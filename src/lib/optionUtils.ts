export const generateUniqueOptions = (
  correctAnswer: string,
  pool: any[],
  field: string
) => {
  const options = [correctAnswer]
  const usedValues = new Set([correctAnswer])
  let attempts = 0
  const maxAttempts = Math.min(pool.length * 10, 500) // 시도 횟수 증가

  // 정답의 글자 수 계산 (한글 기준)
  const correctAnswerLength = correctAnswer ? correctAnswer.length : 0

  const pickValue = (h: any) => {
    if (field === "sound") return h.sound
    if (field === "character") return h.character
    if (field === "relatedWords") {
      if (Array.isArray(h.relatedWords)) {
        const rw =
          h.relatedWords[Math.floor(Math.random() * h.relatedWords.length)]
        return rw?.korean
      }
      return h.relatedWords?.korean
    }
    if (field === "textBookWord") {
      // textBookWord가 있는 경우 그 korean을 사용
      if (h.textBookWord?.korean) return h.textBookWord.korean
      // textBookWord가 없으면 relatedWords에서 isTextBook === true인 것 찾기
      if (Array.isArray(h.relatedWords)) {
        const textBookWord = h.relatedWords.find((rw: any) => rw?.isTextBook)
        if (textBookWord?.korean) return textBookWord.korean
      }
      if (h.relatedWords?.isTextBook) {
        return h.relatedWords.korean
      }
      // 없으면 첫 번째 relatedWords의 korean 사용
      if (Array.isArray(h.relatedWords) && h.relatedWords.length > 0) {
        return h.relatedWords[0]?.korean
      }
      return h.relatedWords?.korean
    }
    return ""
  }

  // textBookWord 필드의 경우, 정답과 비슷한 글자 수의 단어를 우선적으로 찾기
  if (field === "textBookWord" && correctAnswerLength > 0) {
    // 1단계: 정답과 같은 글자 수의 단어를 우선적으로 찾기
    const sameLengthWords: string[] = []
    const otherWords: string[] = []

    for (const h of pool) {
      const value = pickValue(h)
      if (value && !usedValues.has(value)) {
        if (value.length === correctAnswerLength) {
          sameLengthWords.push(value)
        } else {
          otherWords.push(value)
        }
      }
    }

    // 같은 글자 수의 단어를 먼저 추가
    while (options.length < 4 && sameLengthWords.length > 0) {
      const randomIndex = Math.floor(Math.random() * sameLengthWords.length)
      const value = sameLengthWords.splice(randomIndex, 1)[0]
      if (value && !usedValues.has(value)) {
        options.push(value)
        usedValues.add(value)
      }
    }

    // 같은 글자 수의 단어가 부족하면 다른 글자 수의 단어 추가
    while (options.length < 4 && otherWords.length > 0) {
      const randomIndex = Math.floor(Math.random() * otherWords.length)
      const value = otherWords.splice(randomIndex, 1)[0]
      if (value && !usedValues.has(value)) {
        options.push(value)
        usedValues.add(value)
      }
    }
  }

  // 기존 로직: 더 많은 시도
  while (
    options.length < 4 &&
    usedValues.size < pool.length &&
    attempts < maxAttempts
  ) {
    attempts++
    const value = pickValue(pool[Math.floor(Math.random() * pool.length)])
    if (value && !usedValues.has(value) && value.trim() !== "") {
      options.push(value)
      usedValues.add(value)
    }
  }

  // 보충: 더 많은 시도
  let fill = 0
  const maxFill = Math.min(pool.length * 5, 200)
  while (options.length < 4 && fill < maxFill) {
    fill++
    const value = pickValue(pool[Math.floor(Math.random() * pool.length)])
    if (value && value.trim() !== "" && !usedValues.has(value)) {
      options.push(value)
      usedValues.add(value)
    }
  }

  // 전체 pool을 다시 순회하여 더 찾기
  if (options.length < 4) {
    const shuffledPool = [...pool].sort(() => Math.random() - 0.5)
    for (const h of shuffledPool) {
      if (options.length >= 4) break
      const value = pickValue(h)
      if (value && value.trim() !== "" && !usedValues.has(value)) {
        options.push(value)
        usedValues.add(value)
      }
    }
  }

  // "선택지" 기본값 사용하지 않음 - 최대한 실제 단어 사용
  // 만약 4개 미만이면 있는 것만 반환
  return options.slice(0, 4).sort(() => Math.random() - 0.5)
}

import { patterns } from "@/lib/patterns"

export const getSelectedOptionText = (
  question: any,
  userAnswer: any,
  finalQuestionsArray: any[],
  pattern4Options: string[]
): string | null => {
  if (userAnswer === undefined || userAnswer === null || userAnswer === "") {
    return null
  }

  const pattern = patterns[question.type as keyof typeof patterns]
  const userInputType = pattern?.userInputType

  // blank_hanzi 패턴: 숫자면 options에서 character 찾기
  if (question.type === "blank_hanzi") {
    if (typeof userAnswer === "number") {
      const q = finalQuestionsArray.find((q: any) => q.id === question.id)
      const idx = userAnswer - 1
      return q?.options?.[idx] ?? null
    }
    return userAnswer as string
  }

  if (question.type === "word_meaning") {
    // word_meaning은 옵션에서 선택하는 것이 아니라 직접 character를 입력하는 패턴
    // 하지만 실제로는 옵션에서 선택하는 경우도 있으므로 둘 다 처리
    if (typeof userAnswer === "number") {
      const idx = userAnswer - 1
      return pattern4Options?.[idx] ?? null
    }
    // 직접 character를 입력한 경우
    return userAnswer as string
  }

  if (
    userInputType === "character" ||
    userInputType === "korean_word" ||
    userInputType === "meaning_sound"
  ) {
    return userInputType === "korean_word"
      ? (userAnswer as string)?.trim()
      : (userAnswer as string)
  }

  if (userInputType === "option") {
    const q = finalQuestionsArray.find((q: any) => q.id === question.id)
    const idx = parseInt(String(userAnswer)) - 1
    return q?.options?.[idx] ?? null
  }

  return null
}

// hanzi_write 패턴을 위한 정규화 함수
// 훈과 음을 각각 trim하고 한 칸 공백으로 합치기
export const normalizeHanziWrite = (input: string): string => {
  if (!input || typeof input !== "string") return ""
  const parts = input.trim().split(/\s+/)
  const meaning = (parts[0] || "").trim()
  const sound = (parts[1] || "").trim()
  return `${meaning} ${sound}`.trim()
}

export const isCorrectAnswer = (
  question: any,
  userAnswer: any,
  correctAnswer: any,
  selectedOptionText: string | null,
  finalQuestionsArray?: any[]
) => {
  const pattern = patterns[question.type as keyof typeof patterns]
  const userInputType = pattern?.userInputType

  if (question.type === "word_meaning_select") {
    // word_meaning_select는 번호로만 비교
    const userAnswerNum =
      typeof userAnswer === "number" ? userAnswer : parseInt(String(userAnswer))
    const correctAnswerNum =
      typeof correctAnswer === "number"
        ? correctAnswer
        : typeof correctAnswer?.correctAnswer === "number"
        ? correctAnswer.correctAnswer
        : parseInt(String(correctAnswer?.correctAnswer || correctAnswer || "0"))
    return userAnswerNum === correctAnswerNum
  }

  if (question.type === "sound") {
    // sound 패턴: userAnswer는 옵션 번호, correctAnswer는 음(텍스트)
    // selectedOptionText가 정답 음과 일치하는지 비교
    const correctSound = correctAnswer?.correctAnswer || correctAnswer || ""
    const result = selectedOptionText?.trim() === correctSound.trim()

    // 디버깅: sound 패턴 비교 실패 시 로그
    if (!result && selectedOptionText) {
      console.error(`⚠️ sound 패턴 비교 실패:`, {
        questionId: question.id,
        character: question.character,
        userAnswer,
        selectedOptionText,
        correctSound,
        options: finalQuestionsArray?.find((q: any) => q.id === question.id)
          ?.options,
      })
    }

    return result
  }

  if (question.type === "meaning") {
    // meaning 패턴: userAnswer는 옵션 번호, correctAnswer는 character
    // selectedOptionText가 정답 character와 일치하는지 비교
    const correctChar = correctAnswer?.correctAnswer || correctAnswer || ""
    return selectedOptionText?.trim() === correctChar.trim()
  }

  if (question.type === "word_reading") {
    // word_reading 패턴: userAnswer는 옵션 번호, correctAnswer는 korean_word
    // selectedOptionText가 정답 korean_word와 일치하는지 비교
    const correctWord = correctAnswer?.correctAnswer || correctAnswer || ""
    return selectedOptionText?.trim() === correctWord.trim()
  }

  if (question.type === "word_meaning") {
    // word_meaning은 character로 비교
    // userAnswer가 숫자면 selectedOptionText에서 character를 가져옴
    const userCharacter =
      selectedOptionText || (typeof userAnswer === "string" ? userAnswer : null)
    const correctCharacter =
      correctAnswer?.correctAnswer || correctAnswer || question.character
    return userCharacter === correctCharacter
  }

  if (question.type === "blank_hanzi") {
    // blank_hanzi는 character로 비교
    // userAnswer가 숫자면 selectedOptionText에서 character를 가져옴
    const userCharacter =
      selectedOptionText || (typeof userAnswer === "string" ? userAnswer : null)
    const correctCharacter =
      correctAnswer?.correctAnswer || correctAnswer || question.character
    return userCharacter === correctCharacter
  }

  if (question.type === "hanzi_write") {
    // 훈과 음을 각각 trim하고 한 칸 공백으로 합쳐서 비교
    const normalizedUser = normalizeHanziWrite(userAnswer as string)
    const normalizedCorrect = normalizeHanziWrite(
      correctAnswer?.correctAnswer || correctAnswer || ""
    )
    return normalizedUser === normalizedCorrect
  }

  if (question.type === "word_reading_write") {
    // 양쪽 공백만 제거
    return (
      (userAnswer as string)?.trim() ===
      (correctAnswer?.correctAnswer || correctAnswer || "")?.trim()
    )
  }

  if (userInputType === "korean_word") {
    return (
      selectedOptionText?.trim() ===
      (correctAnswer?.correctAnswer || correctAnswer || "")?.trim()
    )
  }

  return selectedOptionText === (correctAnswer?.correctAnswer || correctAnswer)
}
