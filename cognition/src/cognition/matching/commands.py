"""CLI commands for promise-source matching."""

import click

from cognition.core.config import load_env, setup_logging
from cognition.core.db import get_connection
from cognition.matching.repository import clear_matches, find_matches, get_counts, save_matches


@click.command("match-promises")
@click.option("--database", envvar="DATABASE_NAME", default="spatial_dagster")
@click.option("--year", type=int, default=None, help="Filter by election year (e.g., 2022)")
@click.option("--threshold", type=float, default=0.7, help="Minimum similarity score (0-1)")
@click.option("--top-k", type=int, default=5, help="Maximum matches per promise")
@click.option("--clear", is_flag=True, help="Clear existing matches for this year before computing new ones")
@click.option("--dry-run", is_flag=True, help="Show what would be matched without saving")
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose logging")
def match_promises_cmd(
    database: str,
    year: int | None,
    threshold: float,
    top_k: int,
    clear: bool,
    dry_run: bool,
    verbose: bool,
) -> None:
    """Match promises to source documents using vector similarity.
    
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

    logger.info(f"Finding matches with threshold={threshold}, top_k={top_k}...")
    if year:
        logger.info(f"Filtering to election year {year}")

    try:
        matches = find_matches(conn, similarity_threshold=threshold, top_k=top_k, year=year)
        logger.info(f"Found {len(matches)} matches")

        if verbose and matches:
            logger.info("Sample matches:")
            for match in matches[:10]:
                logger.info(
                    f"  {match['promise_id'][:8]}... -> {match['source_dok_id'][:12]}... "
                    f"(score: {match['similarity_score']:.3f})"
                )

        if dry_run:
            logger.info("DRY RUN - Not saving matches")
            return

        saved = save_matches(conn, matches)
        logger.info(f"Saved {saved} matches to database")

    except Exception as e:
        logger.error(f"Error matching promises: {e}")
        if verbose:
            import traceback
            traceback.print_exc()
        raise
