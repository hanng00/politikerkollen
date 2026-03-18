/**
 * Rhetorical Shift Detection POC
 * 
 * Goal: Find real insights about how political rhetoric is changing
 * that would make a PA-chef say "holy shit, I need this"
 * 
 * Run with: cd backend && bun run scripts/rhetorical-shifts.ts
 */

import pg from 'pg';

const DATABASE = 'spatial_dagster';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Imdzc29uaGFubmVzQGdtYWlsLmNvbSIsIm1kUmVnaW9uIjoiYXdzLXVzLWVhc3QtMSIsInNlc3Npb24iOiJnc3Nvbmhhbm5lcy5nbWFpbC5jb20iLCJwYXQiOiJXSmZkMkJueXI1dk1WWDRpU05vZEhjNW9kUTdUMzBYNUNYSDd1bjlFd3F3IiwidXNlcklkIjoiNTI4MmQyNWEtNDMyYy00NWVlLWE0YTctZjk2ZTc2YWIxYTRhIiwiaXNzIjoibWRfcGF0IiwicmVhZE9ubHkiOmZhbHNlLCJ0b2tlblR5cGUiOiJyZWFkX3dyaXRlIiwiaWF0IjoxNzYzNDY0Mzc2fQ.n0rUaZxsCFCVP88EKNsm9BP681FnOP3gSi1ZwApwe44';

// Keywords to track for Energy and Fastighet verticals
const ENERGY_KEYWORDS = ['kärnkraft', 'vindkraft', 'solenergi', 'elnät', 'elpriser', 'energiomställning'];
const FASTIGHET_KEYWORDS = ['strandskydd', 'bygglov', 'bostadsbyggande', 'hyresrätt', 'bostadsbrist', 'marknadshyror'];

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
  // ANALYSIS 1: Monthly keyword trends by party (detect anomalies)
  // ============================================================
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('ANALYSIS 1: KEYWORD FREQUENCY TRENDS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const keyword of ['kärnkraft', 'strandskydd', 'vindkraft']) {
    console.log(`\n📊 Trend for "${keyword}" by party (last 18 months):`);
    
    const trend = await client.query(`
      WITH monthly_counts AS (
        SELECT 
          DATE_TRUNC('month', action_date) as month,
          parti,
          COUNT(*) as mentions
        FROM main_mart.mart_person_timeline
        WHERE action_type = 'speech'
          AND action_date >= CURRENT_DATE - INTERVAL '18 months'
          AND speech_text_clean ILIKE $1
        GROUP BY DATE_TRUNC('month', action_date), parti
      ),
      party_baseline AS (
        SELECT 
          parti,
          AVG(mentions) as avg_mentions,
          STDDEV(mentions) as stddev_mentions
        FROM monthly_counts
        GROUP BY parti
      )
      SELECT 
        mc.month,
        mc.parti,
        mc.mentions,
        pb.avg_mentions,
        CASE 
          WHEN pb.stddev_mentions > 0 
          THEN (mc.mentions - pb.avg_mentions) / pb.stddev_mentions 
          ELSE 0 
        END as z_score
      FROM monthly_counts mc
      JOIN party_baseline pb ON pb.parti = mc.parti
      WHERE mc.mentions >= 5
      ORDER BY mc.month DESC, mc.mentions DESC
      LIMIT 30
    `, [`%${keyword}%`]);

    // Find anomalies (z-score > 1.5 or < -1.5)
    const anomalies = trend.rows.filter(r => Math.abs(parseFloat(r.z_score)) > 1.5);
    
    if (anomalies.length > 0) {
      console.log('  🚨 ANOMALIES DETECTED:');
      anomalies.forEach(r => {
        const month = new Date(r.month).toISOString().slice(0, 7);
        const direction = parseFloat(r.z_score) > 0 ? '📈 SPIKE' : '📉 DROP';
        console.log(`     ${direction} ${r.parti} in ${month}: ${r.mentions} mentions (z=${parseFloat(r.z_score).toFixed(1)}, avg=${parseFloat(r.avg_mentions).toFixed(1)})`);
      });
    } else {
      console.log('  No significant anomalies detected');
    }
  }

  // ============================================================
  // ANALYSIS 2: Who's talking about what? (Party positioning)
  // ============================================================
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('ANALYSIS 2: PARTY POSITIONING ON KEY TOPICS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const partyPositioning = await client.query(`
    WITH topic_mentions AS (
      SELECT 
        parti,
        SUM(CASE WHEN speech_text_clean ILIKE '%kärnkraft%' THEN 1 ELSE 0 END) as karnkraft,
        SUM(CASE WHEN speech_text_clean ILIKE '%vindkraft%' THEN 1 ELSE 0 END) as vindkraft,
        SUM(CASE WHEN speech_text_clean ILIKE '%strandskydd%' THEN 1 ELSE 0 END) as strandskydd,
        SUM(CASE WHEN speech_text_clean ILIKE '%hyresrätt%' THEN 1 ELSE 0 END) as hyresratt,
        COUNT(*) as total_speeches
      FROM main_mart.mart_person_timeline
      WHERE action_type = 'speech'
        AND action_date >= CURRENT_DATE - INTERVAL '12 months'
        AND parti IN ('S', 'M', 'SD', 'C', 'V', 'KD', 'L', 'MP')
      GROUP BY parti
    )
    SELECT 
      parti,
      karnkraft,
      vindkraft,
      strandskydd,
      hyresratt,
      total_speeches,
      ROUND(100.0 * karnkraft / total_speeches, 1) as karnkraft_pct,
      ROUND(100.0 * vindkraft / total_speeches, 1) as vindkraft_pct
    FROM topic_mentions
    ORDER BY karnkraft DESC
  `);

  console.log('Party focus on energy topics (% of speeches mentioning topic):');
  console.log('Party    | Kärnkraft | Vindkraft | Strandskydd | Hyresrätt');
  console.log('---------|-----------|-----------|-------------|----------');
  partyPositioning.rows.forEach(r => {
    console.log(`${r.parti.padEnd(8)} | ${String(r.karnkraft_pct + '%').padEnd(9)} | ${String(r.vindkraft_pct + '%').padEnd(9)} | ${r.strandskydd.toString().padEnd(11)} | ${r.hyresratt}`);
  });

  // ============================================================
  // ANALYSIS 3: Context extraction - HOW are they talking about it?
  // ============================================================
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('ANALYSIS 3: FRAMING ANALYSIS - HOW parties talk about topics');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Get recent speeches mentioning strandskydd and extract context
  const strandskyddContext = await client.query(`
    SELECT 
      parti,
      namn,
      action_date,
      -- Extract 200 chars around the keyword
      SUBSTRING(
        speech_text_clean, 
        GREATEST(1, POSITION('strandskydd' IN LOWER(speech_text_clean)) - 100),
        300
      ) as context
    FROM main_mart.mart_person_timeline
    WHERE action_type = 'speech'
      AND action_date >= CURRENT_DATE - INTERVAL '6 months'
      AND speech_text_clean ILIKE '%strandskydd%'
    ORDER BY action_date DESC
    LIMIT 10
  `);

  console.log('Recent "strandskydd" mentions with context:\n');
  strandskyddContext.rows.forEach(r => {
    const date = new Date(r.action_date).toISOString().slice(0, 10);
    console.log(`[${date}] ${r.parti} - ${r.namn}:`);
    console.log(`  "...${r.context.trim().replace(/\s+/g, ' ')}..."\n`);
  });

  // ============================================================
  // ANALYSIS 4: Cross-party rhetoric convergence/divergence
  // ============================================================
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('ANALYSIS 4: RHETORIC CONVERGENCE - Are parties aligning?');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Compare S and M on kärnkraft over time
  const convergence = await client.query(`
    WITH monthly_by_party AS (
      SELECT 
        DATE_TRUNC('month', action_date) as month,
        parti,
        COUNT(*) as mentions
      FROM main_mart.mart_person_timeline
      WHERE action_type = 'speech'
        AND action_date >= CURRENT_DATE - INTERVAL '24 months'
        AND speech_text_clean ILIKE '%kärnkraft%'
        AND parti IN ('S', 'M')
      GROUP BY DATE_TRUNC('month', action_date), parti
    )
    SELECT 
      month,
      MAX(CASE WHEN parti = 'S' THEN mentions ELSE 0 END) as s_mentions,
      MAX(CASE WHEN parti = 'M' THEN mentions ELSE 0 END) as m_mentions
    FROM monthly_by_party
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12
  `);

  console.log('S vs M on "kärnkraft" (monthly mentions):');
  console.log('Month      | S    | M    | Gap');
  console.log('-----------|------|------|-----');
  convergence.rows.forEach(r => {
    const month = new Date(r.month).toISOString().slice(0, 7);
    const gap = Math.abs(parseInt(r.s_mentions) - parseInt(r.m_mentions));
    console.log(`${month}   | ${String(r.s_mentions).padEnd(4)} | ${String(r.m_mentions).padEnd(4)} | ${gap}`);
  });

  // ============================================================
  // ANALYSIS 5: Emerging voices - who's driving the conversation?
  // ============================================================
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('ANALYSIS 5: EMERGING VOICES - Who drives the energy debate?');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const emergingVoices = await client.query(`
    SELECT 
      namn,
      parti,
      COUNT(*) as energy_speeches,
      COUNT(DISTINCT subject_title) as unique_debates
    FROM main_mart.mart_person_timeline
    WHERE action_type = 'speech'
      AND action_date >= CURRENT_DATE - INTERVAL '6 months'
      AND (
        speech_text_clean ILIKE '%kärnkraft%'
        OR speech_text_clean ILIKE '%vindkraft%'
        OR speech_text_clean ILIKE '%elnät%'
      )
    GROUP BY namn, parti
    ORDER BY energy_speeches DESC
    LIMIT 15
  `);

  console.log('Top voices in energy debate (last 6 months):');
  console.log('Rank | Name                          | Party | Speeches | Debates');
  console.log('-----|-------------------------------|-------|----------|--------');
  emergingVoices.rows.forEach((r, i) => {
    console.log(`${String(i + 1).padEnd(4)} | ${r.namn.padEnd(29)} | ${r.parti.padEnd(5)} | ${String(r.energy_speeches).padEnd(8)} | ${r.unique_debates}`);
  });

  await client.end();
  console.log('\n\n✅ Analysis complete!');
}

main().catch(console.error);
