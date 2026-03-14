"""CLI commands for promise extraction."""

import click

from cognition.core.config import load_env, setup_logging
from cognition.core.db import get_connection
from cognition.core.operations import BatchStatus, ExecutionMode
from cognition.modules.extract_promises.extractor import (
    MODEL_NAME,
    estimate_cost,
    extract_promises,
)
from cognition.modules.extract_promises.repository import (
    get_document_count,
    get_unprocessed_documents,
    save_promises,
)


@click.command("extract-promises")
@click.option("--database", envvar="DATABASE_NAME", default="spatial_dagster")
@click.option("--document-id", default=None, help="Process only this specific document")
@click.option(
    "--year", type=int, default=None, help="Filter by election year (e.g., 2022)"
)
@click.option(
    "--limit", type=int, default=None, help="Maximum number of documents to process"
)
@click.option(
    "--realtime",
    is_flag=True,
    help="Use real-time API (immediate, full price) instead of Batch API",
)
@click.option("--dry-run", is_flag=True, help="Estimate cost without calling API")
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose logging")
def extract_promises_cmd(
    database: str,
    document_id: str | None,
    year: int | None,
    limit: int | None,
    realtime: bool,
    dry_run: bool,
    verbose: bool,
) -> None:
    """Extract promises from party manifestos.

    By default uses OpenAI Batch API (50% cost savings, up to 24h).
    Use --realtime for immediate results at full price.
    """
    logger = setup_logging(verbose)
    load_env()

    mode = ExecutionMode.REALTIME if realtime else ExecutionMode.BATCH

    logger.info("Connecting to MotherDuck...")
    conn = get_connection(database)
    logger.info(f"Connected to MotherDuck database: {database}")

    counts = get_document_count(conn, year=year)
    logger.info(f"Document counts: {counts}")

    documents = get_unprocessed_documents(
        conn, limit=limit, document_id=document_id, year=year
    )
    logger.info(f"Found {len(documents)} documents to process")

    if not documents:
        logger.info("No documents to process")
        return

    if dry_run:
        logger.info("DRY RUN - Estimating costs without calling API")
        use_batch = mode == ExecutionMode.BATCH
        total_cost = 0.0
        for doc in documents:
            text_length = len(doc.get("text_content", "") or "")
            cost_info = estimate_cost(text_length, use_batch_api=use_batch)
            total_cost += cost_info["total_cost_usd"]
            logger.info(
                f"  {doc['document_id']}: {text_length:,} chars, "
                f"~{cost_info['input_tokens']:,} input tokens, "
                f"${cost_info['total_cost_usd']:.4f}"
            )
        logger.info(
            f"Total estimated cost: ${total_cost:.4f} for {len(documents)} documents"
        )
        logger.info(f"Model: {MODEL_NAME}")
        logger.info(f"Mode: {mode.value}")
        if use_batch:
            logger.info("(Batch API provides 50% cost savings)")
        return

    logger.info(f"Mode: {mode.value}")
    logger.info(f"Model: {MODEL_NAME}")

    def on_progress(status: BatchStatus) -> None:
        logger.info(f"  Status: {status.status} ({status.completed}/{status.total})")

    try:
        if mode == ExecutionMode.BATCH:
            logger.info("Submitting to OpenAI Batch API (50% cost savings)...")
            logger.info("Waiting for batch to complete (may take minutes to hours)...")

        results = extract_promises(
            documents,
            mode=mode,
            on_progress=on_progress if mode == ExecutionMode.BATCH else None,
            metadata={
                "source": "cognition",
                "type": "promises",
                "year": str(year) if year else "all",
            },
        )

        doc_lookup = {d["document_id"]: d for d in documents}
        total_promises = 0
        errors = 0

        for doc_id, result in results.items():
            doc = doc_lookup.get(doc_id, {})
            party_id = doc.get("party_id")
            doc_year = doc.get("year")

            promise_count = len(result.promises)
            text_length = len(doc.get("text_content", "") or "")
            cost_info = estimate_cost(
                text_length, use_batch_api=(mode == ExecutionMode.BATCH)
            )

            save_promises(
                conn,
                result,
                party_id=party_id,
                year=doc_year,
                model_version=MODEL_NAME,
                cost_usd=cost_info["total_cost_usd"],
            )

            total_promises += promise_count
            logger.info(f"  {doc_id}: {promise_count} promises extracted")

            if result.extraction_notes:
                logger.info(f"    Notes: {result.extraction_notes}")

        logger.info(
            f"Extraction complete: {total_promises} promises from {len(results)} documents"
        )
        if errors:
            logger.warning(f"  {errors} documents failed")

    except Exception as e:
        logger.error(f"Error extracting promises: {e}")
        if verbose:
            import traceback

            traceback.print_exc()
        raise
