// 사용자 관련 타입
export interface User {
  id: string
  email: string
  displayName: string
  photoURL: string
  isAdmin: boolean
  experience: number // 경험치 필드 추가
  level: number // 레벨 필드 추가
  createdAt: string
  updatedAt: string
}

// 관련 단어 타입
export interface RelatedWord {
  hanzi: string // 한자 단어 (예: "火事")
  korean: string // 한글 뜻 (예: "화재")
}

// 한자 관련 타입
export interface Hanzi {
  id: string
  character: string
  meaning: string // 뜻 (예: "불")
  sound: string // 음 (예: "화")
  pinyin?: string // 병음 (예: "huǒ")
  grade: number
  strokes: number
  radicals: string[]
  relatedWords?: RelatedWord[]
  strokeOrder?: string[]
  difficulty?: "easy" | "medium" | "hard"
  frequency?: number
  notes?: string
}

// 학습 세션 타입
export interface LearningSession {
  id: string
  userId: string
  gameType: "memory" | "quiz" | "writing" | "partial"
  hanziIds: string[]
  score: number
  correctAnswers: number
  totalQuestions: number
  duration: number // 초 단위
  experience: number
  createdAt: string
}

// 게임 타입별 상세 데이터
export interface MemoryGameSession extends LearningSession {
  gameType: "memory"
  pairsFound: number
  totalPairs: number
  attempts: number
}

export interface QuizGameSession extends LearningSession {
  gameType: "quiz"
  questions: QuizQuestion[]
}

export interface WritingGameSession extends LearningSession {
  gameType: "writing"
  charactersWritten: number
  accuracy: number // 0-100
}

export interface PartialGameSession extends LearningSession {
  gameType: "partial"
  charactersGuessed: number
  totalCharacters: number
}

// 퀴즈 질문 타입
export interface QuizQuestion {
  id: string
  hanziId: string
  questionType: "meaning" | "pinyin"
  question: string
  correctAnswer: string
  options: string[]
  userAnswer?: string
  isCorrect?: boolean
}

// 사용자 통계 타입
export interface UserStatistics {
  id?: string
  userId: string
  totalExperience: number
  totalSessions: number
  averageScore: number
  favoriteGame: "memory" | "quiz" | "writing" | "partial"
  weakCharacters: string[] // 취약한 한자들
  strongCharacters: string[] // 잘하는 한자들
  lastPlayedAt: string
  updatedAt: string
}

// 게임 설정 타입
export interface GameSettings {
  difficulty: "easy" | "medium" | "hard"
  timeLimit?: number // 초 단위
  maxQuestions: number
  gradeFilter: number[] // 선택된 등급들
}

// API 응답 타입
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// 로딩 상태 타입
export interface LoadingState {
  isLoading: boolean
  message?: string
}

// 에러 상태 타입
export interface ErrorState {
  hasError: boolean
  message?: string
}
