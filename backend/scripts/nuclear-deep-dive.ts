/**
 * Deep dive: Nuclear financing proposition HC03150
 * Run with: cd backend && bun scripts/nuclear-deep-dive.ts
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

  // 1. The proposition itself
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('PROPOSITION: HC03150 - Kärnkraftsfinansiering');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const prop = await client.query(`
    SELECT dok_id, titel, datum, organ, debattdag, beslutsdag, summary
    FROM main_stg.stg_dokumentlista
    WHERE dok_id = 'HC03150'
  `);
  if (prop.rows[0]) {
    const p = prop.rows[0];
    console.log(`Title: ${p.titel}`);
    console.log(`Date: ${p.datum}`);
    console.log(`Debate: ${p.debattdag || 'N/A'}`);
    console.log(`Decision: ${p.beslutsdag || 'PENDING'}`);
    console.log(`Summary: ${p.summary || 'N/A'}`);
  }

  // 2. The betänkande
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('BETÄNKANDE: HC01NU20');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const bet = await client.query(`
    SELECT dok_id, titel, datum, organ, debattdag, beslutsdag
    FROM main_stg.stg_dokumentlista
    WHERE dok_id = 'HC01NU20'
  `);
  if (bet.rows[0]) {
    const b = bet.rows[0];
    console.log(`Title: ${b.titel}`);
    console.log(`Committee: ${b.organ}`);
    console.log(`Date: ${b.datum}`);
    console.log(`Debate: ${b.debattdag}`);
    console.log(`Decision: ${b.beslutsdag}`);
  }

  // 3. Votes on the betänkande
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('VOTES ON HC01NU20');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const votes = await client.query(`
    SELECT 
      punkt,
      parti,
      rost,
      COUNT(*) as cnt
    FROM main_stg.stg_voteringlista
    WHERE dok_id = 'HC01NU20'
    GROUP BY punkt, parti, rost
    ORDER BY punkt, 
      CASE rost WHEN 'Ja' THEN 1 WHEN 'Nej' THEN 2 WHEN 'Avstår' THEN 3 ELSE 4 END,
      parti
  `);

  let currentPunkt = '';
  let jaParties: string[] = [];
  let nejParties: string[] = [];
  let avstarParties: string[] = [];
  
  votes.rows.forEach((v, i) => {
    if (v.punkt !== currentPunkt) {
      if (currentPunkt !== '') {
        console.log(`  JA: ${jaParties.join(', ')}`);
        console.log(`  NEJ: ${nejParties.join(', ')}`);
        console.log(`  AVSTÅR: ${avstarParties.join(', ')}\n`);
      }
      currentPunkt = v.punkt;
      jaParties = []; nejParties = []; avstarParties = [];
      console.log(`Punkt ${v.punkt}:`);
    }
    
    const partyVote = `${v.parti}(${v.cnt})`;
    if (v.rost === 'Ja') jaParties.push(partyVote);
    if (v.rost === 'Nej') nejParties.push(partyVote);
    if (v.rost === 'Avstår') avstarParties.push(partyVote);
    
    if (i === votes.rows.length - 1) {
      console.log(`  JA: ${jaParties.join(', ')}`);
      console.log(`  NEJ: ${nejParties.join(', ')}`);
      console.log(`  AVSTÅR: ${avstarParties.join(', ')}`);
    }
  });

  // 4. Debate speeches
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('DEBATE SPEECHES');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const speeches = await client.query(`
    SELECT 
      parti,
      COUNT(*) as speeches,
      COUNT(DISTINCT intressent_id) as speakers,
      STRING_AGG(DISTINCT namn, ', ') as names
    FROM main_mart.mart_person_timeline
    WHERE action_type = 'speech'
      AND subject_title ILIKE '%kärnkraft%'
      AND subject_title ILIKE '%finansiering%'
    GROUP BY parti
    ORDER BY speeches DESC
  `);
  
  console.log('Party engagement in the debate:');
  speeches.rows.forEach(s => {
    console.log(`  ${s.parti}: ${s.speeches} speeches by ${s.speakers} (${s.names?.slice(0,50)})`);
  });

  // 5. Key quotes from the debate
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('KEY QUOTES FROM DEBATE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const quotes = await client.query(`
    SELECT 
      namn, parti, action_date,
      LEFT(speech_text_clean, 400) as excerpt
    FROM main_mart.mart_person_timeline
    WHERE action_type = 'speech'
      AND subject_title ILIKE '%kärnkraft%'
      AND subject_title ILIKE '%finansiering%'
    ORDER BY action_date DESC
    LIMIT 8
  `);
  
  quotes.rows.forEach(q => {
    console.log(`[${q.parti}] ${q.namn}:`);
    console.log(`"${q.excerpt?.slice(0, 250)}..."\n`);
  });

  // 6. Follow-up motions
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('FOLLOW-UP MOTIONS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const motions = await client.query(`
    SELECT 
      ds.dokument__dok_id as dok_id,
      ds.dokument__titel as titel,
      ds.dokument__datum as datum,
      STRING_AGG(DISTINCT di.partibet, ', ') as parties
    FROM main_stg.stg_dokumentstatus ds
    LEFT JOIN main_stg.stg_dokumentstatus_intressent di ON di._dlt_root_id = ds._dlt_id
    LEFT JOIN main_stg.stg_dokumentstatus_referens r ON r._dlt_root_id = ds._dlt_id
    WHERE r.ref_dok_id = 'HC03150'
      AND ds.dokument__typ = 'mot'
    GROUP BY ds.dokument__dok_id, ds.dokument__titel, ds.dokument__datum
    ORDER BY ds.dokument__datum
  `);
  
  console.log('Motions referencing the proposition:');
  motions.rows.forEach(m => {
    console.log(`  [${m.datum?.toString().slice(0,10)}] ${m.dok_id}: ${m.titel?.slice(0,50)} (${m.parties})`);
  });

  // 7. What's PENDING now?
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('PENDING ENERGY DECISIONS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const pending = await client.query(`
    SELECT dok_id, titel, datum, organ, debattdag, beslutsdag
    FROM main_stg.stg_dokumentlista
    WHERE typ = 'bet'
      AND organ = 'NU'
      AND (beslutsdag IS NULL OR beslutsdag = '')
      AND datum >= '2025-01-01'
    ORDER BY datum DESC
  `);
  
  console.log('NU betänkanden awaiting decision:');
  pending.rows.forEach(p => {
    console.log(`  [${p.datum?.toString().slice(0,10)}] ${p.dok_id}: ${p.titel?.slice(0,50)}`);
  });

  await client.end();
  console.log('\n\nDone!');
}

main().catch(console.error);
