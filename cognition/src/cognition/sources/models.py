"""
Pydantic models for source document embeddings.

This module is the SINGLE SOURCE OF TRUTH for:
1. Source embedding table schema (via field names and types)
2. Validation rules (via Pydantic validators)
3. Documentation (via Field descriptions)

Source documents are motions (mot) and propositions (prop) - the substantive
policy content that should be embedded for semantic matching against promises.
"""

from datetime import datetime

from pydantic import BaseModel, Field

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536


class SourceEmbedding(BaseModel):
    """Embedding for a source document (motion or proposition)."""

    dok_id: str = Field(description="Document ID (e.g., 'HC023440' for motion)")
    dok_typ: str = Field(description="Document type: 'mot' (motion) or 'prop' (proposition)")
    rm: str = Field(description="Riksmöte (e.g., '2024/25')")
    riksmote_year: int = Field(description="Year extracted from riksmöte (e.g., 2024)")
    titel: str = Field(description="Document title")
    content_text: str = Field(description="Clean text extracted from HTML")
    embedding: list[float] = Field(
        description=f"Vector embedding ({EMBEDDING_DIMENSIONS} dimensions)"
    )
    dokument_url: str | None = Field(
        default=None, description="URL to original document on riksdagen.se"
    )
    parti: str | None = Field(
        default=None,
        description="Party attribution: signatory party for mot, 'Regeringen' for prop",
    )
    intressent_ids: list[str] | None = Field(
        default=None, description="Array of signatory intressent_ids (for motions only)"
    )
    embedded_at: datetime = Field(description="Timestamp when embedding was created")
    model_version: str = Field(
        default=EMBEDDING_MODEL,
        description="Embedding model used (e.g., 'text-embedding-3-small')",
    )


def get_source_embedding_columns() -> list[tuple[str, str]]:
    """Generate SQL column definitions from SourceEmbedding Pydantic model."""
    columns = []
    for field_name, field_info in SourceEmbedding.model_fields.items():
        annotation = field_info.annotation
        is_required = field_info.is_required()

        if field_name == "embedding":
            sql_type = f"FLOAT[{EMBEDDING_DIMENSIONS}] NOT NULL"
        elif field_name == "intressent_ids":
            sql_type = "VARCHAR[]"
        elif annotation is str:
            sql_type = "VARCHAR" + (" NOT NULL" if is_required else "")
        elif annotation is int:
            sql_type = "INTEGER" + (" NOT NULL" if is_required else "")
        elif annotation is datetime:
            sql_type = "TIMESTAMP" + (" NOT NULL" if is_required else "")
        elif annotation is float:
            sql_type = "DOUBLE" + (" NOT NULL" if is_required else "")
        elif str(annotation).startswith("str |") or str(annotation).startswith("typing.Optional[str]"):
            sql_type = "VARCHAR"
        elif str(annotation).startswith("list[str]") or "list[str]" in str(annotation):
            sql_type = "VARCHAR[]"
        else:
            sql_type = "VARCHAR" + (" NOT NULL" if is_required else "")

        columns.append((field_name, sql_type))
    return columns
