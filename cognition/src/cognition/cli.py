#!/usr/bin/env python3
"""
Cognition CLI - LLM-based data processing for political data.

Commands:
    cognition extract-promises  Extract promises from party manifestos
    cognition embed-promises    Generate embeddings for promises
    cognition embed-votes       Generate embeddings for vote proposals
    cognition match-promises    Match promises to votes using vector similarity
"""

import click

from cognition.core.config import load_env
from cognition.core.tracing import setup_tracing
from cognition.embeddings.commands import embed_promises_cmd, embed_votes_cmd
from cognition.matching.commands import match_promises_cmd
from cognition.promises.commands import extract_promises_cmd


@click.group()
def cli() -> None:
    """Cognition CLI for LLM-based data processing."""
    load_env()
    setup_tracing()


cli.add_command(extract_promises_cmd)
cli.add_command(embed_promises_cmd)
cli.add_command(embed_votes_cmd)
cli.add_command(match_promises_cmd)


if __name__ == "__main__":
    cli()
