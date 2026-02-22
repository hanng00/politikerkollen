"""
Voteringlista resource - Riksdagen voting records.

API: https://data.riksdagen.se/voteringlista/
Constraints: Hard 10k cap, no pagination, no date filtering.
Solution: 3D grid (rm × valkrets × parti) with DLT's native parallelism.

See docs/ingestion/riksdagen-api.md for details.
"""

import logging
from typing import Callable, Iterator

import dlt
import requests

from ..paginators import ALL_PARTIES, ALL_RIKSMOTE_SESSIONS, ALL_VALKRETSAR

logger = logging.getLogger(__name__)

DEFAULT_PAGE_SIZE = 10000
BASE_URL = "https://data.riksdagen.se/voteringlista/"


def _filter_sessions_by_date(
    sessions: list[str], start_date: str | None, end_date: str | None
) -> list[str]:
    """Filter sessions that overlap with the date range."""
    if not start_date and not end_date:
        return sessions

    start_year = int(start_date[:4]) if start_date else 1990
    end_year = int(end_date[:4]) if end_date else 2026

    filtered = [
        s for s in sessions if int(s[:4]) <= end_year and int(s[:4]) + 1 >= start_year
    ]
    return filtered or sessions


def _make_fetch_fn(params: dict) -> Callable[[], list[dict]]:
    """Create a callable that fetches one API combination. DLT executes these in parallel."""

    def fetch() -> list[dict]:
        try:
            response = requests.get(
                BASE_URL,
                params=params,
                timeout=180,
                headers={"User-Agent": "riksbevakning-dagster/1.0"},
            )
            response.raise_for_status()
            data = response.json()

            records = data.get("voteringlista", {}).get("votering", [])
            if not records:
                return []

            if isinstance(records, dict):
                records = [records]

            return records

        except Exception as e:
            logger.warning(
                f"Failed to fetch {params.get('rm')}/{params.get('valkrets')}/{params.get('parti')}: {e}"
            )
            return []

    return fetch


@dlt.source(name="riksdagen_voteringlista")
def create_source(
    start_date: str | None = None, end_date: str | None = None, verbose: bool = False
):
    """Create dlt source for voteringlista with DLT's native parallel fetching.
    
    Note: voteringlista has no date filtering - only rm (riksmöte) filtering works.
    The start_date/end_date are used to select which riksmöte sessions to fetch,
    NOT to filter individual records. systemdatum is unreliable (empty for old data,
    represents system entry time not vote date for new data).
    """

    @dlt.resource(
        name="voteringlista",
        write_disposition="merge",
        primary_key=["votering_id", "intressent_id"],
        max_table_nesting=1,
        parallelized=True,
    )
    def voteringlista_resource() -> Iterator[Callable[[], list[dict]]]:
        """Yield callables for each API combination. DLT executes them in its thread pool."""
        sessions = _filter_sessions_by_date(ALL_RIKSMOTE_SESSIONS, start_date, end_date)
        total = len(sessions) * len(ALL_VALKRETSAR) * len(ALL_PARTIES)
        logger.info(f"Yielding {total} fetch tasks for DLT parallel execution")

        for riksmote in sessions:
            for valkrets in ALL_VALKRETSAR:
                for parti in ALL_PARTIES:
                    params = {
                        "utformat": "json",
                        "sz": DEFAULT_PAGE_SIZE,
                        "rm": riksmote,
                        "valkrets": valkrets,
                        "parti": parti,
                    }
                    yield _make_fetch_fn(params)

    return voteringlista_resource


def requires_pagination() -> bool:
    return False


def get_paginator(start_date: str | None = None, end_date: str | None = None):
    return None


def get_paginator_config() -> dict:
    return {"type": "dlt_parallel"}
