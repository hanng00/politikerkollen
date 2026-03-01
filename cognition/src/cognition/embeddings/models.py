"""
Pydantic models for embedding operations.

This module is the SINGLE SOURCE OF TRUTH for:
1. Embedding table schemas (via field names and types)
2. Validation rules (via Pydantic validators)
3. Documentation (via Field descriptions)
"""

from datetime import datetime

from pydantic import BaseModel, Field

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536


class PromiseEmbedding(BaseModel):
    """Embedding for a single political promise."""

    promise_id: str = Field(description="FK to valmanifest_promises.promise_id")
    embedding: list[float] = Field(
        description=f"Vector embedding ({EMBEDDING_DIMENSIONS} dimensions)"
    )
    embedded_at: datetime = Field(description="Timestamp when embedding was created")
    model_version: str = Field(
        default=EMBEDDING_MODEL,
        description="Embedding model used (e.g., 'text-embedding-3-small')",
    )


class VoteEmbedding(BaseModel):
    """Embedding for a vote proposal (utskottsförslag)."""

    votering_id: str = Field(description="Unique vote identifier from Riksdagen")
    dok_id: str = Field(description="Document ID (betänkande)")
    forslag_text: str = Field(description="The proposal text being voted on")
    embedding: list[float] = Field(
        description=f"Vector embedding ({EMBEDDING_DIMENSIONS} dimensions)"
    )
    embedded_at: datetime = Field(description="Timestamp when embedding was created")
    model_version: str = Field(
        default=EMBEDDING_MODEL,
        description="Embedding model used (e.g., 'text-embedding-3-small')",
    )


def get_embedding_columns(model_class: type[BaseModel]) -> list[tuple[str, str]]:
    """Generate SQL column definitions from embedding Pydantic model."""
    columns = []
    for field_name, field_info in model_class.model_fields.items():
        annotation = field_info.annotation
        is_required = field_info.is_required()

        if field_name == "embedding":
            sql_type = f"FLOAT[{EMBEDDING_DIMENSIONS}] NOT NULL"
        elif annotation is str:
            sql_type = "VARCHAR" + (" NOT NULL" if is_required else "")
        elif annotation is datetime:
            sql_type = "TIMESTAMP" + (" NOT NULL" if is_required else "")
        elif annotation is float:
            sql_type = "DOUBLE" + (" NOT NULL" if is_required else "")
        else:
            sql_type = "VARCHAR" + (" NOT NULL" if is_required else "")

        columns.append((field_name, sql_type))
    return columns
