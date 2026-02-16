"""
Anforandelista resource - Riksdagen speeches (anföranden).

API: https://data.riksdagen.se/anforandelista/
Limitation: No proper pagination, max 20K results, only 'd' (date after) filter.
Solution: RiksmotePaginator partitions by session ('rm'), uses 'd' for start_date,
          Python filter for end_date.
"""

from dlt.sources.rest_api import rest_api_source

from ..http_client import get_client_config

INITIAL_INCREMENTAL_VALUE = "0"
DEFAULT_PAGE_SIZE = 20000


def _make_date_range_filter(start_date: str, end_date: str):
    """Filter records to [start_date, end_date] inclusive."""
    def filter_fn(record: dict) -> bool:
        dok_datum = record.get("dok_datum")
        if not dok_datum:
            return True
        return start_date <= dok_datum[:10] <= end_date
    return filter_fn


def get_resource(start_date: str | None = None, end_date: str | None = None) -> dict:
    """
    Resource config for anforandelista.
    
    Backfill (both dates): merge disposition, Python filter for end_date.
    Incremental (no dates): append disposition, systemnyckel cursor.
    """
    if start_date and end_date:
        return {
            "name": "anforandelista",
            "endpoint": {
                "path": "anforandelista/",
                "params": {"utformat": "json", "sz": DEFAULT_PAGE_SIZE},
                "data_selector": "anforandelista.anforande",
            },
            "processing_steps": [
                {"filter": _make_date_range_filter(start_date, end_date)},
            ],
            "write_disposition": "merge",
            "primary_key": ["systemnyckel"],
            "max_table_nesting": 1,
        }

    return {
        "name": "anforandelista",
        "endpoint": {
            "path": "anforandelista/",
            "params": {"utformat": "json", "sz": DEFAULT_PAGE_SIZE},
            "data_selector": "anforandelista.anforande",
            "incremental": {
                "cursor_path": "systemnyckel",
                "initial_value": INITIAL_INCREMENTAL_VALUE,
            },
        },
        "write_disposition": "append",
        "max_table_nesting": 1,
    }


def requires_pagination() -> bool:
    return True


def get_paginator(start_date: str | None = None, end_date: str | None = None):
    from ..paginators import RiksmotePaginator
    return RiksmotePaginator(start_date=start_date, end_date=end_date)


def get_paginator_config() -> dict:
    return {"type": "riksmote"}


def create_source(
    start_date: str | None = None, end_date: str | None = None, verbose: bool = False
):
    """Create dlt source for anforandelista."""
    resource_config = get_resource(start_date, end_date)
    paginator = get_paginator(start_date, end_date)

    client_config = get_client_config()
    if paginator:
        client_config["paginator"] = paginator

    return rest_api_source({
        "client": client_config,
        "resources": [resource_config],
    })
