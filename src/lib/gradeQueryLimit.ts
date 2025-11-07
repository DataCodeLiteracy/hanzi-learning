/**
 * 급수별 API 조회 제한 관리 (하루 2회)
 * preferredGrade는 제한 없음
 * 페이지별로 별도 카운트 (hanzi-list, textbook-words)
 */

const STORAGE_KEY_PREFIX = "hanzi_grade_query_limit_"
const MAX_QUERIES_PER_DAY = 2

export type PageType = "hanzi-list" | "textbook-words"

interface GradeQueryRecord {
  date: string // YYYY-MM-DD 형식
  count: number
}

interface GradeQueryLimits {
  [grade: string]: GradeQueryRecord
}

/**
 * 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 */
function getTodayDate(): string {
  return new Date().toISOString().split("T")[0]
}

/**
 * localStorage에서 조회 제한 데이터 가져오기
 */
function getQueryLimits(pageType: PageType): GradeQueryLimits {
  if (typeof window === "undefined") return {}

  try {
    const storageKey = `${STORAGE_KEY_PREFIX}${pageType}`
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      return JSON.parse(stored) as GradeQueryLimits
    }
  } catch (error) {
    console.error("조회 제한 데이터 로드 실패:", error)
  }

  return {}
}

/**
 * localStorage에 조회 제한 데이터 저장
 */
function saveQueryLimits(limits: GradeQueryLimits, pageType: PageType): void {
  if (typeof window === "undefined") return

  try {
    const storageKey = `${STORAGE_KEY_PREFIX}${pageType}`
    localStorage.setItem(storageKey, JSON.stringify(limits))
  } catch (error) {
    console.error("조회 제한 데이터 저장 실패:", error)
  }
}

/**
 * 해당 급수의 조회 가능 여부 확인
 * @param grade 조회하려는 급수
 * @param preferredGrade 사용자의 preferredGrade (제한 없음)
 * @param pageType 페이지 타입 (hanzi-list, textbook-words)
 * @returns { canQuery: boolean, remainingQueries: number }
 */
export function checkGradeQueryLimit(
  grade: number,
  preferredGrade?: number,
  pageType: PageType = "hanzi-list"
): { canQuery: boolean; remainingQueries: number } {
  // preferredGrade는 제한 없음
  if (preferredGrade && grade === preferredGrade) {
    return { canQuery: true, remainingQueries: MAX_QUERIES_PER_DAY }
  }

  const limits = getQueryLimits(pageType)
  const gradeKey = grade.toString()
  const today = getTodayDate()

  const record = limits[gradeKey]

  // 오늘 날짜가 아니거나 기록이 없으면 조회 가능
  if (!record || record.date !== today) {
    return { canQuery: true, remainingQueries: MAX_QUERIES_PER_DAY }
  }

  // 오늘 날짜이고 조회 횟수 확인
  const remainingQueries = MAX_QUERIES_PER_DAY - record.count

  return {
    canQuery: remainingQueries > 0,
    remainingQueries: Math.max(0, remainingQueries),
  }
}

/**
 * 해당 급수의 조회 횟수 증가
 * @param grade 조회한 급수
 * @param preferredGrade 사용자의 preferredGrade (카운트하지 않음)
 * @param pageType 페이지 타입 (hanzi-list, textbook-words)
 */
export function incrementGradeQueryCount(
  grade: number,
  preferredGrade?: number,
  pageType: PageType = "hanzi-list"
): void {
  // preferredGrade는 카운트하지 않음
  if (preferredGrade && grade === preferredGrade) {
    return
  }

  const limits = getQueryLimits(pageType)
  const gradeKey = grade.toString()
  const today = getTodayDate()

  const record = limits[gradeKey]

  // 오늘 날짜가 아니거나 기록이 없으면 새로 생성
  if (!record || record.date !== today) {
    limits[gradeKey] = { date: today, count: 1 }
  } else {
    // 오늘 날짜면 카운트 증가
    limits[gradeKey] = {
      date: today,
      count: record.count + 1,
    }
  }

  saveQueryLimits(limits, pageType)
}

/**
 * 해당 급수의 남은 조회 횟수 가져오기
 * @param grade 조회하려는 급수
 * @param preferredGrade 사용자의 preferredGrade
 * @param pageType 페이지 타입 (hanzi-list, textbook-words)
 * @returns 남은 조회 횟수
 */
export function getRemainingQueries(
  grade: number,
  preferredGrade?: number,
  pageType: PageType = "hanzi-list"
): number {
  // preferredGrade는 제한 없음
  if (preferredGrade && grade === preferredGrade) {
    return MAX_QUERIES_PER_DAY
  }

  const limits = getQueryLimits(pageType)
  const gradeKey = grade.toString()
  const today = getTodayDate()

  const record = limits[gradeKey]

  // 오늘 날짜가 아니거나 기록이 없으면 최대 횟수 반환
  if (!record || record.date !== today) {
    return MAX_QUERIES_PER_DAY
  }

  // 오늘 날짜면 남은 횟수 계산
  return Math.max(0, MAX_QUERIES_PER_DAY - record.count)
}

