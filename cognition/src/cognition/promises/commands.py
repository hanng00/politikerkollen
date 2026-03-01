"""CLI commands for promise extraction."""

import click

from cognition.core.config import load_env, setup_logging
from cognition.core.db import get_connection
from cognition.promises.extractor import MODEL_NAME, create_agent, estimate_cost, extract_promises
from cognition.promises.repository import get_document_count, get_unprocessed_documents, save_promises


@click.command("extract-promises")
@click.option("--database", envvar="DATABASE_NAME", default="spatial_dagster")
@click.option("--document-id", default=None, help="Process only this specific document")
@click.option("--limit", type=int, default=None, help="Maximum number of documents to process")
@click.option("--dry-run", is_flag=True, help="Estimate cost without calling API")
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose logging")
def extract_promises_cmd(
    database: str,
    document_id: str | None,
    limit: int | None,
    dry_run: bool,
    verbose: bool,
) -> None:
    """Extract promises from party manifestos."""
    logger = setup_logging(verbose)
    load_env()

    logger.info("Connecting to MotherDuck...")
    conn = get_connection(database)

    counts = get_document_count(conn)
    logger.info(f"Document counts: {counts}")

    documents = get_unprocessed_documents(conn, limit=limit, document_id=document_id)
    logger.info(f"Found {len(documents)} documents to process")

    if not documents:
        logger.info("No documents to process")
        return

    if dry_run:
        logger.info("DRY RUN - Estimating costs without calling API")
        total_cost = 0.0
        for doc in documents:
            text_length = len(doc.get("text_content", "") or "")
            cost_info = estimate_cost(text_length)
            total_cost += cost_info["total_cost_usd"]
            logger.info(
                f"  {doc['document_id']}: {text_length:,} chars, "
                f"~{cost_info['input_tokens']:,} input tokens, "
                f"${cost_info['total_cost_usd']:.4f}"
            )
        logger.info(f"Total estimated cost: ${total_cost:.4f} for {len(documents)} documents")
        logger.info(f"Model: {MODEL_NAME}")
        return

    agent = create_agent()
    logger.info(f"Created extraction agent with model: {MODEL_NAME}")

    total_promises = 0
    for i, doc in enumerate(documents, 1):
        doc_id = doc["document_id"]
        party_id = doc.get("party_id")
        year = doc.get("year")
        text = doc.get("text_content", "") or ""

        logger.info(f"[{i}/{len(documents)}] Processing {doc_id} ({len(text):,} chars)")

        try:
            result = extract_promises(doc_id, text, agent)
            promise_count = len(result.promises)

            cost_info = estimate_cost(len(text))
            save_promises(
                conn, result, party_id=party_id, year=year,
                model_version=MODEL_NAME, cost_usd=cost_info["total_cost_usd"],
            )

            total_promises += promise_count
            logger.info(f"  Extracted {promise_count} promises")

            if result.extraction_notes:
                logger.info(f"  Notes: {result.extraction_notes}")

        except Exception as e:
            logger.error(f"  Error processing {doc_id}: {e}")
            if verbose:
                import traceback
                traceback.print_exc()
            continue

    logger.info(f"Extraction complete: {total_promises} promises from {len(documents)} documents")
