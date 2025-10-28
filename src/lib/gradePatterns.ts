import { patterns } from "./patterns"

// 급수별 패턴 구성 (패턴명과 문제 수)
export const gradePatterns = {
  8: [
    { pattern: "sound", questionCount: 5 },
    { pattern: "meaning", questionCount: 5 },
    { pattern: "word_reading", questionCount: 7 },
    { pattern: "word_meaning", questionCount: 9 },
    { pattern: "blank_hanzi", questionCount: 2 },
    { pattern: "word_meaning_select", questionCount: 2 },
    { pattern: "hanzi_write", questionCount: 8 },
    { pattern: "word_reading_write", questionCount: 6 },
    { pattern: "sentence_reading", questionCount: 6 },
  ],
  7: [
    { pattern: "sound", questionCount: 5 },
    { pattern: "meaning", questionCount: 5 },
    { pattern: "word_reading", questionCount: 7 },
    { pattern: "word_meaning", questionCount: 9 },
    { pattern: "blank_hanzi", questionCount: 2 },
    { pattern: "word_meaning_select", questionCount: 2 },
    { pattern: "hanzi_write", questionCount: 8 },
    { pattern: "word_reading_write", questionCount: 6 },
    { pattern: "sentence_reading", questionCount: 6 },
  ],
  6: [
    { pattern: "sound", questionCount: 8 },
    { pattern: "meaning", questionCount: 8 },
    { pattern: "word_reading", questionCount: 8 },
    { pattern: "word_meaning", questionCount: 8 },
    { pattern: "blank_hanzi", questionCount: 2 },
    { pattern: "word_meaning_select", questionCount: 2 },
    { pattern: "hanzi_write", questionCount: 8 },
    { pattern: "word_reading_write", questionCount: 4 },
    { pattern: "sentence_reading", questionCount: 2 },
  ],
  5: [
    { pattern: "sound", questionCount: 10 },
    { pattern: "meaning", questionCount: 10 },
    { pattern: "word_reading", questionCount: 10 },
    { pattern: "word_meaning", questionCount: 10 },
    { pattern: "blank_hanzi", questionCount: 2 },
    { pattern: "word_meaning_select", questionCount: 2 },
    { pattern: "hanzi_write", questionCount: 4 },
    { pattern: "word_reading_write", questionCount: 2 },
    { pattern: "sentence_reading", questionCount: 0 },
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
    questionCount: config.questionCount,
  }))
}

export type GradePatternType = keyof typeof gradePatterns
