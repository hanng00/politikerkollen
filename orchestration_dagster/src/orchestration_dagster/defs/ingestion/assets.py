"""
Dagster assets for ingestion (DLT) that execute via ContainerExecutor.

Each asset represents a raw data ingestion task that runs the ingestion container.
Execution is abstracted via ContainerExecutor - works locally (Docker) and production (ECS).
"""
from datetime import datetime, timedelta
from typing import Dict, List, Tuple

import dagster as dg
from dagster import AssetExecutionContext, AssetKey, MonthlyPartitionsDefinition

from orchestration_dagster.lib.container_executor import ContainerExecutor
from orchestration_dagster.lib.secrets_resource import SecretsResource

GROUP_NAME = "raw_riksdagen"
# Monthly partitions for efficient batching (1 container per month vs 30+ with daily)
# end_offset=1 includes the current incomplete month so we can ingest recent data
month_partition = MonthlyPartitionsDefinition(start_date="1990-01-01", end_offset=1)


def _get_partition_suffix(context: AssetExecutionContext) -> str:
    """Return a safe partition suffix for naming runs."""
    if getattr(context, "has_partition_key", False):
        return context.partition_key
    return "latest"


def _build_ingestion_command(
    resource_name: str,
    context: AssetExecutionContext,
    secrets_resource: SecretsResource,
    database_name: str = None,
) -> Tuple[List[str], Dict[str, str]]:
    """Build command and env vars for ingestion container.
    
    Args:
        resource_name: Name of the ingestion resource (e.g., "anforandelista")
        context: Dagster asset execution context
        secrets_resource: SecretsResource instance for accessing secrets
        database_name: Optional database name override
    """
    database_name = database_name or secrets_resource.get_database_name()
    
    # Get partition date range if partitioned
    start_date = None
    end_date = None
    
    # Check if we have a partition with a time window (daily, weekly, monthly partitions)
    # partition_time_window is available on AssetExecutionContext when using time-based partitions
    if context.has_partition_key:
        partition_time_window = getattr(context, "partition_time_window", None)
        if partition_time_window:
            # Use the time window directly - end is exclusive, so subtract 1 day for inclusive end
            start_date = partition_time_window.start.date().strftime("%Y-%m-%d")
            end_date = (partition_time_window.end - timedelta(days=1)).date().strftime("%Y-%m-%d")
        else:
            # Fallback for non-time-window partitions (shouldn't happen with our partition defs)
            partition_date = datetime.strptime(context.partition_key, "%Y-%m-%d").date()
            start_date = partition_date.strftime("%Y-%m-%d")
            end_date = partition_date.strftime("%Y-%m-%d")
    
    # Build command
    command = ["run", resource_name]
    if start_date:
        command.extend(["--start-date", start_date])
    if end_date:
        command.extend(["--end-date", end_date])
    if database_name:
        command.extend(["--database", database_name])
    
    # Build environment variables from secrets resource
    env_vars = {
        "MOTHERDUCK_ACCESS_TOKEN": secrets_resource.get_motherduck_token(),
        "DATABASE_NAME": database_name,
    }
    
    return command, env_vars


# Create assets for each ingestion resource

# DEPRECATED: anforandelista is redundant - anforande fetches the same data with full text.
# The anforande resource uses anforandelista as a parent (selected=False) internally,
# so we don't need to ingest anforandelista separately. stg_anforandelista has zero
# downstream consumers. Keeping commented for reference.
#
# @dg.asset(
#     key=AssetKey(["raw_riksdagen", "anforandelista"]),
#     group_name=GROUP_NAME,
#     partitions_def=month_partition,
#     description="Ingest anforandelista (speeches) data from Riksdagen API. Monthly partitions for efficient batching.",
# )
# def anforandelista(
#     context: AssetExecutionContext,
#     container_executor: ContainerExecutor,
#     secrets_resource: SecretsResource,
# ):
#     """Ingest anforandelista data via ContainerExecutor."""
#     command, env_vars = _build_ingestion_command("anforandelista", context, secrets_resource)
#
#     result = container_executor.execute(
#         context=context,
#         image="politikerkollen/ingestion:latest",
#         command=command,
#         env_vars=env_vars,
#         name=f"ingest_anforandelista_{_get_partition_suffix(context)}",
#     )
#
#     if not result.success:
#         raise dg.Failure(
#             f"Ingestion failed with exit code {result.exit_code}",
#             metadata={
#                 "stdout": result.stdout,
#                 "stderr": result.stderr,
#                 "resource": "anforandelista",
#             },
#         )
#
#     return {
#         "status": "success",
#         "resource": "anforandelista",
#         "exit_code": result.exit_code,
#     }


@dg.asset(
    key=AssetKey(["raw_riksdagen", "anforande"]),
    group_name=GROUP_NAME,
    partitions_def=month_partition,
    description="Ingest anforande (full speech text) data from Riksdagen API. Monthly partitions for efficient batching.",
)
def anforande(
    context: AssetExecutionContext,
    container_executor: ContainerExecutor,
    secrets_resource: SecretsResource,
):
    """Ingest anforande data via ContainerExecutor.

    This is a child resource of anforandelista - it fetches full speech text
    for each speech from the list. Uses monthly partitions to batch API requests
    efficiently (1 container per month vs 30+ per month with daily partitions).
    """
    command, env_vars = _build_ingestion_command("anforande", context, secrets_resource)

    result = container_executor.execute(
        context=context,
        image="politikerkollen/ingestion:latest",
        command=command,
        env_vars=env_vars,
        name=f"ingest_anforande_{_get_partition_suffix(context)}",
    )

    if not result.success:
        raise dg.Failure(
            f"Ingestion failed with exit code {result.exit_code}",
            metadata={
                "stdout": result.stdout,
                "stderr": result.stderr,
                "resource": "anforande",
            },
        )

    return {
        "status": "success",
        "resource": "anforande",
        "exit_code": result.exit_code,
    }


@dg.asset(
    key=AssetKey(["raw_riksdagen", "dokumentlista"]),
    group_name=GROUP_NAME,
    partitions_def=month_partition,
    description="Ingest dokumentlista (documents) data from Riksdagen API. Monthly partitions for efficient batching.",
)
def dokumentlista(
    context: AssetExecutionContext,
    container_executor: ContainerExecutor,
    secrets_resource: SecretsResource,
):
    """Ingest dokumentlista data via ContainerExecutor."""
    command, env_vars = _build_ingestion_command("dokumentlista", context, secrets_resource)
    
    result = container_executor.execute(
        context=context,
        image="politikerkollen/ingestion:latest",
        command=command,
        env_vars=env_vars,
        name=f"ingest_dokumentlista_{_get_partition_suffix(context)}",
    )
    
    if not result.success:
        raise dg.Failure(
            f"Ingestion failed with exit code {result.exit_code}",
            metadata={
                "stdout": result.stdout,
                "stderr": result.stderr,
                "resource": "dokumentlista",
            },
        )
    
    return {
        "status": "success",
        "resource": "dokumentlista",
        "exit_code": result.exit_code,
    }


@dg.asset(
    key=AssetKey(["raw_riksdagen", "personlista"]),
    group_name=GROUP_NAME,
    description="Ingest personlista (members of parliament) data from Riksdagen API",
)
def personlista(
    context: AssetExecutionContext,
    container_executor: ContainerExecutor,
    secrets_resource: SecretsResource,
):
    """Ingest personlista data (not partitioned - full refresh) via ContainerExecutor."""
    command, env_vars = _build_ingestion_command("personlista", context, secrets_resource)
    
    result = container_executor.execute(
        context=context,
        image="politikerkollen/ingestion:latest",
        command=command,
        env_vars=env_vars,
        name="ingest_personlista",
    )
    
    if not result.success:
        raise dg.Failure(
            f"Ingestion failed with exit code {result.exit_code}",
            metadata={
                "stdout": result.stdout,
                "stderr": result.stderr,
                "resource": "personlista",
            },
        )
    
    return {
        "status": "success",
        "resource": "personlista",
        "exit_code": result.exit_code,
    }


@dg.asset(
    key=AssetKey(["raw_riksdagen", "voteringlista"]),
    group_name=GROUP_NAME,
    partitions_def=month_partition,
    description="Ingest voteringlista (voting records) data from Riksdagen API. Monthly partitions for efficient batching.",
)
def voteringlista(
    context: AssetExecutionContext,
    container_executor: ContainerExecutor,
    secrets_resource: SecretsResource,
):
    """Ingest voteringlista data via ContainerExecutor."""
    command, env_vars = _build_ingestion_command("voteringlista", context, secrets_resource)
    
    result = container_executor.execute(
        context=context,
        image="politikerkollen/ingestion:latest",
        command=command,
        env_vars=env_vars,
        name=f"ingest_voteringlista_{_get_partition_suffix(context)}",
    )
    
    if not result.success:
        raise dg.Failure(
            f"Ingestion failed with exit code {result.exit_code}",
            metadata={
                "stdout": result.stdout,
                "stderr": result.stderr,
                "resource": "voteringlista",
            },
        )
    
    return {
        "status": "success",
        "resource": "voteringlista",
        "exit_code": result.exit_code,
    }


@dg.asset(
    key=AssetKey(["raw_riksdagen", "dokumentstatus"]),
    group_name=GROUP_NAME,
    partitions_def=month_partition,
    description="Ingest dokumentstatus (detailed document history) data from Riksdagen API. Monthly partitions for efficient batching.",
)
def dokumentstatus(
    context: AssetExecutionContext,
    container_executor: ContainerExecutor,
    secrets_resource: SecretsResource,
):
    """Ingest dokumentstatus data via ContainerExecutor.
    
    This is a child resource of dokumentlista - it fetches detailed status
    for each document including full history, activities, proposals, and decisions.
    """
    command, env_vars = _build_ingestion_command("dokumentstatus", context, secrets_resource)
    
    result = container_executor.execute(
        context=context,
        image="politikerkollen/ingestion:latest",
        command=command,
        env_vars=env_vars,
        name=f"ingest_dokumentstatus_{_get_partition_suffix(context)}",
    )
    
    if not result.success:
        raise dg.Failure(
            f"Ingestion failed with exit code {result.exit_code}",
            metadata={
                "stdout": result.stdout,
                "stderr": result.stderr,
                "resource": "dokumentstatus",
            },
        )
    
    return {
        "status": "success",
        "resource": "dokumentstatus",
        "exit_code": result.exit_code,
    }

