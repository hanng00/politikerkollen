"""Configuration and environment utilities."""

import logging
import sys
from pathlib import Path

import dotenv

# Single source of truth for schema name
# Used in: MotherDuck tables, Dagster asset keys
SCHEMA = "cognition"

# Source table for valmanifest - read from dbt staging layer
VALMANIFEST_SOURCE = "main_stg.stg_valmanifest"


def get_root_path() -> Path:
    """Get the root path of the cognition module."""
    return Path(__file__).parent.parent.parent.parent


def load_env() -> None:
    """Load environment variables from .env file."""
    dotenv.load_dotenv(get_root_path() / ".env")


def setup_logging(verbose: bool = False) -> logging.Logger:
    """Configure logging for the CLI."""
    level = logging.DEBUG if verbose else logging.INFO

    logging.basicConfig(
        level=level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        stream=sys.stdout,
    )

    return logging.getLogger("cognition")
