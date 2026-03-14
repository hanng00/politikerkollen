"""
Pydantic models for promise extraction from political manifestos.

This module is the SINGLE SOURCE OF TRUTH for:
1. LLM extraction schema (via output_type)
2. Database column definitions (via field names and types)
3. Validation rules (via Pydantic validators)
4. Documentation (via Field descriptions)

The extractor generates its instructions dynamically from these models.
"""

from typing import Literal

from pydantic import BaseModel, Field

CATEGORY_DESCRIPTIONS: dict[str, str] = {
    "skatt": "Skattepolitik, finanspolitik",
    "vard": "Sjukvård, äldreomsorg",
    "skola": "Utbildning, skolor, universitet",
    "miljo": "Miljö, klimat, energi",
    "migration": "Invandring, integration, asyl",
    "forsvar": "Försvar, militär, säkerhet",
    "rattsvasende": "Rättsväsende, polis, domstolar, brottslighet",
    "arbetsmarknad": "Arbetsmarknad, sysselsättning, fackföreningar",
    "bostader": "Bostadspolitik",
    "pension": "Pensioner, pensionssystem",
    "ovrigt": "Övriga politikområden",
}

CategoryType = Literal[
    "skatt",
    "vard",
    "skola",
    "miljo",
    "migration",
    "forsvar",
    "rattsvasende",
    "arbetsmarknad",
    "bostader",
    "pension",
    "ovrigt",
]

SpecificityType = Literal["high", "medium", "low"]

SPECIFICITY_DESCRIPTIONS: dict[str, str] = {
    "high": "Contains specific numbers, dates, or measurable targets",
    "medium": "Describes concrete action but without specific metrics",
    "low": "General direction or intent",
}


class ExtractedPromise(BaseModel):
    """
    A single political promise extracted from a manifesto.

    A promise is a specific, verifiable commitment to action.
    NOT included: vague aspirations, value descriptions, opponent criticism,
    or historical statements about past actions.
    """

    promise_text: str = Field(
        description="The promise rephrased as a clear, actionable statement in Swedish"
    )
    source_quote: str = Field(
        description="The exact quote from the source document that contains this promise"
    )
    category: CategoryType = Field(description="Policy area category for the promise")
    specificity: SpecificityType = Field(
        description="Level of specificity: high (numbers/dates), medium (concrete action), low (general direction)"
    )
    target_group: str | None = Field(
        default=None,
        description="Target beneficiary group if explicitly mentioned (e.g., 'pensionärer', 'företagare', 'barnfamiljer')",
    )
    measurable: bool = Field(
        description="Whether the promise can be objectively verified as kept or broken"
    )


class DocumentExtractionResult(BaseModel):
    """All promises extracted from a single document."""

    document_id: str = Field(description="Unique identifier for the source document")
    promises: list[ExtractedPromise] = Field(
        default_factory=list, description="List of extracted promises from the document"
    )
    extraction_notes: str | None = Field(
        default=None,
        description="Any issues, caveats, or notes about the extraction (e.g., document too short, unclear language)",
    )


def get_extraction_instructions() -> str:
    """
    Generate LLM extraction instructions dynamically from the Pydantic models.

    This ensures the instructions always match the schema definition.
    """
    category_list = "\n".join(
        f"   - {cat}: {desc}" for cat, desc in CATEGORY_DESCRIPTIONS.items()
    )

    specificity_list = "\n".join(
        f"   - {level}: {desc}" for level, desc in SPECIFICITY_DESCRIPTIONS.items()
    )

    promise_fields = []
    for field_name, field_info in ExtractedPromise.model_fields.items():
        desc = field_info.description or ""
        promise_fields.append(f"- {field_name}: {desc}")
    fields_list = "\n".join(promise_fields)

    return f"""You are an expert at extracting political promises from Swedish party manifestos (partiprogram and valmanifest).

## What is a Promise?

{ExtractedPromise.__doc__}

## Output Schema

For each promise, extract these fields:
{fields_list}

## Category Values

{category_list}

## Specificity Levels

{specificity_list}

## Guidelines

- Be thorough but precise. A typical manifesto contains 10-50 concrete promises.
- If the document is very short or contains no clear promises, return an empty list with a note in extraction_notes.
- Always include the exact source quote so the promise can be verified.
- Write promise_text in Swedish as a clear, standalone statement.
"""
