"""
Dagster assets for cognition (LLM processing) that execute via ContainerExecutor.

Each asset represents an LLM-based data processing task that runs the cognition container.
Execution is abstracted via ContainerExecutor - works locally (Docker) and production (ECS).
"""

import dagster as dg
from dagster import AssetExecutionContext, AssetKey

from orchestration_dagster.lib.container_executor import ContainerExecutor
from orchestration_dagster.lib.secrets_resource import SecretsResource

GROUP_NAME = "cognition"


@dg.asset(
    key=AssetKey(["cognition", "valmanifest_promises"]),
    deps=[AssetKey(["raw_snd", "valmanifest"])],
    group_name=GROUP_NAME,
    description="Extract promises from party manifestos using LLM. Processes unprocessed documents incrementally.",
)
def valmanifest_promises(
    context: AssetExecutionContext,
    container_executor: ContainerExecutor,
    secrets_resource: SecretsResource,
):
    """Extract promises from valmanifest documents via ContainerExecutor.

    Uses the cognition container with OpenAI Agents SDK to extract
    structured promises from Swedish party programs and election manifestos.
    Processes only documents that haven't been extracted yet (incremental).
    """
    command = ["extract-promises"]
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
        name="extract_valmanifest_promises",
    )

    if not result.success:
        raise dg.Failure(
            f"Promise extraction failed with exit code {result.exit_code}",
            metadata={
                "stdout": result.stdout,
                "stderr": result.stderr,
                "task": "extract-promises",
            },
        )

    return {
        "status": "success",
        "task": "extract-promises",
        "exit_code": result.exit_code,
    }


@dg.asset(
    key=AssetKey(["cognition", "promise_embeddings"]),
    deps=[AssetKey(["cognition", "valmanifest_promises"])],
    group_name=GROUP_NAME,
    description="Generate embeddings for extracted promises using text-embedding-3-small.",
)
def promise_embeddings(
    context: AssetExecutionContext,
    container_executor: ContainerExecutor,
    secrets_resource: SecretsResource,
):
    """Generate embeddings for promises via ContainerExecutor.

    Uses OpenAI text-embedding-3-small to create vector embeddings
    for semantic matching between promises and votes.
    Processes only promises that haven't been embedded yet (incremental).
    """
    command = ["embed-promises"]
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
        name="embed_promises",
    )

    if not result.success:
        raise dg.Failure(
            f"Promise embedding failed with exit code {result.exit_code}",
            metadata={
                "stdout": result.stdout,
                "stderr": result.stderr,
                "task": "embed-promises",
            },
        )

    return {
        "status": "success",
        "task": "embed-promises",
        "exit_code": result.exit_code,
    }


@dg.asset(
    key=AssetKey(["cognition", "vote_embeddings"]),
    deps=[AssetKey(["raw_riksdagen", "dokumentstatus"])],
    group_name=GROUP_NAME,
    description="Generate embeddings for vote proposals using text-embedding-3-small.",
)
def vote_embeddings(
    context: AssetExecutionContext,
    container_executor: ContainerExecutor,
    secrets_resource: SecretsResource,
):
    """Generate embeddings for vote proposals via ContainerExecutor.

    Uses OpenAI text-embedding-3-small to create vector embeddings
    for semantic matching between promises and votes.
    Processes only votes that haven't been embedded yet (incremental).
    """
    command = ["embed-votes"]
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
        name="embed_votes",
    )

    if not result.success:
        raise dg.Failure(
            f"Vote embedding failed with exit code {result.exit_code}",
            metadata={
                "stdout": result.stdout,
                "stderr": result.stderr,
                "task": "embed-votes",
            },
        )

    return {
        "status": "success",
        "task": "embed-votes",
        "exit_code": result.exit_code,
    }


@dg.asset(
    key=AssetKey(["cognition", "promise_vote_matches"]),
    deps=[
        AssetKey(["cognition", "promise_embeddings"]),
        AssetKey(["cognition", "vote_embeddings"]),
    ],
    group_name=GROUP_NAME,
    description="Match promises to votes using vector similarity search.",
)
def promise_vote_matches(
    context: AssetExecutionContext,
    container_executor: ContainerExecutor,
    secrets_resource: SecretsResource,
):
    """Match promises to votes via ContainerExecutor.

    Uses DuckDB's array_cosine_similarity to find semantically similar
    promise-vote pairs. Clears existing matches and recomputes.
    """
    command = ["match-promises", "--clear"]
    env_vars = {
        "MOTHERDUCK_ACCESS_TOKEN": secrets_resource.get_motherduck_token(),
        "DATABASE_NAME": secrets_resource.get_database_name(),
    }

    result = container_executor.execute(
        context=context,
        image="politikerkollen/cognition:latest",
        command=command,
        env_vars=env_vars,
        name="match_promises",
    )

    if not result.success:
        raise dg.Failure(
            f"Promise matching failed with exit code {result.exit_code}",
            metadata={
                "stdout": result.stdout,
                "stderr": result.stderr,
                "task": "match-promises",
            },
        )

    return {
        "status": "success",
        "task": "match-promises",
        "exit_code": result.exit_code,
    }
