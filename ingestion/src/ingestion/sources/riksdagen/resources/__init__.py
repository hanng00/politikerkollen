"""
Riksdagen API resource definitions.

Each resource module provides:
- get_resource(): Returns dlt resource configuration
- requires_pagination(): Whether the resource needs pagination
- get_paginator(): Returns paginator instance
- create_source(): Factory to create dlt source

Available resources:
- dokumentlista: Documents (decisions, propositions, motions, protocols)
- dokumentstatus: Detailed document status (child of dokumentlista)
- personlista: Members of Parliament
- anforandelista: Speeches from debates
- anforande: Full speech text (child of anforandelista)
- voteringlista: Voting records
"""

from . import dokumentlista, dokumentstatus, personlista, anforandelista, anforande, voteringlista

__all__ = ["dokumentlista", "dokumentstatus", "personlista", "anforandelista", "anforande", "voteringlista"]

