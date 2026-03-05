"""Configuration and environment utilities."""

import logging
import sys
from pathlib import Path

import dotenv

# Single source of truth for schema name
# Used in: MotherDuck tables, Dagster asset keys
SCHEMA = "cognition"

# Source tables - STRICTLY from dbt staging layer (main_stg schema)
# Cognition should NEVER read from raw_* tables directly
VALMANIFEST_SOURCE = "main_stg.stg_valmanifest"
VOTERINGLISTA_SOURCE = "main_stg.stg_voteringlista"
UTSKOTTSFORSLAG_SOURCE = "main_stg.stg_dokumentstatus_utskottsforslag"
DOKUMENTSTATUS_SOURCE = "main_stg.stg_dokumentstatus"
DOKUMENTSTATUS_INTRESSENT_SOURCE = "main_stg.stg_dokumentstatus_intressent"

# Intermediate tables - from dbt int layer (main_int schema)
# These are derived tables built by dbt transformations
INT_VOTE_PARTY_AGGREGATION = "main_int.int_vote_party_aggregation"
INT_VOTE_SOURCE_LINKS = "main_int.int_vote_source_links"
INT_DOCUMENT_CONTENT = "main_int.int_document_content"


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
