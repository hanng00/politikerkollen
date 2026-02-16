"""
Dagster resources configuration.

Resources are environment-aware - automatically use Docker locally, ECS in production.
"""
import os

import dagster as dg

from orchestration_dagster.lib.container_executor import ContainerExecutor


def get_container_executor() -> ContainerExecutor:
    """Get ContainerExecutor configured for current environment."""
    environment = os.environ.get("DAGSTER_ENVIRONMENT", "local")
    
    # Auto-detect production if running in AWS
    if os.environ.get("AWS_EXECUTION_ENV"):
        environment = "production"
    
    if environment == "production":
        return ContainerExecutor(
            environment="production",
            ecs_cluster=os.environ.get("ECS_CLUSTER", ""),
            ecs_task_definition=os.environ.get("ECS_TASK_DEFINITION", ""),
            ecs_subnets=os.environ.get("ECS_SUBNETS", "").split(",") if os.environ.get("ECS_SUBNETS") else [],
            ecs_security_groups=os.environ.get("ECS_SECURITY_GROUPS", "").split(",") if os.environ.get("ECS_SECURITY_GROUPS") else [],
        )
    else:
        return ContainerExecutor(
            environment="local",
            docker_network=os.environ.get("DOCKER_NETWORK", "spatial-network"),
        )

