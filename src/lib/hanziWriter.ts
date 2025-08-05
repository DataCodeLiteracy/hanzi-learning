import HanziWriter from "hanzi-writer"

// Stroke order 캐시 (메모리)
const strokeOrderCache = new Map<string, string[]>()

/**
 * Hanzi Writer를 사용하여 한자의 stroke order를 생성합니다.
 * @param character 한자 문자
 * @returns stroke order 배열
 */
export const generateStrokeOrder = async (
  character: string
): Promise<string[]> => {
  // 캐시에서 확인
  if (strokeOrderCache.has(character)) {
    return strokeOrderCache.get(character)!
  }

  try {
    // 임시 캔버스 생성
    const tempCanvas = document.createElement("canvas")
    tempCanvas.id = "temp-canvas"
    tempCanvas.style.position = "absolute"
    tempCanvas.style.left = "-9999px"
    tempCanvas.style.top = "-9999px"
    document.body.appendChild(tempCanvas)

    // Hanzi Writer를 사용하여 stroke order 생성
    const writer = HanziWriter.create("temp-canvas", character, {
      width: 100,
      height: 100,
      padding: 5,
      showOutline: false,
      strokeAnimationSpeed: 0,
      delayBetweenStrokes: 0,
    })

    // Stroke order 데이터 추출 (writer 객체에서 stroke 정보 추출)
    const strokeOrder: string[] = []

    // Hanzi Writer의 내부 stroke 데이터에 접근
    const writerWithData = writer as {
      characterData?: { strokes?: unknown[] }
    } | null
    if (writerWithData?.characterData) {
      const characterData = writerWithData.characterData
      if (characterData.strokes) {
        for (let i = 0; i < characterData.strokes.length; i++) {
          strokeOrder.push((i + 1).toString())
        }
      }
    }

    // 캐시에 저장
    strokeOrderCache.set(character, strokeOrder)

    // 임시 캔버스 제거
    document.body.removeChild(tempCanvas)

    return strokeOrder
  } catch (error) {
    console.error(`Stroke order 생성 실패: ${character}`, error)
    return []
  }
}

/**
 * 한자의 stroke order가 비어있는지 확인합니다.
 * @param hanzi 한자 객체
 * @returns stroke order가 비어있으면 true
 */
export const isStrokeOrderEmpty = (hanzi: {
  strokeOrder?: string[]
}): boolean => {
  return !hanzi.strokeOrder || hanzi.strokeOrder.length === 0
}

/**
 * Stroke order를 Firestore에 업데이트합니다.
 * @param hanziId 한자 ID
 * @param strokeOrder stroke order 배열
 */
export const updateHanziStrokeOrder = async (
  hanziId: string,
  strokeOrder: string[]
): Promise<void> => {
  try {
    const { ApiClient } = await import("./apiClient")
    await ApiClient.updateDocument("hanzi", hanziId, {
      strokeOrder,
      updatedAt: new Date().toISOString(),
    })
    console.log(`Stroke order 업데이트 완료: ${hanziId}`)
  } catch (error) {
    console.error(`Stroke order 업데이트 실패: ${hanziId}`, error)
  }
}

/**
 * 한자에 stroke order가 없으면 생성하고 업데이트합니다.
 * @param hanzi 한자 객체
 * @returns 업데이트된 stroke order 배열
 */
export const ensureStrokeOrder = async (hanzi: {
  id: string
  character: string
  strokeOrder?: string[]
}): Promise<string[]> => {
  // 이미 stroke order가 있으면 반환
  if (!isStrokeOrderEmpty(hanzi)) {
    return hanzi.strokeOrder!
  }

  // Stroke order 생성
  const strokeOrder = await generateStrokeOrder(hanzi.character)

  if (strokeOrder.length > 0) {
    // Firestore 업데이트
    await updateHanziStrokeOrder(hanzi.id, strokeOrder)
  }

  return strokeOrder
}
