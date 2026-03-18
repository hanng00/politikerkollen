/**
 * Get politician data for the strandskydd report
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

  // Get politicians who were involved in strandskydd motions
  const motionAuthors = await client.query(`
    SELECT DISTINCT
      p.intressent_id,
      p.namn,
      p.parti,
      p.bild_url_192
    FROM main_mart.mart_person_timeline t
    JOIN main_mart.mart_person p ON p.intressent_id = t.intressent_id
    WHERE t.action_type = 'authored'
      AND t.authored_dok_id IN ('HC023348', 'HC023349', 'HC023350', 'HC023351')
  `);

  console.log('Motion authors:');
  console.log(JSON.stringify(motionAuthors.rows, null, 2));

  // Get key politicians for the report
  const keyPoliticians = await client.query(`
    SELECT 
      intressent_id,
      namn,
      parti,
      bild_url_192
    FROM main_mart.mart_person
    WHERE namn IN (
      'Ulf Kristersson',
      'Romina Pourmokhtari', 
      'Martin Kinnunen',
      'Rebecka Le Moine',
      'Stina Larsson',
      'Kjell-Arne Ottosson',
      'Magnus Oscarsson',
      'Larry Söder',
      'Emma Nohrén',
      'Markus Wiechel'
    )
  `);

  console.log('\nKey politicians:');
  console.log(JSON.stringify(keyPoliticians.rows, null, 2));

  // Get speeches from the May 2025 debate
  const debateSpeeches = await client.query(`
    SELECT 
      t.action_date,
      t.namn,
      t.parti,
      p.bild_url_192,
      t.subject_title,
      LEFT(t.speech_text_clean, 400) as excerpt
    FROM main_mart.mart_person_timeline t
    JOIN main_mart.mart_person p ON p.intressent_id = t.intressent_id
    WHERE t.action_type = 'speech'
      AND t.action_date >= '2025-05-13'
      AND t.action_date <= '2025-05-14'
      AND t.speech_text_clean ILIKE '%strandskydd%'
    ORDER BY t.action_date, t.speech_number
    LIMIT 10
  `);

  console.log('\nDebate speeches (May 13-14):');
  debateSpeeches.rows.forEach(s => {
    console.log(`\n${s.namn} (${s.parti}):`);
    console.log(`  Image: ${s.bild_url_192}`);
    console.log(`  "${s.excerpt?.slice(0, 200)}..."`);
  });

  await client.end();
}

main().catch(console.error);
