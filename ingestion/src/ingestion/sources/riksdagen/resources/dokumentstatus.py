"""
Dokumentstatus resource configuration.

API endpoint: https://data.riksdagen.se/dokumentstatus/{dok_id}.json
Provides detailed document status including full history, activities, proposals,
decisions, and related documents for each document in Riksdagen.

This is a child resource that depends on dokumentlista - it fetches detailed
status for each document ID from the parent dokumentlista resource.

Pattern: Parent-child relationship using dlt's rest_api_source
- Parent: dokumentlista (provides dok_id values)
- Child: dokumentstatus (fetches /dokumentstatus/{dok_id}.json for each)
"""

from typing import Any, Dict

from dlt.sources.rest_api import rest_api_source

from ..http_client import get_client_config

# Default date range for backfill - should match dokumentlista defaults
INITIAL_INCREMENTAL_VALUE = "2025-01-01"
DEFAULT_END_DATE = "2025-06-01"


def get_parent_resource(start_date: str | None = None, end_date: str | None = None) -> dict:
    """
    Get dokumentlista parent resource configuration.
    
    This is a simplified version of dokumentlista that only selects dok_id
    to drive the child dokumentstatus requests.
    
    Only documents with dokument_url_text are included (others don't support
    the dokumentstatus endpoint).
    """
    # Filter function to only include documents with dokument_url_text
    def has_dokumentstatus(record):
        """Only fetch dokumentstatus for documents that have dokument_url_text."""
        url = record.get("dokument_url_text")
        return url is not None and url != ""
    
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
            "selected": False,  # Don't write parent to destination, only use for child
            "processing_steps": [
                {"filter": has_dokumentstatus},
            ],
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
        "selected": False,  # Don't write parent to destination, only use for child
        "processing_steps": [
            {"filter": has_dokumentstatus},
        ],
    }


def get_child_resource() -> dict:
    """
    Get dokumentstatus child resource configuration.
    
    This resource fetches detailed document status for each dok_id
    from the parent dokumentlista resource.
    
    Returns:
        Resource configuration dict for dlt rest_api_source.
    """
    return {
        "name": "dokumentstatus",
        "endpoint": {
            # Path with placeholder referencing parent resource field
            # dlt syntax: {resources.<parent_name>.<field>}
            # Note: dokumentlista API returns 'id' as the document identifier
            "path": "dokumentstatus/{resources.dokumentlista.id}.json",
            "data_selector": "dokumentstatus",
            # Single entity endpoint - no pagination needed
            "paginator": "single_page",
        },
        # Include id from parent to ensure we have the key in output
        "include_from_parent": ["id"],
        # Append-only raw layer; dedup in stg_dokumentstatus
        "write_disposition": "append",
        # Flatten nested structures to reasonable depth
        "max_table_nesting": 2,
    }


def requires_pagination() -> bool:
    """Returns True if this resource requires pagination for the parent."""
    return True


def get_paginator():
    """Get the paginator for the parent dokumentlista resource."""
    from dlt.sources.helpers.rest_client.paginators import JSONLinkPaginator

    return JSONLinkPaginator(next_url_path="dokumentlista.@nasta_sida")


def get_paginator_config() -> dict:
    """Get paginator configuration for the parent resource."""
    return {"type": "json_link", "next_url_path": "dokumentlista.@nasta_sida"}


def create_source(
    start_date: str | None = None, end_date: str | None = None, verbose: bool = False
):
    """
    Create a dlt source for dokumentstatus resource.
    
    This creates a parent-child source where:
    - Parent (dokumentlista) provides the list of dok_id values
    - Child (dokumentstatus) fetches detailed status for each dok_id
    
    Args:
        start_date: Optional start date for backfill (format: YYYY-MM-DD).
        end_date: Optional end date for backfill (format: YYYY-MM-DD).
        verbose: Whether to enable verbose logging.
    
    Returns:
        Configured dlt source with dokumentstatus resource.
    """
    # Get parent and child resource configurations
    parent_config = get_parent_resource(start_date, end_date)
    child_config = get_child_resource()

    # Get paginator for parent
    paginator = get_paginator()

    # Create source configuration with parent-child relationship
    # Uses shared client with increased timeouts for resilience
    client_config = get_client_config()
    client_config["paginator"] = paginator

    source_config = {
        "client": client_config,
        "resources": [
            parent_config,
            child_config,
        ],
    }

    source = rest_api_source(source_config)
    
    return source
