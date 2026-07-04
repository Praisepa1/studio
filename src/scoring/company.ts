import type { Company } from '@/types';
import type { Signal } from './buying-signals';

export interface CompanyScoreResult {
  score: number;
  tier: 'high_priority' | 'warm' | 'neutral' | 'low' | 'deprioritize';
  itemized_signals: Signal[];
  top_3_signals: Signal[];
  pitch_angle: string;
}

export function scoreCompany(input: {
  signals: Signal[];
  company: Partial<Company>;
}): CompanyScoreResult {
  const { signals } = input;

  // 1. Sum all signal weights (excluding any clamping adjustment for the raw calculation)
  const rawTotal = signals
    .filter(s => s.type !== 'clamping_adjustment')
    .reduce((sum, s) => sum + s.weight, 0);

  // 2. Normalize to 0-100 scale:
  //    map -30 -> 0, 0 -> 50 (no signals), +20 -> 100
  let score = 50;
  if (rawTotal < 0) {
    // Map [-30, 0] to [0, 50]
    score = Math.max(0, 50 + (rawTotal * (50 / 30)));
  } else if (rawTotal > 0) {
    // Map [0, 20] to [50, 100]
    score = Math.min(100, 50 + (rawTotal * (50 / 20)));
  } else {
    score = 50;
  }
  score = Math.round(score);

  // 3. Assign a tier label
  let tier: CompanyScoreResult['tier'] = 'neutral';
  if (score >= 80) {
    tier = 'high_priority';
  } else if (score >= 60) {
    tier = 'warm';
  } else if (score >= 40) {
    tier = 'neutral';
  } else if (score >= 20) {
    tier = 'low';
  } else {
    tier = 'deprioritize';
  }

  // 4. Sort signals by absolute weight descending (excluding clamping adjustment)
  const itemized_signals = signals
    .filter(s => s.type !== 'clamping_adjustment')
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));

  const top_3_signals = itemized_signals.slice(0, 3);

  // 5. Derive pitch angle
  const posSignals = itemized_signals.filter(s => s.weight > 0);
  const negSignals = itemized_signals.filter(s => s.weight < 0);

  const formatType = (type: string) => type.replace(/_/g, ' ');

  let pitch_angle = '';
  if (posSignals.length > 0 && negSignals.length === 0) {
    // Positive dominant -> growth pitch
    pitch_angle = `Based on your active growth indicators like ${formatType(posSignals[0].type)}, we can help accelerate your momentum.`;
  } else if (negSignals.length > 0 && posSignals.length === 0) {
    // Negative dominant -> fix-this-specific-problem pitch
    pitch_angle = `We noticed some critical issues on your site, particularly around ${formatType(negSignals[0].type)}, that we can help you fix.`;
  } else if (posSignals.length > 0 && negSignals.length > 0) {
    // Mixed -> acknowledge strength, offer the specific fix
    pitch_angle = `While your site shows great strengths in ${formatType(posSignals[0].type)}, we can help resolve the bottleneck with ${formatType(negSignals[0].type)}.`;
  } else {
    pitch_angle = 'We can help you audit and modernize your digital footprint to drive more business.';
  }

  return {
    score,
    tier,
    itemized_signals,
    top_3_signals,
    pitch_angle,
  };
}
