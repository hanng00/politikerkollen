"""HTML parsing for Riksdagen documents.

Extracts clean text from HTML content using BeautifulSoup.
Handles motions (mot) and propositions (prop) which contain
the substantive policy content for semantic matching.
"""

from bs4 import BeautifulSoup, NavigableString


def extract_text_from_html(html: str | None) -> str | None:
    """Extract clean text from Riksdagen document HTML.

    Uses BeautifulSoup with lxml parser for robust extraction.
    Preserves paragraph structure while removing all markup.

    Args:
        html: Raw HTML content from dokument__html

    Returns:
        Clean text with normalized whitespace, or None if input is None/empty
    """
    if not html:
        return None

    soup = BeautifulSoup(html, "lxml")

    # Remove script and style elements
    for element in soup(["script", "style", "head", "meta", "link"]):
        element.decompose()

    # Extract text with space separation
    text = soup.get_text(separator=" ", strip=True)

    # Normalize whitespace
    text = " ".join(text.split())

    return text if text else None


def extract_structured_content(html: str | None) -> dict[str, str | None]:
    """Extract structured content from Riksdagen document HTML.

    Attempts to identify and separate different sections of the document
    for more nuanced embedding and retrieval.

    Args:
        html: Raw HTML content from dokument__html

    Returns:
        Dict with keys: full_text, summary (if identifiable), body
    """
    if not html:
        return {"full_text": None, "summary": None, "body": None}

    soup = BeautifulSoup(html, "lxml")

    # Remove non-content elements
    for element in soup(["script", "style", "head", "meta", "link"]):
        element.decompose()

    full_text = soup.get_text(separator=" ", strip=True)
    full_text = " ".join(full_text.split())

    # Try to find summary/förslag section (common in motions)
    summary = None
    summary_markers = ["Förslag till riksdagsbeslut", "Sammanfattning", "Yrkande"]
    for marker in summary_markers:
        marker_elem = soup.find(string=lambda t: t and marker in t if isinstance(t, NavigableString) else False)
        if marker_elem:
            parent = marker_elem.find_parent(["div", "p", "section"])
            if parent:
                summary = parent.get_text(separator=" ", strip=True)
                summary = " ".join(summary.split())
                break

    return {
        "full_text": full_text if full_text else None,
        "summary": summary,
        "body": full_text,  # For now, body equals full_text
    }


def estimate_token_count(text: str | None, chars_per_token: int = 4) -> int:
    """Estimate token count for text.

    Args:
        text: Text to estimate
        chars_per_token: Average characters per token (default 4 for Swedish)

    Returns:
        Estimated token count
    """
    if not text:
        return 0
    return len(text) // chars_per_token
