import { Hanzi } from "@/types"
import { HanziStorage, HanziWithKnownStatus } from "@/lib/hanziStorage"

/**
 * isKnown 기반 퀴즈 한자 선택
 * 
 * 로직:
 * - 모르는 한자(isKnown=false)가 많으면 → 모르는 한자에서 많이 출제
 * - 아는 한자(isKnown=true)가 많으면 → 아는 한자에서도 비율 높여서 출제 (복습)
 * - 기본 비율: 모르는 한자 90%, 아는 한자 10%
 * - 부족하면 다른 목록에서 채움
 */
export function selectHanziByKnownStatus(
  knownStatusList: HanziWithKnownStatus[],
  questionCount: number
): HanziWithKnownStatus[] {
  const unknownHanzi = knownStatusList.filter((h) => !h.isKnown)
  const knownHanzi = knownStatusList.filter((h) => h.isKnown)

  // 동적 비율 계산
  const unknownRatio = unknownHanzi.length / knownStatusList.length
  const knownRatio = knownHanzi.length / knownStatusList.length

  let targetUnknown: number
  let targetKnown: number

  if (unknownRatio >= 0.5) {
    // 모르는 한자가 50% 이상이면: 모르는 한자 90%, 아는 한자 10%
    targetUnknown = Math.round(questionCount * 0.9)
    targetKnown = questionCount - targetUnknown
  } else if (knownRatio >= 0.8) {
    // 아는 한자가 80% 이상이면: 모르는 한자 50%, 아는 한자 50% (복습 강화)
    targetUnknown = Math.round(questionCount * 0.5)
    targetKnown = questionCount - targetUnknown
  } else {
    // 중간: 모르는 한자 70%, 아는 한자 30%
    targetUnknown = Math.round(questionCount * 0.7)
    targetKnown = questionCount - targetUnknown
  }

  // 랜덤 셔플
  const shuffledUnknown = [...unknownHanzi].sort(() => Math.random() - 0.5)
  const shuffledKnown = [...knownHanzi].sort(() => Math.random() - 0.5)

  // 각각에서 선택
  const fromUnknown = shuffledUnknown.slice(0, targetUnknown)
  const fromKnown = shuffledKnown.slice(0, targetKnown)

  // 결과 합치기
  let result = [...fromUnknown, ...fromKnown]
  const shortage = questionCount - result.length

  // 부족하면 남은 목록에서 채움
  if (shortage > 0) {
    const selectedIds = new Set(result.map((h) => h.hanziId))

    // 남은 모르는 한자에서 채우기
    const remainingUnknown = shuffledUnknown
      .filter((h) => !selectedIds.has(h.hanziId))
      .slice(0, shortage)
    result = [...result, ...remainingUnknown]

    // 아직도 부족하면 남은 아는 한자에서 채우기
    const stillShortage = questionCount - result.length
    if (stillShortage > 0) {
      const updatedSelectedIds = new Set(result.map((h) => h.hanziId))
      const remainingKnown = shuffledKnown
        .filter((h) => !updatedSelectedIds.has(h.hanziId))
        .slice(0, stillShortage)
      result = [...result, ...remainingKnown]
    }
  }

  // 최종 셔플 후 반환
  return result.sort(() => Math.random() - 0.5).slice(0, questionCount)
}

/**
 * HanziWithKnownStatus를 Hanzi 형태로 변환
 * (퀴즈/부분맞추기 게임에서 사용하는 형식)
 */
function convertToHanzi(
  knownStatusList: HanziWithKnownStatus[],
  fullHanziList: Hanzi[]
): Hanzi[] {
  const hanziMap = new Map(fullHanziList.map((h) => [h.id, h]))
  return knownStatusList
    .map((ks) => hanziMap.get(ks.hanziId))
    .filter((h): h is Hanzi => h !== undefined)
}

/**
 * 퀴즈/부분맞추기용: isKnown 캐시 기반으로 한자 선택
 * 
 * 1. IndexedDB에서 isKnown 캐시 조회
 * 2. 캐시가 있으면 isKnown 기반으로 선택
 * 3. 캐시가 없으면 전체 랜덤 (기존 방식 fallback)
 */
export async function getSelectedHanziForGame(
  userId: string,
  _currentGrade: number, // 현재는 사용하지 않지만 API 호환성 유지
  currentGradeHanziList: Hanzi[],
  questionCount: number
): Promise<Hanzi[]> {
  try {
    const storage = new HanziStorage(userId)
    const cache = await storage.getKnownStatusCache()

    if (cache?.data?.length) {
      // isKnown 캐시가 있으면 사용
      const selectedByKnown = selectHanziByKnownStatus(cache.data, questionCount)
      const result = convertToHanzi(selectedByKnown, currentGradeHanziList)

      // 변환 결과가 부족하면 나머지는 전체 목록에서 채움
      if (result.length < questionCount) {
        const selectedIds = new Set(result.map((h) => h.id))
        const remaining = currentGradeHanziList
          .filter((h) => !selectedIds.has(h.id))
          .sort(() => Math.random() - 0.5)
          .slice(0, questionCount - result.length)
        return [...result, ...remaining].sort(() => Math.random() - 0.5)
      }

      console.debug(`✅ isKnown 기반 문제 선택: ${result.length}개`)
      return result
    }
  } catch (error) {
    console.error("isKnown 캐시 조회 실패:", error)
  }

  // 캐시가 없으면 전체 랜덤 (fallback)
  console.debug("⚠️ isKnown 캐시 없음, 전체 랜덤 선택")
  return [...currentGradeHanziList]
    .sort(() => Math.random() - 0.5)
    .slice(0, questionCount)
}
