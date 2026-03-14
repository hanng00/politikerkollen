import dagster as dg
from dagster import AssetExecutionContext, AssetKey, Config

from orchestration_dagster.lib.container_executor import ContainerExecutor
from orchestration_dagster.lib.partitions import (
    election_year_partitions,
    yearly_partitions,
)
from orchestration_dagster.lib.secrets_resource import SecretsResource

GROUP_NAME = "cognition"


class LLMConfig(Config):
    """Configuration for LLM-based assets.

    Configure via Dagster UI launchpad when materializing assets.
    """

    realtime: bool = False
    """Use real-time API instead of Batch API.
    
    - False (default): Batch API - 50% cost savings, up to 24h completion
    - True: Real-time API - immediate results, full price
    
    Use realtime=True for testing small batches, then backfill with batch mode.
    """

    limit: int | None = None
    """Limit number of items to process (for testing).
    
    When set, only processes this many promises/documents.
    Useful for quick iteration and debugging.
    """


def dbt_asset_key(model: str) -> AssetKey:
    """Create AssetKey for a dbt model.

    dbt models use schema prefix as first key component:
    - stg_* models -> ["stg", "stg_model_name"]
    - int_* models -> ["int", "int_model_name"]
    - mart_* models -> ["mart", "mart_model_name"]
    """
    if model.startswith("stg_"):
        return AssetKey(["stg", model])
    elif model.startswith("int_"):
        return AssetKey(["int", model])
    elif model.startswith("mart_"):
        return AssetKey(["mart", model])
    else:
        raise ValueError(f"Unknown dbt model prefix: {model}")


def cognition_asset_key(name: str) -> AssetKey:
    """Create AssetKey for a cognition asset."""
    return AssetKey(["cognition", name])


def _get_year_from_partition(context: AssetExecutionContext) -> str | None:
    """Extract year from partition key.

    Handles both static ("2022") and time window ("2022-01-01") partition keys.
    """
    if context.has_partition_key:
        return context.partition_key[:4]
    return None


def _get_partition_suffix(context: AssetExecutionContext) -> str:
    """Return a safe partition suffix for naming runs."""
    if context.has_partition_key:
        return context.partition_key
    return "all"


# =============================================================================
# PROMISE EXTRACTION
# =============================================================================


@dg.asset(
    key=cognition_asset_key("valmanifest_promises"),
    deps=[dbt_asset_key("stg_valmanifest")],
    group_name=GROUP_NAME,
    partitions_def=election_year_partitions,
    description="Extract promises from party manifestos using LLM. Partitioned by election year.",
)
def valmanifest_promises(
    context: AssetExecutionContext,
    config: LLMConfig,
    container_executor: ContainerExecutor,
    secrets_resource: SecretsResource,
):
    """Extract promises from valmanifest documents via ContainerExecutor.

    Reads from: main_stg.stg_valmanifest
    Writes to: cognition.valmanifest_promises, cognition.extraction_state

    Configure `realtime` in the launchpad:
    - False (default): Batch API - 50% cheaper, async
    - True: Real-time API - immediate results
    """
    command = ["extract-promises"]

    year = _get_year_from_partition(context)
    if year:
        command.extend(["--year", year])
        context.log.info(f"Processing manifestos for election year {year}")

    if config.realtime:
        command.append("--realtime")
        context.log.info("Using REALTIME mode (immediate, full price)")
    else:
        context.log.info("Using BATCH mode (50% savings, up to 24h)")

    env_vars = {
        "MOTHERDUCK_ACCESS_TOKEN": secrets_resource.get_motherduck_token(),
        "OPENAI_API_KEY": secrets_resource.get_openai_api_key(),
        "DATABASE_NAME": secrets_resource.get_database_name(),
    }

    result = container_executor.execute(
        context=context,
        image="politikerkollen/cognition:latest",
        command=command,
        env_vars=env_vars,
        name=f"extract_promises_{_get_partition_suffix(context)}",
    )

    if not result.success:
        raise dg.Failure(
            f"Promise extraction failed with exit code {result.exit_code}",
            metadata={
                "stdout": result.stdout,
                "stderr": result.stderr,
                "task": "extract-promises",
                "year": year or "all",
                "mode": "realtime" if config.realtime else "batch",
            },
        )

    return {
        "status": "success",
        "task": "extract-promises",
        "year": year or "all",
        "mode": "realtime" if config.realtime else "batch",
        "exit_code": result.exit_code,
    }


# =============================================================================
# PROMISE EMBEDDINGS
# =============================================================================


@dg.asset(
    key=cognition_asset_key("promise_embeddings"),
    deps=[cognition_asset_key("valmanifest_promises")],
    group_name=GROUP_NAME,
    partitions_def=election_year_partitions,
    description="Generate embeddings for extracted promises. Partitioned by election year.",
)
def promise_embeddings(
    context: AssetExecutionContext,
    config: LLMConfig,
    container_executor: ContainerExecutor,
    secrets_resource: SecretsResource,
):
    """Generate embeddings for promises via ContainerExecutor.

    Configure `realtime` in the launchpad:
    - False (default): Batch API - 50% cheaper, async
    - True: Real-time API - immediate results
    """
    command = ["embed-promises"]

    year = _get_year_from_partition(context)
    if year:
        command.extend(["--year", year])
        context.log.info(f"Embedding promises for election year {year}")

    if config.realtime:
        command.append("--realtime")
        context.log.info("Using REALTIME mode (immediate, full price)")
    else:
        context.log.info("Using BATCH mode (50% savings, up to 24h)")

    env_vars = {
        "MOTHERDUCK_ACCESS_TOKEN": secrets_resource.get_motherduck_token(),
        "OPENAI_API_KEY": secrets_resource.get_openai_api_key(),
        "DATABASE_NAME": secrets_resource.get_database_name(),
    }

    result = container_executor.execute(
        context=context,
        image="politikerkollen/cognition:latest",
        command=command,
        env_vars=env_vars,
        name=f"embed_promises_{_get_partition_suffix(context)}",
    )

    if not result.success:
        raise dg.Failure(
            f"Promise embedding failed with exit code {result.exit_code}",
            metadata={
                "stdout": result.stdout,
                "stderr": result.stderr,
                "task": "embed-promises",
                "year": year or "all",
                "mode": "realtime" if config.realtime else "batch",
            },
        )

    return {
        "status": "success",
        "task": "embed-promises",
        "year": year or "all",
        "mode": "realtime" if config.realtime else "batch",
        "exit_code": result.exit_code,
    }


# =============================================================================
# SOURCE TEXT EXTRACTION
# =============================================================================


@dg.asset(
    key=cognition_asset_key("source_texts"),
    deps=[dbt_asset_key("int_source_documents"), dbt_asset_key("int_document_content")],
    group_name=GROUP_NAME,
    partitions_def=yearly_partitions,
    description="Extract plain text from source document HTML. Shared by BM25 search and other cognition pipelines.",
)
def source_texts(
    context: AssetExecutionContext,
    container_executor: ContainerExecutor,
    secrets_resource: SecretsResource,
):
    """Extract plain text from HTML via ContainerExecutor.

    Pure CPU work — no API calls. Incremental: only processes new documents.
    """
    command = ["build-source-texts"]

    riksmote_year = _get_year_from_partition(context)
    if riksmote_year:
        command.extend(["--riksmote-year", riksmote_year])
        context.log.info(f"Extracting source texts for riksmöte {riksmote_year}")

    env_vars = {
        "MOTHERDUCK_ACCESS_TOKEN": secrets_resource.get_motherduck_token(),
        "DATABASE_NAME": secrets_resource.get_database_name(),
    }

    result = container_executor.execute(
        context=context,
        image="politikerkollen/cognition:latest",
        command=command,
        env_vars=env_vars,
        name=f"source_texts_{_get_partition_suffix(context)}",
    )

    if not result.success:
        raise dg.Failure(
            f"Source text extraction failed with exit code {result.exit_code}",
            metadata={
                "stdout": result.stdout,
                "stderr": result.stderr,
                "task": "build-source-texts",
                "riksmote_year": riksmote_year or "all",
            },
        )

    return {
        "status": "success",
        "task": "build-source-texts",
        "riksmote_year": riksmote_year or "all",
        "exit_code": result.exit_code,
    }


# =============================================================================
# SOURCE EMBEDDINGS
# =============================================================================


@dg.asset(
    key=cognition_asset_key("source_embeddings"),
    deps=[cognition_asset_key("source_texts")],
    group_name=GROUP_NAME,
    partitions_def=yearly_partitions,
    description="Generate embeddings for source documents. Reads plain text from source_texts.",
)
def source_embeddings(
    context: AssetExecutionContext,
    container_executor: ContainerExecutor,
    secrets_resource: SecretsResource,
):
    """Generate embeddings for source documents via ContainerExecutor.

    Incremental: only embeds documents not yet in the embeddings table.
    Partitioned by riksmöte year for scoped backfills.
    """
    command = ["embed-sources"]

    riksmote_year = _get_year_from_partition(context)
    if riksmote_year:
        command.extend(["--riksmote-year", riksmote_year])
        context.log.info(
            f"Embedding sources for riksmöte {riksmote_year}/{int(riksmote_year) + 1 - 2000}"
        )

    env_vars = {
        "MOTHERDUCK_ACCESS_TOKEN": secrets_resource.get_motherduck_token(),
        "OPENAI_API_KEY": secrets_resource.get_openai_api_key(),
        "DATABASE_NAME": secrets_resource.get_database_name(),
    }

    result = container_executor.execute(
        context=context,
        image="politikerkollen/cognition:latest",
        command=command,
        env_vars=env_vars,
        name=f"embed_sources_{_get_partition_suffix(context)}",
    )

    if not result.success:
        raise dg.Failure(
            f"Source embedding failed with exit code {result.exit_code}",
            metadata={
                "stdout": result.stdout,
                "stderr": result.stderr,
                "task": "embed-sources",
                "riksmote_year": riksmote_year or "all",
            },
        )

    return {
        "status": "success",
        "task": "embed-sources",
        "riksmote_year": riksmote_year or "all",
        "exit_code": result.exit_code,
    }


# =============================================================================
# PROMISE-SOURCE MATCHING
# =============================================================================


@dg.asset(
    key=cognition_asset_key("promise_vote_matches"),
    deps=[
        cognition_asset_key("promise_embeddings"),
        cognition_asset_key("source_embeddings"),
        cognition_asset_key("source_texts"),
        cognition_asset_key("valmanifest_promises"),
        # Note: We no longer depend on int_vote_source_links for recall filtering.
        # The new pipeline matches against ALL sources and lets the LLM classifier
        # decide relevance (with the "irrelevant" opt-out).
    ],
    group_name=GROUP_NAME,
    partitions_def=election_year_partitions,
    description="Match promises to source documents using hybrid retrieval + LLM alignment classification. Partitioned by election year.",
)
def promise_vote_matches(
    context: AssetExecutionContext,
    config: LLMConfig,
    container_executor: ContainerExecutor,
    secrets_resource: SecretsResource,
):
    """Match promises to source documents via ContainerExecutor.

    Two-stage pipeline:
    1. Hybrid recall (vector + keyword search with RRF fusion)
    2. LLM alignment classification (supports/opposes/tangential)

    Configure `realtime` in the launchpad:
    - False (default): Batch API - 50% cheaper, async
    - True: Real-time API - immediate results

    Configure `limit` for testing:
    - None (default): Process all promises
    - N: Only process N promises (for quick iteration)
    """
    command = ["match-promises"]

    year = _get_year_from_partition(context)
    if year:
        command.extend(["--year", year])
        context.log.info(f"Matching promises to sources for election year {year}")

    if config.realtime:
        command.append("--realtime")
        context.log.info("Using REALTIME mode (immediate, full price)")
    else:
        context.log.info("Using BATCH mode (50% savings, up to 24h)")

    if config.limit:
        command.extend(["--limit", str(config.limit)])
        context.log.info(f"TESTING MODE: Limiting to {config.limit} promises")

    env_vars = {
        "MOTHERDUCK_ACCESS_TOKEN": secrets_resource.get_motherduck_token(),
        "OPENAI_API_KEY": secrets_resource.get_openai_api_key(),
        "DATABASE_NAME": secrets_resource.get_database_name(),
    }

    result = container_executor.execute(
        context=context,
        image="politikerkollen/cognition:latest",
        command=command,
        env_vars=env_vars,
        name=f"match_promises_{_get_partition_suffix(context)}",
    )

    if not result.success:
        raise dg.Failure(
            f"Promise matching failed with exit code {result.exit_code}",
            metadata={
                "stdout": result.stdout,
                "stderr": result.stderr,
                "task": "match-promises",
                "year": year or "all",
                "mode": "realtime" if config.realtime else "batch",
            },
        )

    return {
        "status": "success",
        "task": "match-promises",
        "year": year or "all",
        "mode": "realtime" if config.realtime else "batch",
        "limit": config.limit,
        "exit_code": result.exit_code,
    }
