"""
Dagster assets for cognition (LLM processing) that execute via ContainerExecutor.

Each asset represents an LLM-based data processing task that runs the cognition container.
Execution is abstracted via ContainerExecutor - works locally (Docker) and production (ECS).

Partitioning:
- Promises: partitioned by election year (2018, 2022, 2026, ...)
- Sources: partitioned by riksmöte year (2018, 2019, 2020, ...) - embeds motions/propositions
- Matches: partitioned by election year (matches promises to sources in the 4-year mandate period)

Run Configuration:
- LLM assets support `realtime` mode via the Dagster UI launchpad
- Default is batch mode (50% cost savings, up to 24h)
- Use realtime for testing small batches with immediate results
"""

import dagster as dg
from dagster import AssetExecutionContext, AssetKey, Config, TimeWindowPartitionsDefinition

from orchestration_dagster.lib.container_executor import ContainerExecutor
from orchestration_dagster.lib.secrets_resource import SecretsResource

GROUP_NAME = "cognition"

# Yearly partitions starting from 2018
# end_offset=1 includes the current year
yearly_partitions = TimeWindowPartitionsDefinition(
    start="2018-01-01",
    cron_schedule="0 0 1 1 *",  # Yearly: at midnight on January 1st
    fmt="%Y-%m-%d",
    end_offset=1,
)


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
    """Extract year from partition key (format: YYYY-MM-DD -> YYYY)."""
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
    partitions_def=yearly_partitions,
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
    partitions_def=yearly_partitions,
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
# SOURCE EMBEDDINGS
# =============================================================================

@dg.asset(
    key=cognition_asset_key("source_embeddings"),
    deps=[
        dbt_asset_key("int_document_content"),
        dbt_asset_key("stg_dokumentstatus_intressent"),
    ],
    group_name=GROUP_NAME,
    partitions_def=yearly_partitions,
    description="Generate embeddings for source documents (motions/propositions). Reads from int_document_content (pre-filtered HTML) and parses with BeautifulSoup. Partitioned by riksmöte year.",
)
def source_embeddings(
    context: AssetExecutionContext,
    config: LLMConfig,
    container_executor: ContainerExecutor,
    secrets_resource: SecretsResource,
):
    """Generate embeddings for source documents via ContainerExecutor.
    
    Configure `realtime` in the launchpad:
    - False (default): Batch API - 50% cheaper, async
    - True: Real-time API - immediate results
    """
    command = ["embed-sources"]

    riksmote_year = _get_year_from_partition(context)
    if riksmote_year:
        command.extend(["--riksmote-year", riksmote_year])
        context.log.info(
            f"Embedding sources for riksmöte {riksmote_year}/{int(riksmote_year) + 1 - 2000}"
        )

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
                "mode": "realtime" if config.realtime else "batch",
            },
        )

    return {
        "status": "success",
        "task": "embed-sources",
        "riksmote_year": riksmote_year or "all",
        "mode": "realtime" if config.realtime else "batch",
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
        cognition_asset_key("valmanifest_promises"),
    ],
    group_name=GROUP_NAME,
    partitions_def=yearly_partitions,
    description="Match promises to source documents using vector similarity. Partitioned by election year.",
)
def promise_vote_matches(
    context: AssetExecutionContext,
    container_executor: ContainerExecutor,
    secrets_resource: SecretsResource,
):
    """Match promises to source documents via ContainerExecutor.
    
    Note: This asset does not use LLM - it's pure vector similarity matching.
    No realtime/batch config needed.
    """
    command = ["match-promises"]

    year = _get_year_from_partition(context)
    if year:
        command.extend(["--year", year])
        context.log.info(f"Matching promises to sources for election year {year}")

    env_vars = {
        "MOTHERDUCK_ACCESS_TOKEN": secrets_resource.get_motherduck_token(),
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
            },
        )

    return {
        "status": "success",
        "task": "match-promises",
        "year": year or "all",
        "exit_code": result.exit_code,
    }
