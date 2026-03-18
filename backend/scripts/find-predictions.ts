/**
 * Find prediction opportunities: pending legislation where outcome is unknown
 * Run with: cd backend && bun run scripts/find-predictions.ts
 */

import pg from 'pg';

const DATABASE = 'spatial_dagster';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Imdzc29uaGFubmVzQGdtYWlsLmNvbSIsIm1kUmVnaW9uIjoiYXdzLXVzLWVhc3QtMSIsInNlc3Npb24iOiJnc3Nvbmhhbm5lcy5nbWFpbC5jb20iLCJwYXQiOiJXSmZkMkJueXI1dk1WWDRpU05vZEhjNW9kUTdUMzBYNUNYSDd1bjlFd3F3IiwidXNlcklkIjoiNTI4MmQyNWEtNDMyYy00NWVlLWE0YTctZjk2ZTc2YWIxYTRhIiwiaXNzIjoibWRfcGF0IiwicmVhZE9ubHkiOmZhbHNlLCJ0b2tlblR5cGUiOiJyZWFkX3dyaXRlIiwiaWF0IjoxNzYzNDY0Mzc2fQ.n0rUaZxsCFCVP88EKNsm9BP681FnOP3gSi1ZwApwe44';

async function main() {
  const client = new pg.Client({
    host: 'pg.us-east-1-aws.motherduck.com',
    port: 5432,
    user: 'postgres',
    password: TOKEN,
    database: DATABASE,
    ssl: { rejectUnauthorized: true },
  });

  await client.connect();
  console.log('Connected to MotherDuck\n');

  // 0. Check data freshness
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('0. DATA FRESHNESS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const freshness = await client.query(`
    SELECT 
      MAX(datum) as latest_doc,
      MAX(beslutsdag) as latest_decision,
      MAX(systemdatum) as latest_system_update
    FROM main_stg.stg_dokumentlista
    WHERE datum IS NOT NULL
  `);
  console.log('Latest document date:', freshness.rows[0].latest_doc);
  console.log('Latest decision date:', freshness.rows[0].latest_decision);
  console.log('Latest system update:', freshness.rows[0].latest_system_update);

  // 1. Propositions without decisions yet
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('1. PENDING PROPOSITIONS (no decision yet)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const pendingProps = await client.query(`
    SELECT 
      dok_id,
      titel,
      datum,
      organ,
      status,
      debattdag,
      beslutsdag
    FROM main_stg.stg_dokumentlista
    WHERE typ = 'prop'
      AND datum >= '2025-01-01'
      AND (beslutsdag IS NULL OR beslutsdag = '' OR TRY_CAST(beslutsdag AS DATE) > CURRENT_DATE)
    ORDER BY datum DESC
    LIMIT 30
  `);

  console.log('Propositions from 2025+ without final decision:');
  pendingProps.rows.forEach(p => {
    const date = p.datum ? new Date(p.datum).toISOString().slice(0, 10) : 'N/A';
    const decision = p.beslutsdag ? new Date(p.beslutsdag).toISOString().slice(0, 10) : 'PENDING';
    console.log(`\n[${date}] ${p.dok_id}: ${p.titel?.slice(0, 60)}`);
    console.log(`  Status: ${p.status || 'N/A'} | Decision: ${decision}`);
  });

  // 2. Betänkanden with upcoming decisions
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('2. BETÄNKANDEN WITH UPCOMING/PENDING DECISIONS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const pendingBet = await client.query(`
    SELECT 
      dok_id,
      titel,
      datum,
      organ,
      debattdag,
      beslutsdag,
      status
    FROM main_stg.stg_dokumentlista
    WHERE typ = 'bet'
      AND datum >= '2025-01-01'
      AND (beslutsdag IS NULL OR beslutsdag = '' OR TRY_CAST(beslutsdag AS DATE) >= CURRENT_DATE)
    ORDER BY beslutsdag NULLS LAST, datum DESC
    LIMIT 30
  `);

  console.log('Betänkanden awaiting decision:');
  pendingBet.rows.forEach(b => {
    const date = b.datum ? new Date(b.datum).toISOString().slice(0, 10) : 'N/A';
    const debate = b.debattdag ? new Date(b.debattdag).toISOString().slice(0, 10) : 'N/A';
    const decision = b.beslutsdag ? new Date(b.beslutsdag).toISOString().slice(0, 10) : 'PENDING';
    console.log(`\n[${date}] ${b.dok_id}: ${b.titel?.slice(0, 60)}`);
    console.log(`  Committee: ${b.organ} | Debate: ${debate} | Decision: ${decision}`);
  });

  // 3. Hot topics: What's being debated NOW?
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('3. HOT TOPICS: Most debated subjects (last 30 days)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const hotTopics = await client.query(`
    SELECT 
      subject_title,
      COUNT(*) as speech_count,
      COUNT(DISTINCT parti) as parties_involved,
      COUNT(DISTINCT intressent_id) as unique_speakers,
      STRING_AGG(DISTINCT parti, ', ') as parties
    FROM main_mart.mart_person_timeline
    WHERE action_type = 'speech'
      AND action_date >= CURRENT_DATE - INTERVAL '30 days'
      AND subject_title IS NOT NULL
    GROUP BY subject_title
    HAVING COUNT(*) >= 5
    ORDER BY speech_count DESC
    LIMIT 20
  `);

  console.log('Most active debates (last 30 days):');
  hotTopics.rows.forEach(t => {
    console.log(`\n${t.speech_count} speeches by ${t.unique_speakers} politicians: ${t.subject_title?.slice(0, 70)}`);
    console.log(`  Parties: ${t.parties}`);
  });

  // 4. Controversial topics: Where parties disagree
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('4. CONTROVERSIAL: Topics with cross-party engagement');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const controversial = await client.query(`
    WITH topic_parties AS (
      SELECT 
        subject_title,
        parti,
        COUNT(*) as speeches
      FROM main_mart.mart_person_timeline
      WHERE action_type = 'speech'
        AND action_date >= CURRENT_DATE - INTERVAL '60 days'
        AND subject_title IS NOT NULL
      GROUP BY subject_title, parti
    )
    SELECT 
      subject_title,
      COUNT(DISTINCT parti) as party_count,
      SUM(speeches) as total_speeches,
      STRING_AGG(parti || '(' || speeches || ')', ', ' ORDER BY speeches DESC) as party_breakdown
    FROM topic_parties
    GROUP BY subject_title
    HAVING COUNT(DISTINCT parti) >= 5 AND SUM(speeches) >= 10
    ORDER BY party_count DESC, total_speeches DESC
    LIMIT 15
  `);

  console.log('Topics engaging multiple parties (potential for interesting votes):');
  controversial.rows.forEach(c => {
    console.log(`\n${c.subject_title?.slice(0, 70)}`);
    console.log(`  ${c.party_count} parties, ${c.total_speeches} speeches: ${c.party_breakdown}`);
  });

  // 5. Upcoming votes: Betänkanden with scheduled decision dates
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('5. SCHEDULED DECISIONS (next 60 days)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const upcoming = await client.query(`
    SELECT 
      dok_id,
      titel,
      organ,
      debattdag,
      beslutsdag
    FROM main_stg.stg_dokumentlista
    WHERE typ = 'bet'
      AND beslutsdag IS NOT NULL 
      AND beslutsdag != ''
      AND TRY_CAST(beslutsdag AS DATE) >= CURRENT_DATE
      AND TRY_CAST(beslutsdag AS DATE) <= CURRENT_DATE + INTERVAL '60 days'
    ORDER BY beslutsdag
    LIMIT 20
  `);

  console.log('Betänkanden with scheduled decisions:');
  upcoming.rows.forEach(u => {
    const debate = u.debattdag ? new Date(u.debattdag).toISOString().slice(0, 10) : 'N/A';
    const decision = new Date(u.beslutsdag).toISOString().slice(0, 10);
    console.log(`\n[${decision}] ${u.dok_id}: ${u.titel?.slice(0, 60)}`);
    console.log(`  Committee: ${u.organ} | Debate: ${debate}`);
  });

  // 6. Find propositions that have motions but no betänkande yet
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('6. PROPOSITIONS IN COMMITTEE (have motions, awaiting betänkande)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const inCommittee = await client.query(`
    WITH prop_motions AS (
      SELECT 
        p.dok_id as prop_id,
        p.titel as prop_titel,
        p.datum as prop_date,
        COUNT(DISTINCT m.dok_id) as motion_count
      FROM main_stg.stg_dokumentlista p
      LEFT JOIN main_stg.stg_dokumentstatus_referens r ON r.ref_dok_id = p.dok_id
      LEFT JOIN main_stg.stg_dokumentstatus ds ON ds._dlt_id = r._dlt_root_id
      LEFT JOIN main_stg.stg_dokumentlista m ON m.dok_id = ds.dokument__dok_id AND m.typ = 'mot'
      WHERE p.typ = 'prop'
        AND p.datum >= '2025-06-01'
      GROUP BY p.dok_id, p.titel, p.datum
    ),
    prop_betankande AS (
      SELECT DISTINCT
        r.ref_dok_id as prop_id,
        b.dok_id as bet_id
      FROM main_stg.stg_dokumentstatus_referens r
      JOIN main_stg.stg_dokumentstatus ds ON ds._dlt_id = r._dlt_root_id
      JOIN main_stg.stg_dokumentlista b ON b.dok_id = ds.dokument__dok_id AND b.typ = 'bet'
    )
    SELECT 
      pm.prop_id,
      pm.prop_titel,
      pm.prop_date,
      pm.motion_count,
      pb.bet_id
    FROM prop_motions pm
    LEFT JOIN prop_betankande pb ON pb.prop_id = pm.prop_id
    WHERE pb.bet_id IS NULL
    ORDER BY pm.prop_date DESC
    LIMIT 20
  `);

  console.log('Recent propositions still in committee process:');
  inCommittee.rows.forEach(p => {
    const date = new Date(p.prop_date).toISOString().slice(0, 10);
    console.log(`\n[${date}] ${p.prop_id}: ${p.prop_titel?.slice(0, 60)}`);
    console.log(`  Follow-up motions: ${p.motion_count}`);
  });

  // 7. Rhetorical intensity: Topics with increasing mentions
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('7. RISING TOPICS: Keywords with increasing mentions');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const risingTopics = await client.query(`
    WITH monthly_mentions AS (
      SELECT 
        DATE_TRUNC('month', action_date) as month,
        CASE 
          WHEN speech_text_clean ILIKE '%kärnkraft%' THEN 'kärnkraft'
          WHEN speech_text_clean ILIKE '%vindkraft%' THEN 'vindkraft'
          WHEN speech_text_clean ILIKE '%migration%' OR speech_text_clean ILIKE '%invandring%' THEN 'migration'
          WHEN speech_text_clean ILIKE '%nato%' THEN 'NATO'
          WHEN speech_text_clean ILIKE '%försvar%' THEN 'försvar'
          WHEN speech_text_clean ILIKE '%klimat%' THEN 'klimat'
          WHEN speech_text_clean ILIKE '%gängkriminalitet%' OR speech_text_clean ILIKE '%gängbrott%' THEN 'gängkriminalitet'
          WHEN speech_text_clean ILIKE '%sjukvård%' OR speech_text_clean ILIKE '%vården%' THEN 'sjukvård'
          WHEN speech_text_clean ILIKE '%skatt%' THEN 'skatt'
          WHEN speech_text_clean ILIKE '%pension%' THEN 'pension'
        END as topic
      FROM main_mart.mart_person_timeline
      WHERE action_type = 'speech'
        AND action_date >= CURRENT_DATE - INTERVAL '6 months'
    )
    SELECT 
      topic,
      COUNT(*) FILTER (WHERE month >= CURRENT_DATE - INTERVAL '1 month') as last_month,
      COUNT(*) FILTER (WHERE month >= CURRENT_DATE - INTERVAL '3 months' AND month < CURRENT_DATE - INTERVAL '1 month') / 2.0 as avg_prev_2_months
    FROM monthly_mentions
    WHERE topic IS NOT NULL
    GROUP BY topic
    ORDER BY last_month DESC
  `);

  console.log('Topic intensity (last month vs previous 2-month average):');
  risingTopics.rows.forEach(t => {
    const change = t.avg_prev_2_months > 0 
      ? ((t.last_month / t.avg_prev_2_months - 1) * 100).toFixed(0) 
      : 'N/A';
    const trend = t.last_month > t.avg_prev_2_months ? '📈' : '📉';
    console.log(`  ${trend} ${t.topic}: ${t.last_month} mentions (${change}% vs avg)`);
  });

  await client.end();
  console.log('\n\n✅ Analysis complete!');
}

main().catch(console.error);
