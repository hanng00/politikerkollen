/**
 * Deep Analysis: Connecting rhetoric to outcomes
 * 
 * Goal: Answer "So what?" by showing:
 * 1. Did rhetorical spikes precede actual decisions?
 * 2. Can we correlate speech patterns with vote outcomes?
 * 3. What are the current "open bets" - topics heating up that haven't resolved yet?
 * 
 * Run with: cd backend && bun run scripts/rhetoric-to-outcomes.ts
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
  // ANALYSIS 1: What betänkanden drove the kärnkraft spike in Sept 2025?
  // ============================================================
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('ANALYSIS 1: WHAT CAUSED THE KÄRNKRAFT SPIKE IN SEPT 2025?');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const karnkraftDebates = await client.query(`
    SELECT 
      subject_title,
      betankande_titel,
      COUNT(*) as speech_count,
      COUNT(DISTINCT intressent_id) as unique_speakers
    FROM main_mart.mart_person_timeline
    WHERE action_type = 'speech'
      AND action_date >= '2025-09-01'
      AND action_date < '2025-10-01'
      AND speech_text_clean ILIKE '%kärnkraft%'
    GROUP BY subject_title, betankande_titel
    ORDER BY speech_count DESC
    LIMIT 10
  `);

  console.log('Debates that drove kärnkraft mentions in Sept 2025:');
  karnkraftDebates.rows.forEach(r => {
    console.log(`  ${r.speech_count} speeches: ${r.subject_title || r.betankande_titel || 'Unknown'}`);
  });

  // ============================================================
  // ANALYSIS 2: What VOTES happened after the kärnkraft spike?
  // ============================================================
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('ANALYSIS 2: VOTES ON KÄRNKRAFT-RELATED BETÄNKANDEN (Sept-Dec 2025)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const karnkraftVotes = await client.query(`
    SELECT 
      subject_title,
      betankande_titel,
      action_date,
      vote_value,
      parti,
      COUNT(*) as vote_count
    FROM main_mart.mart_person_timeline
    WHERE action_type = 'vote'
      AND action_date >= '2025-09-01'
      AND action_date <= '2025-12-31'
      AND (
        subject_title ILIKE '%kärnkraft%'
        OR betankande_titel ILIKE '%kärnkraft%'
        OR subject_title ILIKE '%energi%'
      )
    GROUP BY subject_title, betankande_titel, action_date, vote_value, parti
    ORDER BY action_date DESC, vote_count DESC
    LIMIT 30
  `);

  console.log('Votes on energy/kärnkraft betänkanden after the spike:');
  let currentSubject = '';
  karnkraftVotes.rows.forEach(r => {
    const subject = r.subject_title || r.betankande_titel || 'Unknown';
    if (subject !== currentSubject) {
      currentSubject = subject;
      const date = new Date(r.action_date).toISOString().slice(0, 10);
      console.log(`\n  [${date}] ${subject}`);
    }
    console.log(`    ${r.parti}: ${r.vote_count} ${r.vote_value}`);
  });

  // ============================================================
  // ANALYSIS 3: Strandskydd - rhetoric to decision timeline
  // ============================================================
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('ANALYSIS 3: STRANDSKYDD - FROM RHETORIC TO DECISION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const strandskyddTimeline = await client.query(`
    WITH monthly_speeches AS (
      SELECT 
        DATE_TRUNC('month', action_date) as month,
        COUNT(*) as speech_count
      FROM main_mart.mart_person_timeline
      WHERE action_type = 'speech'
        AND action_date >= '2025-01-01'
        AND speech_text_clean ILIKE '%strandskydd%'
      GROUP BY DATE_TRUNC('month', action_date)
    ),
    monthly_votes AS (
      SELECT 
        DATE_TRUNC('month', action_date) as month,
        COUNT(*) as vote_count,
        subject_title
      FROM main_mart.mart_person_timeline
      WHERE action_type = 'vote'
        AND action_date >= '2025-01-01'
        AND (subject_title ILIKE '%strandskydd%' OR betankande_titel ILIKE '%strandskydd%')
      GROUP BY DATE_TRUNC('month', action_date), subject_title
    )
    SELECT 
      COALESCE(s.month, v.month) as month,
      COALESCE(s.speech_count, 0) as speeches,
      COALESCE(v.vote_count, 0) as votes,
      v.subject_title
    FROM monthly_speeches s
    FULL OUTER JOIN monthly_votes v ON s.month = v.month
    ORDER BY month
  `);

  console.log('Strandskydd: Speeches vs Votes timeline (2025):');
  console.log('Month      | Speeches | Votes | Decision');
  console.log('-----------|----------|-------|----------');
  strandskyddTimeline.rows.forEach(r => {
    const month = r.month ? new Date(r.month).toISOString().slice(0, 7) : 'N/A';
    const decision = r.subject_title ? r.subject_title.slice(0, 30) : '-';
    console.log(`${month}   | ${String(r.speeches).padEnd(8)} | ${String(r.votes).padEnd(5)} | ${decision}`);
  });

  // ============================================================
  // ANALYSIS 4: OPEN BETS - Topics heating up without resolution
  // ============================================================
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('ANALYSIS 4: OPEN BETS - TOPICS HEATING UP (no decision yet)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Find topics with increasing speech activity but no recent votes
  const heatingTopics = await client.query(`
    WITH recent_speech_topics AS (
      SELECT 
        subject_title,
        COUNT(*) as recent_speeches,
        COUNT(DISTINCT intressent_id) as unique_speakers,
        MAX(action_date) as last_speech
      FROM main_mart.mart_person_timeline
      WHERE action_type = 'speech'
        AND action_date >= CURRENT_DATE - INTERVAL '3 months'
        AND subject_title IS NOT NULL
        AND subject_title NOT IN ('Frågestund', 'Partiledardebatt', 'Statsministerns frågestund')
      GROUP BY subject_title
      HAVING COUNT(*) >= 20
    ),
    older_speech_topics AS (
      SELECT 
        subject_title,
        COUNT(*) as older_speeches
      FROM main_mart.mart_person_timeline
      WHERE action_type = 'speech'
        AND action_date >= CURRENT_DATE - INTERVAL '6 months'
        AND action_date < CURRENT_DATE - INTERVAL '3 months'
        AND subject_title IS NOT NULL
      GROUP BY subject_title
    ),
    recent_votes AS (
      SELECT DISTINCT subject_title
      FROM main_mart.mart_person_timeline
      WHERE action_type = 'vote'
        AND action_date >= CURRENT_DATE - INTERVAL '2 months'
    )
    SELECT 
      r.subject_title,
      r.recent_speeches,
      COALESCE(o.older_speeches, 0) as older_speeches,
      r.unique_speakers,
      r.last_speech,
      CASE WHEN v.subject_title IS NOT NULL THEN 'VOTED' ELSE 'PENDING' END as status,
      ROUND(100.0 * (r.recent_speeches - COALESCE(o.older_speeches, 0)) / GREATEST(COALESCE(o.older_speeches, 1), 1), 0) as growth_pct
    FROM recent_speech_topics r
    LEFT JOIN older_speech_topics o ON o.subject_title = r.subject_title
    LEFT JOIN recent_votes v ON v.subject_title = r.subject_title
    WHERE v.subject_title IS NULL  -- No recent vote
    ORDER BY r.recent_speeches DESC
    LIMIT 15
  `);

  console.log('Topics with high activity but NO recent vote (potential upcoming decisions):');
  console.log('');
  heatingTopics.rows.forEach(r => {
    const growth = parseInt(r.growth_pct);
    const trend = growth > 50 ? '🔥 HEATING' : growth > 0 ? '📈 Growing' : '➡️ Stable';
    console.log(`${trend} | ${r.recent_speeches} speeches | ${r.unique_speakers} speakers`);
    console.log(`  "${r.subject_title}"`);
    console.log('');
  });

  // ============================================================
  // ANALYSIS 5: Keyword momentum - what's accelerating?
  // ============================================================
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('ANALYSIS 5: KEYWORD MOMENTUM - WHAT\'S ACCELERATING?');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const keywords = ['AI', 'artificiell intelligens', 'elpriser', 'migration', 'gängkriminalitet', 'NATO', 'försvar', 'inflation', 'ränta', 'bostadskris'];
  
  for (const keyword of keywords) {
    const momentum = await client.query(`
      WITH recent AS (
        SELECT COUNT(*) as cnt
        FROM main_mart.mart_person_timeline
        WHERE action_type = 'speech'
          AND action_date >= CURRENT_DATE - INTERVAL '3 months'
          AND speech_text_clean ILIKE $1
      ),
      older AS (
        SELECT COUNT(*) as cnt
        FROM main_mart.mart_person_timeline
        WHERE action_type = 'speech'
          AND action_date >= CURRENT_DATE - INTERVAL '6 months'
          AND action_date < CURRENT_DATE - INTERVAL '3 months'
          AND speech_text_clean ILIKE $1
      )
      SELECT 
        recent.cnt as recent,
        older.cnt as older,
        CASE WHEN older.cnt > 0 THEN ROUND(100.0 * (recent.cnt - older.cnt) / older.cnt, 0) ELSE 999 END as growth
      FROM recent, older
    `, [`%${keyword}%`]);

    const r = momentum.rows[0];
    const growth = parseInt(r.growth);
    const trend = growth > 50 ? '🔥' : growth > 0 ? '📈' : growth < -20 ? '📉' : '➡️';
    console.log(`${trend} "${keyword}": ${r.recent} mentions (last 3mo) vs ${r.older} (prev 3mo) = ${growth > 500 ? 'NEW' : growth + '%'}`);
  }

  // ============================================================
  // ANALYSIS 6: Cross-party convergence on specific issues
  // ============================================================
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('ANALYSIS 6: CROSS-PARTY CONVERGENCE (unusual alliances)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const convergence = await client.query(`
    WITH party_topics AS (
      SELECT 
        parti,
        subject_title,
        COUNT(*) as speeches
      FROM main_mart.mart_person_timeline
      WHERE action_type = 'speech'
        AND action_date >= CURRENT_DATE - INTERVAL '6 months'
        AND subject_title IS NOT NULL
        AND parti IN ('S', 'M', 'SD', 'C', 'V', 'KD', 'L', 'MP')
      GROUP BY parti, subject_title
      HAVING COUNT(*) >= 5
    ),
    topic_party_count AS (
      SELECT 
        subject_title,
        COUNT(DISTINCT parti) as party_count,
        SUM(speeches) as total_speeches,
        STRING_AGG(parti || ':' || speeches::text, ', ' ORDER BY speeches DESC) as breakdown
      FROM party_topics
      GROUP BY subject_title
      HAVING COUNT(DISTINCT parti) >= 6  -- At least 6 parties engaged
    )
    SELECT *
    FROM topic_party_count
    ORDER BY party_count DESC, total_speeches DESC
    LIMIT 10
  `);

  console.log('Topics with broad cross-party engagement (6+ parties):');
  convergence.rows.forEach(r => {
    console.log(`\n  "${r.subject_title}"`);
    console.log(`  ${r.party_count} parties, ${r.total_speeches} total speeches`);
    console.log(`  Breakdown: ${r.breakdown}`);
  });

  await client.end();
  console.log('\n\n✅ Analysis complete!');
}

main().catch(console.error);
