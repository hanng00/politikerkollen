/**
 * Pending energy decisions analysis
 * Run with: cd backend && bun scripts/pending-energy.ts
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

  const pendingIds = ['HD01NU13', 'HD01NU17', 'HD01NU16'];

  for (const betId of pendingIds) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`BETÄNKANDE: ${betId}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Basic info
    const bet = await client.query(`
      SELECT dok_id, titel, datum, organ, debattdag, beslutsdag, summary
      FROM main_stg.stg_dokumentlista
      WHERE dok_id = $1
    `, [betId]);
    
    if (bet.rows[0]) {
      const b = bet.rows[0];
      console.log(`Title: ${b.titel}`);
      console.log(`Date: ${b.datum}`);
      console.log(`Debate: ${b.debattdag || 'TBD'}`);
      console.log(`Decision: ${b.beslutsdag || 'PENDING'}`);
    }

    // Committee recommendations
    const forslag = await client.query(`
      SELECT punkt, rubrik, forslag, beslutstyp, vinnare
      FROM main_stg.stg_dokumentstatus_utskottsforslag
      WHERE _dlt_root_id IN (
        SELECT _dlt_id FROM main_stg.stg_dokumentstatus WHERE dokument__dok_id = $1
      )
      ORDER BY punkt
      LIMIT 10
    `, [betId]);

    if (forslag.rows.length > 0) {
      console.log('\nCommittee recommendations:');
      forslag.rows.forEach(f => {
        console.log(`  Punkt ${f.punkt}: ${f.rubrik?.slice(0,50)}`);
        console.log(`    Type: ${f.beslutstyp} | Winner: ${f.vinnare || 'TBD'}`);
      });
    }

    // Related motions
    const motions = await client.query(`
      SELECT 
        r.ref_dok_id,
        d.titel,
        STRING_AGG(DISTINCT di.partibet, ', ') as parties
      FROM main_stg.stg_dokumentstatus_referens r
      JOIN main_stg.stg_dokumentstatus ds ON ds._dlt_id = r._dlt_root_id
      JOIN main_stg.stg_dokumentlista d ON d.dok_id = r.ref_dok_id
      LEFT JOIN main_stg.stg_dokumentstatus_intressent di ON di._dlt_root_id = (
        SELECT _dlt_id FROM main_stg.stg_dokumentstatus WHERE dokument__dok_id = r.ref_dok_id LIMIT 1
      )
      WHERE ds.dokument__dok_id = $1
        AND d.typ = 'mot'
      GROUP BY r.ref_dok_id, d.titel
      LIMIT 15
    `, [betId]);

    if (motions.rows.length > 0) {
      console.log('\nRelated motions:');
      motions.rows.forEach(m => {
        console.log(`  ${m.ref_dok_id}: ${m.titel?.slice(0,45)} (${m.parties || 'N/A'})`);
      });
    }

    console.log('\n');
  }

  // Historical NU voting patterns for prediction
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('HISTORICAL NU VOTING (for prediction baseline)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const patterns = await client.query(`
    SELECT 
      parti,
      COUNT(*) as total_votes,
      SUM(CASE WHEN rost = 'Ja' THEN 1 ELSE 0 END) as ja,
      SUM(CASE WHEN rost = 'Nej' THEN 1 ELSE 0 END) as nej,
      SUM(CASE WHEN rost = 'Avstår' THEN 1 ELSE 0 END) as avstar
    FROM main_stg.stg_voteringlista
    WHERE beteckning LIKE '%NU%'
      AND systemdatum >= '2025-01-01'
    GROUP BY parti
    ORDER BY total_votes DESC
  `);

  console.log('2025 NU voting patterns:');
  patterns.rows.forEach(p => {
    const total = parseInt(p.total_votes);
    const jaRate = ((parseInt(p.ja) / total) * 100).toFixed(0);
    const nejRate = ((parseInt(p.nej) / total) * 100).toFixed(0);
    console.log(`  ${p.parti.padEnd(3)}: Ja ${jaRate}%, Nej ${nejRate}% (n=${total})`);
  });

  // Mandate count
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('CURRENT MANDATE DISTRIBUTION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const mandates = await client.query(`
    SELECT parti, COUNT(DISTINCT intressent_id) as seats
    FROM main_mart.mart_person_timeline
    WHERE action_date >= '2025-09-01'
      AND parti IS NOT NULL AND parti != ''
    GROUP BY parti
    ORDER BY seats DESC
  `);

  let totalSeats = 0;
  console.log('Seats by party:');
  mandates.rows.forEach(m => {
    totalSeats += parseInt(m.seats);
    console.log(`  ${m.parti}: ${m.seats}`);
  });
  console.log(`  TOTAL: ${totalSeats}`);

  await client.end();
  console.log('\n\nDone!');
}

main().catch(console.error);
