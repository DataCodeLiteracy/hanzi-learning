import { createQuestionByPattern } from "./createQuestionByPattern"

export const generateQuestionsByPattern = (
  gradePatterns: any[],
  selectedTextBookHanzi: any[],
  selectedNormalHanzi: any[]
) => {
  const structuredQuestions: any[] = []
  let textBookIndex = 0
  let normalIndex = 0

  gradePatterns.forEach((pattern: any) => {
    let patternQuestionCount = 0
    let attempts = 0
    const maxAttempts = pattern.questionCount * 3

    while (
      patternQuestionCount < pattern.questionCount &&
      attempts < maxAttempts
    ) {
      attempts++
      let hanzi = null
      if (pattern.isTextBook) {
        if (textBookIndex >= selectedTextBookHanzi.length) textBookIndex = 0
        hanzi = selectedTextBookHanzi[textBookIndex]
        textBookIndex++
      } else {
        if (normalIndex >= selectedNormalHanzi.length) normalIndex = 0
        hanzi = selectedNormalHanzi[normalIndex]
        normalIndex++
      }
      if (!hanzi) continue
      const question = createQuestionByPattern(
        pattern,
        hanzi,
        structuredQuestions.length
      )
      if (question) {
        structuredQuestions.push(question)
        patternQuestionCount++
      }
    }
  })

  return structuredQuestions
}
