"""
Dagster assets for cognition (LLM processing) that execute via ContainerExecutor.

Each asset represents an LLM-based data processing task that runs the cognition container.
Execution is abstracted via ContainerExecutor - works locally (Docker) and production (ECS).

Partitioned by election year for incremental processing and cost control.
"""

import dagster as dg
from dagster import AssetExecutionContext, AssetKey, StaticPartitionsDefinition

from orchestration_dagster.lib.container_executor import ContainerExecutor
from orchestration_dagster.lib.secrets_resource import SecretsResource

GROUP_NAME = "cognition"

# Election years for partitioning - Swedish elections are every 4 years
# Start with recent years, can expand backwards as needed
ELECTION_YEARS = ["2018", "2022", "2024"]
election_year_partitions = StaticPartitionsDefinition(ELECTION_YEARS)


def _get_partition_suffix(context: AssetExecutionContext) -> str:
    """Return a safe partition suffix for naming runs."""
    if context.has_partition_key:
        return context.partition_key
    return "all"


@dg.asset(
    key=AssetKey(["cognition", "valmanifest_promises"]),
    deps=[AssetKey(["raw_snd", "valmanifest"])],
    group_name=GROUP_NAME,
    partitions_def=election_year_partitions,
    description="Extract promises from party manifestos using LLM. Partitioned by election year.",
)
def valmanifest_promises(
    context: AssetExecutionContext,
    container_executor: ContainerExecutor,
    secrets_resource: SecretsResource,
):
    """Extract promises from valmanifest documents via ContainerExecutor.

    Uses the cognition container with OpenAI Agents SDK to extract
    structured promises from Swedish party programs and election manifestos.
    Partitioned by election year for incremental processing.
    """
    command = ["extract-promises"]
    
    if context.has_partition_key:
        year = context.partition_key
        command.extend(["--year", year])
        context.log.info(f"Processing manifestos for election year {year}")

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
                "year": context.partition_key if context.has_partition_key else "all",
            },
        )

    return {
        "status": "success",
        "task": "extract-promises",
        "year": context.partition_key if context.has_partition_key else "all",
        "exit_code": result.exit_code,
    }


@dg.asset(
    key=AssetKey(["cognition", "promise_embeddings"]),
    deps=[AssetKey(["cognition", "valmanifest_promises"])],
    group_name=GROUP_NAME,
    partitions_def=election_year_partitions,
    description="Generate embeddings for extracted promises using text-embedding-3-small. Partitioned by election year.",
)
def promise_embeddings(
    context: AssetExecutionContext,
    container_executor: ContainerExecutor,
    secrets_resource: SecretsResource,
):
    """Generate embeddings for promises via ContainerExecutor.

    Uses OpenAI text-embedding-3-small to create vector embeddings
    for semantic matching between promises and votes.
    Partitioned by election year for incremental processing.
    """
    command = ["embed-promises"]
    
    if context.has_partition_key:
        year = context.partition_key
        command.extend(["--year", year])
        context.log.info(f"Embedding promises for election year {year}")

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
                "year": context.partition_key if context.has_partition_key else "all",
            },
        )

    return {
        "status": "success",
        "task": "embed-promises",
        "year": context.partition_key if context.has_partition_key else "all",
        "exit_code": result.exit_code,
    }


@dg.asset(
    key=AssetKey(["cognition", "vote_embeddings"]),
    deps=[AssetKey(["raw_riksdagen", "dokumentstatus"])],
    group_name=GROUP_NAME,
    partitions_def=election_year_partitions,
    description="Generate embeddings for vote proposals using text-embedding-3-small. Partitioned by election year.",
)
def vote_embeddings(
    context: AssetExecutionContext,
    container_executor: ContainerExecutor,
    secrets_resource: SecretsResource,
):
    """Generate embeddings for vote proposals via ContainerExecutor.

    Uses OpenAI text-embedding-3-small to create vector embeddings
    for semantic matching between promises and votes.
    Partitioned by election year (riksmöte) for incremental processing.
    """
    command = ["embed-votes"]
    
    if context.has_partition_key:
        year = context.partition_key
        command.extend(["--year", year])
        context.log.info(f"Embedding votes for riksmöte starting {year}")

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
        name=f"embed_votes_{_get_partition_suffix(context)}",
    )

    if not result.success:
        raise dg.Failure(
            f"Vote embedding failed with exit code {result.exit_code}",
            metadata={
                "stdout": result.stdout,
                "stderr": result.stderr,
                "task": "embed-votes",
                "year": context.partition_key if context.has_partition_key else "all",
            },
        )

    return {
        "status": "success",
        "task": "embed-votes",
        "year": context.partition_key if context.has_partition_key else "all",
        "exit_code": result.exit_code,
    }


@dg.asset(
    key=AssetKey(["cognition", "promise_vote_matches"]),
    deps=[
        AssetKey(["cognition", "promise_embeddings"]),
        AssetKey(["cognition", "vote_embeddings"]),
    ],
    group_name=GROUP_NAME,
    partitions_def=election_year_partitions,
    description="Match promises to votes using vector similarity search. Partitioned by election year.",
)
def promise_vote_matches(
    context: AssetExecutionContext,
    container_executor: ContainerExecutor,
    secrets_resource: SecretsResource,
):
    """Match promises to votes via ContainerExecutor.

    Uses DuckDB's array_cosine_similarity to find semantically similar
    promise-vote pairs. Partitioned by election year - matches promises
    from that year's manifestos to votes in the following riksmöte.
    """
    command = ["match-promises"]
    
    if context.has_partition_key:
        year = context.partition_key
        command.extend(["--year", year])
        context.log.info(f"Matching promises to votes for election year {year}")

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
                "year": context.partition_key if context.has_partition_key else "all",
            },
        )

    return {
        "status": "success",
        "task": "match-promises",
        "year": context.partition_key if context.has_partition_key else "all",
        "exit_code": result.exit_code,
    }
