/**
 * Bill Tracker: Proposition → Beslut Pipeline
 * 
 * Goal: Build a complete legislative lifecycle view
 * Proposition → Utskott → Betänkande → Debatt → Röstning → Beslut
 * 
 * Run with: cd backend && bun run scripts/bill-tracker.ts
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

  // ============================================================
  // 1. Understand the data model - how are docs connected?
  // ============================================================
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('1. DATA MODEL EXPLORATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Check dokumentstatus_referens for document relationships
  const refs = await client.query(`
    SELECT 
      referenstyp,
      COUNT(*) as cnt
    FROM main_stg.stg_dokumentstatus_referens
    GROUP BY referenstyp
    ORDER BY cnt DESC
    LIMIT 20
  `);

  console.log('Document reference types (how docs link to each other):');
  refs.rows.forEach(r => console.log(`  ${r.cnt}x: ${r.referenstyp}`));

  // ============================================================
  // 2. Track a specific proposition through the system
  // ============================================================
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('2. CASE STUDY: Strandskydd proposition (HC03102)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Get the proposition details
  const prop = await client.query(`
    SELECT 
      dok_id,
      titel,
      datum,
      organ,
      typ,
      subtyp,
      status,
      summary
    FROM main_stg.stg_dokumentlista
    WHERE dok_id = 'HC03102'
  `);

  if (prop.rows.length > 0) {
    const p = prop.rows[0];
    console.log('PROPOSITION:');
    console.log(`  ID: ${p.dok_id}`);
    console.log(`  Title: ${p.titel}`);
    console.log(`  Date: ${p.datum}`);
    console.log(`  Organ: ${p.organ}`);
    console.log(`  Status: ${p.status}`);
    console.log(`  Summary: ${p.summary?.slice(0, 200)}...`);
  }

  // Find all documents that reference this proposition
  const relatedDocs = await client.query(`
    SELECT 
      r.referenstyp,
      r.ref_dok_id,
      d.titel,
      d.typ,
      d.datum,
      d.organ
    FROM main_stg.stg_dokumentstatus_referens r
    LEFT JOIN main_stg.stg_dokumentlista d ON d.dok_id = r.ref_dok_id
    WHERE r._dlt_root_id IN (
      SELECT _dlt_id FROM main_stg.stg_dokumentstatus WHERE dokument__dok_id = 'HC03102'
    )
    ORDER BY d.datum
  `);

  console.log('\n\nRELATED DOCUMENTS:');
  relatedDocs.rows.forEach(r => {
    const date = r.datum ? new Date(r.datum).toISOString().slice(0, 10) : 'N/A';
    console.log(`  [${date}] ${r.referenstyp}: ${r.ref_dok_id} (${r.typ}) - ${r.titel?.slice(0, 60)}`);
  });

  // Find documents that reference HC03102
  const referencingDocs = await client.query(`
    SELECT 
      ds.dokument__dok_id as dok_id,
      ds.dokument__titel as titel,
      ds.dokument__typ as typ,
      ds.dokument__datum as datum,
      r.referenstyp
    FROM main_stg.stg_dokumentstatus_referens r
    JOIN main_stg.stg_dokumentstatus ds ON ds._dlt_id = r._dlt_root_id
    WHERE r.ref_dok_id = 'HC03102'
    ORDER BY ds.dokument__datum
  `);

  console.log('\n\nDOCUMENTS REFERENCING THIS PROPOSITION:');
  referencingDocs.rows.forEach(r => {
    const date = r.datum ? new Date(r.datum).toISOString().slice(0, 10) : 'N/A';
    console.log(`  [${date}] ${r.dok_id} (${r.typ}) - ${r.titel?.slice(0, 60)}`);
  });

  // ============================================================
  // 3. Find the betänkande that processed this proposition
  // ============================================================
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('3. BETÄNKANDE (Committee Report)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const betankande = await client.query(`
    SELECT 
      ds.dokument__dok_id as dok_id,
      ds.dokument__titel as titel,
      ds.dokument__typ as typ,
      ds.dokument__datum as datum,
      ds.dokument__organ as organ,
      d.beslutsdag,
      d.debattdag
    FROM main_stg.stg_dokumentstatus_referens r
    JOIN main_stg.stg_dokumentstatus ds ON ds._dlt_id = r._dlt_root_id
    LEFT JOIN main_stg.stg_dokumentlista d ON d.dok_id = ds.dokument__dok_id
    WHERE r.ref_dok_id = 'HC03102'
      AND ds.dokument__typ = 'bet'
  `);

  if (betankande.rows.length > 0) {
    const b = betankande.rows[0];
    console.log('BETÄNKANDE:');
    console.log(`  ID: ${b.dok_id}`);
    console.log(`  Title: ${b.titel}`);
    console.log(`  Committee: ${b.organ}`);
    console.log(`  Date: ${b.datum}`);
    console.log(`  Debate day: ${b.debattdag}`);
    console.log(`  Decision day: ${b.beslutsdag}`);

    // Get utskottsförslag (committee recommendations)
    const forslag = await client.query(`
      SELECT 
        rubrik,
        forslag,
        beslutstyp,
        vinnare
      FROM main_stg.stg_dokumentstatus_utskottsforslag
      WHERE _dlt_root_id IN (
        SELECT _dlt_id FROM main_stg.stg_dokumentstatus WHERE dokument__dok_id = $1
      )
    `, [b.dok_id]);

    console.log('\n  COMMITTEE RECOMMENDATIONS:');
    forslag.rows.forEach((f, i) => {
      console.log(`\n  ${i + 1}. ${f.rubrik}`);
      console.log(`     Decision type: ${f.beslutstyp}`);
      console.log(`     Winner: ${f.vinnare}`);
      console.log(`     Proposal: ${f.forslag?.slice(0, 100)}...`);
    });
  }

  // ============================================================
  // 4. Find votes on this betänkande
  // ============================================================
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('4. VOTES');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (betankande.rows.length > 0) {
    const betId = betankande.rows[0].dok_id;
    
    const votes = await client.query(`
      SELECT 
        v.punkt,
        v.rost as vote,
        v.parti,
        COUNT(*) as cnt
      FROM main_stg.stg_voteringlista v
      WHERE v.dok_id = $1
      GROUP BY v.punkt, v.rost, v.parti
      ORDER BY v.punkt, v.parti
    `, [betId]);

    console.log(`Votes on ${betId}:`);
    let currentPunkt = '';
    votes.rows.forEach(v => {
      if (v.punkt !== currentPunkt) {
        currentPunkt = v.punkt;
        console.log(`\n  Punkt ${v.punkt}:`);
      }
      console.log(`    ${v.parti}: ${v.cnt} ${v.vote}`);
    });
  }

  // ============================================================
  // 5. Find motions filed in response
  // ============================================================
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('5. FOLLOW-UP MOTIONS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const followupMotions = await client.query(`
    SELECT 
      ds.dokument__dok_id as dok_id,
      ds.dokument__titel as titel,
      ds.dokument__datum as datum,
      STRING_AGG(DISTINCT di.partibet, ', ') as parties
    FROM main_stg.stg_dokumentstatus_referens r
    JOIN main_stg.stg_dokumentstatus ds ON ds._dlt_id = r._dlt_root_id
    LEFT JOIN main_stg.stg_dokumentstatus_intressent di ON di._dlt_root_id = ds._dlt_id
    WHERE r.ref_dok_id = 'HC03102'
      AND ds.dokument__typ = 'mot'
    GROUP BY ds.dokument__dok_id, ds.dokument__titel, ds.dokument__datum
    ORDER BY ds.dokument__datum
  `);

  console.log('Motions filed in response to the proposition:');
  followupMotions.rows.forEach(m => {
    const date = m.datum ? new Date(m.datum).toISOString().slice(0, 10) : 'N/A';
    console.log(`  [${date}] ${m.dok_id} (${m.parties}): ${m.titel}`);
  });

  // ============================================================
  // 6. Build complete timeline
  // ============================================================
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('6. COMPLETE LEGISLATIVE TIMELINE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const timeline = await client.query(`
    WITH prop_events AS (
      -- The proposition itself
      SELECT 
        datum as event_date,
        'PROPOSITION' as event_type,
        dok_id,
        titel,
        NULL as extra
      FROM main_stg.stg_dokumentlista
      WHERE dok_id = 'HC03102'
      
      UNION ALL
      
      -- Related documents (motions, betänkanden)
      SELECT 
        ds.dokument__datum as event_date,
        CASE ds.dokument__typ 
          WHEN 'mot' THEN 'MOTION'
          WHEN 'bet' THEN 'BETÄNKANDE'
          ELSE UPPER(ds.dokument__typ)
        END as event_type,
        ds.dokument__dok_id as dok_id,
        ds.dokument__titel as titel,
        ds.dokument__organ as extra
      FROM main_stg.stg_dokumentstatus_referens r
      JOIN main_stg.stg_dokumentstatus ds ON ds._dlt_id = r._dlt_root_id
      WHERE r.ref_dok_id = 'HC03102'
      
      UNION ALL
      
      -- Speeches mentioning strandskydd around this time
      SELECT DISTINCT
        action_date as event_date,
        'DEBATE' as event_type,
        NULL as dok_id,
        subject_title as titel,
        parti as extra
      FROM main_mart.mart_person_timeline
      WHERE action_type = 'speech'
        AND action_date >= '2025-02-01'
        AND action_date <= '2025-05-01'
        AND speech_text_clean ILIKE '%strandskydd%'
    )
    SELECT * FROM prop_events
    WHERE event_date IS NOT NULL
    ORDER BY event_date
  `);

  console.log('TIMELINE: Strandskydd Proposition (HC03102)\n');
  console.log('Date       | Event        | ID        | Description');
  console.log('-----------|--------------|-----------|------------------------------------------');
  timeline.rows.forEach(e => {
    const date = new Date(e.event_date).toISOString().slice(0, 10);
    const id = (e.dok_id || '').padEnd(9);
    const type = e.event_type.padEnd(12);
    const desc = (e.titel || '').slice(0, 40);
    console.log(`${date} | ${type} | ${id} | ${desc}`);
  });

  // ============================================================
  // 7. Find other recent propositions to track
  // ============================================================
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('7. OTHER ACTIVE PROPOSITIONS (2025)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const recentProps = await client.query(`
    SELECT 
      dok_id,
      titel,
      datum,
      organ,
      status
    FROM main_stg.stg_dokumentlista
    WHERE typ = 'prop'
      AND datum >= '2025-01-01'
    ORDER BY datum DESC
    LIMIT 20
  `);

  console.log('Recent propositions:');
  recentProps.rows.forEach(p => {
    const date = p.datum ? new Date(p.datum).toISOString().slice(0, 10) : 'N/A';
    console.log(`  [${date}] ${p.dok_id}: ${p.titel?.slice(0, 60)}`);
  });

  await client.end();
  console.log('\n\n✅ Analysis complete!');
}

main().catch(console.error);
