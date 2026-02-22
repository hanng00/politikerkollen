"""
Custom paginators for Riksdagen API resources.

The Riksdagen API has a hard cap of 10,000 results per request with no pagination support.
These paginators partition requests by available filters to fetch all data.

See docs/ingestion/riksdagen-api.md for API constraints and workarounds.
"""

from typing import Any, Dict, Optional

from dlt.sources.helpers.rest_client.paginators import BasePaginator

# Parliamentary sessions from 1990/91 to present (Sep-Sep cycle)
ALL_RIKSMOTE_SESSIONS = [
    "2025/26",
    "2024/25",
    "2023/24",
    "2022/23",
    "2021/22",
    "2020/21",
    "2019/20",
    "2018/19",
    "2017/18",
    "2016/17",
    "2015/16",
    "2014/15",
    "2013/14",
    "2012/13",
    "2011/12",
    "2010/11",
    "2009/10",
    "2008/09",
    "2007/08",
    "2006/07",
    "2005/06",
    "2004/05",
    "2003/04",
    "2002/03",
    "2001/02",
    "2000/01",
    "1999/00",
    "1998/99",
    "1997/98",
    "1996/97",
    "1995/96",
    "1994/95",
    "1993/94",
    "1992/93",
    "1991/92",
    "1990/91",
]

# Electoral districts
ALL_VALKRETSAR = [
    "Blekinge län",
    "Dalarnas län",
    "Gotlands län",
    "Gävleborgs län",
    "Göteborgs kommun",
    "Hallands län",
    "Jämtlands län",
    "Jönköpings län",
    "Kalmar län",
    "Kronobergs län",
    "Malmö kommun",
    "Norrbottens län",
    "Skåne läns norra och östra",
    "Skåne läns södra",
    "Skåne läns västra",
    "Stockholms kommun",
    "Stockholms län",
    "Södermanlands län",
    "Uppsala län",
    "Värmlands län",
    "Västerbottens län",
    "Västernorrlands län",
    "Västmanlands län",
    "Västra Götalands läns norra",
    "Västra Götalands läns södra",
    "Västra Götalands läns västra",
    "Västra Götalands läns östra",
    "Örebro län",
    "Östergötlands län",
]

# Political parties - includes historical codes (lowercase pre-2010) and current (uppercase)
# API is case-insensitive for filtering but returns data in original case
ALL_PARTIES = [
    "S", "M", "SD", "C", "V", "KD", "L", "MP",  # Current parties
    "fp",  # Folkpartiet (now L), used in data before ~2015
    "-",   # Independent/no party affiliation
]


def _filter_sessions_by_year(
    sessions: list[str], start_date: str | None, end_date: str | None
) -> list[str]:
    """Filter sessions that overlap with the date range (year-level granularity)."""
    if not start_date and not end_date:
        return sessions

    start_year = int(start_date[:4]) if start_date else 1990
    end_year = int(end_date[:4]) if end_date else 2026

    filtered = [
        s for s in sessions if int(s[:4]) <= end_year and int(s[:4]) + 1 >= start_year
    ]
    return filtered or sessions


class RiksmotePaginator(BasePaginator):
    """
    Paginate by riksmöte (parliamentary session) using 'rm' parameter.
    Optionally uses 'd' (date after) for API-level start_date filtering.
    """

    def __init__(self, start_date: str | None = None, end_date: str | None = None):
        self.start_date = start_date
        self.riksmote_sessions = _filter_sessions_by_year(
            ALL_RIKSMOTE_SESSIONS, start_date, end_date
        )
        self.current_session_index = 0
        self._has_next_page = True

    def _build_params(self, session: str) -> Dict[str, Any]:
        params = {"rm": session}
        if self.start_date:
            params["d"] = self.start_date
        return params

    def update_state(self, response: Any, data: Any = None) -> None:
        self.current_session_index += 1
        self._has_next_page = self.current_session_index < len(self.riksmote_sessions)

    def get_next_request_params(self) -> Optional[Dict[str, Any]]:
        if not self._has_next_page or self.current_session_index >= len(
            self.riksmote_sessions
        ):
            return None
        return self._build_params(self.riksmote_sessions[self.current_session_index])

    def get_initial_request_params(self) -> Dict[str, Any]:
        if self.current_session_index < len(self.riksmote_sessions):
            return self._build_params(
                self.riksmote_sessions[self.current_session_index]
            )
        return {}

    def init_request(self, request: Any) -> Any:
        params = self.get_initial_request_params()
        if params and hasattr(request, "params"):
            request.params.update(params)
        return request

    def update_request(self, request: Any) -> Any:
        params = self.get_next_request_params()
        if params:
            if hasattr(request, "params"):
                request.params.update(params)
            elif hasattr(request, "url"):
                from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

                parsed = urlparse(request.url)
                query_params = parse_qs(parsed.query)
                query_params.update(params)
                request.url = urlunparse(
                    parsed._replace(query=urlencode(query_params, doseq=True))
                )
        return request

    @property
    def has_next_page(self) -> bool:
        return self._has_next_page

    def reset(self) -> None:
        self.current_session_index = 0
        self._has_next_page = True


class VoteringlistaIncrementalPaginator(BasePaginator):
    """
    3D paginator for incremental voteringlista loads: riksmöte × valkrets × parti.
    
    Only fetches the latest riksmöte (determined from end_date or current session).
    Required because large valkrets (Stockholm, Göteborg) exceed 10k even with 2D.
    """

    def __init__(self, start_date: str | None = None, end_date: str | None = None):
        self.current_riksmote = self._determine_riksmote(end_date)
        self.current_valkrets_index = 0
        self.current_parti_index = 0
        self._has_next_page = True

    def _determine_riksmote(self, end_date: str | None) -> str:
        if not end_date:
            return "2024/25"
        end_year = int(end_date[:4])
        return f"{end_year}/{str(end_year + 1)[2:]}"

    def _build_params(self) -> Dict[str, Any]:
        return {
            "rm": self.current_riksmote,
            "valkrets": ALL_VALKRETSAR[self.current_valkrets_index],
            "parti": ALL_PARTIES[self.current_parti_index],
        }

    def _advance(self) -> None:
        """Advance to next parti, then valkrets."""
        self.current_parti_index += 1
        if self.current_parti_index >= len(ALL_PARTIES):
            self.current_parti_index = 0
            self.current_valkrets_index += 1
        self._has_next_page = self.current_valkrets_index < len(ALL_VALKRETSAR)

    def update_state(self, response: Any, data: Any = None) -> None:
        self._advance()

    def get_next_request_params(self) -> Optional[Dict[str, Any]]:
        if not self._has_next_page:
            return None
        return self._build_params()

    def get_initial_request_params(self) -> Dict[str, Any]:
        if self._has_next_page:
            return self._build_params()
        return {}

    def init_request(self, request: Any) -> Any:
        params = self.get_initial_request_params()
        if params and hasattr(request, "params"):
            request.params.update(params)
        return request

    def update_request(self, request: Any) -> Any:
        params = self.get_next_request_params()
        if params:
            if hasattr(request, "params"):
                request.params.update(params)
            elif hasattr(request, "url"):
                from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

                parsed = urlparse(request.url)
                query_params = parse_qs(parsed.query)
                query_params.update(params)
                request.url = urlunparse(
                    parsed._replace(query=urlencode(query_params, doseq=True))
                )
        return request

    @property
    def has_next_page(self) -> bool:
        return self._has_next_page

    def reset(self) -> None:
        self.current_valkrets_index = 0
        self.current_parti_index = 0
        self._has_next_page = True


class VoteringlistaPaginator(BasePaginator):
    """
    3D paginator for full voteringlista backfill: riksmöte × valkrets × parti.
    
    Required because the API has a hard 10k cap and large valkrets (Stockholm, Göteborg)
    have ~20k votes per riksmöte. Adding parti as 3rd dimension keeps each request under 10k.
    
    Iteration order: parti (inner) → valkrets → riksmöte (outer)
    Total requests per riksmöte: 29 valkrets × 10 parties = 290
    """

    def __init__(self, start_date: str | None = None, end_date: str | None = None):
        self.riksmote_sessions = _filter_sessions_by_year(
            ALL_RIKSMOTE_SESSIONS, start_date, end_date
        )
        self.current_riksmote_index = 0
        self.current_valkrets_index = 0
        self.current_parti_index = 0
        self._has_next_page = len(self.riksmote_sessions) > 0

    def _build_params(self) -> Dict[str, Any]:
        return {
            "rm": self.riksmote_sessions[self.current_riksmote_index],
            "valkrets": ALL_VALKRETSAR[self.current_valkrets_index],
            "parti": ALL_PARTIES[self.current_parti_index],
        }

    def _advance(self) -> None:
        """Advance to next parti, then valkrets, then riksmöte."""
        self.current_parti_index += 1
        if self.current_parti_index >= len(ALL_PARTIES):
            self.current_parti_index = 0
            self.current_valkrets_index += 1
            if self.current_valkrets_index >= len(ALL_VALKRETSAR):
                self.current_valkrets_index = 0
                self.current_riksmote_index += 1
        self._has_next_page = self.current_riksmote_index < len(self.riksmote_sessions)

    def update_state(self, response: Any, data: Any = None) -> None:
        self._advance()

    def get_next_request_params(self) -> Optional[Dict[str, Any]]:
        if not self._has_next_page:
            return None
        return self._build_params()

    def get_initial_request_params(self) -> Dict[str, Any]:
        if self._has_next_page:
            return self._build_params()
        return {}

    def init_request(self, request: Any) -> Any:
        params = self.get_initial_request_params()
        if params and hasattr(request, "params"):
            request.params.update(params)
        return request

    def update_request(self, request: Any) -> Any:
        params = self.get_next_request_params()
        if params:
            if hasattr(request, "params"):
                request.params.update(params)
            elif hasattr(request, "url"):
                from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

                parsed = urlparse(request.url)
                query_params = parse_qs(parsed.query)
                query_params.update(params)
                request.url = urlunparse(
                    parsed._replace(query=urlencode(query_params, doseq=True))
                )
        return request

    @property
    def has_next_page(self) -> bool:
        return self._has_next_page

    def reset(self) -> None:
        self.current_riksmote_index = 0
        self.current_valkrets_index = 0
        self.current_parti_index = 0
        self._has_next_page = len(self.riksmote_sessions) > 0


class AnforandelistaPaginator(BasePaginator):
    """
    Date-based paginator using 'd' parameter (deprecated, use RiksmotePaginator).
    Advances by setting 'd' to latest dok_datum from each response.
    """

    def __init__(self):
        self.last_date: Optional[str] = None
        self._has_next_page = True
        self.first_request = True

    def update_state(self, response: Any, data: Any = None) -> None:
        if not response or not hasattr(response, "json"):
            self._has_next_page = False
            return

        try:
            json_data = data if data is not None else response.json()
            anforanden = json_data.get("anforandelista", {}).get("anforande", [])

            if not anforanden:
                self._has_next_page = False
                return

            latest_date = max(
                (a.get("dok_datum") for a in anforanden if a.get("dok_datum")),
                default=None,
            )
            if latest_date:
                self.last_date = latest_date
                self._has_next_page = len(anforanden) >= 10000
            else:
                self._has_next_page = False
        except Exception:
            self._has_next_page = False

    def get_next_request_params(self) -> Optional[Dict[str, Any]]:
        if not self._has_next_page or not self.last_date:
            return None
        return {"d": self.last_date}

    def update_request(self, request: Any) -> Any:
        if self.first_request:
            self.first_request = False
            return request

        params = self.get_next_request_params()
        if params:
            if hasattr(request, "params"):
                request.params.update(params)
            elif hasattr(request, "url"):
                from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

                parsed = urlparse(request.url)
                query_params = parse_qs(parsed.query)
                query_params.update(params)
                request.url = urlunparse(
                    parsed._replace(query=urlencode(query_params, doseq=True))
                )
        return request

    @property
    def has_next_page(self) -> bool:
        return self._has_next_page

    def reset(self) -> None:
        self.last_date = None
        self._has_next_page = True
        self.first_request = True
