"""
Resource for executing dbt commands via Docker containers.

This resource wraps dbt execution to use Docker containers instead of direct CLI.
It can be used with DbtProjectComponent-created assets to customize execution.
"""
import os
import subprocess
from typing import Optional

import dagster as dg


class DbtDockerResource(dg.ConfigurableResource):
    """Resource for executing dbt via Docker containers."""

    container_image: str = dg.Field(
        default="transformations_dbt:latest",
        description="Docker image name for dbt container",
    )
    
    docker_command_prefix: str = dg.Field(
        default="docker run --rm",
        description="Docker command prefix (can include volume mounts, network, etc.)",
    )
    
    motherduck_token_env_var: str = dg.Field(
        default="MOTHERDUCK_ACCESS_TOKEN",
        description="Environment variable name for MotherDuck token",
    )

    def execute_dbt_command(
        self, context: dg.ResourceContext, dbt_command: str, selector: Optional[str] = None
    ) -> dict:
        """Execute a dbt command via Docker container.
        
        Args:
            context: Dagster resource context
            dbt_command: dbt command (e.g., "run", "build", "test")
            selector: Optional dbt selector (e.g., "stg.*", "mart.politician360")
        
        Returns:
            dict with status and output
        """
        # Get MotherDuck token from environment
        token = os.environ.get(self.motherduck_token_env_var, "")
        if not token:
            raise ValueError(f"Environment variable {self.motherduck_token_env_var} not set")
        
        # Build docker command
        docker_cmd_parts = [
            self.docker_command_prefix,
            f"-e {self.motherduck_token_env_var}={token}",
            self.container_image,
            dbt_command,
        ]
        
        if selector:
            docker_cmd_parts.extend(["--select", selector])
        
        docker_cmd = " ".join(docker_cmd_parts)
        
        context.log.info(f"Executing dbt via Docker: {docker_cmd}")
        
        # Execute docker command
        result = subprocess.run(
            docker_cmd,
            shell=True,
            capture_output=True,
            text=True,
        )
        
        if result.returncode != 0:
            context.log.error(f"dbt execution failed:\nSTDOUT: {result.stdout}\nSTDERR: {result.stderr}")
            raise dg.Failure(
                f"dbt execution failed with exit code {result.returncode}",
                metadata={
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "command": docker_cmd,
                },
            )
        
        context.log.info(f"dbt execution succeeded:\n{result.stdout}")
        return {
            "status": "success",
            "stdout": result.stdout,
            "stderr": result.stderr,
            "command": docker_cmd,
        }

