-- Mart: Person Timeline
-- One row per action per person, pre-joined with all context needed for analysis.
-- Designed for contradiction detection: "What did person X say vs do?"
--
-- Action types:
--   - vote: Cast a vote (Ja/Nej/Avstår) on a betänkande punkt
--   - speech: Gave a speech in the chamber
--   - authored: Signed/authored a document (motion, skriftlig fråga, etc.)
--
-- Query pattern: SELECT * FROM mart_person_timeline WHERE intressent_id = 'X' ORDER BY action_date

-- =============================================================================
-- VOTES: Person voted on a betänkande punkt
-- =============================================================================
with votes as (
    select
        v.intressent_id,
        'vote' as action_type,
        cast(v.systemdatum as date) as action_date,
        v.votering_id as action_id,
        
        -- Vote details
        v.rost as vote_value,
        v.punkt as vote_punkt,
        v.avser as vote_avser,
        
        -- What was voted on (from utskottsforslag)
        utf.rubrik as subject_title,
        utf.forslag as subject_text,
        utf.beslutstyp as subject_decision_type,
        utf.vinnare as subject_winner,
        
        -- Parent betänkande
        v.dok_id as betankande_dok_id,
        v.beteckning as betankande_beteckning,
        dl.titel as betankande_titel,
        dl.organ as betankande_organ,
        
        -- No speech text for votes
        null as speech_text,
        null as speech_text_clean,
        null as speech_activity_type,
        null as speech_number,
        null as speech_is_reply,
        null as speech_sub_title,
        null as speech_protocol_url,
        null as speech_debate_type,
        
        -- No authored doc for votes
        null as authored_dok_id,
        null as authored_dok_titel,
        null as authored_dok_typ,
        null as authored_roll,
        null as authored_stakeholders
        
    from {{ ref('stg_voteringlista') }} v
    left join {{ ref('stg_dokumentstatus_utskottsforslag') }} utf 
        on lower(utf.votering_id) = lower(v.votering_id)
    left join {{ ref('stg_dokumentlista') }} dl 
        on dl.dok_id = v.dok_id
    where v.intressent_id is not null
),

-- =============================================================================
-- SPEECHES: Person spoke in the chamber
-- =============================================================================
speeches as (
    select
        a.intressent_id,
        'speech' as action_type,
        cast(a.systemdatum as date) as action_date,
        a.systemnyckel as action_id,
        
        -- No vote details for speeches
        null as vote_value,
        null as vote_punkt,
        null as vote_avser,
        
        -- Subject: what was being debated
        a.avsnittsrubrik as subject_title,
        null as subject_text,
        null as subject_decision_type,
        null as subject_winner,
        
        -- Related document being debated (if any)
        coalesce(a.rel_dok_id_normalized, a.dok_id_normalized) as betankande_dok_id,
        null as betankande_beteckning,
        coalesce(rel_dl.titel, dl.titel) as betankande_titel,
        null as betankande_organ,
        
        -- Speech content
        a.anforandetext as speech_text,
        a.anforandetext_clean as speech_text_clean,
        a.kammaraktivitet as speech_activity_type,
        
        -- Speech context
        a.anforande_nummer as speech_number,
        a.replik as speech_is_reply,
        a.underrubrik as speech_sub_title,
        a.protokoll_url_www as speech_protocol_url,
        coalesce(rel_dl.dokumentnamn, dl.dokumentnamn) as speech_debate_type,
        
        -- No authored doc for speeches
        null as authored_dok_id,
        null as authored_dok_titel,
        null as authored_dok_typ,
        null as authored_roll,
        null as authored_stakeholders
        
    from {{ ref('stg_anforande') }} a
    left join {{ ref('stg_dokumentlista') }} dl 
        on dl.dok_id = a.dok_id_normalized
    left join {{ ref('stg_dokumentlista') }} rel_dl 
        on rel_dl.dok_id = a.rel_dok_id_normalized
    where a.intressent_id is not null
),

-- =============================================================================
-- AUTHORED: Person signed/authored a document
-- =============================================================================
-- Pre-aggregate all stakeholders per document for context
-- stg_dokumentstatus_intressent is already deduplicated at the staging layer
doc_stakeholders as (
    select
        _dlt_root_id,
        to_json(list({
            'intressent_id': intressent_id,
            'namn': namn,
            'parti': partibet,
            'roll': roll,
            'ordning': ordning
        } order by ordning)) as stakeholders
    from {{ ref('stg_dokumentstatus_intressent') }}
    where intressent_id is not null
    group by _dlt_root_id
),

authored as (
    select
        di.intressent_id,
        'authored' as action_type,
        coalesce(
            try_cast(ds.dokument__datum as date),
            try_cast(ds.dokument__publicerad as date),
            try_cast(ds.dokument__systemdatum as date)
        ) as action_date,
        ds.dokument__dok_id as action_id,
        
        -- No vote details
        null as vote_value,
        null as vote_punkt,
        null as vote_avser,
        
        -- Subject: the document itself
        ds.dokument__titel as subject_title,
        null as subject_text,
        null as subject_decision_type,
        null as subject_winner,
        
        -- No betänkande context for authored docs
        null as betankande_dok_id,
        null as betankande_beteckning,
        null as betankande_titel,
        null as betankande_organ,
        
        -- No speech text
        null as speech_text,
        null as speech_text_clean,
        null as speech_activity_type,
        null as speech_number,
        null as speech_is_reply,
        null as speech_sub_title,
        null as speech_protocol_url,
        null as speech_debate_type,
        
        -- Authored document details
        ds.dokument__dok_id as authored_dok_id,
        ds.dokument__titel as authored_dok_titel,
        ds.dokument__dokumentnamn as authored_dok_typ,
        di.roll as authored_roll,
        dsh.stakeholders as authored_stakeholders
        
    from {{ ref('stg_dokumentstatus_intressent') }} di
    inner join {{ ref('stg_dokumentstatus') }} ds 
        on ds._dlt_id = di._dlt_root_id
    left join doc_stakeholders dsh
        on dsh._dlt_root_id = di._dlt_root_id
    where di.intressent_id is not null
      and ds.dokument__dok_id is not null
),

-- =============================================================================
-- UNION ALL action types
-- =============================================================================
all_actions as (
    select * from votes
    union all
    select * from speeches
    union all
    select * from authored
)

-- =============================================================================
-- Final output with person details
-- =============================================================================
select
    -- Person identifiers
    a.intressent_id,
    p.tilltalsnamn,
    p.efternamn,
    p.tilltalsnamn || ' ' || p.efternamn as namn,
    p.parti,
    p.valkrets,
    p.status as person_status,
    
    -- Action metadata
    a.action_type,
    a.action_date,
    a.action_id,
    
    -- Vote-specific (null for non-votes)
    a.vote_value,
    a.vote_punkt,
    a.vote_avser,
    
    -- Subject/context
    a.subject_title,
    a.subject_text,
    a.subject_decision_type,
    a.subject_winner,
    
    -- Betänkande context (for votes and speeches)
    a.betankande_dok_id,
    a.betankande_beteckning,
    a.betankande_titel,
    a.betankande_organ,
    
    -- Speech-specific (null for non-speeches)
    a.speech_text,
    a.speech_text_clean,
    a.speech_activity_type,
    a.speech_number,
    a.speech_is_reply,
    a.speech_sub_title,
    a.speech_protocol_url,
    a.speech_debate_type,
    
    -- Authored-specific (null for non-authored)
    a.authored_dok_id,
    a.authored_dok_titel,
    a.authored_dok_typ,
    a.authored_roll,
    a.authored_stakeholders

from all_actions a
inner join {{ ref('stg_personlista') }} p 
    on p.intressent_id = a.intressent_id
where a.action_date is not null
