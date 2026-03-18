/**
 * Energy sector prediction analysis
 * Run with: cd backend && bun run scripts/energy-prediction.ts
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
  console.log('Connected\n');

  // 1. Energy-related propositions
  console.log('=== ENERGY PROPOSITIONS (2025-2026) ===\n');
  const props = await client.query(`
    SELECT dok_id, titel, datum, organ, debattdag, beslutsdag
    FROM main_stg.stg_dokumentlista
    WHERE typ = 'prop'
      AND datum >= '2025-01-01'
      AND (
        titel ILIKE '%kärnkraft%' OR titel ILIKE '%vindkraft%' 
        OR titel ILIKE '%energi%' OR titel ILIKE '%elnät%'
        OR titel ILIKE '%elproduktion%' OR titel ILIKE '%kraftvärme%'
      )
    ORDER BY datum DESC
  `);
  props.rows.forEach(p => {
    console.log(`[${p.datum?.toString().slice(0,10)}] ${p.dok_id}: ${p.titel}`);
    console.log(`  Decision: ${p.beslutsdag || 'PENDING'}\n`);
  });

  // 2. Energy betänkanden
  console.log('\n=== ENERGY BETÄNKANDEN ===\n');
  const bets = await client.query(`
    SELECT dok_id, titel, datum, organ, debattdag, beslutsdag
    FROM main_stg.stg_dokumentlista
    WHERE typ = 'bet'
      AND datum >= '2025-01-01'
      AND (
        titel ILIKE '%kärnkraft%' OR titel ILIKE '%vindkraft%' 
        OR titel ILIKE '%energi%' OR titel ILIKE '%elnät%'
        OR organ = 'NU'
      )
    ORDER BY datum DESC
    LIMIT 20
  `);
  bets.rows.forEach(b => {
    console.log(`[${b.datum?.toString().slice(0,10)}] ${b.dok_id}: ${b.titel?.slice(0,60)}`);
    console.log(`  Committee: ${b.organ} | Decision: ${b.beslutsdag || 'PENDING'}\n`);
  });

  // 3. Party rhetoric on nuclear
  console.log('\n=== KÄRNKRAFT RHETORIC BY PARTY (2025) ===\n');
  const nuclear = await client.query(`
    SELECT 
      parti,
      COUNT(*) as mentions,
      COUNT(DISTINCT intressent_id) as speakers
    FROM main_mart.mart_person_timeline
    WHERE action_type = 'speech'
      AND action_date >= '2025-01-01'
      AND speech_text_clean ILIKE '%kärnkraft%'
    GROUP BY parti
    ORDER BY mentions DESC
  `);
  nuclear.rows.forEach(n => {
    console.log(`  ${n.parti}: ${n.mentions} mentions by ${n.speakers} speakers`);
  });

  // 4. Party rhetoric on wind
  console.log('\n=== VINDKRAFT RHETORIC BY PARTY (2025) ===\n');
  const wind = await client.query(`
    SELECT 
      parti,
      COUNT(*) as mentions,
      COUNT(DISTINCT intressent_id) as speakers
    FROM main_mart.mart_person_timeline
    WHERE action_type = 'speech'
      AND action_date >= '2025-01-01'
      AND speech_text_clean ILIKE '%vindkraft%'
    GROUP BY parti
    ORDER BY mentions DESC
  `);
  wind.rows.forEach(w => {
    console.log(`  ${w.parti}: ${w.mentions} mentions by ${w.speakers} speakers`);
  });

  // 5. Recent energy debates
  console.log('\n=== RECENT ENERGY DEBATES ===\n');
  const debates = await client.query(`
    SELECT 
      subject_title,
      COUNT(*) as speeches,
      STRING_AGG(DISTINCT parti, ', ') as parties
    FROM main_mart.mart_person_timeline
    WHERE action_type = 'speech'
      AND action_date >= '2025-06-01'
      AND (
        subject_title ILIKE '%energi%' 
        OR subject_title ILIKE '%kärnkraft%'
        OR subject_title ILIKE '%vindkraft%'
        OR subject_title ILIKE '%elnät%'
      )
    GROUP BY subject_title
    ORDER BY speeches DESC
    LIMIT 10
  `);
  debates.rows.forEach(d => {
    console.log(`${d.speeches} speeches: ${d.subject_title?.slice(0,60)}`);
    console.log(`  Parties: ${d.parties}\n`);
  });

  // 6. NU committee voting patterns
  console.log('\n=== NU (NÄRINGSUTSKOTTET) VOTING PATTERNS ===\n');
  const nuVotes = await client.query(`
    SELECT 
      parti,
      SUM(CASE WHEN rost = 'Ja' THEN 1 ELSE 0 END) as ja,
      SUM(CASE WHEN rost = 'Nej' THEN 1 ELSE 0 END) as nej,
      SUM(CASE WHEN rost = 'Avstår' THEN 1 ELSE 0 END) as avstar,
      COUNT(*) as total
    FROM main_stg.stg_voteringlista
    WHERE beteckning LIKE '%NU%'
      AND systemdatum >= '2024-01-01'
    GROUP BY parti
    ORDER BY total DESC
  `);
  nuVotes.rows.forEach(v => {
    const jaRate = ((parseInt(v.ja) / parseInt(v.total)) * 100).toFixed(0);
    console.log(`  ${v.parti}: ${jaRate}% Ja (${v.ja}/${v.total})`);
  });

  // 7. Key quotes
  console.log('\n=== KEY ENERGY QUOTES (recent) ===\n');
  const quotes = await client.query(`
    SELECT 
      namn, parti, action_date,
      LEFT(speech_text_clean, 300) as excerpt
    FROM main_mart.mart_person_timeline
    WHERE action_type = 'speech'
      AND action_date >= '2025-09-01'
      AND (
        speech_text_clean ILIKE '%kärnkraft%investering%'
        OR speech_text_clean ILIKE '%ny kärnkraft%'
        OR speech_text_clean ILIKE '%kärnkraftsatsning%'
      )
    ORDER BY action_date DESC
    LIMIT 5
  `);
  quotes.rows.forEach(q => {
    console.log(`[${q.action_date?.toString().slice(0,10)}] ${q.namn} (${q.parti}):`);
    console.log(`"${q.excerpt}..."\n`);
  });

  await client.end();
  console.log('\nDone!');
}

main().catch(console.error);
