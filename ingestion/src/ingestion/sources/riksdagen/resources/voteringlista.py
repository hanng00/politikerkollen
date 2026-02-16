"""
Voteringlista resource configuration.

API endpoint: https://data.riksdagen.se/voteringlista/
Provides voting records from Riksdagen.
Supports both full refresh and incremental loading.
"""

from dlt.sources.rest_api import rest_api_source

from ..http_client import get_client_config

INITIAL_INCREMENTAL_VALUE = "2024-01-01 00:00:00"  # Start from recent data
DEFAULT_PAGE_SIZE = 10000  # Maximum allowed page size


def get_resource(incremental: bool = True) -> dict:
    """
    Get voteringlista (voting records) resource configuration.

    Args:
        incremental: Whether to use incremental loading (default: True)

    Returns:
        Resource configuration dict for dlt rest_api_source.

    Note:
        - Full refresh: 2D pagination across Riksmöte × Valkrets
        - Incremental: Uses systemdatum cursor, filters by latest riksmöte across all valkrets
        - Surrogate key: votering_id + intressent_id
        - Data selector: voteringlista.votering
    """
    if incremental:
        # Incremental mode - use systemdatum as cursor
        return {
            "name": "voteringlista",
            "endpoint": {
                "path": "voteringlista/",
                "params": {
                    "utformat": "json",
                    "sz": DEFAULT_PAGE_SIZE,
                    # rm and valkrets will be added by paginator for incremental
                },
                "data_selector": "voteringlista.votering",
                "incremental": {
                    "cursor_path": "systemdatum",
                    "initial_value": INITIAL_INCREMENTAL_VALUE,
                },
            },
            "write_disposition": "append",
            "max_table_nesting": 1,
            "primary_key": ["votering_id", "intressent_id"],  # Surrogate key
        }
    else:
        # Full refresh mode - traverse all riksmöte × valkrets combinations
        return {
            "name": "voteringlista",
            "endpoint": {
                "path": "voteringlista/",
                "params": {
                    "utformat": "json",
                    "sz": DEFAULT_PAGE_SIZE,
                    # rm and valkrets will be added by paginator
                },
                "data_selector": "voteringlista.votering",
            },
            "write_disposition": "replace",
            "max_table_nesting": 1,
            "primary_key": ["votering_id", "intressent_id"],  # Surrogate key
        }


def requires_pagination() -> bool:
    """Returns True as this resource uses custom 2D pagination."""
    return True


def get_paginator(
    incremental: bool = True, start_date: str | None = None, end_date: str | None = None
):
    """Get the paginator for this resource."""
    from ..paginators import (
        VoteringlistaIncrementalPaginator,
        VoteringlistaPaginator,
    )

    if incremental:
        return VoteringlistaIncrementalPaginator(
            start_date=start_date, end_date=end_date
        )
    else:
        return VoteringlistaPaginator(start_date=start_date, end_date=end_date)


def get_paginator_config(incremental: bool = True) -> dict:
    """Get paginator configuration for this resource."""
    if incremental:
        return {
            "type": "incremental_latest_riksmote",
            "description": "Fetches latest riksmöte across all valkrets, filters by systemdatum",
        }
    else:
        return {
            "type": "2d_riksmote_valkrets",
            "description": "Paginates through Riksmöte × Valkrets combinations",
        }


def create_source(
    incremental: bool = True,
    start_date: str | None = None,
    end_date: str | None = None,
    verbose: bool = False,
):
    """
    Create a dlt source for voteringlista resource.

    Args:
        incremental: Whether to use incremental loading (default: True)
        start_date: Optional start date to filter Riksmöte range
        end_date: Optional end date to filter Riksmöte range
        verbose: Whether to enable verbose logging.

    Returns:
        Configured dlt source with voteringlista resource and appropriate paginator.
    """
    # Get resource configuration
    resource_config = get_resource(incremental=incremental)

    # Get paginator with date filtering
    paginator = get_paginator(
        incremental=incremental, start_date=start_date, end_date=end_date
    )

    # Create source configuration (uses shared client with increased timeouts for containerized envs)
    client_config = get_client_config()
    if paginator:
        client_config["paginator"] = paginator

    source_config = {
        "client": client_config,
        "resources": [resource_config],
    }

    return rest_api_source(source_config)
