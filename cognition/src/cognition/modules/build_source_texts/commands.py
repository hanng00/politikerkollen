"""CLI command for source text extraction."""

import click

from cognition.core.config import load_env, setup_logging
from cognition.core.db import get_connection
from cognition.modules.build_source_texts.repository import (
    get_sources_needing_text,
    save_source_texts,
)


@click.command("build-source-texts")
@click.option("--database", envvar="DATABASE_NAME", default="spatial_dagster")
@click.option(
    "--riksmote-year",
    type=int,
    default=None,
    help="Filter by riksmöte year (e.g., 2024 for riksmöte 2024/25)",
)
@click.option(
    "--dok-typ",
    type=click.Choice(["mot", "prop"]),
    default=None,
    help="Filter by document type",
)
@click.option("--limit", type=int, default=None, help="Maximum number of sources")
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose logging")
def build_source_texts_cmd(
    database: str,
    riksmote_year: int | None,
    dok_typ: str | None,
    limit: int | None,
    verbose: bool,
) -> None:
    """Extract plain text from source document HTML into cognition.source_texts.

    Shared asset used by BM25 keyword search and other cognition pipelines.
    Incremental: only processes documents not already in source_texts.
    No API calls — pure CPU text extraction.
    """
    logger = setup_logging(verbose)
    load_env()

    logger.info("Connecting to MotherDuck...")
    conn = get_connection(database)
    logger.info(f"Connected to MotherDuck database: {database}")

    sources = get_sources_needing_text(
        conn,
        limit=limit,
        riksmote_year=riksmote_year,
        dok_typ=dok_typ,
    )

    logger.info(f"Found {len(sources)} sources needing text extraction")

    if not sources:
        logger.info("All sources already have text extracted")
        return

    try:
        saved = save_source_texts(conn, sources)
        logger.info(f"Saved {saved} source texts")
    except Exception as e:
        logger.error(f"Error building source texts: {e}")
        if verbose:
            import traceback

            traceback.print_exc()
        raise
