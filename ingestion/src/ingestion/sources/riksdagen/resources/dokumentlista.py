"""
Dokumentlista resource configuration.

API endpoint: https://data.riksdagen.se/dokumentlista/
Provides documents from Riksdagen including decisions, propositions, motions, and protocols.
Supports both incremental and backfill modes.
"""

from datetime import datetime
from typing import Any, Dict

from dlt.sources.rest_api import rest_api_source

from ..http_client import get_client_config

INITIAL_INCREMENTAL_VALUE = "2025-01-01"
DEFAULT_END_DATE = "2025-06-01"


def get_resource(start_date: str | None = None, end_date: str | None = None) -> dict:
    """
    Get dokumentlista resource configuration.

    Args:
        start_date: Optional start date for backfill (format: YYYY-MM-DD).
        end_date: Optional end date for backfill (format: YYYY-MM-DD).

    Returns:
        Resource configuration dict for dlt rest_api_source.

    Note:
        - Backfill mode: Both dates provided → merge disposition with primary key
        - Incremental mode: No dates → merge disposition with cursor
        - Requires pagination via JSONLinkPaginator
    """
    # Backfill mode
    if start_date and end_date:
        return {
            "name": "dokumentlista",
            "endpoint": {
                "path": "dokumentlista/",
            "params": {
                "utformat": "json",
                "from": start_date,
                "tom": end_date,
                "sort": "datum",
                "sortorder": "asc",
                "antal": 10000,
            },
                "data_selector": "dokumentlista.dokument",
            },
            # Append-only raw layer; dedup in stg_dokumentlista
            "write_disposition": "append",
            "max_table_nesting": 1,
        }

    # Incremental mode
    return {
        "name": "dokumentlista",
        "endpoint": {
            "path": "dokumentlista/",
            "params": {
                "utformat": "json",
                "tom": DEFAULT_END_DATE,
                "sort": "datum",
                "sortorder": "asc",
                "antal": 10000,
                "from": "{incremental.start_value}",
            },
            "data_selector": "dokumentlista.dokument",
            "incremental": {
                "cursor_path": "datum",
                "initial_value": INITIAL_INCREMENTAL_VALUE,
            },
        },
        # Append-only raw layer; dedup in stg_dokumentlista
        "write_disposition": "append",
        "max_table_nesting": 1,
    }


def requires_pagination() -> bool:
    """Returns True if this resource requires pagination."""
    return True


def get_paginator():
    """Get the paginator for this resource."""
    from dlt.sources.helpers.rest_client.paginators import JSONLinkPaginator

    return JSONLinkPaginator(next_url_path="dokumentlista.@nasta_sida")


def get_paginator_config() -> dict:
    """Get paginator configuration for this resource."""
    return {"type": "json_link", "next_url_path": "dokumentlista.@nasta_sida"}


def create_source(
    start_date: str | None = None, end_date: str | None = None, verbose: bool = False
):
    """
    Create a dlt source for dokumentlista resource.

    Args:
        start_date: Optional start date for backfill (format: YYYY-MM-DD).
        end_date: Optional end date for backfill (format: YYYY-MM-DD).
        verbose: Whether to enable verbose logging.

    Returns:
        Configured dlt source with dokumentlista resource and paginator.
    """
    # Get resource configuration
    resource_config = get_resource(start_date, end_date)

    # Get paginator
    paginator = get_paginator()

    # Create source configuration (uses shared client with increased timeouts)
    client_config = get_client_config()
    if paginator:
        client_config["paginator"] = paginator

    source_config = {
        "client": client_config,
        "resources": [resource_config],
    }

    source = rest_api_source(source_config)
    resource = source.resources["dokumentlista"]

    @resource.add_map
    def normalize_publicerad(row: Dict[str, Any]) -> Dict[str, Any]:
        """Coerce empty/invalid publicerad values to null to avoid destination cast errors."""
        raw = row.get("publicerad")

        if raw is None:
            return row

        if isinstance(raw, str):
            cleaned = raw.strip()
            if not cleaned:
                row["publicerad"] = None
                return row

            try:
                parsed = datetime.fromisoformat(cleaned.replace(" ", "T"))
                # Use a normalized timestamp string DuckDB can cast consistently.
                row["publicerad"] = parsed.isoformat(sep=" ", timespec="seconds")
            except Exception:
                row["publicerad_raw"] = raw
                row["publicerad"] = None
        else:
            # Unexpected type: keep raw copy and null out parsed field
            row["publicerad_raw"] = raw
            row["publicerad"] = None

        return row

    return source
