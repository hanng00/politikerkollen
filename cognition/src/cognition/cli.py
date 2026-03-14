#!/usr/bin/env python3
"""
Cognition CLI - LLM-based data processing for political data.

Commands:
    cognition extract-promises   Extract promises from party manifestos
    cognition embed-promises     Generate embeddings for promises
    cognition embed-sources      Generate embeddings for source documents (mot/prop)
    cognition build-source-texts Extract plain text from source HTML (for BM25)
    cognition match-promises     Match promises to sources using vector similarity
"""

import atexit

import click

from cognition.core.config import load_env
from cognition.core.llm import flush as flush_langfuse
from cognition.core.tracing import setup_tracing
from cognition.modules.build_source_texts.commands import build_source_texts_cmd
from cognition.modules.embed_promises.commands import embed_promises_cmd
from cognition.modules.embed_sources.commands import embed_sources_cmd
from cognition.modules.extract_promises.commands import extract_promises_cmd
from cognition.modules.match_promises.commands import match_promises_cmd


@click.group()
def cli() -> None:
    """Cognition CLI for LLM-based data processing."""
    load_env()
    setup_tracing()
    atexit.register(flush_langfuse)


cli.add_command(extract_promises_cmd)
cli.add_command(embed_promises_cmd)
cli.add_command(embed_sources_cmd)
cli.add_command(build_source_texts_cmd)
cli.add_command(match_promises_cmd)


if __name__ == "__main__":
    cli()
