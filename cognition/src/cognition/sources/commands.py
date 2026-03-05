"""CLI commands for source document embeddings."""

import click

from cognition.core.config import load_env, setup_logging
from cognition.core.db import get_connection
from cognition.sources.embedder import embed_sources, estimate_cost
from cognition.sources.models import EMBEDDING_MODEL
from cognition.sources.repository import (
    get_counts,
    get_unembedded_sources,
    save_source_embeddings,
)


@click.command("embed-sources")
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
    help="Filter by document type: mot (motion) or prop (proposition)",
)
@click.option(
    "--limit", type=int, default=None, help="Maximum number of sources to embed"
)
@click.option("--dry-run", is_flag=True, help="Estimate cost without calling API")
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose logging")
def embed_sources_cmd(
    database: str,
    riksmote_year: int | None,
    dok_typ: str | None,
    limit: int | None,
    dry_run: bool,
    verbose: bool,
) -> None:
    """Generate embeddings for source documents (motions and propositions).

    Source documents contain the substantive policy content that should be
    embedded for semantic matching against manifesto promises.

    Partitioned by riksmöte year (Sept-Aug cycle). Each riksmöte like 2024/25
    is identified by its starting year (2024).
    """
    logger = setup_logging(verbose)
    load_env()

    logger.info("Connecting to MotherDuck...")
    conn = get_connection(database)

    counts = get_counts(conn, riksmote_year=riksmote_year, dok_typ=dok_typ)
    logger.info(f"Source embedding counts: {counts}")

    sources = get_unembedded_sources(
        conn, limit=limit, riksmote_year=riksmote_year, dok_typ=dok_typ
    )

    filter_desc = []
    if riksmote_year:
        filter_desc.append(f"riksmöte {riksmote_year}/{riksmote_year + 1 - 2000}")
    if dok_typ:
        filter_desc.append(f"type={dok_typ}")
    filter_str = f" ({', '.join(filter_desc)})" if filter_desc else ""

    logger.info(f"Found {len(sources)} sources to embed{filter_str}")

    if not sources:
        logger.info("No sources to embed")
        return

    if dry_run:
        logger.info("DRY RUN - Estimating costs without calling API")
        cost_info = estimate_cost(sources)
        logger.info(f"  Sources: {cost_info['source_count']}")
        logger.info(f"  Total characters: {cost_info['total_chars']:,}")
        logger.info(f"  Avg tokens per source: {cost_info['avg_tokens_per_source']:,}")
        logger.info(f"  Estimated total tokens: {cost_info['total_tokens']:,}")
        logger.info(f"  Estimated cost: ${cost_info['total_cost_usd']:.4f}")
        logger.info(f"  Model: {cost_info['model']}")

        mot_count = sum(1 for s in sources if s["dok_typ"] == "mot")
        prop_count = sum(1 for s in sources if s["dok_typ"] == "prop")
        logger.info(f"  Breakdown: {mot_count} motions, {prop_count} propositions")
        return

    logger.info(f"Model: {EMBEDDING_MODEL}")

    try:
        results = embed_sources(sources)
        logger.info(f"Generated {len(results)} embeddings")

        source_lookup = {s["dok_id"]: s for s in sources}
        matched_sources = []
        matched_embeddings = []
        for dok_id, emb in results.items():
            if dok_id in source_lookup:
                matched_sources.append(source_lookup[dok_id])
                matched_embeddings.append(emb)

        saved = save_source_embeddings(conn, matched_sources, matched_embeddings)
        logger.info(f"Saved {saved} source embeddings to database")

    except Exception as e:
        logger.error(f"Error embedding sources: {e}")
        if verbose:
            import traceback

            traceback.print_exc()
        raise
