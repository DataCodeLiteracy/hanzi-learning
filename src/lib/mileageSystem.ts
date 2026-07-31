/** 200 XP = 1000P (10P = 10원) → 1 XP = 5P */
export const MILEAGE_PER_XP = 5

/** 하루 마일리지 상한 (600 XP 상당) */
export const DAILY_MILEAGE_CAP = 3000

export function xpToMileage(xp: number): number {
  if (xp <= 0) return 0
  return Math.floor(xp * MILEAGE_PER_XP)
}

export function calculateMileageAccrual(
  experienceGained: number,
  alreadyEarnedToday: number
): { mileage: number; remainingCap: number; hitCap: boolean } {
  const remainingCap = Math.max(0, DAILY_MILEAGE_CAP - alreadyEarnedToday)
  if (experienceGained <= 0 || remainingCap <= 0) {
    return {
      mileage: 0,
      remainingCap,
      hitCap: remainingCap <= 0,
    }
  }

  const potential = xpToMileage(experienceGained)
  const mileage = Math.min(potential, remainingCap)
  return {
    mileage,
    remainingCap: remainingCap - mileage,
    hitCap: mileage < potential || remainingCap - mileage <= 0,
  }
}

export function formatMileage(amount: number): string {
  return `${Math.floor(amount).toLocaleString("ko-KR")}P`
}

export function yearMonthFromDate(dateISO: string): string {
  return dateISO.slice(0, 7)
}
