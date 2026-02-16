"""
SecretsResource - Environment-aware secrets management.

Local/Dev: Uses EnvVar to read from environment variables (can be loaded from .env)
Production: Can optionally fetch from AWS Secrets Manager

Follows the same environment detection pattern as ContainerExecutor.
"""
import json
import os
from typing import Optional

import dagster as dg


class SecretsResource(dg.ConfigurableResource):
    """Environment-aware secrets resource.
    
    Automatically detects environment and loads secrets from appropriate source:
    - Local/Dev: Reads from environment variables (via EnvVar)
    - Production: Can use AWS Secrets Manager if configured
    
    Usage:
        # In resources.py:
        secrets_resource = SecretsResource(
            motherduck_access_token=dg.EnvVar("MOTHERDUCK_ACCESS_TOKEN"),
            database_name=dg.EnvVar("DATABASE_NAME", default="spatial_dagster"),
            use_secrets_manager=False,  # Set to True in production
            secrets_manager_secret_name="spatial/secrets",  # If using Secrets Manager
        )
    """
    
    # Secrets - use EnvVar for local/dev
    motherduck_access_token: Optional[str] = None
    database_name: str = "spatial_dagster"
    
    # AWS Secrets Manager configuration (for production)
    use_secrets_manager: bool = False
    secrets_manager_secret_name: Optional[str] = None
    secrets_manager_region: str = "us-east-1"
    
    def __init__(self, **data):
        """Initialize secrets resource with environment-aware loading."""
        use_secrets_manager = data.get("use_secrets_manager", False)
        
        # If using secrets manager and in production, load from AWS
        if use_secrets_manager:
            environment = self._detect_environment()
            if environment == "production":
                # Load secrets from AWS Secrets Manager
                secrets = self._load_from_secrets_manager(
                    secret_name=data.get("secrets_manager_secret_name"),
                    region=data.get("secrets_manager_region", "us-east-1"),
                )
                # Merge secrets into data (overrides any existing values)
                data.update(secrets)
        
        super().__init__(**data)
        
        # Validate required secrets after initialization
        if not self.motherduck_access_token:
            if use_secrets_manager:
                raise ValueError(
                    "Failed to load motherduck_access_token from AWS Secrets Manager. "
                    "Check that the secret exists and contains MOTHERDUCK_ACCESS_TOKEN."
                )
            else:
                raise ValueError(
                    "motherduck_access_token is required. "
                    "Set MOTHERDUCK_ACCESS_TOKEN environment variable or use Secrets Manager."
                )
    
    def _detect_environment(self) -> str:
        """Detect environment - same pattern as ContainerExecutor."""
        if os.environ.get("DAGSTER_ENVIRONMENT") == "production":
            return "production"
        if os.environ.get("AWS_EXECUTION_ENV"):
            return "production"
        return "local"
    
    def _load_from_secrets_manager(
        self, secret_name: Optional[str], region: str
    ) -> dict:
        """Load secrets from AWS Secrets Manager.
        
        Expected secret format in AWS Secrets Manager:
        {
            "MOTHERDUCK_ACCESS_TOKEN": "token_value",
            "DATABASE_NAME": "database_name"
        }
        """
        if not secret_name:
            raise ValueError(
                "secrets_manager_secret_name is required when use_secrets_manager=True"
            )
        
        try:
            import boto3
        except ImportError:
            raise ImportError(
                "boto3 is required for AWS Secrets Manager. Install with: pip install boto3"
            )
        
        try:
            client = boto3.client("secretsmanager", region_name=region)
            response = client.get_secret_value(SecretId=secret_name)
            
            # Parse secret (can be JSON string or plain string)
            secret_string = response["SecretString"]
            try:
                secrets = json.loads(secret_string)
            except json.JSONDecodeError:
                # If not JSON, treat as plain string (single secret)
                secrets = {"MOTHERDUCK_ACCESS_TOKEN": secret_string}
            
            # Map to resource fields
            result = {}
            if "MOTHERDUCK_ACCESS_TOKEN" in secrets:
                result["motherduck_access_token"] = secrets["MOTHERDUCK_ACCESS_TOKEN"]
            if "DATABASE_NAME" in secrets:
                result["database_name"] = secrets["DATABASE_NAME"]
            
            return result
            
        except Exception as e:
            raise ValueError(
                f"Failed to load secrets from AWS Secrets Manager ({secret_name}): {str(e)}"
            ) from e
    
    def get_motherduck_token(self) -> str:
        """Get MotherDuck access token."""
        return self.motherduck_access_token
    
    def get_database_name(self) -> str:
        """Get database name."""
        return self.database_name

