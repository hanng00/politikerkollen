/**
 * Complete Bill Lifecycle: Strandskydd
 * 
 * We found: HC03102 → HC01MJU16 (betänkande)
 * Now let's get the full picture including votes
 * 
 * Run with: cd backend && bun run scripts/strandskydd-complete.ts
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

  const BETANKANDE_ID = 'HC01MJU16';

  // ============================================================
  // 1. Betänkande details
  // ============================================================
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('1. BETÄNKANDE: HC01MJU16');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const bet = await client.query(`
    SELECT 
      dok_id,
      titel,
      datum,
      organ,
      debattdag,
      beslutsdag,
      status,
      summary
    FROM main_stg.stg_dokumentlista
    WHERE dok_id = $1
  `, [BETANKANDE_ID]);

  if (bet.rows.length > 0) {
    const b = bet.rows[0];
    console.log(`ID: ${b.dok_id}`);
    console.log(`Title: ${b.titel}`);
    console.log(`Committee: ${b.organ}`);
    console.log(`Date: ${b.datum}`);
    console.log(`Debate day: ${b.debattdag}`);
    console.log(`Decision day: ${b.beslutsdag}`);
    console.log(`Status: ${b.status}`);
  }

  // ============================================================
  // 2. Committee recommendations (utskottsförslag)
  // ============================================================
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('2. COMMITTEE RECOMMENDATIONS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const forslag = await client.query(`
    SELECT 
      punkt,
      rubrik,
      forslag,
      beslutstyp,
      vinnare,
      votering_id
    FROM main_stg.stg_dokumentstatus_utskottsforslag
    WHERE _dlt_root_id IN (
      SELECT _dlt_id FROM main_stg.stg_dokumentstatus WHERE dokument__dok_id = $1
    )
    ORDER BY punkt
  `, [BETANKANDE_ID]);

  forslag.rows.forEach(f => {
    console.log(`\nPunkt ${f.punkt}: ${f.rubrik}`);
    console.log(`  Decision type: ${f.beslutstyp}`);
    console.log(`  Winner: ${f.vinnare}`);
    console.log(`  Votering ID: ${f.votering_id}`);
    console.log(`  Proposal: ${f.forslag?.slice(0, 150)}...`);
  });

  // ============================================================
  // 3. Votes on this betänkande
  // ============================================================
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('3. VOTES ON BETÄNKANDE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const votes = await client.query(`
    SELECT 
      punkt,
      rost as vote,
      parti,
      COUNT(*) as cnt
    FROM main_stg.stg_voteringlista
    WHERE dok_id = $1
    GROUP BY punkt, rost, parti
    ORDER BY punkt, 
      CASE rost WHEN 'Ja' THEN 1 WHEN 'Nej' THEN 2 WHEN 'Avstår' THEN 3 ELSE 4 END,
      parti
  `, [BETANKANDE_ID]);

  if (votes.rows.length > 0) {
    let currentPunkt = '';
    let jaTotal = 0, nejTotal = 0, avstarTotal = 0;
    
    votes.rows.forEach(v => {
      if (v.punkt !== currentPunkt) {
        if (currentPunkt !== '') {
          console.log(`  TOTAL: Ja=${jaTotal}, Nej=${nejTotal}, Avstår=${avstarTotal}`);
        }
        currentPunkt = v.punkt;
        jaTotal = 0; nejTotal = 0; avstarTotal = 0;
        console.log(`\n  Punkt ${v.punkt}:`);
      }
      
      if (v.vote === 'Ja') jaTotal += parseInt(v.cnt);
      if (v.vote === 'Nej') nejTotal += parseInt(v.cnt);
      if (v.vote === 'Avstår') avstarTotal += parseInt(v.cnt);
      
      console.log(`    ${v.parti.padEnd(3)}: ${v.cnt} ${v.vote}`);
    });
    
    if (currentPunkt !== '') {
      console.log(`  TOTAL: Ja=${jaTotal}, Nej=${nejTotal}, Avstår=${avstarTotal}`);
    }
  } else {
    console.log('No votes found for this betänkande.');
    
    // Try to find any votes around the decision date
    console.log('\nSearching for votes around the decision date...');
    const nearbyVotes = await client.query(`
      SELECT DISTINCT
        dok_id,
        beteckning,
        systemdatum::date as vote_date
      FROM main_stg.stg_voteringlista
      WHERE systemdatum >= '2025-05-01'
        AND systemdatum <= '2025-06-30'
        AND (dok_id ILIKE '%MJU%' OR beteckning ILIKE '%MJU%')
      ORDER BY systemdatum
      LIMIT 20
    `);
    
    console.log('MJU-related votes in May-June 2025:');
    nearbyVotes.rows.forEach(v => {
      console.log(`  [${v.vote_date}] ${v.dok_id} - ${v.beteckning}`);
    });
  }

  // ============================================================
  // 4. Speeches during the debate
  // ============================================================
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('4. DEBATE SPEECHES');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const speeches = await client.query(`
    SELECT 
      action_date,
      namn,
      parti,
      subject_title,
      LEFT(speech_text_clean, 300) as excerpt
    FROM main_mart.mart_person_timeline
    WHERE action_type = 'speech'
      AND (
        betankande_dok_id = $1
        OR subject_title ILIKE '%strandskydd%'
        OR subject_title ILIKE '%MJU16%'
      )
      AND action_date >= '2025-05-01'
      AND action_date <= '2025-06-30'
    ORDER BY action_date, speech_number
    LIMIT 20
  `, [BETANKANDE_ID]);

  console.log('Speeches related to the strandskydd betänkande:');
  speeches.rows.forEach(s => {
    const date = new Date(s.action_date).toISOString().slice(0, 10);
    console.log(`\n[${date}] ${s.namn} (${s.parti}) - ${s.subject_title}:`);
    console.log(`  "${s.excerpt?.slice(0, 200)}..."`);
  });

  // ============================================================
  // 5. Complete timeline with all events
  // ============================================================
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('5. COMPLETE TIMELINE: STRANDSKYDD LEGISLATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const timeline = await client.query(`
    WITH events AS (
      -- Proposition
      SELECT 
        datum::date as event_date,
        'PROPOSITION' as event_type,
        'HC03102' as dok_id,
        'Lättnader i strandskyddet – ett första steg' as description,
        'Regeringen' as actor
      FROM main_stg.stg_dokumentlista
      WHERE dok_id = 'HC03102'
      
      UNION ALL
      
      -- Follow-up motions
      SELECT 
        ds.dokument__datum::date as event_date,
        'MOTION' as event_type,
        ds.dokument__dok_id as dok_id,
        ds.dokument__titel as description,
        STRING_AGG(DISTINCT di.partibet, ', ') as actor
      FROM main_stg.stg_dokumentstatus ds
      LEFT JOIN main_stg.stg_dokumentstatus_intressent di ON di._dlt_root_id = ds._dlt_id
      WHERE ds.dokument__dok_id IN ('HC023348', 'HC023349', 'HC023350', 'HC023351')
      GROUP BY ds.dokument__datum, ds.dokument__dok_id, ds.dokument__titel
      
      UNION ALL
      
      -- Betänkande
      SELECT 
        datum::date as event_date,
        'BETÄNKANDE' as event_type,
        dok_id,
        titel as description,
        organ as actor
      FROM main_stg.stg_dokumentlista
      WHERE dok_id = 'HC01MJU16'
      
      UNION ALL
      
      -- Debate day
      SELECT 
        debattdag::date as event_date,
        'DEBATE' as event_type,
        dok_id,
        'Riksdagsdebatt om ' || titel as description,
        'Riksdagen' as actor
      FROM main_stg.stg_dokumentlista
      WHERE dok_id = 'HC01MJU16'
        AND debattdag IS NOT NULL
      
      UNION ALL
      
      -- Decision day
      SELECT 
        beslutsdag::date as event_date,
        'DECISION' as event_type,
        dok_id,
        'Beslut om ' || titel as description,
        'Riksdagen' as actor
      FROM main_stg.stg_dokumentlista
      WHERE dok_id = 'HC01MJU16'
        AND beslutsdag IS NOT NULL
    )
    SELECT * FROM events
    WHERE event_date IS NOT NULL
    ORDER BY event_date
  `);

  console.log('Date       | Event       | Actor              | Description');
  console.log('-----------|-------------|--------------------|---------------------------------');
  timeline.rows.forEach(e => {
    const date = new Date(e.event_date).toISOString().slice(0, 10);
    const type = e.event_type.padEnd(11);
    const actor = (e.actor || '').slice(0, 18).padEnd(18);
    const desc = (e.description || '').slice(0, 33);
    console.log(`${date} | ${type} | ${actor} | ${desc}`);
  });

  // ============================================================
  // 6. Historical pattern: How long does legislation take?
  // ============================================================
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('6. HISTORICAL PATTERN: Proposition → Decision time');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const processingTime = await client.query(`
    WITH prop_to_bet AS (
      SELECT 
        p.dok_id as prop_id,
        p.datum as prop_date,
        b.dok_id as bet_id,
        b.datum as bet_date,
        b.beslutsdag as decision_date,
        b.organ as committee,
        DATE_PART('day', b.beslutsdag::timestamp - p.datum::timestamp) as days_to_decision
      FROM main_stg.stg_dokumentlista p
      JOIN main_stg.stg_dokumentstatus_referens r ON r.ref_dok_id = p.dok_id
      JOIN main_stg.stg_dokumentstatus ds ON ds._dlt_id = r._dlt_root_id
      JOIN main_stg.stg_dokumentlista b ON b.dok_id = ds.dokument__dok_id
      WHERE p.typ = 'prop'
        AND b.typ = 'bet'
        AND p.datum >= '2024-01-01'
        AND b.beslutsdag IS NOT NULL
    )
    SELECT 
      committee,
      COUNT(*) as num_props,
      ROUND(AVG(days_to_decision)) as avg_days,
      MIN(days_to_decision) as min_days,
      MAX(days_to_decision) as max_days
    FROM prop_to_bet
    WHERE days_to_decision > 0
    GROUP BY committee
    ORDER BY num_props DESC
    LIMIT 15
  `);

  console.log('Average processing time by committee (2024-2025):');
  console.log('Committee                    | Props | Avg days | Min | Max');
  console.log('-----------------------------|-------|----------|-----|-----');
  processingTime.rows.forEach(r => {
    const committee = (r.committee || 'Unknown').slice(0, 28).padEnd(28);
    console.log(`${committee} | ${String(r.num_props).padEnd(5)} | ${String(r.avg_days).padEnd(8)} | ${String(r.min_days).padEnd(3)} | ${r.max_days}`);
  });

  await client.end();
  console.log('\n\n✅ Analysis complete!');
}

main().catch(console.error);
