import { Hanzi } from "@/types"
import { HanziStorage, HanziWithKnownStatus } from "@/lib/hanziStorage"

const UNKNOWN_RATIO = 0.9
const KNOWN_RATIO = 0.1

/**
 * 아는 한자 / 모르는 한자 분리 저장 기준 퀴즈 선택
 *
 * - 모르는 한자 90%, 아는 한자 10%
 * - 개수가 부족하면 아는 한자에서 추가로 채움 (이미 뽑은 아는 한자와 중복 없이)
 */
export function selectHanziByKnownStatus(
  unknownList: HanziWithKnownStatus[],
  knownList: HanziWithKnownStatus[],
  questionCount: number
): HanziWithKnownStatus[] {
  const targetUnknown = Math.round(questionCount * UNKNOWN_RATIO)
  const targetKnown = questionCount - targetUnknown

  const shuffledUnknown = [...unknownList].sort(() => Math.random() - 0.5)
  const shuffledKnown = [...knownList].sort(() => Math.random() - 0.5)

  const fromUnknown = shuffledUnknown.slice(0, targetUnknown)
  const fromKnown = shuffledKnown.slice(0, targetKnown)

  let result = [...fromUnknown, ...fromKnown]
  const selectedIds = new Set(result.map((h) => h.hanziId))
  let shortage = questionCount - result.length

  if (shortage > 0) {
    const remainingKnown = shuffledKnown.filter((h) => !selectedIds.has(h.hanziId))
    const fillFromKnown = remainingKnown.slice(0, shortage)
    result = [...result, ...fillFromKnown]
    fillFromKnown.forEach((h) => selectedIds.add(h.hanziId))
    shortage = questionCount - result.length
  }

  if (shortage > 0) {
    const remainingUnknown = shuffledUnknown.filter((h) => !selectedIds.has(h.hanziId))
    result = [...result, ...remainingUnknown.slice(0, shortage)]
  }

  return result.sort(() => Math.random() - 0.5).slice(0, questionCount)
}

/**
 * HanziWithKnownStatus[] → Hanzi[] 변환 (퀴즈용)
 */
function convertToHanzi(
  selected: HanziWithKnownStatus[],
  fullHanziList: Hanzi[]
): Hanzi[] {
  const hanziMap = new Map(fullHanziList.map((h) => [h.id, h]))
  return selected
    .map((ks) => hanziMap.get(ks.hanziId))
    .filter((h): h is Hanzi => h !== undefined)
}

/**
 * 퀴즈/부분맞추기용: IndexedDB의 known/unknown 분리 캐시 기준으로 한자 선택
 */
export async function getSelectedHanziForGame(
  userId: string,
  _currentGrade: number,
  currentGradeHanziList: Hanzi[],
  questionCount: number
): Promise<Hanzi[]> {
  try {
    const storage = new HanziStorage(userId)
    const cache = await storage.getKnownStatusCache(_currentGrade)

    const hasKnown = cache?.known?.length !== undefined
    const hasUnknown = cache?.unknown?.length !== undefined
    const hasData = hasKnown && hasUnknown && (cache.known.length > 0 || cache.unknown.length > 0)

    if (cache && hasData) {
      const selected = selectHanziByKnownStatus(
        cache.unknown,
        cache.known,
        questionCount
      )
      const result = convertToHanzi(selected, currentGradeHanziList)

      if (result.length < questionCount) {
        const selectedIds = new Set(result.map((h) => h.id))
        const remaining = currentGradeHanziList
          .filter((h) => !selectedIds.has(h.id))
          .sort(() => Math.random() - 0.5)
          .slice(0, questionCount - result.length)
        return [...result, ...remaining].sort(() => Math.random() - 0.5)
      }

      console.debug(`✅ known/unknown 기반 문제 선택: ${result.length}개`)
      return result
    }
  } catch (error) {
    console.error("isKnown 캐시 조회 실패:", error)
  }

  console.debug("⚠️ known/unknown 캐시 없음, 전체 랜덤 선택")
  return [...currentGradeHanziList]
    .sort(() => Math.random() - 0.5)
    .slice(0, questionCount)
}
