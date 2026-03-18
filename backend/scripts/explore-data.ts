/**
 * Quick data exploration script for rhetorical shift analysis.
 * Run with: cd backend && bun run scripts/explore-data.ts
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

  // 1. What tables do we have?
  console.log('=== AVAILABLE MART TABLES ===');
  const tables = await client.query(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema LIKE '%mart%'
    ORDER BY table_name
  `);
  tables.rows.forEach(r => console.log(`  ${r.table_schema}.${r.table_name}`));

  // 2. How much speech data do we have?
  console.log('\n=== SPEECH DATA VOLUME ===');
  const speechStats = await client.query(`
    SELECT 
      COUNT(*) as total_speeches,
      MIN(action_date) as earliest,
      MAX(action_date) as latest,
      COUNT(DISTINCT intressent_id) as unique_politicians
    FROM main_mart.mart_person_timeline
    WHERE action_type = 'speech'
  `);
  console.log(speechStats.rows[0]);

  // 3. Sample speeches with text
  console.log('\n=== SAMPLE SPEECH (with text) ===');
  const sampleSpeech = await client.query(`
    SELECT 
      namn,
      parti,
      action_date,
      subject_title,
      LEFT(speech_text_clean, 500) as speech_preview
    FROM main_mart.mart_person_timeline
    WHERE action_type = 'speech'
      AND speech_text_clean IS NOT NULL
      AND LENGTH(speech_text_clean) > 100
    ORDER BY action_date DESC
    LIMIT 1
  `);
  console.log(sampleSpeech.rows[0]);

  // 4. Topic distribution - what are politicians talking about?
  console.log('\n=== TOP DEBATE TOPICS (last 6 months) ===');
  const topics = await client.query(`
    SELECT 
      subject_title,
      COUNT(*) as speech_count,
      COUNT(DISTINCT intressent_id) as unique_speakers
    FROM main_mart.mart_person_timeline
    WHERE action_type = 'speech'
      AND action_date >= CURRENT_DATE - INTERVAL '6 months'
      AND subject_title IS NOT NULL
    GROUP BY subject_title
    ORDER BY speech_count DESC
    LIMIT 15
  `);
  topics.rows.forEach(r => console.log(`  ${r.speech_count} speeches by ${r.unique_speakers} politicians: ${r.subject_title}`));

  // 5. Energy/Fastighet keyword search in speeches
  console.log('\n=== ENERGY-RELATED SPEECHES (keyword search, last 12 months) ===');
  const energySpeeches = await client.query(`
    SELECT 
      parti,
      COUNT(*) as mentions,
      COUNT(DISTINCT intressent_id) as unique_speakers
    FROM main_mart.mart_person_timeline
    WHERE action_type = 'speech'
      AND action_date >= CURRENT_DATE - INTERVAL '12 months'
      AND (
        speech_text_clean ILIKE '%kärnkraft%'
        OR speech_text_clean ILIKE '%vindkraft%'
        OR speech_text_clean ILIKE '%elnät%'
      )
    GROUP BY parti
    ORDER BY mentions DESC
  `);
  energySpeeches.rows.forEach(r => console.log(`  ${r.parti}: ${r.mentions} speeches by ${r.unique_speakers} politicians`));

  // 6. Fastighet/Bygg keyword search
  console.log('\n=== FASTIGHET-RELATED SPEECHES (keyword search, last 12 months) ===');
  const fastighetSpeeches = await client.query(`
    SELECT 
      parti,
      COUNT(*) as mentions,
      COUNT(DISTINCT intressent_id) as unique_speakers
    FROM main_mart.mart_person_timeline
    WHERE action_type = 'speech'
      AND action_date >= CURRENT_DATE - INTERVAL '12 months'
      AND (
        speech_text_clean ILIKE '%strandskydd%'
        OR speech_text_clean ILIKE '%bygglov%'
        OR speech_text_clean ILIKE '%bostadsbyggande%'
        OR speech_text_clean ILIKE '%hyresrätt%'
      )
    GROUP BY parti
    ORDER BY mentions DESC
  `);
  fastighetSpeeches.rows.forEach(r => console.log(`  ${r.parti}: ${r.mentions} speeches by ${r.unique_speakers} politicians`));

  // 7. Monthly trend for a specific keyword
  console.log('\n=== MONTHLY TREND: "kärnkraft" mentions ===');
  const karnkraftTrend = await client.query(`
    SELECT 
      DATE_TRUNC('month', action_date) as month,
      COUNT(*) as mentions,
      COUNT(DISTINCT intressent_id) as unique_speakers
    FROM main_mart.mart_person_timeline
    WHERE action_type = 'speech'
      AND action_date >= CURRENT_DATE - INTERVAL '24 months'
      AND speech_text_clean ILIKE '%kärnkraft%'
    GROUP BY DATE_TRUNC('month', action_date)
    ORDER BY month DESC
    LIMIT 12
  `);
  karnkraftTrend.rows.forEach(r => {
    const month = new Date(r.month).toISOString().slice(0, 7);
    console.log(`  ${month}: ${r.mentions} mentions by ${r.unique_speakers} speakers`);
  });

  await client.end();
  console.log('\nDone!');
}

main().catch(console.error);
