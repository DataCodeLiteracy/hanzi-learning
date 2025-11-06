import { createQuestionByPattern } from "./createQuestionByPattern"
import type { Hanzi } from "@/types/index"
import type { ExamQuestionDetail } from "@/types/exam"

interface GradePattern {
  type: string
  name: string
  description: string
  questionCount: number
  isTextBook?: boolean
}

export const generateQuestionsByPattern = (
  gradePatterns: GradePattern[],
  selectedTextBookHanzi: Hanzi[],
  selectedNormalHanzi: Hanzi[]
): ExamQuestionDetail[] => {
  const structuredQuestions: ExamQuestionDetail[] = []
  let textBookIndex = 0
  let normalIndex = 0

  gradePatterns.forEach((pattern: GradePattern) => {
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
