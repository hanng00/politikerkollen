"""
Shared HTTP client configuration for Riksdagen API.

Provides base_url and headers for dlt rest_api_source. Timeout and retry settings
are configured via .dlt/config.toml [runtime] section (request_timeout=180, etc.)
to avoid passing a custom session—session objects use thread-local state and
cannot be deep-copied by dlt's config validation.
"""


def get_client_config() -> dict:
    """
    Get the shared client configuration for dlt rest_api_source.

    Returns a dict suitable for the "client" key in rest_api_source config.
    Timeout/retry: use .dlt/config.toml [runtime] section.
    """
    return {
        "base_url": "https://data.riksdagen.se/",
        "headers": {
            "User-Agent": "riksbevakning-dagster/1.0",
        },
    }
