// 사용자 관련 타입
export interface User {
  id: string
  email: string
  displayName: string
  photoURL: string
  isAdmin: boolean
  experience: number // 경험치 필드 추가
  level: number // 레벨 필드 추가
  preferredGrade?: number // 선호하는 급수 (기본값: 8)
  createdAt: string
  updatedAt: string
}

// 관련 단어 타입
export interface RelatedWord {
  hanzi: string // 한자 단어 (예: "火事")
  korean: string // 한글 뜻 (예: "화재")
  isTextBook?: boolean // 교과서 한자어 여부
  meaning?: string // 교과서 한자어의 뜻 (사용자가 등록)
}

// 한자 관련 타입
export interface Hanzi {
  id: string
  character: string
  meaning: string // 뜻 (예: "불")
  sound: string // 음 (예: "화")
  pinyin?: string // 병음 (예: "huǒ")
  grade: number
  gradeNumber: number // 급수 내에서의 번호 (예: 8급 1번, 8급 2번...)
  strokes: number
  radicals: string[]
  relatedWords?: RelatedWord[]
  strokeOrder?: string[]
  difficulty?: "easy" | "medium" | "hard"
  frequency?: number
  notes?: string
  createdAt: string
  updatedAt: string
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
  todayExperience: number // 오늘 달성한 경험치
  todayGoal?: number // 오늘의 학습 목표 (기본값: 100)
  lastResetDate?: string // 마지막 리셋 날짜 (자정 리셋용)
  lastWeekNumber?: string // 마지막 주차 번호 (주간 리셋용)

  // 목표 달성 통계 필드들 추가
  goalAchievementHistory?: {
    date: string // YYYY-MM-DD 형식
    achieved: boolean // 해당 날짜 목표 달성 여부
    experience: number // 해당 날짜 획득 경험치
  }[]
  consecutiveGoalDays?: number // 연속 목표 달성일
  weeklyGoalAchievement?: {
    currentWeek: string // YYYY-WW 형식 (예: 2024-01)
    achievedDays: number // 이번주 달성한 날 수
    totalDays: number // 이번주 총 날 수 (보통 7)
  }
  monthlyGoalAchievement?: {
    currentMonth: string // YYYY-MM 형식
    achievedDays: number // 이번달 달성한 날 수
    totalDays: number // 이번달 총 날 수
  }

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
