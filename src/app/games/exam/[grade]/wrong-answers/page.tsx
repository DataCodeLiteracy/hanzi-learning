"use client"

import { useState, useEffect, use, useCallback } from "react"
import { useAuth } from "@/contexts/AuthContext"
import LoadingSpinner from "@/components/LoadingSpinner"
import { XCircle, ArrowLeft, BookOpen } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

interface WrongAnswer {
  questionNumber: number
  questionId: string
  questionIndex: number
  userAnswer: string
  userSelectedNumber?: number // 실제 선택한 번호
  correctAnswer: string
  pattern: string
  character?: string
  questionText?: string
  options?: string[]
}

interface ExamWrongAnswers {
  examId: string
  grade: number
  date: string
  score: number
  passed: boolean
  duration?: number // 소요 시간 (초)
  wrongAnswers: WrongAnswer[]
}

export default function WrongAnswersPage({
  params,
}: {
  params: Promise<{ grade: string }>
}) {
  const { user, loading: authLoading, initialLoading } = useAuth()
  const searchParams = useSearchParams()
  const examId = searchParams.get("examId")

  const resolvedParams = use(params)
  const grade = parseInt(resolvedParams.grade)

  const [isLoading, setIsLoading] = useState(true)
  const [wrongAnswers, setWrongAnswers] = useState<ExamWrongAnswers | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)
  
  // 결과 페이지로 돌아가기 위한 URL 파라미터 생성
  const getResultPageUrl = () => {
    const params = new URLSearchParams()
    
    // 1순위: sessionStorage에서 저장된 결과 페이지 정보 가져오기 (오답 페이지로 이동할 때 저장한 정보)
    if (examId) {
      const navStorageKey = `exam_result_nav_${examId}`
      try {
        const navStored = sessionStorage.getItem(navStorageKey)
        if (navStored) {
          const navData = JSON.parse(navStored)
          console.log("🔍 저장된 결과 페이지 정보 복원:", navData)
          params.set("score", (navData.score || 0).toString())
          params.set("passed", (navData.passed || false).toString())
          params.set("examId", navData.examId || examId)
          if (navData.duration) {
            params.set("duration", navData.duration.toString())
          }
          return `/games/exam/${grade}/result?${params.toString()}`
        }
      } catch (error) {
        console.error("sessionStorage 복원 실패:", error)
      }
    }
    
    // 2순위: wrongAnswers에서 가져오기 (API에서 로드된 경우)
    if (wrongAnswers) {
      params.set("score", wrongAnswers.score.toString())
      params.set("passed", wrongAnswers.passed.toString())
      params.set("examId", wrongAnswers.examId)
      if (wrongAnswers.duration) {
        params.set("duration", wrongAnswers.duration.toString())
      }
      return `/games/exam/${grade}/result?${params.toString()}`
    }
    
    // 3순위: URL 파라미터에서 가져오기 (결과 페이지에서 넘어올 때)
    const urlScore = searchParams.get("score")
    const urlPassed = searchParams.get("passed")
    const urlDuration = searchParams.get("duration")
    if (urlScore && urlPassed && examId) {
      params.set("score", urlScore)
      params.set("passed", urlPassed)
      params.set("examId", examId)
      if (urlDuration) {
        params.set("duration", urlDuration)
      }
      return `/games/exam/${grade}/result?${params.toString()}`
    }
    
    // 4순위: sessionStorage에서 복원 시도 (기존 저장된 정보)
    if (examId) {
      const storageKey = `exam_result_${examId}`
      try {
        const stored = sessionStorage.getItem(storageKey)
        if (stored) {
          const storedData = JSON.parse(stored)
          params.set("score", (storedData.score || 0).toString())
          params.set("passed", (storedData.passed || false).toString())
          params.set("examId", storedData.examId || examId)
          if (storedData.duration) {
            params.set("duration", storedData.duration.toString())
          }
          return `/games/exam/${grade}/result?${params.toString()}`
        }
      } catch (error) {
        console.error("sessionStorage 복원 실패:", error)
      }
    }
    
    // 5순위: examId만 있으면 기본 URL
    if (examId) {
      params.set("examId", examId)
      return `/games/exam/${grade}/result?${params.toString()}`
    }
    
    return `/games/exam/${grade}/result`
  }

  const loadWrongAnswers = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(
        `/api/exam-statistics/${examId}?userId=${user?.id}`
      )
      if (!response.ok) {
        throw new Error("시험 정보를 불러올 수 없습니다.")
      }

      const data = await response.json()
      console.log("🔍 API에서 받아온 틀린 문제 데이터:", data)
      console.log("🔍 틀린 문제 상세:", data.wrongAnswers)
      setWrongAnswers(data)
    } catch (error) {
      console.error("오답 정보 로드 실패:", error)
      setError("오답 정보를 불러오는데 실패했습니다.")
    } finally {
      setIsLoading(false)
    }
  }, [user, examId])

  useEffect(() => {
    if (!authLoading && !initialLoading && user && examId) {
      loadWrongAnswers()
    }
  }, [authLoading, initialLoading, user, examId, loadWrongAnswers])

  const getPatternName = (pattern: string) => {
    const patternNames: Record<string, string> = {
      sound: "음 읽기",
      meaning: "뜻 찾기",
      word_meaning: "단어 뜻",
      word_reading: "단어 읽기",
      blank_hanzi: "빈칸 채우기",
      word_meaning_select: "단어 뜻 선택",
      hanzi_write: "한자 쓰기",
      word_reading_write: "단어 읽기 쓰기",
      sentence_reading: "문장 읽기",
    }
    return patternNames[pattern] || pattern
  }

  const getCorrectAnswerText = (wrong: WrongAnswer) => {
    if (wrong.pattern === "word_meaning_select") {
      // word_meaning_select는 번호만 표시
      const correctAnswerNum = typeof wrong.correctAnswer === "number" 
        ? wrong.correctAnswer 
        : parseInt(String(wrong.correctAnswer))
      
      if (!correctAnswerNum || isNaN(correctAnswerNum)) {
        return "1번"
      }
      
      return `${correctAnswerNum}번`
    }
    
    if (wrong.pattern === "blank_hanzi") {
      // blank_hanzi는 character로 표시
      return wrong.character || wrong.correctAnswer || ""
    }
    
    if (wrong.pattern === "word_meaning") {
      // word_meaning 패턴은 character로 표시
      return wrong.character || wrong.correctAnswer || ""
    }
    
    return wrong.correctAnswer || ""
  }

  const getUserAnswerText = (wrong: WrongAnswer) => {
    if (wrong.pattern === "word_meaning_select") {
      // word_meaning_select는 번호만 표시
      const userAnswerNum = wrong.userSelectedNumber || 
        (typeof wrong.userAnswer === "number" ? wrong.userAnswer : parseInt(String(wrong.userAnswer)))
      
      if (!userAnswerNum || isNaN(userAnswerNum)) {
        return "미답변"
      }
      
      return `${userAnswerNum}번`
    }
    
    if (wrong.pattern === "blank_hanzi") {
      // blank_hanzi는 character로 표시
      // userAnswer가 숫자면 options에서 character 찾기
      if (typeof wrong.userAnswer === "number") {
        const userIndex = wrong.userAnswer - 1
        return wrong.options?.[userIndex] || wrong.character || "미답변"
      }
      return wrong.userAnswer || wrong.character || "미답변"
    }
    
    if (wrong.pattern === "word_meaning") {
      // word_meaning 패턴은 character로 표시
      // userAnswer가 숫자면 options에서 character 찾기
      if (typeof wrong.userAnswer === "number") {
        const userIndex = wrong.userAnswer - 1
        return wrong.options?.[userIndex] || wrong.character || "미답변"
      }
      return wrong.userAnswer || wrong.character || "미답변"
    }
    
    return wrong.userAnswer || "미답변"
  }

  // 패턴별로 틀린 문제 그룹화
  const groupedWrongAnswers =
    wrongAnswers?.wrongAnswers.reduce((acc, wrong) => {
      if (!acc[wrong.pattern]) {
        acc[wrong.pattern] = []
      }
      acc[wrong.pattern].push(wrong)
      return acc
    }, {} as Record<string, WrongAnswer[]>) || {}

  if (authLoading || initialLoading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-gray-900 mb-4'>
            로그인이 필요합니다
          </h1>
          <Link
            href='/login'
            className='inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'
          >
            로그인하기
          </Link>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-red-600 mb-4'>{error}</h1>
          <Link
            href={getResultPageUrl()}
            className='inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700'
          >
            결과 페이지로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  if (!wrongAnswers) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-gray-900 mb-4'>
            오답 정보를 찾을 수 없습니다
          </h1>
          <Link
            href={getResultPageUrl()}
            className='inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700'
          >
            결과 페이지로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='container mx-auto px-4 py-8'>
        {/* 헤더 */}
        <div className='mb-8'>
          <div className='flex items-center justify-between mb-4'>
            <Link
              href={`/games/exam/${grade}/result`}
              className='inline-flex items-center text-gray-600 hover:text-gray-800'
            >
              <ArrowLeft className='w-5 h-5 mr-2' />
              결과 페이지로 돌아가기
            </Link>
            <div className='text-sm text-gray-500'>
              {grade}급 시험 • {wrongAnswers.date}
            </div>
          </div>

          <div className='bg-white rounded-lg p-6 shadow-sm'>
            <div className='flex items-center justify-between mb-4'>
              <h1 className='text-2xl font-bold text-gray-900'>
                틀린 문제 분석
              </h1>
              <div className='flex items-center space-x-4'>
                <div className='text-center'>
                  <div className='text-2xl font-bold text-blue-600'>
                    {wrongAnswers.score}점
                  </div>
                  <div className='text-sm text-gray-500'>최종 점수</div>
                </div>
                <div className='text-center'>
                  <div className='text-2xl font-bold text-red-600'>
                    {wrongAnswers.wrongAnswers.length}개
                  </div>
                  <div className='text-sm text-gray-500'>틀린 문제</div>
                </div>
              </div>
            </div>

            <div className='flex items-center'>
              {wrongAnswers.passed ? (
                <div className='flex items-center text-green-600'>
                  <BookOpen className='w-5 h-5 mr-2' />
                  <span className='font-medium'>합격</span>
                </div>
              ) : (
                <div className='flex items-center text-red-600'>
                  <XCircle className='w-5 h-5 mr-2' />
                  <span className='font-medium'>불합격</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 패턴별 틀린 문제 분석 */}
        <div className='space-y-6'>
          {Object.entries(groupedWrongAnswers).map(([pattern, wrongs]) => (
            <div key={pattern} className='bg-white rounded-lg p-6 shadow-sm'>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='text-lg font-semibold text-gray-900'>
                  {getPatternName(pattern)} 패턴
                </h3>
                <div className='bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium'>
                  {wrongs.length}개 틀림
                </div>
              </div>

              <div className='space-y-4'>
                {wrongs.map((wrong, index) => (
                  <div
                    key={index}
                    className='bg-gray-50 rounded-lg p-4 border-l-4 border-red-500'
                  >
                    <div className='flex items-center justify-between mb-3'>
                      <div className='flex items-center space-x-3'>
                        <div className='bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-medium'>
                          {wrong.questionNumber}번
                        </div>
                        {wrong.character && (
                          <div className='text-lg font-bold text-gray-800'>
                            {wrong.character}
                          </div>
                        )}
                      </div>
                    </div>

                    {wrong.questionText && (
                      <div className='mb-3 p-3 bg-white rounded border'>
                        <div className='text-sm text-gray-600 mb-1'>문제</div>
                        <div className='text-gray-800'>
                          {wrong.questionText}
                        </div>
                      </div>
                    )}

                    <div className='grid grid-cols-1 md:grid-cols-2 gap-3 mb-3'>
                      <div className='p-3 bg-red-50 rounded-lg'>
                        <div className='text-sm text-red-600 mb-1'>내 답</div>
                        <div className='text-red-800 font-medium'>
                          {getUserAnswerText(wrong)}
                        </div>
                      </div>

                      <div className='p-3 bg-green-50 rounded-lg'>
                        <div className='text-sm text-green-600 mb-1'>정답</div>
                        <div className='text-green-800 font-medium'>
                          {getCorrectAnswerText(wrong)}
                        </div>
                      </div>
                    </div>

                    {wrong.options && wrong.options.length > 0 && (
                      <div className='p-3 bg-blue-50 rounded-lg'>
                        <div className='text-sm text-blue-600 mb-2'>선택지</div>
                        <div className='flex flex-wrap gap-2'>
                          {wrong.options.map((option, optionIndex) => {
                            const isCorrectAnswer =
                              wrong.pattern === "word_meaning_select"
                                ? optionIndex ===
                                  (typeof wrong.correctAnswer === "number" 
                                    ? wrong.correctAnswer 
                                    : parseInt(String(wrong.correctAnswer))) - 1
                                : option === wrong.correctAnswer
                            const isUserAnswer =
                              wrong.pattern === "word_meaning_select"
                                ? optionIndex ===
                                  (wrong.userSelectedNumber as number) - 1
                                : option === wrong.userAnswer

                            return (
                              <span
                                key={optionIndex}
                                className={`px-2 py-1 rounded text-sm ${
                                  isCorrectAnswer
                                    ? "bg-green-200 text-green-800 font-medium"
                                    : isUserAnswer
                                    ? "bg-red-200 text-red-800 font-medium"
                                    : "bg-gray-200 text-gray-700"
                                }`}
                              >
                                {optionIndex + 1}. {option}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 기존 틀린 문제 목록 (백업용) */}
        <div className='space-y-4' style={{ display: "none" }}>
          {wrongAnswers.wrongAnswers.map((wrong, index) => (
            <div
              key={index}
              className='bg-white rounded-lg p-6 shadow-sm border-l-4 border-red-500'
            >
              <div className='flex items-center justify-between mb-4'>
                <div className='flex items-center space-x-3'>
                  <div className='bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium'>
                    {wrong.questionNumber}번
                  </div>
                  <div className='bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm'>
                    {getPatternName(wrong.pattern)}
                  </div>
                </div>

                {wrong.character && (
                  <div className='text-lg font-bold text-gray-800'>
                    {wrong.character}
                  </div>
                )}
              </div>

              {wrong.questionText && (
                <div className='mb-4 p-3 bg-gray-50 rounded-lg'>
                  <div className='text-sm text-gray-600 mb-1'>문제</div>
                  <div className='text-gray-800'>{wrong.questionText}</div>
                </div>
              )}

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
                <div className='p-3 bg-red-50 rounded-lg'>
                  <div className='text-sm text-red-600 mb-1'>내 답</div>
                  <div className='text-red-800 font-medium'>
                    {getUserAnswerText(wrong)}
                  </div>
                </div>

                <div className='p-3 bg-green-50 rounded-lg'>
                  <div className='text-sm text-green-600 mb-1'>정답</div>
                  <div className='text-green-800 font-medium'>
                    {getCorrectAnswerText(wrong)}
                  </div>
                </div>
              </div>

              {wrong.options && wrong.options.length > 0 && (
                <div className='p-3 bg-blue-50 rounded-lg'>
                  <div className='text-sm text-blue-600 mb-2'>선택지</div>
                  <div className='flex flex-wrap gap-2'>
                    {wrong.options.map((option, optionIndex) => {
                      const isCorrectAnswer =
                        wrong.pattern === "word_meaning_select"
                          ? optionIndex ===
                            (typeof wrong.correctAnswer === "number" 
                              ? wrong.correctAnswer 
                              : parseInt(String(wrong.correctAnswer))) - 1
                          : option === wrong.correctAnswer
                      const isUserAnswer =
                        wrong.pattern === "word_meaning_select"
                          ? optionIndex ===
                            (wrong.userSelectedNumber as number) - 1
                          : option === wrong.userAnswer

                      return (
                        <span
                          key={optionIndex}
                          className={`px-2 py-1 rounded text-sm ${
                            isCorrectAnswer
                              ? "bg-green-200 text-green-800 font-medium"
                              : isUserAnswer
                              ? "bg-red-200 text-red-800 font-medium"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {optionIndex + 1}. {option}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 하단 액션 */}
        <div className='mt-8 text-center'>
          <Link
            href={`/games/exam/${grade}`}
            className='inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium'
          >
            다시 시험 보기
          </Link>
        </div>
      </div>
    </div>
  )
}
