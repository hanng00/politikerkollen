"""CLI commands for promise-source matching."""

import click

from cognition.core.config import load_env, setup_logging
from cognition.core.db import get_connection
from cognition.core.operations import ExecutionMode
from cognition.modules.match_promises.classifier import (
    classify_alignments,
    estimate_cost,
)
from cognition.modules.match_promises.repository import (
    DEFAULT_MAX_PER_PROMISE,
    DEFAULT_MIN_BM25_SCORE,
    DEFAULT_SIMILARITY_THRESHOLD,
    CandidatePool,
    clear_matches,
    filter_by_party_votes,
    find_matches,
    get_counts,
    get_promise_parties,
    get_source_voting_parties,
    get_vote_linked_source_ids,
    save_matches,
)


@click.command("match-promises")
@click.option("--database", envvar="DATABASE_NAME", default="spatial_dagster")
@click.option(
    "--year", type=int, default=None, help="Filter by election year (e.g., 2022)"
)
@click.option(
    "--threshold",
    type=float,
    default=DEFAULT_SIMILARITY_THRESHOLD,
    help="Minimum similarity score (0-1)",
)
@click.option(
    "--max-per-promise",
    type=int,
    default=DEFAULT_MAX_PER_PROMISE,
    help="Maximum matches per promise",
)
@click.option(
    "--enable-keyword",
    default=True,
    help="Enable BM25 keyword search with RRF fusion",
)
@click.option(
    "--min-bm25-score",
    type=float,
    default=DEFAULT_MIN_BM25_SCORE,
    help="Minimum BM25 score threshold for keyword search (0 = no threshold)",
)
@click.option(
    "--limit",
    type=int,
    default=10,
    help="Limit number of promises to process (for testing)",
)
@click.option(
    "--vote-linked/--no-vote-linked",
    default=False,
    help="Only match against sources with vote links (default: disabled - match all sources)",
)
@click.option(
    "--party-filter/--no-party-filter",
    default=False,
    help="Filter out matches where promising party didn't vote (default: disabled)",
)
@click.option(
    "--clear",
    is_flag=True,
    help="Clear existing matches for this year before computing new ones",
)
@click.option(
    "--skip-classification", is_flag=True, help="Skip LLM alignment classification"
)
@click.option(
    "--realtime",
    is_flag=True,
    help="Use realtime API instead of batch (faster but more expensive)",
)
@click.option(
    "--dry-run", is_flag=True, help="Show what would be matched without saving"
)
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose logging")
def match_promises_cmd(
    database: str,
    year: int | None,
    threshold: float,
    max_per_promise: int,
    enable_keyword: bool,
    min_bm25_score: float,
    limit: int | None,
    vote_linked: bool,
    party_filter: bool,
    clear: bool,
    skip_classification: bool,
    realtime: bool,
    dry_run: bool,
    verbose: bool,
) -> None:
    """Match promises to source documents + LLM alignment classification.

    Stage 1: Vector recall (+ optional keyword search with --enable-keyword)
    Stage 2: LLM alignment classification (supports/opposes/tangential)
    """
    logger = setup_logging(verbose)
    load_env()

    logger.info("Connecting to MotherDuck...")
    conn = get_connection(database)
    logger.info(f"Connected to MotherDuck database: {database}")

    # Build candidate pool from CLI options
    source_dok_ids = None
    if vote_linked:
        logger.warning(
            "⚠️  --vote-linked is DEPRECATED. It uses int_vote_source_links which has "
            "broken lineage. The default (--no-vote-linked) matches against all sources "
            "and lets the LLM classifier decide relevance."
        )
        logger.info("Fetching vote-linked source IDs...")
        source_dok_ids = get_vote_linked_source_ids(conn, year=year)
        if not source_dok_ids:
            logger.error("No vote-linked sources found. Check int_vote_source_links.")
            return

    pool = CandidatePool(year=year, source_dok_ids=source_dok_ids)

    counts = get_counts(conn, pool=pool)
    logger.info(f"Counts: {counts}")

    if counts["promise_embeddings"] == 0:
        logger.error("No promise embeddings found. Run 'embed-promises' first.")
        return

    if counts["source_embeddings"] == 0:
        logger.error("No source embeddings found. Run 'embed-sources' first.")
        return

    if clear and not dry_run:
        deleted = clear_matches(conn, pool=pool)
        logger.info(
            f"Cleared {deleted} existing matches"
            + (f" for year {year}" if year else "")
        )

    mode_label = "vector + keyword" if enable_keyword else "vector-only"
    pool_label = "vote-linked" if vote_linked else "all sources"
    filter_label = " + party-filter" if party_filter else ""
    logger.info(
        f"Stage 1: Recall ({mode_label}, {pool_label}{filter_label}, threshold={threshold}, max_per_promise={max_per_promise}, min_bm25={min_bm25_score})..."
    )
    if year:
        logger.info(f"Filtering to election year {year}")
    if limit:
        logger.info(f"Limiting to {limit} promises (testing mode)")

    try:
        matches = find_matches(
            conn,
            similarity_threshold=threshold,
            max_per_promise=max_per_promise,
            pool=pool,
            enable_keyword=enable_keyword,
            limit=limit,
            min_bm25_score=min_bm25_score,
        )
        logger.info(f"Found {len(matches)} raw matches")

        if party_filter and matches:
            matched_promise_ids = {m["promise_id"] for m in matches}
            matched_source_ids = {m["source_dok_id"] for m in matches}

            promise_parties = get_promise_parties(conn, matched_promise_ids)
            source_voting_parties = get_source_voting_parties(conn, matched_source_ids)
            matches = filter_by_party_votes(
                matches, promise_parties, source_voting_parties
            )

        logger.info(f"Proceeding with {len(matches)} matches")

        if verbose and matches:
            logger.info("Sample matches:")
            for match in matches[:10]:
                logger.info(
                    f"  {match['promise_id'][:8]}... -> {match['source_dok_id'][:12]}... "
                    f"(score: {match['similarity_score']:.3f})"
                )

        if dry_run:
            if not skip_classification:
                cost = estimate_cost(len(matches), use_batch_api=not realtime)
                logger.info(
                    f"Classification cost estimate: ${cost['total_cost_usd']:.4f}"
                )
            logger.info("DRY RUN - Not saving matches or classifying")
            return

        alignments = {}
        if not skip_classification and matches:
            mode = ExecutionMode.REALTIME if realtime else ExecutionMode.BATCH
            logger.info(f"Stage 2: Alignment classification ({mode.value} mode)...")

            alignments = classify_alignments(
                conn,
                matches,
                mode=mode,
                metadata={"year": str(year) if year else "all"},
            )
            logger.info(f"Classified {len(alignments)} matches")

            if verbose and alignments:
                logger.info("Sample classifications:")
                for match_id, result in list(alignments.items())[:5]:
                    logger.info(
                        f"  {match_id[:8]}...: {result.alignment} "
                        f"(conf: {result.confidence:.2f}) - {result.rationale[:50]}..."
                    )

        saved = save_matches(conn, matches, alignments)
        logger.info(f"Saved {saved} matches to database")

    except Exception as e:
        logger.error(f"Error matching promises: {e}")
        if verbose:
            import traceback

            traceback.print_exc()
        raise
