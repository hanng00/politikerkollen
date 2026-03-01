"""
Dagster resources configuration.

Resources are environment-aware - automatically use Docker locally, ECS in production.
"""

import os

import dagster as dg

from orchestration_dagster.lib.container_executor import ContainerExecutor
from orchestration_dagster.lib.secrets_resource import SecretsResource


def get_container_executor() -> ContainerExecutor:
    """Get ContainerExecutor configured for current environment."""
    environment = os.environ.get("DAGSTER_ENVIRONMENT", "local")

    # Auto-detect production if running in AWS
    if os.environ.get("AWS_EXECUTION_ENV"):
        environment = "production"

    if environment == "production":
        # Build task definitions mapping from environment variables
        # Supports both:
        # 1. Individual vars: INGESTION_TASK_DEFINITION, DBT_TASK_DEFINITION
        # 2. Combined format: ECS_TASK_DEFINITIONS="ingestion=arn:...,dbt=arn:..."
        task_definitions = {}

        # Check for individual task definition env vars (from SAM template)
        if os.environ.get("INGESTION_TASK_DEFINITION"):
            task_definitions["ingestion"] = os.environ["INGESTION_TASK_DEFINITION"]
            # Also map the full image name used in assets.py
            task_definitions["politikerkollen/ingestion:latest"] = os.environ[
                "INGESTION_TASK_DEFINITION"
            ]

        if os.environ.get("DBT_TASK_DEFINITION"):
            task_definitions["dbt"] = os.environ["DBT_TASK_DEFINITION"]
            task_definitions["transformations_dbt"] = os.environ["DBT_TASK_DEFINITION"]
            task_definitions["politikerkollen/transformations_dbt:latest"] = os.environ[
                "DBT_TASK_DEFINITION"
            ]

        # Also parse combined format if provided
        task_defs_str = os.environ.get("ECS_TASK_DEFINITIONS", "")
        if task_defs_str:
            for pair in task_defs_str.split(","):
                if "=" in pair:
                    key, value = pair.split("=", 1)
                    task_definitions[key.strip()] = value.strip()

        return ContainerExecutor(
            environment="production",
            ecs_cluster=os.environ.get("ECS_CLUSTER", ""),
            ecs_task_definition=os.environ.get(
                "ECS_TASK_DEFINITION", ""
            ),  # Legacy fallback
            ecs_task_definitions=task_definitions if task_definitions else None,
            ecs_subnets=os.environ.get("ECS_SUBNETS", "").split(",")
            if os.environ.get("ECS_SUBNETS")
            else [],
            ecs_security_groups=os.environ.get("ECS_SECURITY_GROUPS", "").split(",")
            if os.environ.get("ECS_SECURITY_GROUPS")
            else [],
            use_fargate_spot=os.environ.get("USE_FARGATE_SPOT", "true").lower()
            == "true",
        )
    else:
        return ContainerExecutor(
            environment="local",
            docker_network=os.environ.get("DOCKER_NETWORK", "politikerkollen-network"),
            docker_host="unix:///var/run/docker.sock",
        )


def get_secrets_resource() -> SecretsResource:
    """Get SecretsResource configured for current environment.

    Local/Dev: Uses EnvVar to read from environment variables (can be loaded from .env)
    Production: Can use AWS Secrets Manager if USE_SECRETS_MANAGER=true
    """
    environment = os.environ.get("DAGSTER_ENVIRONMENT", "local")

    # Auto-detect production if running in AWS
    if os.environ.get("AWS_EXECUTION_ENV"):
        environment = "production"

    # Check if Secrets Manager should be used
    use_secrets_manager = (
        environment == "production"
        and os.environ.get("USE_SECRETS_MANAGER", "").lower() == "true"
    )

    if use_secrets_manager:
        # Production with AWS Secrets Manager
        return SecretsResource(
            motherduck_access_token=None,  # Will be loaded from Secrets Manager in __init__
            openai_api_key=None,  # Will be loaded from Secrets Manager in __init__
            database_name=os.environ.get("DATABASE_NAME", "spatial_dagster"),
            use_secrets_manager=True,
            secrets_manager_secret_name=os.environ.get(
                "SECRETS_MANAGER_SECRET_NAME", "spatial/secrets"
            ),
            secrets_manager_region=os.environ.get("AWS_REGION", "us-east-1"),
        )
    else:
        # Local/dev: use EnvVar (can be loaded from .env file)
        # For optional values with defaults, use os.environ.get() directly
        # OpenAI API key is optional - only required for cognition tasks
        openai_key = os.environ.get("OPENAI_API_KEY")
        return SecretsResource(
            motherduck_access_token=dg.EnvVar("MOTHERDUCK_ACCESS_TOKEN"),
            openai_api_key=openai_key,
            database_name=os.environ.get("DATABASE_NAME", "spatial_dagster"),
            use_secrets_manager=False,
        )
