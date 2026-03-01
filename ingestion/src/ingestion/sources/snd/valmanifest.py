"""
Valmanifest resource - Swedish party programs and election manifestos from SND.

Dataset: https://snd.se/vivill
DOI: 10.5878/kcsf-k293

This is a static dataset (updates only before elections), so we download once
and load to MotherDuck. The dataset contains ~360 documents from 1897 to present.
"""

import logging
import zipfile
from pathlib import Path
from typing import Iterator

import dlt
import duckdb
import requests

logger = logging.getLogger(__name__)

DATASET_DOI = "10.5878/kcsf-k293"
DATASET_ID = "snd0810-1"
DATASET_VERSION = "3"
METADATA_FILENAME = "Partidokument.csv"

DOWNLOAD_URLS = {
    "zip": f"https://api.researchdata.se/dataset/{DATASET_ID}/{DATASET_VERSION}/file/data?filePath=Svenska%20partiprogram%20och%20valmanifest.zip",
    "csv": f"https://api.researchdata.se/dataset/{DATASET_ID}/{DATASET_VERSION}/file/documentation?filePath=Partidokument.csv",
}

DATA_DIR = Path(__file__).parent.parent.parent.parent.parent / "data" / "snd"


def download_file(url: str, target_path: Path) -> None:
    """Download a file with progress logging."""
    logger.info(f"Downloading {url} to {target_path}")
    target_path.parent.mkdir(parents=True, exist_ok=True)

    response = requests.get(url, stream=True, timeout=300)
    response.raise_for_status()

    total_size = int(response.headers.get("content-length", 0))
    downloaded = 0

    with open(target_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
            downloaded += len(chunk)
            if total_size > 0 and downloaded % (5 * 1024 * 1024) == 0:
                logger.info(f"Downloaded {downloaded / 1024 / 1024:.1f} MB / {total_size / 1024 / 1024:.1f} MB")

    logger.info(f"Download complete: {target_path}")


def ensure_dataset_downloaded(data_dir: Path = DATA_DIR) -> Path:
    """Ensure the SND dataset is downloaded, return path to data directory."""
    data_dir.mkdir(parents=True, exist_ok=True)

    zip_path = data_dir / "valmanifest.zip"
    csv_path = data_dir / METADATA_FILENAME

    if not zip_path.exists():
        download_file(DOWNLOAD_URLS["zip"], zip_path)

    if not csv_path.exists():
        download_file(DOWNLOAD_URLS["csv"], csv_path)

    return data_dir


def read_metadata_with_duckdb(csv_path: Path) -> list[dict]:
    """Read CSV metadata using DuckDB for robust parsing."""
    conn = duckdb.connect(":memory:")

    result = conn.execute(f"""
        SELECT
            id AS document_id,
            year,
            party_id,
            party AS parti,
            type_id,
            type AS document_type,
            källa AS source,
            titel AS title
        FROM read_csv('{csv_path}', auto_detect=true)
    """)

    columns = [desc[0] for desc in result.description]
    rows = result.fetchall()
    conn.close()

    records = [dict(zip(columns, row)) for row in rows]
    logger.info(f"Parsed {len(records)} documents from metadata CSV")
    return records


def extract_text_from_zip(zip_path: Path, document_id: str, parti: str) -> str | None:
    """
    Extract text content from a document in the ZIP archive.

    ZIP structure: Svenska partiprogram och valmanifest/Partidokument/{PartyName}/{document_id}.txt
    """
    with zipfile.ZipFile(zip_path, "r") as zf:
        txt_filename = f"Svenska partiprogram och valmanifest/Partidokument/{parti}/{document_id}.txt"

        if txt_filename in zf.namelist():
            with zf.open(txt_filename) as f:
                return f.read().decode("utf-8", errors="replace")

        # Fallback: case-insensitive search
        target_basename = f"{document_id}.txt".lower()
        for zf_name in zf.namelist():
            if zf_name.lower().endswith(target_basename):
                with zf.open(zf_name) as f:
                    return f.read().decode("utf-8", errors="replace")

        logger.warning(f"Could not find {document_id}.txt for party {parti} in ZIP archive")
        return None


@dlt.resource(name="valmanifest", write_disposition="replace", primary_key="document_id")
def valmanifest_resource(data_dir: Path = DATA_DIR) -> Iterator[dict]:
    """
    Yield valmanifest documents with metadata and full text content.

    Columns:
    - document_id: Unique identifier (e.g., s-2022-v)
    - year: Publication year
    - party_id: Party abbreviation (e.g., s, m, c)
    - parti: Full party name
    - type_id: Document type code (p=partiprogram, v=valmanifest, etc.)
    - document_type: Full document type name
    - title: Document title
    - source: Source of the document
    - text_content: Full text of the document
    - text_length: Character count of text_content
    """
    data_dir = ensure_dataset_downloaded(data_dir)

    csv_path = data_dir / METADATA_FILENAME
    zip_path = data_dir / "valmanifest.zip"

    metadata = read_metadata_with_duckdb(csv_path)

    for doc in metadata:
        document_id = doc.get("document_id", "")
        parti = doc.get("parti", "")

        text = extract_text_from_zip(zip_path, document_id, parti)

        yield {
            "document_id": document_id,
            "year": doc.get("year"),
            "party_id": doc.get("party_id"),
            "parti": parti,
            "type_id": doc.get("type_id"),
            "document_type": doc.get("document_type"),
            "title": doc.get("title"),
            "source": doc.get("source"),
            "text_content": text,
            "text_length": len(text) if text else 0,
        }


def create_source(data_dir: Path | None = None):
    """Create dlt source for valmanifest."""
    if data_dir is None:
        data_dir = DATA_DIR

    return dlt.source(
        name="snd_valmanifest",
        section="snd",
    )(lambda: [valmanifest_resource(data_dir)])()
