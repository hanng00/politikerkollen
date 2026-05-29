"""
Anforande resource configuration.

API endpoint: https://data.riksdagen.se/anforande/{dok_id}-{anforande_nummer}.json
Provides full speech text (anforandetext) for each anförande from Riksdagen debates.
The list endpoint (anforandelista) returns truncated text; this endpoint returns the full text.

This is a child resource that depends on anforandelista - it fetches full detail
for each speech (dok_id + anforande_nummer) from the parent anforandelista resource.

Pattern: Parent-child relationship using dlt's rest_api_source
- Parent: anforandelista (provides dok_id, anforande_nummer)
- Child: anforande (fetches /anforande/{dok_id}-{anforande_nummer}.json for each)
"""

import os

from dlt.sources.rest_api import rest_api_source

from ..http_client import get_client_config
from . import anforandelista

DEFAULT_PAGE_SIZE = 20000  # Maximum allowed page size


def _make_date_range_filter(start_date: str, end_date: str):
    """Create a filter function that keeps only records within the date range (inclusive)."""
    def filter_by_date_range(record: dict) -> bool:
        dok_datum = record.get("dok_datum")
        if not dok_datum:
            return True  # Keep records without a date
        # dok_datum format is "YYYY-MM-DD" or "YYYY-MM-DD HH:MM:SS"
        record_date = dok_datum[:10]  # Extract just the date part
        return start_date <= record_date <= end_date
    return filter_by_date_range


def get_parent_resource(start_date: str | None = None, end_date: str | None = None) -> dict:
    """
    Get anforandelista parent resource configuration.

    Defines parent config inline (like dokumentstatus does) to ensure proper
    parent-child relationship. Parent is selected=False so data is not written,
    only used to drive child requests.
    """
    # Backfill mode
    if start_date and end_date:
        return {
            "name": "anforandelista",
            "endpoint": {
                "path": "anforandelista/",
                "params": {
                    "utformat": "json",
                    "sz": DEFAULT_PAGE_SIZE,
                    # rm parameter is set by RiksmotePaginator
                },
                "data_selector": "anforandelista.anforande",
            },
            "selected": False,  # Don't write parent to destination, only use for child
            "processing_steps": [
                {"filter": _make_date_range_filter(start_date, end_date)},
            ],
        }

    # Incremental mode
    return {
        "name": "anforandelista",
        "endpoint": {
            "path": "anforandelista/",
            "params": {
                "utformat": "json",
                "sz": DEFAULT_PAGE_SIZE,
            },
            "data_selector": "anforandelista.anforande",
        },
        "selected": False,  # Don't write parent to destination, only use for child
    }


def get_child_resource() -> dict:
    """
    Get anforande child resource configuration.

    Fetches full speech detail for each dok_id-anforande_nummer from parent.
    Path format: anforande/{dok_id}-{anforande_nummer}.json

    Note: The Riksdagen API sometimes returns empty responses or 404s for
    anforande IDs that don't exist or have been removed. We use response_actions
    to ignore these gracefully so the pipeline continues processing other records.
    """
    return {
        "name": "anforande",
        "endpoint": {
            "path": "anforande/{resources.anforandelista.dok_id}-{resources.anforandelista.anforande_nummer}.json",
            "data_selector": "anforande",
            "paginator": "single_page",
            "response_actions": [
                {"status_code": 404, "action": "ignore"},
                {"content": "", "action": "ignore"},  # Empty response body
            ],
        },
        "include_from_parent": ["dok_id", "anforande_nummer", "systemnyckel"],
        "write_disposition": "append",  # Append-only raw layer; dedup in stg_anforande
        "max_table_nesting": 2,
    }


def requires_pagination() -> bool:
    """Returns True - parent anforandelista requires pagination."""
    return True


def _anforandelista_paginator_dates(
    start_date: str | None, end_date: str | None
) -> tuple[str | None, str | None]:
    """Args for RiksmotePaginator: backfill uses explicit range; else optional list `d` via env."""
    if start_date and end_date:
        return start_date, end_date
    return (start_date or os.environ.get("ANFORANDE_LIST_AFTER_DATE"), end_date)


def get_paginator(start_date: str | None = None, end_date: str | None = None):
    """Get the paginator for the parent anforandelista resource."""
    return anforandelista.get_paginator(start_date, end_date)


def get_paginator_config() -> dict:
    """Get paginator configuration for the parent resource."""
    return anforandelista.get_paginator_config()


def create_source(
    start_date: str | None = None, end_date: str | None = None, verbose: bool = False
):
    """
    Create a dlt source for anforande resource.

    Parent-child source:
    - Parent (anforandelista) provides speech list with dok_id, anforande_nummer
    - Child (anforande) fetches full speech text for each

    Args:
        start_date: Optional start date for backfill (format: YYYY-MM-DD).
        end_date: Optional end date for backfill (format: YYYY-MM-DD).
        verbose: Whether to enable verbose logging.

    Returns:
        Configured dlt source with anforande resource.

    Incremental tuning: when not in backfill mode, set env ANFORANDE_LIST_AFTER_DATE=YYYY-MM-DD
    so the parent anforandelista requests pass API parameter `d` (speeches after that date),
    reducing work per riksmöte. Unset = previous behaviour (no `d` on list calls).
    """
    parent_config = get_parent_resource(start_date, end_date)
    child_config = get_child_resource()
    pl_start, pl_end = _anforandelista_paginator_dates(start_date, end_date)
    paginator = get_paginator(pl_start, pl_end)

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

    return rest_api_source(source_config)
