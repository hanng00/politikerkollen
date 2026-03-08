"""CLI commands for promise-source matching."""

import click

from cognition.core.config import load_env, setup_logging
from cognition.core.db import get_connection
from cognition.core.operations import ExecutionMode
from cognition.matching.classifier import classify_alignments, estimate_cost
from cognition.matching.repository import (
    DEFAULT_MAX_PER_PROMISE,
    DEFAULT_SIMILARITY_THRESHOLD,
    clear_matches,
    find_matches,
    get_counts,
    save_matches,
)


@click.command("match-promises")
@click.option("--database", envvar="DATABASE_NAME", default="spatial_dagster")
@click.option("--year", type=int, default=None, help="Filter by election year (e.g., 2022)")
@click.option("--threshold", type=float, default=DEFAULT_SIMILARITY_THRESHOLD, help="Minimum similarity score (0-1)")
@click.option("--max-per-promise", type=int, default=DEFAULT_MAX_PER_PROMISE, help="Maximum matches per promise")
@click.option("--clear", is_flag=True, help="Clear existing matches for this year before computing new ones")
@click.option("--skip-classification", is_flag=True, help="Skip LLM alignment classification")
@click.option("--realtime", is_flag=True, help="Use realtime API instead of batch (faster but more expensive)")
@click.option("--dry-run", is_flag=True, help="Show what would be matched without saving")
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose logging")
def match_promises_cmd(
    database: str,
    year: int | None,
    threshold: float,
    max_per_promise: int,
    clear: bool,
    skip_classification: bool,
    realtime: bool,
    dry_run: bool,
    verbose: bool,
) -> None:
    """Match promises to source documents using hybrid retrieval + alignment classification.
    
    Stage 1: Hybrid recall (vector + keyword search with RRF fusion)
    Stage 2: LLM alignment classification (supports/opposes/tangential)
    
    Matches manifesto promises against motions and propositions (source documents)
    which contain substantive policy content.
    """
    logger = setup_logging(verbose)
    load_env()

    logger.info("Connecting to MotherDuck...")
    conn = get_connection(database)

    counts = get_counts(conn, year=year)
    logger.info(f"Counts: {counts}")

    if counts["promise_embeddings"] == 0:
        logger.error("No promise embeddings found. Run 'embed-promises' first.")
        return

    if counts["source_embeddings"] == 0:
        logger.error("No source embeddings found. Run 'embed-sources' first.")
        return

    if clear and not dry_run:
        deleted = clear_matches(conn, year=year)
        logger.info(f"Cleared {deleted} existing matches" + (f" for year {year}" if year else ""))

    logger.info(f"Stage 1: Hybrid recall (threshold={threshold}, max_per_promise={max_per_promise})...")
    if year:
        logger.info(f"Filtering to election year {year}")

    try:
        matches = find_matches(
            conn,
            similarity_threshold=threshold,
            max_per_promise=max_per_promise,
            year=year,
        )
        logger.info(f"Found {len(matches)} matches")

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
                logger.info(f"Classification cost estimate: ${cost['total_cost_usd']:.4f}")
            logger.info("DRY RUN - Not saving matches or classifying")
            return

        alignments = {}
        if not skip_classification and matches:
            mode = ExecutionMode.REALTIME if realtime else ExecutionMode.BATCH
            logger.info(f"Stage 2: Alignment classification ({mode.value} mode)...")
            
            def on_progress(status):
                logger.info(f"Batch status: {status.status} ({status.completed_count}/{status.total_count})")
            
            alignments = classify_alignments(
                conn,
                matches,
                mode=mode,
                on_progress=on_progress if verbose else None,
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
