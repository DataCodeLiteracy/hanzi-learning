import { Hanzi } from "@/types"
import { ApiClient } from "@/lib/apiClient"
import { HanziStorage } from "@/lib/hanziStorage"
import { getGradeBelow } from "@/lib/gradeUtils"

const OVERLAP_RATIO = 0.3
const RANDOM_RATIO = 0.7

/**
 * 아래 급수 한자 목록 조회. IndexedDB 캐시 우선, 없으면 API 1회 호출 후 캐시 저장.
 * (Firebase 조회는 최초 1회만 발생)
 */
export async function getGradeBelowHanziList(
  userId: string,
  gradeBelow: number
): Promise<Hanzi[]> {
  const storage = new HanziStorage(userId)
  const cached = await storage.getDataByGrade(gradeBelow)
  if (cached?.data?.length) return cached.data
  const data = await ApiClient.getHanziByGrade(gradeBelow)
  if (data.length) await storage.saveDataByGrade(gradeBelow, data)
  return data
}

/**
 * 현재 급수 한자 중 "아래 급수와 글자(character)가 겹치는 한자" = 이미 알고 있을 가능성이 높은 한자
 */
function getOverlapHanzi(
  currentGradeList: Hanzi[],
  gradeBelowList: Hanzi[]
): Hanzi[] {
  const belowCharacters = new Set(gradeBelowList.map((h) => h.character))
  return currentGradeList.filter((h) => belowCharacters.has(h.character))
}

/**
 * 30%: 아래 급수와 겹치는 한자(알 가능성 높음) / 70%: 전체에서 랜덤
 * 겹치는 한자가 없거나 아래 급수가 없으면 전부 랜덤
 */
export function selectHanziForQuiz(
  currentGradeHanziList: Hanzi[],
  gradeBelowHanziList: Hanzi[] | null,
  questionCount: number
): Hanzi[] {
  const overlap = gradeBelowHanziList?.length
    ? getOverlapHanzi(currentGradeHanziList, gradeBelowHanziList)
    : []
  const nOverlap = Math.min(
    Math.round(questionCount * OVERLAP_RATIO),
    overlap.length
  )
  const nRandom = questionCount - nOverlap

  const fromOverlap =
    nOverlap > 0
      ? [...overlap].sort(() => Math.random() - 0.5).slice(0, nOverlap)
      : []
  const fromRandom = [...currentGradeHanziList]
    .sort(() => Math.random() - 0.5)
    .filter((h) => !fromOverlap.find((o) => o.id === h.id))
    .slice(0, nRandom)

  const combined = [...fromOverlap, ...fromRandom].sort(() => Math.random() - 0.5)
  return combined.slice(0, questionCount)
}

/**
 * 퀴즈/부분맞추기용: 현재 급수 목록 + 아래 급수(캐시 또는 1회 API)로 30/70 선택 후 한자 배열 반환
 */
export async function getSelectedHanziForGame(
  userId: string,
  currentGrade: number,
  currentGradeHanziList: Hanzi[],
  questionCount: number
): Promise<Hanzi[]> {
  const gradeBelow = getGradeBelow(currentGrade)
  const gradeBelowList =
    gradeBelow !== null
      ? await getGradeBelowHanziList(userId, gradeBelow)
      : null
  return selectHanziForQuiz(
    currentGradeHanziList,
    gradeBelowList,
    questionCount
  )
}
