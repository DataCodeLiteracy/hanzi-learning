"use client"

import { useState, useEffect, useCallback, use } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import LoadingSpinner from "@/components/LoadingSpinner"
import { ArrowLeft, Clock, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTimeTracking } from "@/hooks/useTimeTracking"

interface HanziData {
  character: string
  sound: string
  meaning: string
  relatedWords: Array<{
    hanzi: string
    korean: string
    isTextBook: boolean
  }>
}

interface ExamQuestion {
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
}

interface ExamSession {
  id: string
  userId: string
  grade: number
  questions: ExamQuestion[]
  answers: Record<string, string | number>
  startTime: Date
  endTime?: Date
  score?: number
  passed?: boolean
}

const gradeInfo: Record<
  number,
  { name: string; questionCount: number; timeLimit: number }
> = {
  8: { name: "8급", questionCount: 50, timeLimit: 60 },
  7: { name: "7급", questionCount: 50, timeLimit: 60 },
  6: { name: "6급", questionCount: 80, timeLimit: 60 },
  5: { name: "5급", questionCount: 100, timeLimit: 60 },
  4: { name: "4급", questionCount: 100, timeLimit: 60 },
  3: { name: "3급", questionCount: 100, timeLimit: 60 },
  2: { name: "2급", questionCount: 100, timeLimit: 60 },
  1: { name: "1급", questionCount: 100, timeLimit: 60 },
  0: { name: "사범급", questionCount: 100, timeLimit: 60 },
}

export default function ExamGradePage({
  params,
}: {
  params: Promise<{ grade: string }>
}) {
  const { user, loading: authLoading, initialLoading } = useAuth()
  const { refreshUserStatistics, hanziList } = useData()
  const router = useRouter()

  const resolvedParams = use(params)
  const grade = parseInt(resolvedParams.grade)
  const currentGradeInfo = gradeInfo[grade]

  // 시간 추적 훅
  const { startSession, endSession, currentDuration } = useTimeTracking({
    userId: user?.id || "",
    type: "game",
    activity: "exam",
    autoStart: false,
    autoEnd: true,
  })

  const [examSession, setExamSession] = useState<ExamSession | null>(null)
  const [currentPattern, setCurrentPattern] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | number>>({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 9개 패턴별 시험 문제 생성 함수
  const generateSimpleExamQuestions = (
    hanziList: any[],
    questionCount: number
  ): ExamQuestion[] => {
    const questions: ExamQuestion[] = []
    const shuffled = [...hanziList].sort(() => Math.random() - 0.5)
    let questionIndex = 0

    // 패턴별로 문제 생성
    patterns.forEach((pattern, patternIndex) => {
      for (let i = 0; i < pattern.questionCount; i++) {
        const hanzi = shuffled[questionIndex % shuffled.length]
        const questionId = `q_${questionIndex}`

        let question: any = {
          id: questionId,
          type: pattern.type,
          hanziData: hanzi,
        }

        // 패턴별 문제 생성
        switch (pattern.type) {
          case "sound":
            question.question = `[${hanzi.character}] 안의 한자의 음(소리)으로 알맞은 것을 선택하세요.`
            question.options = generateUniqueOptions(
              hanzi.sound,
              shuffled,
              "sound"
            )
            question.correctAnswer = question.options.indexOf(hanzi.sound) + 1
            break

          case "meaning":
            question.question = `[${hanzi.meaning}] 안의 뜻에 맞는 한자를 선택하세요.`
            question.options = generateUniqueOptions(
              hanzi.character,
              shuffled,
              "character"
            )
            question.correctAnswer =
              question.options.indexOf(hanzi.character) + 1
            break

          case "word_reading":
            if (hanzi.relatedWords && hanzi.relatedWords.length > 0) {
              const randomWord =
                hanzi.relatedWords[
                  Math.floor(Math.random() * hanzi.relatedWords.length)
                ]
              question.question = `[${randomWord.hanzi}] 안의 한자어를 바르게 읽은 것을 선택하세요.`
              question.options = generateUniqueOptions(
                randomWord.korean,
                shuffled,
                "relatedWords"
              )
              question.correctAnswer =
                question.options.indexOf(randomWord.korean) + 1
            } else {
              // 관련 단어가 없으면 sound 문제로 대체
              question.question = `[${hanzi.character}] 안의 한자의 음(소리)으로 알맞은 것을 선택하세요.`
              question.options = generateUniqueOptions(
                hanzi.sound,
                shuffled,
                "sound"
              )
              question.correctAnswer = question.options.indexOf(hanzi.sound) + 1
            }
            break

          case "word_meaning":
            question.question = `[${hanzi.meaning}] 안의 뜻을 가진 한자를 <보기>에서 찾아 번호를 쓰세요.`
            question.options = generateUniqueOptions(
              hanzi.character,
              shuffled,
              "character"
            )
            question.correctAnswer =
              question.options.indexOf(hanzi.character) + 1
            break

          case "blank_hanzi":
            question.question = `○에 들어갈 알맞은 한자를 <보기>에서 찾아 번호를 쓰세요.`
            question.options = generateUniqueOptions(
              hanzi.character,
              shuffled,
              "character"
            )
            question.correctAnswer =
              question.options.indexOf(hanzi.character) + 1
            break

          case "word_meaning_select":
            if (hanzi.relatedWords && hanzi.relatedWords.length > 0) {
              const randomWord =
                hanzi.relatedWords[
                  Math.floor(Math.random() * hanzi.relatedWords.length)
                ]
              question.question = `[${randomWord.hanzi}] 안의 한자어의 뜻을 찾아 번호를 쓰세요.`
              question.options = generateUniqueOptions(
                randomWord.korean,
                shuffled,
                "relatedWords"
              )
              question.correctAnswer =
                question.options.indexOf(randomWord.korean) + 1
            } else {
              // 관련 단어가 없으면 meaning 문제로 대체
              question.question = `[${hanzi.meaning}] 안의 뜻에 맞는 한자를 선택하세요.`
              question.options = generateUniqueOptions(
                hanzi.character,
                shuffled,
                "character"
              )
              question.correctAnswer =
                question.options.indexOf(hanzi.character) + 1
            }
            break

          case "hanzi_write":
            question.question = `한자의 훈(뜻)과 음(소리)을 <보기>와 같이 한글로 쓰세요.\n\n<보기> 善 ( 착할 선 )\n\n${hanzi.character} (          )`
            question.correctAnswer = `${hanzi.meaning} ${hanzi.sound}`
            break

          case "word_reading_write":
            if (hanzi.relatedWords && hanzi.relatedWords.length > 0) {
              const randomWord =
                hanzi.relatedWords[
                  Math.floor(Math.random() * hanzi.relatedWords.length)
                ]
              question.question = `한자어의 독음(소리)을 <보기>와 같이 한글로 쓰세요.\n\n<보기> 善惡 ( 선악 )\n\n${randomWord.hanzi} (          )`
              question.correctAnswer = randomWord.korean
            } else {
              // 관련 단어가 없으면 sound 문제로 대체
              question.question = `한자의 음(소리)을 <보기>와 같이 한글로 쓰세요.\n\n<보기> 善 ( 선 )\n\n${hanzi.character} (          )`
              question.correctAnswer = hanzi.sound
            }
            break

          case "sentence_reading":
            question.question = `[${hanzi.character}] 안의 한자어의 독음(소리)을 <보기>에서 선택하세요.`
            question.options = generateUniqueOptions(
              hanzi.sound,
              shuffled,
              "sound"
            )
            question.correctAnswer = question.options.indexOf(hanzi.sound) + 1
            break

          case "subjective":
            question.question = `한자의 훈(뜻)과 음(소리)을 <보기>와 같이 한글로 쓰세요.\n\n<보기> 善 ( 착할 선 )\n\n${hanzi.character} (          )`
            question.correctAnswer = `${hanzi.meaning} ${hanzi.sound}`
            break
        }

        questions.push(question)
        questionIndex++
      }
    })

    return questions
  }

  // 중복되지 않는 선택지 생성 함수
  const generateUniqueOptions = (
    correctAnswer: string,
    shuffled: any[],
    field: string
  ) => {
    const options = [correctAnswer]
    const usedValues = new Set([correctAnswer])

    while (options.length < 4 && usedValues.size < shuffled.length) {
      const randomHanzi = shuffled[Math.floor(Math.random() * shuffled.length)]
      let value = ""

      if (field === "sound") {
        value = randomHanzi.sound
      } else if (field === "character") {
        value = randomHanzi.character
      } else if (field === "relatedWords") {
        if (randomHanzi.relatedWords && randomHanzi.relatedWords.length > 0) {
          const randomWord =
            randomHanzi.relatedWords[
              Math.floor(Math.random() * randomHanzi.relatedWords.length)
            ]
          value = randomWord.korean
        } else {
          continue
        }
      }

      if (value && !usedValues.has(value)) {
        options.push(value)
        usedValues.add(value)
      }
    }

    // 4개가 안 되면 나머지 채우기
    while (options.length < 4) {
      const randomHanzi = shuffled[Math.floor(Math.random() * shuffled.length)]
      let value = ""

      if (field === "sound") {
        value = randomHanzi.sound
      } else if (field === "character") {
        value = randomHanzi.character
      } else if (field === "relatedWords") {
        if (randomHanzi.relatedWords && randomHanzi.relatedWords.length > 0) {
          const randomWord =
            randomHanzi.relatedWords[
              Math.floor(Math.random() * randomHanzi.relatedWords.length)
            ]
          value = randomWord.korean
        } else {
          continue
        }
      }

      if (value) {
        options.push(value)
      }
    }

    return options.sort(() => Math.random() - 0.5)
  }

  // 패턴별 문제 분류 (7-8급: 9가지 패턴)
  const patterns = [
    {
      name: "한자의 음(소리) 찾기",
      type: "sound",
      description: "[ ] 안의 한자의 음(소리)으로 알맞은 것을 선택하세요.",
      questionCount: 5,
    },
    {
      name: "뜻에 맞는 한자 찾기",
      type: "meaning",
      description: "[ ] 안의 뜻에 맞는 한자를 선택하세요.",
      questionCount: 5,
    },
    {
      name: "한자어 독음 문제",
      type: "word_reading",
      description: "[ ] 안의 한자어를 바르게 읽은 것을 선택하세요.",
      questionCount: 7,
    },
    {
      name: "한자어 뜻 문제",
      type: "word_meaning",
      description: "[ ] 안의 뜻을 가진 한자를 <보기>에서 찾아 번호를 쓰세요.",
      questionCount: 9,
    },
    {
      name: "빈칸 한자 찾기",
      type: "blank_hanzi",
      description: "○에 들어갈 알맞은 한자를 <보기>에서 찾아 번호를 쓰세요.",
      questionCount: 2,
    },
    {
      name: "한자어 뜻 찾기",
      type: "word_meaning_select",
      description: "[ ] 안의 한자어의 뜻을 찾아 번호를 쓰세요.",
      questionCount: 2,
    },
    {
      name: "한자 뜻과 음 쓰기",
      type: "hanzi_write",
      description: "한자의 훈(뜻)과 음(소리)을 <보기>와 같이 한글로 쓰세요.",
      questionCount: 8,
    },
    {
      name: "한자어 독음 쓰기",
      type: "word_reading_write",
      description: "한자어의 독음(소리)을 <보기>와 같이 한글로 쓰세요.",
      questionCount: 6,
    },
    {
      name: "문장 독음 문제",
      type: "sentence_reading",
      description: "[ ] 안의 한자어의 독음(소리)을 <보기>에서 선택하세요.",
      questionCount: 6,
    },
  ]

  const loadExamQuestions = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // 현재 급수에 맞는 한자 데이터 필터링
      const gradeHanzi = hanziList.filter((hanzi: any) => hanzi.grade === grade)

      if (gradeHanzi.length === 0) {
        throw new Error("해당 급수의 한자 데이터가 없습니다.")
      }

      // 클라이언트 사이드에서 문제 생성 (간단한 랜덤 선택)
      const questions = generateSimpleExamQuestions(
        gradeHanzi,
        currentGradeInfo.questionCount
      )

      const session: ExamSession = {
        id: `exam_${Date.now()}`,
        userId: user!.id,
        grade,
        questions: questions,
        answers: {},
        startTime: new Date(),
      }

      setExamSession(session)
      setTimeLeft(currentGradeInfo.timeLimit * 60) // 분을 초로 변환

      // 시험 시작 시 시간 추적 시작
      if (user) {
        startSession()
      }
    } catch (error) {
      console.error("시험 문제 로드 실패:", error)
      setError(
        error instanceof Error
          ? error.message
          : "시험 문제를 불러올 수 없습니다."
      )
    } finally {
      setIsLoading(false)
    }
  }, [user, grade, currentGradeInfo, hanziList])

  const handleAnswer = useCallback(
    (questionId: string, answer: string | number) => {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: answer,
      }))
    },
    []
  )

  const handleSubmitExam = useCallback(async () => {
    if (!examSession) return

    try {
      setIsSubmitting(true)

      // 시험 종료 시 시간 추적 종료
      if (user) {
        endSession()
      }

      // 점수 계산
      let correctCount = 0
      examSession.questions.forEach((question) => {
        const userAnswer = answers[question.id]
        if (userAnswer === question.correctAnswer) {
          correctCount++
        }
      })

      const score = Math.round(
        (correctCount / examSession.questions.length) * 100
      )
      const passed = score >= 70 // 70점 이상 통과

      // 시험 결과 저장
      const examResult = {
        ...examSession,
        answers,
        endTime: new Date(),
        score,
        passed,
        actualDuration: currentDuration, // 실제 소요 시간 (초)
      }

      // API로 결과 저장
      await fetch("/api/save-exam-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(examResult),
      })

      // 사용자 통계 업데이트
      if (passed) {
        await refreshUserStatistics()
      }

      // 결과 페이지로 이동
      router.push(`/games/exam/${grade}/result?score=${score}&passed=${passed}`)
    } catch (error) {
      console.error("시험 제출 실패:", error)
      setError("시험 제출에 실패했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }, [
    examSession,
    answers,
    currentDuration,
    user,
    refreshUserStatistics,
    router,
    grade,
  ])

  const handleNextPattern = useCallback(() => {
    if (currentPattern < patterns.length - 1) {
      setCurrentPattern(currentPattern + 1)
      setCurrentQuestion(0)
    } else {
      handleSubmitExam()
    }
  }, [currentPattern, patterns.length, handleSubmitExam])

  const handlePreviousPattern = useCallback(() => {
    if (currentPattern > 0) {
      setCurrentPattern(currentPattern - 1)
      setCurrentQuestion(0)
    }
  }, [currentPattern])

  useEffect(() => {
    if (user && currentGradeInfo) {
      loadExamQuestions()
    }
  }, [user, grade, currentGradeInfo, loadExamQuestions])

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && examSession) {
      handleSubmitExam()
    }
  }, [timeLeft, examSession, handleSubmitExam])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  // 로딩 중
  if (authLoading || initialLoading || isLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='시험 문제를 준비하는 중...' />
      </div>
    )
  }

  // 인증 체크
  if (!user) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-gray-900 mb-4'>
            로그인이 필요합니다
          </h1>
          <Link href='/login' className='text-blue-600 hover:text-blue-700'>
            로그인하기
          </Link>
        </div>
      </div>
    )
  }

  // 오류 상태
  if (error) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <div className='text-center'>
          <X className='w-16 h-16 text-red-500 mx-auto mb-4' />
          <h1 className='text-2xl font-bold text-gray-900 mb-4'>
            오류가 발생했습니다
          </h1>
          <p className='text-gray-600 mb-4'>{error}</p>
          <button
            onClick={loadExamQuestions}
            className='text-blue-600 hover:text-blue-700'
          >
            다시 시도하기
          </button>
        </div>
      </div>
    )
  }

  if (!examSession) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='시험을 준비하는 중...' />
      </div>
    )
  }

  // 현재 패턴의 문제들 필터링
  const currentPatternType = patterns[currentPattern].type
  const currentPatternQuestions = examSession.questions.filter(
    (q) => q.type === currentPatternType
  )
  const currentQuestionData = currentPatternQuestions[currentQuestion]

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      {/* 헤더 */}
      <div className='bg-white shadow-sm border-b'>
        <div className='max-w-4xl mx-auto px-4 py-4'>
          {/* 상단: 제목과 타이머 */}
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center space-x-4'>
              <Link
                href='/games/exam'
                className='text-gray-600 hover:text-gray-800'
              >
                <ArrowLeft className='w-6 h-6' />
              </Link>
              <div>
                <h1 className='text-xl font-bold text-gray-900'>
                  {currentGradeInfo.name} 시험
                </h1>
                <p className='text-sm text-black'>
                  패턴 {currentPattern + 1}/{patterns.length}:{" "}
                  {patterns[currentPattern].name}
                </p>
              </div>
            </div>

            <div className='flex items-center space-x-4'>
              <div className='flex items-center text-red-600'>
                <Clock className='w-5 h-5 mr-2' />
                <span className='font-mono text-lg font-bold'>
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>
          </div>

          {/* 하단: 진행 상황과 패턴 네비게이션 */}
          <div className='flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0'>
            <div className='text-sm text-black'>
              전체 진행: {Object.keys(answers).length}/
              {examSession.questions.length} 완료
            </div>

            {/* 패턴 네비게이션 */}
            <div className='flex items-center space-x-2'>
              {currentPattern > 0 && (
                <button
                  onClick={handlePreviousPattern}
                  className='px-3 py-1 text-sm border border-gray-300 rounded text-gray-600 hover:bg-gray-50'
                >
                  ← 이전 패턴
                </button>
              )}
              {currentPattern < patterns.length - 1 && (
                <button
                  onClick={handleNextPattern}
                  className='px-3 py-1 text-sm border border-gray-300 rounded text-gray-600 hover:bg-gray-50'
                >
                  다음 패턴 →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className='max-w-4xl mx-auto px-4 py-8'>
        {/* 패턴 설명 */}
        <div className='bg-white rounded-lg shadow-sm p-6 mb-6'>
          <h2 className='text-xl font-bold text-black mb-2'>
            {patterns[currentPattern].name}
          </h2>
          <p className='text-black mb-4'>
            {patterns[currentPattern].description}
          </p>
          <div className='space-y-4'>
            {/* 답안 완료 상태 */}
            <div className='flex items-center justify-between'>
              <div className='text-sm text-gray-600'>
                답안 완료:{" "}
                {
                  Object.keys(answers).filter((key) =>
                    currentPatternQuestions.some((q) => q.id === key)
                  ).length
                }
                /{currentPatternQuestions.length}
              </div>
            </div>

            {/* 문제 번호 네비게이션 */}
            <div className='flex flex-wrap gap-1 justify-center'>
              {currentPatternQuestions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestion(index)}
                  className={`w-8 h-8 text-xs rounded border ${
                    index === currentQuestion
                      ? "bg-blue-500 text-white border-blue-500"
                      : answers[currentPatternQuestions[index].id]
                      ? "bg-green-100 text-green-700 border-green-300"
                      : "bg-gray-100 text-gray-600 border-gray-300"
                  } hover:bg-blue-100`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 문제 */}
        {currentQuestionData && (
          <div className='bg-white rounded-lg shadow-lg p-4 sm:p-8'>
            <div className='mb-6'>
              <h3 className='text-lg font-semibold text-black mb-4 break-words'>
                {currentQuestionData.question}
              </h3>
            </div>

            {/* 객관식 문제 */}
            {currentQuestionData.options && (
              <div className='space-y-2 sm:space-y-3'>
                {currentQuestionData.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() =>
                      handleAnswer(currentQuestionData.id, index + 1)
                    }
                    className={`w-full p-3 sm:p-4 text-left rounded-lg border-2 transition-colors ${
                      answers[currentQuestionData.id] === index + 1
                        ? "border-blue-500 bg-blue-50 text-black"
                        : "border-gray-200 hover:border-gray-300 bg-white text-black"
                    }`}
                  >
                    <span className='font-medium mr-2 sm:mr-3'>
                      {index + 1}.
                    </span>
                    <span className='break-words'>{option}</span>
                  </button>
                ))}
              </div>
            )}

            {/* 주관식 문제 */}
            {(currentQuestionData.type === "subjective" ||
              currentQuestionData.type === "hanzi_write" ||
              currentQuestionData.type === "word_reading_write") && (
              <div className='space-y-4'>
                <textarea
                  value={answers[currentQuestionData.id] || ""}
                  onChange={(e) =>
                    handleAnswer(currentQuestionData.id, e.target.value)
                  }
                  placeholder='한자의 훈과 음을 입력하세요 (예: 착할 선)'
                  className='w-full p-3 sm:p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base'
                  rows={3}
                />
              </div>
            )}

            {/* 네비게이션 */}
            <div className='flex justify-between items-center mt-6 sm:mt-8 pt-4 sm:pt-6 border-t'>
              {/* 이전 문제 버튼 */}
              <div className='flex-1'>
                {currentQuestion > 0 && (
                  <button
                    onClick={() => setCurrentQuestion(currentQuestion - 1)}
                    className='px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-black hover:bg-gray-50 text-xs sm:text-sm'
                  >
                    ← 이전 문제
                  </button>
                )}
              </div>

              {/* 다음 문제/패턴 버튼 */}
              <div className='flex-1 flex justify-end'>
                {currentQuestion < currentPatternQuestions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestion(currentQuestion + 1)}
                    className='px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-black hover:bg-gray-50 text-xs sm:text-sm'
                  >
                    다음 문제 →
                  </button>
                ) : (
                  <button
                    onClick={handleNextPattern}
                    disabled={isSubmitting}
                    className='px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-xs sm:text-sm'
                  >
                    {currentPattern < patterns.length - 1
                      ? "다음 패턴 →"
                      : "시험 완료"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 제출 중 */}
        {isSubmitting && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
            <div className='bg-white rounded-lg p-8 text-center'>
              <LoadingSpinner />
              <p className='text-black'>시험 결과를 처리하는 중...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
