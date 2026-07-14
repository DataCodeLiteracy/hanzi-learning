import { getKSTDateISO } from "@/lib/apiClient"

export type GoalHistoryRecord = {
  date: string
  achieved: boolean
  experience: number
  goal?: number
}

export type DayStatus =
  | "achieved"
  | "studied_missed"
  | "none"
  | "future"

export type DayInfo = {
  dateStr: string
  day: number
  status: DayStatus
  experience: number
  goal?: number
  achieved: boolean
}

export type PeriodSummary = {
  /** 기간 내 오늘까지 경과한 일수 */
  elapsedDays: number
  /** experience > 0 */
  studyDays: number
  /** elapsed - studyDays */
  nonStudyDays: number
  /** achieved === true */
  achievedDays: number
  /** 학습했지만 미달성 */
  studiedButMissedDays: number
  /** 달성일 / 경과일 (%) */
  achievementRate: number
  /** 기간 내 최장 연속 달성 */
  longestStreakInPeriod: number
  /** 완벽한 주(월~일 7/7) 횟수 — 월간 요약용 */
  perfectWeeks: number
  totalExp: number
  /** 총 EXP / 학습일 */
  avgExpPerStudyDay: number
  maxDailyExp: number
  /** goal이 있는 날의 평균 목표 */
  avgDailyGoal: number
  /** 총 EXP / 기간 목표 합 (%) */
  goalCompletionRatio: number
  /** experience >= goal * 1.5 */
  overAchievedDays: number
}

export type PeriodView = "week" | "month" | "custom"

function parseISODate(dateStr: string): { y: number; m: number; d: number } {
  const [y, m, d] = dateStr.split("-").map(Number)
  return { y, m, d }
}

/** YYYY-MM-DD → Date at local midnight (date parts only, no TZ shift) */
function dateFromISO(dateStr: string): Date {
  const { y, m, d } = parseISODate(dateStr)
  return new Date(y, m - 1, d)
}

export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function addDaysISO(dateStr: string, days: number): string {
  const date = dateFromISO(dateStr)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

/** 월요일 시작 주의 시작일 (YYYY-MM-DD) */
export function getMondayOfWeek(dateStr: string): string {
  const date = dateFromISO(dateStr)
  const day = date.getDay() // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return toISODate(date)
}

export function getSundayOfWeek(dateStr: string): string {
  return addDaysISO(getMondayOfWeek(dateStr), 6)
}

export function buildHistoryMap(
  history: GoalHistoryRecord[] | undefined,
  resetAt?: string | null
): Map<string, GoalHistoryRecord> {
  const map = new Map<string, GoalHistoryRecord>()
  if (!history) return map
  const list = resetAt ? history.filter((r) => r.date > resetAt) : history
  list.forEach((r) => map.set(r.date, r))
  return map
}

function dayStatus(
  dateStr: string,
  record: GoalHistoryRecord | undefined,
  today: string
): DayStatus {
  if (dateStr > today) return "future"
  if (!record || record.experience <= 0) return "none"
  if (record.achieved) return "achieved"
  return "studied_missed"
}

export function getDayInfo(
  dateStr: string,
  historyMap: Map<string, GoalHistoryRecord>,
  today = getKSTDateISO()
): DayInfo {
  const { d } = parseISODate(dateStr)
  const record = historyMap.get(dateStr)
  return {
    dateStr,
    day: d,
    status: dayStatus(dateStr, record, today),
    experience: record?.experience ?? 0,
    goal: record?.goal,
    achieved: record?.achieved ?? false,
  }
}

function enumerateDates(startISO: string, endISO: string): string[] {
  const dates: string[] = []
  let cur = startISO
  while (cur <= endISO) {
    dates.push(cur)
    cur = addDaysISO(cur, 1)
  }
  return dates
}

function longestAchievedStreak(days: DayInfo[]): number {
  let best = 0
  let run = 0
  for (const day of days) {
    if (day.status === "future") continue
    if (day.achieved) {
      run += 1
      best = Math.max(best, run)
    } else {
      run = 0
    }
  }
  return best
}

function countPerfectWeeks(
  startISO: string,
  endISO: string,
  historyMap: Map<string, GoalHistoryRecord>,
  today: string
): number {
  // Only count Mon–Sun weeks fully inside the period and fully elapsed
  let weekStart = getMondayOfWeek(startISO)
  let count = 0

  while (weekStart <= endISO) {
    const weekEnd = addDaysISO(weekStart, 6)
    if (
      weekStart >= startISO &&
      weekEnd <= endISO &&
      weekEnd <= today
    ) {
      let allAchieved = true
      for (let i = 0; i < 7; i++) {
        if (!historyMap.get(addDaysISO(weekStart, i))?.achieved) {
          allAchieved = false
          break
        }
      }
      if (allAchieved) count += 1
    }
    weekStart = addDaysISO(weekStart, 7)
  }
  return count
}

export function computePeriodSummary(
  startISO: string,
  endISO: string,
  historyMap: Map<string, GoalHistoryRecord>,
  today = getKSTDateISO()
): PeriodSummary {
  const dates = enumerateDates(startISO, endISO)
  const dayInfos = dates.map((d) => getDayInfo(d, historyMap, today))
  const elapsed = dayInfos.filter((d) => d.status !== "future")

  let studyDays = 0
  let achievedDays = 0
  let studiedButMissedDays = 0
  let totalExp = 0
  let maxDailyExp = 0
  let goalSum = 0
  let goalCount = 0
  let overAchievedDays = 0

  for (const day of elapsed) {
    if (day.experience > 0) {
      studyDays += 1
      totalExp += day.experience
      maxDailyExp = Math.max(maxDailyExp, day.experience)
    }
    if (day.achieved) achievedDays += 1
    if (day.status === "studied_missed") studiedButMissedDays += 1
    if (day.goal != null && day.goal > 0) {
      goalSum += day.goal
      goalCount += 1
      if (day.experience >= day.goal * 1.5) overAchievedDays += 1
    }
  }

  const elapsedDays = elapsed.length
  const nonStudyDays = Math.max(0, elapsedDays - studyDays)

  return {
    elapsedDays,
    studyDays,
    nonStudyDays,
    achievedDays,
    studiedButMissedDays,
    achievementRate:
      elapsedDays > 0 ? Math.round((achievedDays / elapsedDays) * 100) : 0,
    longestStreakInPeriod: longestAchievedStreak(dayInfos),
    perfectWeeks: countPerfectWeeks(startISO, endISO, historyMap, today),
    totalExp,
    avgExpPerStudyDay:
      studyDays > 0 ? Math.round(totalExp / studyDays) : 0,
    maxDailyExp,
    avgDailyGoal: goalCount > 0 ? Math.round(goalSum / goalCount) : 0,
    goalCompletionRatio:
      goalSum > 0 ? Math.round((totalExp / goalSum) * 100) : 0,
    overAchievedDays,
  }
}

/** 월간 달력 그리드 (일~토, 빈 칸 null) */
export function buildMonthCalendarGrid(
  year: number,
  month: number
): Array<{ day: number | null; dateStr: string | null }> {
  const first = new Date(year, month - 1, 1)
  const last = new Date(year, month, 0)
  const firstWeekday = first.getDay()
  const daysInMonth = last.getDate()
  const cells: Array<{ day: number | null; dateStr: string | null }> = []
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ day: null, dateStr: null })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const m = String(month).padStart(2, "0")
    const dayStr = String(d).padStart(2, "0")
    cells.push({ day: d, dateStr: `${year}-${m}-${dayStr}` })
  }
  return cells
}

export function getMonthRange(
  year: number,
  month: number
): { startISO: string; endISO: string } {
  const m = String(month).padStart(2, "0")
  const lastDay = new Date(year, month, 0).getDate()
  return {
    startISO: `${year}-${m}-01`,
    endISO: `${year}-${m}-${String(lastDay).padStart(2, "0")}`,
  }
}

export function getWeekRange(mondayISO: string): {
  startISO: string
  endISO: string
} {
  return { startISO: mondayISO, endISO: addDaysISO(mondayISO, 6) }
}

export function formatWeekLabel(mondayISO: string): string {
  const sunday = addDaysISO(mondayISO, 6)
  const start = parseISODate(mondayISO)
  const end = parseISODate(sunday)
  if (start.y === end.y && start.m === end.m) {
    return `${start.y}년 ${start.m}월 ${start.d}일 – ${end.d}일`
  }
  if (start.y === end.y) {
    return `${start.y}년 ${start.m}월 ${start.d}일 – ${end.m}월 ${end.d}일`
  }
  return `${start.y}.${start.m}.${start.d} – ${end.y}.${end.m}.${end.d}`
}

export function shiftMonth(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

/** Months (inclusive) covered by an ISO date range */
export function listMonthsInRange(
  startISO: string,
  endISO: string
): Array<{ year: number; month: number }> {
  const start = parseISODate(startISO)
  const end = parseISODate(endISO)
  const months: Array<{ year: number; month: number }> = []
  let y = start.y
  let m = start.m
  while (y < end.y || (y === end.y && m <= end.m)) {
    months.push({ year: y, month: m })
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return months
}

export function formatDateRangeLabel(startISO: string, endISO: string): string {
  const s = parseISODate(startISO)
  const e = parseISODate(endISO)
  if (s.y === e.y && s.m === e.m) {
    return `${s.y}년 ${s.m}월 ${s.d}일 – ${e.d}일`
  }
  if (s.y === e.y) {
    return `${s.y}년 ${s.m}월 ${s.d}일 – ${e.m}월 ${e.d}일`
  }
  return `${s.y}년 ${s.m}월 ${s.d}일 – ${e.y}년 ${e.m}월 ${e.d}일`
}
