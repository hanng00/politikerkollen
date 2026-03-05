-- Staging model for source_embeddings (motions and propositions)
-- Source: cognition module using OpenAI text-embedding-3-small
--
-- Source documents contain the substantive policy content that promises
-- are matched against. Each document links to votes via int_vote_source_links.

select
    dok_id,
    dok_typ,
    rm,
    riksmote_year,
    titel,
    parti,
    dokument_url,
    embedded_at,
    model_version

from {{ source('cognition', 'source_embeddings') }}
