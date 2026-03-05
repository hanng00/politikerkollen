"""
ContainerExecutor Resource - Abstracts container execution.

Locally: Uses Docker SDK to execute containers on Docker network
Production: Uses ECS Tasks to execute containers in AWS

This allows assets to be environment-agnostic - same code works locally and in production.
"""

import os
import time
import uuid
from typing import Dict, List, Optional

import dagster as dg


class ExecutionResult:
    """Result of container execution."""

    def __init__(
        self,
        success: bool,
        exit_code: int,
        stdout: str = "",
        stderr: str = "",
        logs: List[str] = None,
    ):
        self.success = success
        self.exit_code = exit_code
        self.stdout = stdout
        self.stderr = stderr
        self.logs = logs or []


class ContainerExecutor(dg.ConfigurableResource):
    """Resource that abstracts container execution - Docker locally, ECS in production."""

    environment: str
    docker_network: str = "politikerkollen-network"
    docker_host: str = "unix:///var/run/docker.sock"
    # Use host network for Docker - can fix ConnectTimeout when bridge network blocks outbound
    use_host_network: bool = False
    ecs_cluster: Optional[str] = None
    ecs_task_definition: Optional[str] = None  # Deprecated: use task_definitions dict
    ecs_subnets: Optional[List[str]] = None
    ecs_security_groups: Optional[List[str]] = None
    # New: map image names to task definition ARNs
    ecs_task_definitions: Optional[Dict[str, str]] = None
    # Use Fargate Spot for cost savings (can be interrupted)
    use_fargate_spot: bool = True

    def execute(
        self,
        context,
        image: str,
        command: List[str],
        env_vars: Optional[Dict[str, str]] = None,
        name: Optional[str] = None,
        **kwargs,
    ) -> ExecutionResult:
        """
        Execute a container - abstracts local Docker vs production ECS.

        Args:
            context: Dagster resource context
            image: Container image name (e.g., "ingestion:latest")
            command: Command to run in container (e.g., ["run", "anforandelista"])
            env_vars: Environment variables to pass to container
            name: Optional container/task name
            **kwargs: Additional execution options

        Returns:
            ExecutionResult with success status, exit code, logs, etc.
        """
        env_vars = env_vars or {}

        # Detect environment if not explicitly set
        environment = self.environment
        if (
            environment == "local"
            and os.environ.get("DAGSTER_ENVIRONMENT") == "production"
        ):
            environment = "production"
        elif environment == "local" and os.environ.get("AWS_EXECUTION_ENV"):
            # Running in ECS/Lambda
            environment = "production"

        if environment == "local":
            return self._execute_docker(
                context, image, command, env_vars, name, **kwargs
            )
        else:
            return self._execute_ecs(context, image, command, env_vars, name, **kwargs)

    def _execute_docker(
        self,
        context,
        image: str,
        command: List[str],
        env_vars: Dict[str, str],
        name: Optional[str],
        **kwargs,
    ) -> ExecutionResult:
        """Execute container via Docker SDK (local development)."""
        try:
            import docker
        except ImportError:
            raise ImportError(
                "docker package required for local execution. Install with: pip install docker"
            )

        try:
            client = docker.from_env()

            run_kwargs = {
                "image": image,
                "command": command,
                "environment": env_vars,
                "detach": True,
                "name": f"{name}-{uuid.uuid4().hex[:8]}" if name else None,
                "mem_limit": kwargs.get("mem_limit", "2g"),
                "cpu_count": kwargs.get("cpu_count", 1),
                "stdout": True,
                "stderr": True,
            }

            if self.use_host_network:
                run_kwargs["network_mode"] = "host"
                context.log.info(
                    "Using host network mode (can fix ConnectTimeout to external APIs)"
                )
            else:
                try:
                    client.networks.get(self.docker_network)
                except docker.errors.NotFound:
                    context.log.info(f"Creating Docker network: {self.docker_network}")
                    client.networks.create(self.docker_network, driver="bridge")
                run_kwargs["network"] = self.docker_network

            context.log.info(f"Executing container: {image} with command: {command}")

            container = client.containers.run(**run_kwargs)

            # Wait for container to finish and get exit code
            exit_code = container.wait().get("StatusCode", 1)
            success = exit_code == 0

            # Get logs from container
            logs_bytes = container.logs(stdout=True, stderr=True)
            logs_text = logs_bytes.decode("utf-8") if logs_bytes else ""
            logs = logs_text.split("\n") if logs_text else []

            # Log output as a single block for readability in Dagster UI
            if logs_text.strip():
                context.log.info(f"Container output:\n{logs_text}")

            # Remove container after getting logs
            container.remove()

            if not success:
                context.log.error(f"Container exited with code {exit_code}")
                return ExecutionResult(
                    success=False,
                    exit_code=exit_code,
                    stdout=logs_text,
                    stderr="",
                    logs=logs,
                )

            context.log.info("Container execution succeeded")
            return ExecutionResult(
                success=True,
                exit_code=exit_code,
                stdout=logs_text,
                stderr="",
                logs=logs,
            )

        except docker.errors.ImageNotFound:
            raise dg.Failure(
                f"Container image not found: {image}. "
                f"Build it with: docker build -t {image} <path>",
                metadata={"image": image, "command": command},
            )
        except docker.errors.APIError as e:
            raise dg.Failure(
                f"Docker API error: {e}",
                metadata={"image": image, "command": command, "error": str(e)},
            )
        except Exception as e:
            raise dg.Failure(
                f"Failed to execute container: {e}",
                metadata={"image": image, "command": command, "error": str(e)},
            )

    def _execute_ecs(
        self,
        context,
        image: str,
        command: List[str],
        env_vars: Dict[str, str],
        name: Optional[str],
        **kwargs,
    ) -> ExecutionResult:
        """Execute container via ECS Task (production)."""
        try:
            import boto3
        except ImportError:
            raise ImportError(
                "boto3 required for production execution. Install with: pip install boto3"
            )

        if not self.ecs_cluster:
            raise ValueError("ecs_cluster must be set for production execution")
        if not self.ecs_subnets:
            raise ValueError("ecs_subnets must be set for production execution")

        # Resolve task definition from image name
        task_definition = self._resolve_task_definition(image)
        if not task_definition:
            raise ValueError(
                f"No task definition found for image: {image}. "
                f"Configure ecs_task_definitions mapping or ecs_task_definition."
            )

        ecs_client = boto3.client("ecs")
        logs_client = boto3.client("logs")

        context.log.info(f"Executing ECS task: {image} with command: {command}")
        context.log.info(f"Task definition: {task_definition}")

        # Convert env_vars to ECS format
        environment = [{"name": k, "value": v} for k, v in env_vars.items()]

        # Build capacity provider strategy for Fargate Spot
        capacity_provider_strategy = []
        if self.use_fargate_spot:
            capacity_provider_strategy = [
                {"capacityProvider": "FARGATE_SPOT", "weight": 1, "base": 0},
                {"capacityProvider": "FARGATE", "weight": 0, "base": 0},  # Fallback
            ]

        try:
            # Run ECS task
            run_task_kwargs = {
                "cluster": self.ecs_cluster,
                "taskDefinition": task_definition,
                "networkConfiguration": {
                    "awsvpcConfiguration": {
                        "subnets": self.ecs_subnets,
                        "securityGroups": self.ecs_security_groups or [],
                        "assignPublicIp": "ENABLED",
                    }
                },
                "overrides": {
                    "containerOverrides": [
                        {
                            "name": "container",  # Default container name
                            "command": command,
                            "environment": environment,
                        }
                    ]
                },
            }

            # Use capacity provider strategy for Spot, or launchType for on-demand
            if capacity_provider_strategy:
                run_task_kwargs["capacityProviderStrategy"] = capacity_provider_strategy
            else:
                run_task_kwargs["launchType"] = "FARGATE"

            response = ecs_client.run_task(**run_task_kwargs)

            task_arn = response["tasks"][0]["taskArn"]
            context.log.info(f"Started ECS task: {task_arn}")

            # Wait for task completion and stream logs
            return self._wait_for_ecs_task_completion(
                context, ecs_client, logs_client, self.ecs_cluster, task_arn
            )

        except Exception as e:
            raise dg.Failure(
                f"Failed to execute ECS task: {e}",
                metadata={"image": image, "command": command, "error": str(e)},
            )

    def _resolve_task_definition(self, image: str) -> Optional[str]:
        """Resolve task definition ARN from image name."""
        # Try the task definitions mapping first
        if self.ecs_task_definitions:
            # Try exact match
            if image in self.ecs_task_definitions:
                return self.ecs_task_definitions[image]
            # Try matching by image basename (e.g., "spatial/ingestion:latest" -> "ingestion")
            image_name = image.split("/")[-1].split(":")[0]
            if image_name in self.ecs_task_definitions:
                return self.ecs_task_definitions[image_name]
            # Try matching by family name pattern
            for key, task_def in self.ecs_task_definitions.items():
                if key in image or image_name in key:
                    return task_def

        # Fall back to legacy single task definition
        return self.ecs_task_definition

    def _wait_for_ecs_task_completion(
        self,
        context,
        ecs_client,
        logs_client,
        cluster: str,
        task_arn: str,
        poll_interval: int = 5,
        max_wait: int = 3600,
    ) -> ExecutionResult:
        """Wait for ECS task to complete and stream logs."""
        start_time = time.time()
        logs = []

        while time.time() - start_time < max_wait:
            # Get task status
            response = ecs_client.describe_tasks(cluster=cluster, tasks=[task_arn])
            task = response["tasks"][0]
            last_status = task["lastStatus"]
            desired_status = task.get("desiredStatus")

            # Get logs (if available)
            try:
                # Extract log group/stream from task definition
                # This is simplified - in practice, you'd get this from task definition
                log_group = f"/ecs/{self.ecs_task_definition}"
                log_stream = task_arn.split("/")[-1]

                log_response = logs_client.get_log_events(
                    logGroupName=log_group,
                    logStreamName=log_stream,
                )

                for event in log_response.get("events", []):
                    log_line = event["message"]
                    logs.append(log_line)
                    context.log.info(log_line)
            except Exception:
                # Logs might not be available yet
                pass

            if last_status == "STOPPED":
                # Task completed
                exit_code = task.get("containers", [{}])[0].get("exitCode", 0)
                success = exit_code == 0

                return ExecutionResult(
                    success=success,
                    exit_code=exit_code,
                    stdout="\n".join(logs),
                    stderr="",
                    logs=logs,
                )

            time.sleep(poll_interval)

        raise dg.Failure(
            f"ECS task did not complete within {max_wait} seconds",
            metadata={"task_arn": task_arn, "last_status": last_status},
        )
