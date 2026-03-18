/**
 * Deep dive into specific prediction opportunities
 * Run with: cd backend && bun run scripts/prediction-deep-dive.ts
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

  // 1. Arbetskraftsinvandring - HD0387 / HD01SfU12
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('1. ARBETSKRAFTSINVANDRING (HD0387 → HD01SfU12)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const arbetskraft = await client.query(`
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
    WHERE dok_id IN ('HD0387', 'HD01SfU12')
    ORDER BY datum
  `);
  arbetskraft.rows.forEach(r => {
    console.log(`[${r.dok_id}] ${r.titel}`);
    console.log(`  Date: ${r.datum} | Committee: ${r.organ}`);
    console.log(`  Debate: ${r.debattdag || 'N/A'} | Decision: ${r.beslutsdag || 'PENDING'}`);
    if (r.summary) console.log(`  Summary: ${r.summary.slice(0, 200)}...`);
    console.log();
  });

  // Check for motions on this topic
  const arbetskraftMotions = await client.query(`
    SELECT 
      ds.dokument__dok_id as dok_id,
      ds.dokument__titel as titel,
      ds.dokument__datum as datum,
      STRING_AGG(DISTINCT di.partibet, ', ') as parties
    FROM main_stg.stg_dokumentstatus ds
    LEFT JOIN main_stg.stg_dokumentstatus_intressent di ON di._dlt_root_id = ds._dlt_id
    WHERE ds.dokument__dok_id LIKE 'HD02%'
      AND (
        ds.dokument__titel ILIKE '%arbetskraftsinvandring%'
        OR ds.dokument__titel ILIKE '%arbetskraft%invandring%'
      )
    GROUP BY ds.dokument__dok_id, ds.dokument__titel, ds.dokument__datum
    ORDER BY ds.dokument__datum DESC
    LIMIT 10
  `);
  console.log('Related motions:');
  arbetskraftMotions.rows.forEach(m => {
    console.log(`  [${m.datum?.slice(0,10)}] ${m.dok_id}: ${m.titel?.slice(0, 50)} (${m.parties})`);
  });

  // 2. Klimatpolitik - HD01MJU16
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('2. KLIMATPOLITIK (HD01MJU16)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const klimat = await client.query(`
    SELECT 
      dok_id,
      titel,
      datum,
      organ,
      debattdag,
      beslutsdag,
      status
    FROM main_stg.stg_dokumentlista
    WHERE dok_id = 'HD01MJU16'
  `);
  klimat.rows.forEach(r => {
    console.log(`[${r.dok_id}] ${r.titel}`);
    console.log(`  Date: ${r.datum} | Committee: ${r.organ}`);
    console.log(`  Debate: ${r.debattdag || 'N/A'} | Decision: ${r.beslutsdag || 'PENDING'}`);
  });

  // Historical voting on climate
  const klimatVotes = await client.query(`
    SELECT 
      v.dok_id,
      v.beteckning,
      v.punkt,
      v.parti,
      v.rost,
      COUNT(*) as cnt
    FROM main_stg.stg_voteringlista v
    WHERE v.beteckning ILIKE '%MJU%'
      AND v.systemdatum >= '2024-01-01'
    GROUP BY v.dok_id, v.beteckning, v.punkt, v.parti, v.rost
    ORDER BY v.dok_id DESC, v.punkt, v.parti
    LIMIT 50
  `);
  console.log('\nRecent MJU votes (climate/environment committee):');
  let currentDok = '';
  klimatVotes.rows.forEach(v => {
    if (v.dok_id !== currentDok) {
      currentDok = v.dok_id;
      console.log(`\n  ${v.dok_id} - ${v.beteckning}:`);
    }
    console.log(`    Punkt ${v.punkt}: ${v.parti} = ${v.rost} (${v.cnt})`);
  });

  // 3. Euro-debatten - Särskild debatt
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('3. EURO-DEBATTEN (Särskild debatt)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const euroDebate = await client.query(`
    SELECT 
      parti,
      COUNT(*) as speeches,
      COUNT(DISTINCT intressent_id) as speakers
    FROM main_mart.mart_person_timeline
    WHERE action_type = 'speech'
      AND subject_title ILIKE '%euro%'
      AND action_date >= '2025-01-01'
    GROUP BY parti
    ORDER BY speeches DESC
  `);
  console.log('Party engagement in Euro debate:');
  euroDebate.rows.forEach(e => {
    console.log(`  ${e.parti}: ${e.speeches} speeches by ${e.speakers} speakers`);
  });

  // Sample quotes from euro debate
  const euroQuotes = await client.query(`
    SELECT 
      namn,
      parti,
      action_date,
      LEFT(speech_text_clean, 400) as excerpt
    FROM main_mart.mart_person_timeline
    WHERE action_type = 'speech'
      AND subject_title ILIKE '%euro%'
      AND action_date >= '2025-01-01'
      AND speech_text_clean IS NOT NULL
    ORDER BY action_date DESC
    LIMIT 5
  `);
  console.log('\nRecent euro debate quotes:');
  euroQuotes.rows.forEach(q => {
    console.log(`\n  [${q.action_date?.slice(0,10)}] ${q.namn} (${q.parti}):`);
    console.log(`  "${q.excerpt?.slice(0, 200)}..."`);
  });

  // 4. Unga lagöverträdare - potential for interesting vote
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('4. UNGA LAGÖVERTRÄDARE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const ungaLag = await client.query(`
    SELECT 
      dok_id,
      titel,
      datum,
      organ,
      debattdag,
      beslutsdag
    FROM main_stg.stg_dokumentlista
    WHERE titel ILIKE '%unga lagöverträdare%'
      AND datum >= '2025-01-01'
    ORDER BY datum DESC
    LIMIT 5
  `);
  ungaLag.rows.forEach(u => {
    console.log(`[${u.dok_id}] ${u.titel}`);
    console.log(`  Date: ${u.datum} | Decision: ${u.beslutsdag || 'PENDING'}`);
  });

  // Party positions from speeches
  const ungaLagSpeeches = await client.query(`
    SELECT 
      parti,
      COUNT(*) as speeches,
      STRING_AGG(DISTINCT namn, ', ') as speakers
    FROM main_mart.mart_person_timeline
    WHERE action_type = 'speech'
      AND subject_title ILIKE '%unga lagöverträdare%'
      AND action_date >= '2025-01-01'
    GROUP BY parti
    ORDER BY speeches DESC
  `);
  console.log('\nParty engagement:');
  ungaLagSpeeches.rows.forEach(s => {
    console.log(`  ${s.parti}: ${s.speeches} speeches (${s.speakers?.slice(0, 50)})`);
  });

  // 5. Historical voting patterns - predict based on past behavior
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('5. HISTORICAL VOTING PATTERNS BY COMMITTEE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const votingPatterns = await client.query(`
    WITH vote_summary AS (
      SELECT 
        SUBSTRING(beteckning FROM '[A-Za-z]+') as committee,
        parti,
        rost,
        COUNT(*) as votes
      FROM main_stg.stg_voteringlista
      WHERE systemdatum >= '2024-01-01'
        AND rost IN ('Ja', 'Nej', 'Avstår')
      GROUP BY SUBSTRING(beteckning FROM '[A-Za-z]+'), parti, rost
    )
    SELECT 
      committee,
      parti,
      SUM(CASE WHEN rost = 'Ja' THEN votes ELSE 0 END) as ja,
      SUM(CASE WHEN rost = 'Nej' THEN votes ELSE 0 END) as nej,
      SUM(CASE WHEN rost = 'Avstår' THEN votes ELSE 0 END) as avstar
    FROM vote_summary
    WHERE committee IN ('SfU', 'MJU', 'JuU', 'AU')
    GROUP BY committee, parti
    ORDER BY committee, parti
  `);
  
  let currentCommittee = '';
  console.log('Voting patterns by committee (2024-2026):');
  votingPatterns.rows.forEach(v => {
    if (v.committee !== currentCommittee) {
      currentCommittee = v.committee;
      console.log(`\n  ${v.committee}:`);
    }
    const total = parseInt(v.ja) + parseInt(v.nej) + parseInt(v.avstar);
    const jaRate = ((parseInt(v.ja) / total) * 100).toFixed(0);
    console.log(`    ${v.parti.padEnd(3)}: Ja ${jaRate}% (${v.ja}/${total})`);
  });

  // 6. Mandate distribution for prediction
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('6. CURRENT MANDATE DISTRIBUTION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const mandates = await client.query(`
    SELECT 
      parti,
      COUNT(DISTINCT intressent_id) as ledamoter
    FROM main_mart.mart_person_timeline
    WHERE action_date >= '2025-01-01'
      AND parti IS NOT NULL
      AND parti != ''
    GROUP BY parti
    ORDER BY ledamoter DESC
  `);
  console.log('Active parliamentarians by party:');
  let total = 0;
  mandates.rows.forEach(m => {
    total += parseInt(m.ledamoter);
    console.log(`  ${m.parti}: ${m.ledamoter}`);
  });
  console.log(`  TOTAL: ${total}`);

  await client.end();
  console.log('\n\n✅ Analysis complete!');
}

main().catch(console.error);
