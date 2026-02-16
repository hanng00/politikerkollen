"""
Personlista resource configuration.

API endpoint: https://data.riksdagen.se/personlista/
Provides information about all members of parliament (current and historical).
Full refresh mode only - no pagination or incremental loading.
"""

from dlt.sources.rest_api import rest_api_source

from ..http_client import get_client_config


def get_resource() -> dict:
    """
    Get personlista (Members of Parliament) resource configuration.

    Returns:
        Resource configuration dict for dlt rest_api_source.

    Note:
        - This endpoint returns all members in a single response
        - No pagination required
        - Always performs full refresh (replace disposition)
        - Data includes member details and their assignments (personuppdrag)
        - Historical data from around 1990 onwards
    """
    return {
        "name": "personlista",
        "endpoint": {
            "path": "personlista/",
            "params": {
                "utformat": "json",
                "rdlstatus": "samtliga",  # All members (current and historical)
            },
            "data_selector": "personlista.person",
        },
        "write_disposition": "replace"  # Full refresh each time
    }


def requires_pagination() -> bool:
    """Returns False as this resource returns all data in a single response."""
    return False


def get_paginator():
    """Get the paginator for this resource."""
    return None  # No pagination needed


def get_paginator_config() -> dict:
    """Get paginator configuration for this resource."""
    return {"type": "none", "description": "No pagination needed - single response"}


def create_source(verbose: bool = False):
    """
    Create a dlt source for personlista resource.

    Args:
        verbose: Whether to enable verbose logging.

    Returns:
        Configured dlt source with personlista resource.
    """
    # Get resource configuration
    resource_config = get_resource()

    # Get paginator (will be None)
    paginator = get_paginator()

    # Create source configuration (uses shared client with increased timeouts for containerized envs)
    client_config = get_client_config()
    if paginator:
        client_config["paginator"] = paginator

    source_config = {
        "client": client_config,
        "resources": [resource_config],
    }

    return rest_api_source(source_config)
