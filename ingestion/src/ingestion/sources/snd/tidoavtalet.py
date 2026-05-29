"""
Tidöavtalet resource - Coalition agreement between M, KD, L, and SD (2022-2026).

Source: https://kristdemokraterna.se/arkiv/nyheter/2022/2022-10-14-overenskommelse-for-sverige---tidoavtalet
PDF: Tidöavtalet - Överenskommelse för Sverige

Unlike valmanifest which maps one document to one party, Tidöavtalet is a shared
agreement. We yield one document per coalition party so the downstream cognition
pipeline (which is partitioned by party_id) attributes promises correctly.
"""

import logging
from pathlib import Path
from typing import Iterator

import dlt

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent.parent.parent.parent / "data" / "tidoavtalet"

COALITION_PARTIES = [
    {"party_id": "m", "parti": "Moderaterna"},
    {"party_id": "kd", "parti": "Kristdemokraterna"},
    {"party_id": "l", "parti": "Liberalerna"},
    {"party_id": "sd", "parti": "Sverigedemokraterna"},
]

DOCUMENT_YEAR = 2022
SOURCE_URL = "https://kristdemokraterna.se/arkiv/nyheter/2022/2022-10-14-overenskommelse-for-sverige---tidoavtalet"


def read_tidoavtalet(data_dir: Path = DATA_DIR) -> str | None:
    """Read the Tidöavtalet text file."""
    txt_path = data_dir / "tidoavtalet-2022.txt"
    if not txt_path.exists():
        logger.error(f"Tidöavtalet text file not found at {txt_path}")
        return None
    return txt_path.read_text(encoding="utf-8")


@dlt.resource(name="tidoavtalet", write_disposition="merge", primary_key="document_id")
def tidoavtalet_resource(data_dir: Path = DATA_DIR) -> Iterator[dict]:
    """
    Yield Tidöavtalet as one document per coalition party.

    Uses the same table name ("valmanifest") and schema as the SND manifesto data
    so the entire downstream pipeline works unchanged. The type_id "t" distinguishes
    coalition agreements from regular manifestos (type_id "v", "p", etc.).
    """
    text = read_tidoavtalet(data_dir)
    if text is None:
        logger.warning("Skipping Tidöavtalet - text file not found")
        return

    text_length = len(text)
    logger.info(f"Loaded Tidöavtalet: {text_length:,} characters")

    for party in COALITION_PARTIES:
        document_id = f"{party['party_id']}-{DOCUMENT_YEAR}-t"
        logger.info(f"Yielding Tidöavtalet for {party['parti']} as {document_id}")

        yield {
            "document_id": document_id,
            "year": DOCUMENT_YEAR,
            "party_id": party["party_id"],
            "parti": party["parti"],
            "type_id": "t",
            "document_type": "Tidöavtalet",
            "title": "Tidöavtalet - Överenskommelse för Sverige",
            "source": SOURCE_URL,
            "text_content": text,
            "text_length": text_length,
        }


def create_source(data_dir: Path | None = None):
    """Create dlt source for Tidöavtalet."""
    if data_dir is None:
        data_dir = DATA_DIR

    return dlt.source(
        name="snd_valmanifest",
        section="snd",
    )(lambda: [tidoavtalet_resource(data_dir)])()
