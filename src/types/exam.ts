export interface HanziData {
  character: string
  sound: string
  meaning: string
  relatedWords: Array<{
    hanzi: string
    korean: string
    isTextBook: boolean
  }>
}

export interface ExamQuestion {
  id: string
  type:
    | "sound"
    | "meaning"
    | "word_reading"
    | "word_meaning"
    | "blank_hanzi"
    | "word_meaning_select"
    | "hanzi_write"
    | "word_reading_write"
    | "sentence_reading"
    | "subjective"
  question: string
  options?: string[]
  correctAnswer: string | number
  explanation?: string
  hanziData?: HanziData
  needsAI?: boolean
  aiPrompt?: string
  aiGeneratedContent?: string
}

export interface ExamSession {
  id: string
  userId: string
  grade: number
  questions: ExamQuestionDetail[]
  answers: Record<string, string | number>
  startTime: Date
  endTime?: Date
  score?: number
  passed?: boolean
}

// 패턴별 질문 상세 타입 (discriminated union)
export type QuestionType =
  | "sound"
  | "meaning"
  | "word_reading"
  | "word_meaning"
  | "blank_hanzi"
  | "word_meaning_select"
  | "hanzi_write"
  | "word_reading_write"
  | "sentence_reading"
  | "subjective"

interface BaseQuestion {
  id: string
  type: QuestionType
  character: string
  question?: string
  options?: string[]
  aiGeneratedContent?: string
  aiText?: string // AI 프롬프트 텍스트
  textBookWord?: { hanzi?: string; korean?: string; isTextBook?: boolean }
  relatedWords?:
    | { hanzi?: string; korean?: string; isTextBook?: boolean }
    | Array<{ hanzi?: string; korean?: string; isTextBook?: boolean }>
  correctAnswer?: string | number
  wrongAnswers?: string[] // word_meaning_select용 오답 배열
}

export interface SoundQuestion extends BaseQuestion {
  type: "sound"
  sound: string
}

export interface MeaningQuestion extends BaseQuestion {
  type: "meaning" | "word_meaning"
  meaning: string
}

export interface WordReadingQuestion extends BaseQuestion {
  type: "word_reading"
  sound: string
}

export interface BlankHanziQuestion extends BaseQuestion {
  type: "blank_hanzi"
}

export interface WordMeaningSelectQuestion extends BaseQuestion {
  type: "word_meaning_select"
  correctAnswerIndex?: number
  allOptions?: string[]
}

export interface HanziWriteQuestionData extends BaseQuestion {
  type: "hanzi_write"
  meaning: string
  sound: string
}

export interface WordReadingWriteQuestionData extends BaseQuestion {
  type: "word_reading_write"
  sound?: string
  correctAnswer?: string
}

export interface SentenceReadingQuestionData extends BaseQuestion {
  type: "sentence_reading"
  sound?: string
  correctAnswer?: string
}

export interface SubjectiveQuestion extends BaseQuestion {
  type: "subjective"
}

export type ExamQuestionDetail =
  | SoundQuestion
  | MeaningQuestion
  | WordReadingQuestion
  | BlankHanziQuestion
  | WordMeaningSelectQuestion
  | HanziWriteQuestionData
  | WordReadingWriteQuestionData
  | SentenceReadingQuestionData
  | SubjectiveQuestion

export interface CorrectAnswerItem {
  questionIndex: number
  type: QuestionType
  character: string
  correctAnswer: string | number
}
