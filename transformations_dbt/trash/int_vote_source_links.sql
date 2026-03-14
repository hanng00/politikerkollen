-- Int: Vote Source Links
-- 
-- ⚠️  DEPRECATED: This model has a broken lineage. Use int_punkt_motion_decisions instead.
--
-- The problem: This model cross-joins ALL motions that a betänkande "behandlar" to
-- ALL punkter in that betänkande. But a motion is only decided under a SPECIFIC punkt,
-- not all of them. This leads to incorrect vote attribution.
--
-- The fix: int_punkt_motion_decisions parses the forslag text to extract which
-- specific motions are decided under each punkt.
--
-- This model is kept for backward compatibility with mart_promise_accountability_cards.
-- New code should use int_punkt_motion_decisions + int_motion_party_stance.
--
-- Links each vote (votering_id) to its source documents (motions and propositions).
-- This enables tracing from a vote back to the substantive policy content.
--
-- Join strategy:
--   1. utskottsforslag has votering_id and links to bet via _dlt_root_id
--   2. bet links to source documents (mot/prop) via referens (referenstyp='behandlar')
--   3. Result: votering_id → bet → source_dok_id
--
-- Note: A single vote may decide on multiple source documents (motions/propositions).
-- A single source document may be decided by multiple votes (different punkter).

with utskottsforslag as (
    select
        votering_id,
        _dlt_root_id as bet_dlt_id,
        punkt,
        rubrik,
        vinnare,
        beslutstyp
    from {{ ref('stg_dokumentstatus_utskottsforslag') }}
    where votering_id is not null
),

bet as (
    select
        _dlt_id as bet_dlt_id,
        dokument__dok_id as bet_dok_id,
        dokument__rm as rm,
        dokument__organ as organ
    from {{ ref('stg_dokumentstatus') }}
    where dokument__typ = 'bet'
),

sources as (
    select
        r._dlt_root_id as bet_dlt_id,
        r.ref_dok_id as source_dok_id,
        r.ref_dok_typ as source_dok_typ,
        r.ref_dok_titel as source_titel
    from {{ ref('stg_dokumentstatus_referens') }} r
    where r.referenstyp = 'behandlar'
      and r.ref_dok_typ in ('mot', 'prop')
)

select
    lower(u.votering_id) as votering_id,
    b.bet_dok_id,
    b.rm,
    b.organ,
    u.punkt,
    u.rubrik as punkt_rubrik,
    u.vinnare,
    u.beslutstyp,
    s.source_dok_id,
    s.source_dok_typ,
    s.source_titel,
    
    -- Outcome for this specific source in this vote
    case u.vinnare
        when 'motförslaget' then 'approved'
        when 'utskottet' then 'rejected'
        else case u.beslutstyp
            when 'acklamation' then 'acklamation'
            else 'unknown'
        end
    end as vote_outcome

from utskottsforslag u
join bet b on u.bet_dlt_id = b.bet_dlt_id
join sources s on u.bet_dlt_id = s.bet_dlt_id
