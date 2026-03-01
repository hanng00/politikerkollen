"""CLI commands for embeddings."""

import click

from cognition.core.config import load_env, setup_logging
from cognition.core.db import get_connection
from cognition.embeddings.embedder import embed_batch, estimate_cost, get_client
from cognition.embeddings.models import EMBEDDING_MODEL
from cognition.embeddings.repository import (
    get_counts,
    get_unembedded_promises,
    get_unembedded_votes,
    save_promise_embeddings,
    save_vote_embeddings,
)


@click.command("embed-promises")
@click.option("--database", envvar="DATABASE_NAME", default="spatial_dagster")
@click.option("--year", type=int, default=None, help="Filter by election year (e.g., 2022)")
@click.option("--limit", type=int, default=None, help="Maximum number of promises to embed")
@click.option("--batch-size", type=int, default=100, help="Number of texts per API call")
@click.option("--dry-run", is_flag=True, help="Estimate cost without calling API")
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose logging")
def embed_promises_cmd(
    database: str,
    year: int | None,
    limit: int | None,
    batch_size: int,
    dry_run: bool,
    verbose: bool,
) -> None:
    """Generate embeddings for extracted promises."""
    logger = setup_logging(verbose)
    load_env()

    logger.info("Connecting to MotherDuck...")
    conn = get_connection(database)

    counts = get_counts(conn, year=year)
    logger.info(f"Embedding counts: {counts}")

    promises = get_unembedded_promises(conn, limit=limit, year=year)
    logger.info(f"Found {len(promises)} promises to embed" + (f" for year {year}" if year else ""))

    if not promises:
        logger.info("No promises to embed")
        return

    if dry_run:
        logger.info("DRY RUN - Estimating costs without calling API")
        cost_info = estimate_cost(len(promises))
        logger.info(f"  Promises: {cost_info['text_count']}")
        logger.info(f"  Estimated tokens: {cost_info['total_tokens']:,}")
        logger.info(f"  Estimated cost: ${cost_info['total_cost_usd']:.4f}")
        logger.info(f"  Model: {cost_info['model']}")
        return

    client = get_client()
    logger.info(f"Created OpenAI client for embedding with model: {EMBEDDING_MODEL}")

    texts = [p["promise_text"] for p in promises]
    logger.info(f"Embedding {len(texts)} promise texts in batches of {batch_size}...")

    try:
        embeddings = embed_batch(texts, client, batch_size=batch_size)
        logger.info(f"Generated {len(embeddings)} embeddings")

        embedding_pairs = [
            (promises[i]["promise_id"], embeddings[i]) for i in range(len(promises))
        ]
        saved = save_promise_embeddings(conn, embedding_pairs)
        logger.info(f"Saved {saved} promise embeddings to database")

    except Exception as e:
        logger.error(f"Error embedding promises: {e}")
        if verbose:
            import traceback
            traceback.print_exc()
        raise


@click.command("embed-votes")
@click.option("--database", envvar="DATABASE_NAME", default="spatial_dagster")
@click.option("--year", type=int, default=None, help="Filter by riksmöte year (e.g., 2022 for 2022/23)")
@click.option("--limit", type=int, default=None, help="Maximum number of votes to embed")
@click.option("--batch-size", type=int, default=100, help="Number of texts per API call")
@click.option("--dry-run", is_flag=True, help="Estimate cost without calling API")
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose logging")
def embed_votes_cmd(
    database: str,
    year: int | None,
    limit: int | None,
    batch_size: int,
    dry_run: bool,
    verbose: bool,
) -> None:
    """Generate embeddings for vote proposals."""
    logger = setup_logging(verbose)
    load_env()

    logger.info("Connecting to MotherDuck...")
    conn = get_connection(database)

    counts = get_counts(conn, year=year)
    logger.info(f"Embedding counts: {counts}")

    votes = get_unembedded_votes(conn, limit=limit, year=year)
    logger.info(f"Found {len(votes)} votes to embed" + (f" for riksmöte {year}/{year+1-2000}" if year else ""))

    if not votes:
        logger.info("No votes to embed")
        return

    if dry_run:
        logger.info("DRY RUN - Estimating costs without calling API")
        cost_info = estimate_cost(len(votes), avg_tokens_per_text=200)
        logger.info(f"  Votes: {cost_info['text_count']}")
        logger.info(f"  Estimated tokens: {cost_info['total_tokens']:,}")
        logger.info(f"  Estimated cost: ${cost_info['total_cost_usd']:.4f}")
        logger.info(f"  Model: {cost_info['model']}")
        return

    client = get_client()
    logger.info(f"Created OpenAI client for embedding with model: {EMBEDDING_MODEL}")

    texts = [v["forslag_text"] for v in votes]
    logger.info(f"Embedding {len(texts)} vote texts in batches of {batch_size}...")

    try:
        embeddings = embed_batch(texts, client, batch_size=batch_size)
        logger.info(f"Generated {len(embeddings)} embeddings")

        embedding_tuples = [
            (votes[i]["votering_id"], votes[i]["dok_id"], votes[i]["forslag_text"], embeddings[i])
            for i in range(len(votes))
        ]
        saved = save_vote_embeddings(conn, embedding_tuples)
        logger.info(f"Saved {saved} vote embeddings to database")

    except Exception as e:
        logger.error(f"Error embedding votes: {e}")
        if verbose:
            import traceback
            traceback.print_exc()
        raise
