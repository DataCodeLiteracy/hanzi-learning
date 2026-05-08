/** 메인 페이지 연속 달성 축하 모달 — "그만 보기" 영구 숨김 (유저별) */

export type MainStreakModalMilestone = 10 | 20

export function getMainStreakModalDismissedKey(userId: string): string {
  return `hanzi-learning-main-streak-modal-dismissed:${userId}`
}

export function readMainStreakModalPermanentDismissed(
  userId: string
): Partial<Record<MainStreakModalMilestone, boolean>> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(getMainStreakModalDismissedKey(userId))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, boolean>
    return {
      ...(parsed["10"] ? { 10: true } : {}),
      ...(parsed["20"] ? { 20: true } : {}),
    }
  } catch {
    return {}
  }
}

export function writeMainStreakModalPermanentDismissed(
  userId: string,
  milestone: MainStreakModalMilestone
): void {
  if (typeof window === "undefined") return
  try {
    const key = getMainStreakModalDismissedKey(userId)
    const prev = JSON.parse(localStorage.getItem(key) || "{}") as Record<
      string,
      boolean
    >
    prev[String(milestone)] = true
    localStorage.setItem(key, JSON.stringify(prev))
  } catch {
    /* ignore quota / private mode */
  }
}
