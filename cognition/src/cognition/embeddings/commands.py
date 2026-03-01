"""CLI commands for embeddings."""

import click

from cognition.core.batch import (
    get_batch_status,
    get_embedding_results,
    submit_embedding_batch,
    wait_for_batch,
)
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
@click.option("--max-concurrency", type=int, default=1, help="Concurrent API calls (sync mode)")
@click.option("--batch", "use_batch", is_flag=True, help="Use Batch API (50% cheaper, async)")
@click.option("--dry-run", is_flag=True, help="Estimate cost without calling API")
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose logging")
def embed_promises_cmd(
    database: str,
    year: int | None,
    limit: int | None,
    batch_size: int,
    max_concurrency: int,
    use_batch: bool,
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
        cost_info = estimate_cost(len(promises), use_batch_api=use_batch)
        logger.info(f"  Promises: {cost_info['text_count']}")
        logger.info(f"  Estimated tokens: {cost_info['total_tokens']:,}")
        logger.info(f"  Estimated cost: ${cost_info['total_cost_usd']:.4f}")
        logger.info(f"  Model: {cost_info['model']}")
        logger.info(f"  Batch API: {cost_info['batch_api']} (50% discount)" if use_batch else "")
        return

    if use_batch:
        logger.info("Submitting batch job to OpenAI Batch API (50% cost savings)...")
        batch_id = submit_embedding_batch(
            promises,
            id_field="promise_id",
            text_field="promise_text",
            metadata={"source": "cognition", "type": "promises", "year": str(year) if year else "all"},
        )
        logger.info(f"Batch submitted: {batch_id}")
        logger.info("Waiting for batch to complete (may take minutes to hours)...")
        
        def on_progress(status):
            logger.info(f"  Status: {status['status']} ({status['completed']}/{status['total']})")
        
        status = wait_for_batch(batch_id, poll_interval=30, on_progress=on_progress)
        logger.info(f"Batch completed: {status['completed']} succeeded, {status['failed']} failed")
        
        results = get_embedding_results(status["output_file_id"])
        saved = save_promise_embeddings(conn, results)
        logger.info(f"Saved {saved} promise embeddings to database")
    else:
        client = get_client()
        logger.info(f"Using sync mode with max_concurrency={max_concurrency}")
        logger.info(f"Model: {EMBEDDING_MODEL}")

        texts = [p["promise_text"] for p in promises]
        logger.info(f"Embedding {len(texts)} promise texts in batches of {batch_size}...")

        try:
            embeddings = embed_batch(texts, client, batch_size=batch_size, max_concurrency=max_concurrency)
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
@click.option("--max-concurrency", type=int, default=1, help="Concurrent API calls (sync mode)")
@click.option("--batch", "use_batch", is_flag=True, help="Use Batch API (50% cheaper, async)")
@click.option("--dry-run", is_flag=True, help="Estimate cost without calling API")
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose logging")
def embed_votes_cmd(
    database: str,
    year: int | None,
    limit: int | None,
    batch_size: int,
    max_concurrency: int,
    use_batch: bool,
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
        cost_info = estimate_cost(len(votes), avg_tokens_per_text=200, use_batch_api=use_batch)
        logger.info(f"  Votes: {cost_info['text_count']}")
        logger.info(f"  Estimated tokens: {cost_info['total_tokens']:,}")
        logger.info(f"  Estimated cost: ${cost_info['total_cost_usd']:.4f}")
        logger.info(f"  Model: {cost_info['model']}")
        logger.info(f"  Batch API: {cost_info['batch_api']} (50% discount)" if use_batch else "")
        return

    if use_batch:
        logger.info("Submitting batch job to OpenAI Batch API (50% cost savings)...")
        
        items = [{"votering_id": v["votering_id"], "forslag_text": v["forslag_text"]} for v in votes]
        batch_id = submit_embedding_batch(
            items,
            id_field="votering_id",
            text_field="forslag_text",
            metadata={"source": "cognition", "type": "votes", "year": str(year) if year else "all"},
        )
        logger.info(f"Batch submitted: {batch_id}")
        logger.info("Waiting for batch to complete (may take minutes to hours)...")
        
        def on_progress(status):
            logger.info(f"  Status: {status['status']} ({status['completed']}/{status['total']})")
        
        status = wait_for_batch(batch_id, poll_interval=30, on_progress=on_progress)
        logger.info(f"Batch completed: {status['completed']} succeeded, {status['failed']} failed")
        
        embedding_results = get_embedding_results(status["output_file_id"])
        
        vote_lookup = {v["votering_id"]: v for v in votes}
        embedding_tuples = [
            (vid, vote_lookup[vid]["dok_id"], vote_lookup[vid]["forslag_text"], emb)
            for vid, emb in embedding_results
            if vid in vote_lookup
        ]
        saved = save_vote_embeddings(conn, embedding_tuples)
        logger.info(f"Saved {saved} vote embeddings to database")
    else:
        client = get_client()
        logger.info(f"Using sync mode with max_concurrency={max_concurrency}")
        logger.info(f"Model: {EMBEDDING_MODEL}")

        texts = [v["forslag_text"] for v in votes]
        logger.info(f"Embedding {len(texts)} vote texts in batches of {batch_size}...")

        try:
            embeddings = embed_batch(texts, client, batch_size=batch_size, max_concurrency=max_concurrency)
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
