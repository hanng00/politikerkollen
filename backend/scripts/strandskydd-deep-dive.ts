/**
 * Deep dive: Strandskydd case study
 * 
 * We have: Feb spike → April votes → August spike
 * Question: Can we tell a causal story?
 * 
 * Run with: cd backend && bun run scripts/strandskydd-deep-dive.ts
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
  // 1. What was the February 2025 spike about?
  // ============================================================
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('1. FEBRUARY 2025 SPIKE - What triggered it?');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const febSpeeches = await client.query(`
    SELECT 
      action_date,
      namn,
      parti,
      subject_title,
      betankande_titel,
      LEFT(speech_text_clean, 300) as excerpt
    FROM main_mart.mart_person_timeline
    WHERE action_type = 'speech'
      AND action_date >= '2025-02-01'
      AND action_date < '2025-03-01'
      AND speech_text_clean ILIKE '%strandskydd%'
    ORDER BY action_date
  `);

  console.log(`Found ${febSpeeches.rows.length} speeches mentioning strandskydd in Feb 2025:\n`);
  
  const febDebates = new Map<string, number>();
  febSpeeches.rows.forEach(r => {
    const key = r.subject_title || r.betankande_titel || 'Unknown';
    febDebates.set(key, (febDebates.get(key) || 0) + 1);
  });
  
  console.log('Debates:');
  [...febDebates.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  ${v}x: ${k}`);
  });

  // ============================================================
  // 2. What was voted on in April 2025?
  // ============================================================
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('2. APRIL 2025 VOTES - What was decided?');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const aprilVotes = await client.query(`
    SELECT 
      action_date,
      subject_title,
      betankande_titel,
      betankande_dok_id,
      vote_value,
      parti,
      COUNT(*) as vote_count
    FROM main_mart.mart_person_timeline
    WHERE action_type = 'vote'
      AND action_date >= '2025-04-01'
      AND action_date < '2025-05-01'
    GROUP BY action_date, subject_title, betankande_titel, betankande_dok_id, vote_value, parti
    ORDER BY action_date, subject_title, parti
    LIMIT 50
  `);

  console.log('All votes in April 2025 (sample):');
  let currentSubject = '';
  aprilVotes.rows.slice(0, 30).forEach(r => {
    const subject = r.subject_title || r.betankande_titel || 'Unknown';
    if (subject !== currentSubject) {
      currentSubject = subject;
      const date = new Date(r.action_date).toISOString().slice(0, 10);
      console.log(`\n[${date}] ${subject}`);
      console.log(`  dok_id: ${r.betankande_dok_id}`);
    }
    console.log(`  ${r.parti}: ${r.vote_count} ${r.vote_value}`);
  });

  // ============================================================
  // 3. What was the August 2025 spike about?
  // ============================================================
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('3. AUGUST 2025 SPIKE - What triggered it?');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const augSpeeches = await client.query(`
    SELECT 
      action_date,
      namn,
      parti,
      subject_title,
      betankande_titel,
      LEFT(speech_text_clean, 400) as excerpt
    FROM main_mart.mart_person_timeline
    WHERE action_type = 'speech'
      AND action_date >= '2025-08-01'
      AND action_date < '2025-09-01'
      AND speech_text_clean ILIKE '%strandskydd%'
    ORDER BY action_date
  `);

  console.log(`Found ${augSpeeches.rows.length} speeches mentioning strandskydd in Aug 2025:\n`);
  
  const augDebates = new Map<string, number>();
  augSpeeches.rows.forEach(r => {
    const key = r.subject_title || r.betankande_titel || 'Unknown';
    augDebates.set(key, (augDebates.get(key) || 0) + 1);
  });
  
  console.log('Debates:');
  [...augDebates.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  ${v}x: ${k}`);
  });

  console.log('\nSample excerpts from August:');
  augSpeeches.rows.slice(0, 5).forEach(r => {
    const date = new Date(r.action_date).toISOString().slice(0, 10);
    console.log(`\n[${date}] ${r.namn} (${r.parti}) - ${r.subject_title}:`);
    console.log(`  "${r.excerpt}..."`);
  });

  // ============================================================
  // 4. What data do we have about the legislative process?
  // ============================================================
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('4. LEGISLATIVE PROCESS DATA - What do we track?');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Check what document types we have
  const docTypes = await client.query(`
    SELECT 
      authored_dok_typ,
      COUNT(*) as cnt
    FROM main_mart.mart_person_timeline
    WHERE action_type = 'authored'
      AND action_date >= '2024-01-01'
    GROUP BY authored_dok_typ
    ORDER BY cnt DESC
    LIMIT 20
  `);

  console.log('Document types we track (authored):');
  docTypes.rows.forEach(r => {
    console.log(`  ${r.cnt}x: ${r.authored_dok_typ}`);
  });

  // Check what we have in stg tables
  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema IN ('main_stg', 'main_int', 'main_mart')
    ORDER BY table_schema, table_name
  `);

  console.log('\n\nAvailable tables:');
  tables.rows.forEach(r => console.log(`  ${r.table_name}`));

  // ============================================================
  // 5. Can we find propositions (prop) related to strandskydd?
  // ============================================================
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('5. PROPOSITIONS - Government bills on strandskydd');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const props = await client.query(`
    SELECT 
      authored_dok_id,
      authored_dok_titel,
      authored_dok_typ,
      action_date,
      namn,
      parti
    FROM main_mart.mart_person_timeline
    WHERE action_type = 'authored'
      AND authored_dok_typ ILIKE '%prop%'
      AND (
        authored_dok_titel ILIKE '%strandskydd%'
        OR authored_dok_titel ILIKE '%strand%'
      )
    ORDER BY action_date DESC
    LIMIT 10
  `);

  console.log('Propositions mentioning strandskydd:');
  props.rows.forEach(r => {
    const date = new Date(r.action_date).toISOString().slice(0, 10);
    console.log(`  [${date}] ${r.authored_dok_id}: ${r.authored_dok_titel}`);
  });

  // Try motions instead
  const motions = await client.query(`
    SELECT 
      authored_dok_id,
      authored_dok_titel,
      authored_dok_typ,
      action_date,
      parti,
      COUNT(DISTINCT intressent_id) as signatories
    FROM main_mart.mart_person_timeline
    WHERE action_type = 'authored'
      AND authored_dok_typ ILIKE '%motion%'
      AND authored_dok_titel ILIKE '%strandskydd%'
      AND action_date >= '2024-01-01'
    GROUP BY authored_dok_id, authored_dok_titel, authored_dok_typ, action_date, parti
    ORDER BY action_date DESC
    LIMIT 15
  `);

  console.log('\n\nMotions on strandskydd (2024-2025):');
  motions.rows.forEach(r => {
    const date = new Date(r.action_date).toISOString().slice(0, 10);
    console.log(`  [${date}] ${r.parti} (${r.signatories} signatories): ${r.authored_dok_titel}`);
  });

  await client.end();
  console.log('\n\n✅ Analysis complete!');
}

main().catch(console.error);
