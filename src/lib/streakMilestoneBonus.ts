/**
 * 연속 목표 달성 마일스톤 보너스.
 * 지급 시 실제 금액은 연속 달성 구간 각 날의 goal 평균 × 비율(반올림)입니다.
 */
export const STREAK_MILESTONE_THRESHOLDS = [
  10, 20, 30, 100, 200, 365,
] as const

export const STREAK_MILESTONE_PERCENTAGES: Record<number, number> = {
  10: 0.5,
  20: 0.55,
  30: 0.6,
  100: 0.6,
  200: 0.7,
  365: 0.9,
}

export function calculateStreakMilestoneBonus(
  averageDailyGoal: number,
  milestone: number
): number {
  const pct = STREAK_MILESTONE_PERCENTAGES[milestone] ?? 0.5
  return Math.round(averageDailyGoal * pct)
}

export function getStreakMilestonePercentage(milestone: number): number {
  return STREAK_MILESTONE_PERCENTAGES[milestone] ?? 0.5
}
