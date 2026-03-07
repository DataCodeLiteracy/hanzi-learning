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
 * 현재 급수 한자 중 "아래 급수와 겹치지 않는 한자" = 새로 배워야 할 한자
 */
function getNonOverlapHanzi(
  currentGradeList: Hanzi[],
  gradeBelowList: Hanzi[]
): Hanzi[] {
  const belowCharacters = new Set(gradeBelowList.map((h) => h.character))
  return currentGradeList.filter((h) => !belowCharacters.has(h.character))
}

/**
 * 30%: 아래 급수와 겹치는 한자(알 가능성 높음)
 * 70%: 아래 급수와 겹치지 않는 한자(새로 배울 한자)
 * 부족하면 남는 목록에서 채움
 */
export function selectHanziForQuiz(
  currentGradeHanziList: Hanzi[],
  gradeBelowHanziList: Hanzi[] | null,
  questionCount: number
): Hanzi[] {
  // 아래 급수가 없으면 전부 랜덤
  if (!gradeBelowHanziList?.length) {
    return [...currentGradeHanziList]
      .sort(() => Math.random() - 0.5)
      .slice(0, questionCount)
  }

  const overlap = getOverlapHanzi(currentGradeHanziList, gradeBelowHanziList)
  const nonOverlap = getNonOverlapHanzi(currentGradeHanziList, gradeBelowHanziList)

  // 목표 개수 계산
  const targetOverlap = Math.round(questionCount * OVERLAP_RATIO)
  const targetNonOverlap = questionCount - targetOverlap

  // 랜덤 셔플 후 선택
  const shuffledOverlap = [...overlap].sort(() => Math.random() - 0.5)
  const shuffledNonOverlap = [...nonOverlap].sort(() => Math.random() - 0.5)

  // 각각에서 가능한 만큼 선택
  const fromOverlap = shuffledOverlap.slice(0, targetOverlap)
  const fromNonOverlap = shuffledNonOverlap.slice(0, targetNonOverlap)

  // 부족한 경우 처리
  let result = [...fromOverlap, ...fromNonOverlap]
  const shortage = questionCount - result.length

  if (shortage > 0) {
    // 이미 선택된 id 집합
    const selectedIds = new Set(result.map((h) => h.id))

    // 남은 overlap에서 채우기
    const remainingOverlap = shuffledOverlap
      .filter((h) => !selectedIds.has(h.id))
      .slice(0, shortage)
    result = [...result, ...remainingOverlap]

    // 아직도 부족하면 남은 nonOverlap에서 채우기
    const stillShortage = questionCount - result.length
    if (stillShortage > 0) {
      const updatedSelectedIds = new Set(result.map((h) => h.id))
      const remainingNonOverlap = shuffledNonOverlap
        .filter((h) => !updatedSelectedIds.has(h.id))
        .slice(0, stillShortage)
      result = [...result, ...remainingNonOverlap]
    }
  }

  // 최종 셔플 후 반환
  return result.sort(() => Math.random() - 0.5).slice(0, questionCount)
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
