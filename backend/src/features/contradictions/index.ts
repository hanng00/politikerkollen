/**
 * Contradictions API handlers
 */

export { 
  getContradictions, 
  getContradictionFilters, 
  getPromiseById, 
  getPartyScorecard,
  getPromiseScores,
  getPromiseScoreById,
  getPartyEvidenceScorecard,
} from './queries';

export type { 
  ContradictionCard, 
  GetContradictionsRequest, 
  GetContradictionsResponse, 
  PartyScore,
  PromiseEvidence,
  PromiseScore,
  GetPromiseScoresRequest,
  GetPromiseScoresResponse,
} from './types';
