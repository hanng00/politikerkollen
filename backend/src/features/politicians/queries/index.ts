/**
 * Re-export all query functions from the queries folder
 */

// List queries
export { listPoliticians, getConstituencies, type ListPoliticiansOptions } from './list';

// Detail queries
export {
  getPolitician,
  getPercentileRankings,
  getVoteBreakdown,
  getPartyLoyalty,
  getTopTopics,
  COMMITTEE_TO_TOPIC,
  type PercentileRankings,
  type PartyLoyalty,
  type TopicActivity,
} from './detail';

// Motion queries
export {
  getMotionEffectiveness,
  getBatchMotionStats,
  getMotionImpactScores,
  type MotionStatsForList,
} from './motions';

// Accountability queries
export {
  getAccountabilityStats,
  getBatchAccountabilityStats,
  getBatchScrutinizedStats,
  type AccountabilityStatsForList,
  type ScrutinizedStatsForList,
} from './accountability';

// Vote queries
export {
  getRebelVotesByTopic,
  getKeyVotes,
  getRebelVotes,
  getBatchTopRebelTopics,
  type RebelVote,
  type RebelVotesByTopic,
  type KeyVote,
  type TopRebelTopicForList,
} from './votes';

// Timeline queries
export { getTimeline, type GetTimelineOptions } from './timeline';
