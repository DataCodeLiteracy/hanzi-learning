import { patterns } from "./patterns"

// 급수별 패턴 구성 (패턴명과 문제 수)
export const gradePatterns = {
  8: [
    { pattern: "sound", questionCount: 5, isTextBook: false },
    { pattern: "meaning", questionCount: 5, isTextBook: false },
    { pattern: "word_reading", questionCount: 7, isTextBook: true },
    { pattern: "word_meaning", questionCount: 9, isTextBook: false },
    { pattern: "blank_hanzi", questionCount: 2, isTextBook: true },
    { pattern: "word_meaning_select", questionCount: 2, isTextBook: true },
    { pattern: "hanzi_write", questionCount: 8, isTextBook: false },
    { pattern: "word_reading_write", questionCount: 6, isTextBook: true },
    { pattern: "sentence_reading", questionCount: 6, isTextBook: true },
  ],
  7: [
    { pattern: "sound", questionCount: 5, isTextBook: false },
    { pattern: "meaning", questionCount: 5, isTextBook: false },
    { pattern: "word_reading", questionCount: 7, isTextBook: true },
    { pattern: "word_meaning", questionCount: 9, isTextBook: false },
    { pattern: "blank_hanzi", questionCount: 2, isTextBook: true },
    { pattern: "word_meaning_select", questionCount: 2, isTextBook: true },
    { pattern: "hanzi_write", questionCount: 8, isTextBook: false },
    { pattern: "word_reading_write", questionCount: 6, isTextBook: true },
    { pattern: "sentence_reading", questionCount: 6, isTextBook: true },
  ],
  6: [
    { pattern: "sound", questionCount: 10, isTextBook: false },
    { pattern: "sound_same", questionCount: 4, isTextBook: false },
    { pattern: "meaning", questionCount: 10, isTextBook: false },
    { pattern: "word_reading", questionCount: 10, isTextBook: true },
    { pattern: "word_meaning", questionCount: 8, isTextBook: false },
    { pattern: "blank_hanzi", questionCount: 4, isTextBook: true },
    { pattern: "word_meaning_select", questionCount: 4, isTextBook: true },
    { pattern: "hanzi_write", questionCount: 10, isTextBook: false },
    { pattern: "word_reading_write", questionCount: 10, isTextBook: true },
    { pattern: "sentence_reading", questionCount: 10, isTextBook: true },
  ],
  5: [
    { pattern: "sound", questionCount: 10, isTextBook: false },
    { pattern: "meaning", questionCount: 10, isTextBook: false },
    { pattern: "word_reading", questionCount: 10, isTextBook: true },
    { pattern: "word_meaning", questionCount: 10, isTextBook: false },
    { pattern: "blank_hanzi", questionCount: 2, isTextBook: true },
    { pattern: "word_meaning_select", questionCount: 2, isTextBook: true },
    { pattern: "hanzi_write", questionCount: 4, isTextBook: false },
    { pattern: "word_reading_write", questionCount: 2, isTextBook: true },
    { pattern: "sentence_reading", questionCount: 0, isTextBook: true },
  ],
} as const

// 급수별 패턴 정보를 동적으로 생성하는 함수
export const getGradePatterns = (grade: number) => {
  const gradeConfig = gradePatterns[grade as keyof typeof gradePatterns]
  if (!gradeConfig) {
    throw new Error(`급수 ${grade}에 대한 패턴 설정이 없습니다.`)
  }

  return gradeConfig.map((config) => ({
    ...patterns[config.pattern as keyof typeof patterns],
    pattern: config.pattern,
    questionCount: config.questionCount,
    isTextBook: config.isTextBook,
  }))
}

export type GradePatternType = keyof typeof gradePatterns
