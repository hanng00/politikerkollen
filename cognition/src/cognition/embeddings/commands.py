"""CLI commands for promise embeddings."""

import click

from cognition.core.config import load_env, setup_logging
from cognition.core.db import get_connection
from cognition.core.embedding import EmbeddingService
from cognition.core.models import EMBEDDING_MODEL
from cognition.embeddings.embedder import embed_promises, estimate_cost
from cognition.embeddings.repository import (
    get_counts,
    get_unembedded_promises,
    save_promise_embeddings,
)


@click.command("embed-promises")
@click.option("--database", envvar="DATABASE_NAME", default="spatial_dagster")
@click.option(
    "--year", type=int, default=None, help="Filter by election year (e.g., 2022)"
)
@click.option(
    "--limit", type=int, default=None, help="Maximum number of promises to embed"
)
@click.option("--dry-run", is_flag=True, help="Estimate cost without calling API")
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose logging")
def embed_promises_cmd(
    database: str,
    year: int | None,
    limit: int | None,
    dry_run: bool,
    verbose: bool,
) -> None:
    """Generate embeddings for extracted promises.

    Uses the unified embedding system with NoChunking (promises are short).
    """
    logger = setup_logging(verbose)
    load_env()

    logger.info("Connecting to MotherDuck...")
    conn = get_connection(database)

    counts = get_counts(conn, year=year)
    logger.info(f"Embedding counts: {counts}")

    promises = get_unembedded_promises(conn, limit=limit, year=year)
    logger.info(
        f"Found {len(promises)} promises to embed"
        + (f" for year {year}" if year else "")
    )

    if not promises:
        logger.info("No promises to embed")
        return

    if dry_run:
        logger.info("DRY RUN - Estimating costs without calling API")
        cost_info = estimate_cost(promises)
        logger.info(f"  Promises: {cost_info['promise_count']}")
        logger.info(f"  Estimated tokens: {cost_info['total_tokens']:,}")
        logger.info(f"  Estimated cost: ${cost_info['total_cost_usd']:.4f}")
        logger.info(f"  Model: {cost_info['model']}")
        return

    logger.info(f"Model: {EMBEDDING_MODEL}")

    try:
        service = EmbeddingService()
        records = embed_promises(promises, service=service)
        logger.info(f"Generated {len(records)} embeddings")

        saved = save_promise_embeddings(conn, records)
        logger.info(f"Saved {saved} promise embeddings to database")

    except Exception as e:
        logger.error(f"Error embedding promises: {e}")
        if verbose:
            import traceback

            traceback.print_exc()
        raise
