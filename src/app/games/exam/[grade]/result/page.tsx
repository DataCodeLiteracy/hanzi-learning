"use client"

import { useState, useEffect, use, useCallback } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import LoadingSpinner from "@/components/LoadingSpinner"
import WrongAnswersModal from "@/components/exam/WrongAnswersModal"
import {
  Trophy,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  Award,
} from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { getKSTDateISO } from "@/lib/apiClient"

interface WrongAnswerData {
  questionNumber: number
  questionId: string
  questionIndex: number
  userAnswer: string | number
  correctAnswer: string | number
  pattern: string
  character?: string
  questionText: string
  options?: string[]
  userSelectedNumber?: number
}

interface ExamResult {
  score: number
  passed: boolean
  grade: number
  totalQuestions: number
  correctAnswers: number
  duration: number
  actualDuration?: number // 실제 소요 시간 (초)
  experienceGained?: number // 획득한 경험치
  previousTotalExperience?: number // 기존 총 경험치
  newTotalExperience?: number // 새로운 총 경험치
  examId?: string // 시험 ID
  experienceAlreadyApplied?: boolean // 경험치가 이미 반영되었는지
  wrongAnswers?: WrongAnswerData[] // 틀린 문제들
}

export default function ExamResultPage({
  params,
}: {
  params: Promise<{ grade: string }>
}) {
  const { user, loading: authLoading, initialLoading } = useAuth()
  const { refreshUserStatistics, userStatistics: _userStatistics } = useData()
  const searchParams = useSearchParams()

  const resolvedParams = use(params)
  const grade = parseInt(resolvedParams.grade)
  const score = parseInt(searchParams.get("score") || "0")
  const passed = searchParams.get("passed") === "true"
  const duration = parseInt(searchParams.get("duration") || "0")
  const examId = searchParams.get("examId")

  const [isLoading, setIsLoading] = useState(true)
  const [examResult, setExamResult] = useState<ExamResult | null>(null)
  const [showWrongAnswersModal, setShowWrongAnswersModal] = useState(false)

  const loadExamResult = useCallback(async () => {
    try {
      setIsLoading(true)

      // sessionStorage에서 시험 결과 데이터 확인 (URL 파라미터가 없거나 유실된 경우)
      const storageKey = examId
        ? `exam_result_${examId}`
        : `exam_result_${grade}_${user?.id}`
      let storedResult: ExamResult | null = null

      try {
        const stored = sessionStorage.getItem(storageKey)
        if (stored) {
          storedResult = JSON.parse(stored)
          console.log("🔍 sessionStorage에서 시험 결과 복원:", storedResult)
        }
      } catch (error) {
        console.error("sessionStorage 파싱 실패:", error instanceof Error ? error.message : String(error))
      }

      // URL 파라미터가 있으면 우선 사용, 없으면 sessionStorage에서 가져오기
      const finalScore = score > 0 ? score : storedResult?.score || 0
      const finalPassed = passed || storedResult?.passed || false
      const finalDuration =
        duration > 0 ? duration : storedResult?.duration || 0
      const finalExamId = examId || storedResult?.examId

      // sessionStorage에 결과 저장 (있으면 업데이트, 없으면 생성)
      if (finalScore > 0 || storedResult) {
        const resultData = {
          score: finalScore,
          passed: finalPassed,
          grade: grade,
          duration: finalDuration,
          examId: finalExamId,
        }
        sessionStorage.setItem(storageKey, JSON.stringify(resultData))
        console.log("🔍 sessionStorage에 시험 결과 저장:", resultData)
      }

      // 기존 총 경험치 가져오기
      const previousTotalExperience = user?.experience || 0

      // 경험치가 이미 반영되었는지 확인 (sessionStorage에서)
      const experienceAppliedKey = `exam_experience_applied_${
        finalExamId || `${grade}_${user?.id}`
      }`
      const experienceAlreadyApplied =
        sessionStorage.getItem(experienceAppliedKey) === "true"

      console.log("🔍 경험치 반영 상태 확인:", {
        experienceAlreadyApplied,
        examId: finalExamId,
      })

      // 이번에 얻은 경험치 계산 (storedResult가 있으면 그 값 사용)
      let experienceGained = storedResult?.experienceGained
      if (!experienceGained) {
        experienceGained = finalPassed
          ? (finalScore === 100 ? 100 : 50) +
            Math.round((finalScore / 100) * getQuestionCount(grade))
          : Math.round((finalScore / 100) * getQuestionCount(grade))
      }

      // 새로운 총 경험치 계산
      const newTotalExperience = previousTotalExperience + experienceGained

      // 시험 결과 데이터 구성
      // 틀린 문제 정보 가져오기 (examId가 있는 경우)
      let wrongAnswers: ExamResult["wrongAnswers"] = []
      if (finalExamId && user) {
        try {
          const response = await fetch(
            `/api/exam-statistics/${finalExamId}?userId=${user.id}`
          )
          if (response.ok) {
            const examData = await response.json()
            wrongAnswers = examData.wrongAnswers || []
          }
        } catch (error) {
          console.error("틀린 문제 정보 로드 실패:", error instanceof Error ? error.message : String(error))
        }
      }

      const result: ExamResult = {
        score: finalScore,
        passed: finalPassed,
        grade,
        totalQuestions: getQuestionCount(grade),
        correctAnswers: Math.round(
          (finalScore / 100) * getQuestionCount(grade)
        ),
        duration: finalDuration,
        actualDuration: finalDuration,
        experienceGained: experienceGained,
        previousTotalExperience: previousTotalExperience,
        newTotalExperience: newTotalExperience,
        wrongAnswers: wrongAnswers,
        examId: finalExamId,
        experienceAlreadyApplied: experienceAlreadyApplied,
      }

      console.log("🔍 결과 페이지 틀린 문제 데이터:", wrongAnswers)
      setExamResult(result)

      // 사용자 통계 새로고침
      await refreshUserStatistics()
    } catch (error) {
      console.error("시험 결과 로드 실패:", error instanceof Error ? error.message : String(error))
    } finally {
      setIsLoading(false)
    }
  }, [user, grade, examId, score, passed, duration, refreshUserStatistics])

  useEffect(() => {
    if (user) {
      loadExamResult()
    }
  }, [user, loadExamResult])

  const getUserAnswerText = (wrong: WrongAnswerData) => {
    if (wrong.pattern === "word_meaning_select") {
      // word_meaning_select는 번호만 표시
      const userAnswerNum =
        wrong.userSelectedNumber ||
        (typeof wrong.userAnswer === "number"
          ? wrong.userAnswer
          : parseInt(String(wrong.userAnswer)))

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

  const getCorrectAnswerText = (wrong: WrongAnswerData) => {
    if (wrong.pattern === "word_meaning_select") {
      // word_meaning_select는 번호만 표시
      const correctAnswerNum =
        typeof wrong.correctAnswer === "number"
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

  const getQuestionCount = (grade: number) => {
    const counts: Record<number, number> = {
      8: 50,
      7: 50,
      6: 80,
      5: 100,
      4: 100,
      3: 100,
    }
    return counts[grade] || 50
  }

  const getGradeName = (grade: number) => {
    const names: Record<number, string> = {
      8: "8급",
      7: "7급",
      6: "6급",
      5: "5급",
      4: "4급",
      3: "3급",
      2: "2급",
      1: "1급",
      0: "사범급",
    }
    return names[grade] || "급수"
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600"
    if (score >= 80) return "text-blue-600"
    if (score >= 70) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreMessage = (score: number, passed: boolean) => {
    if (passed) {
      if (score >= 95) return "완벽합니다! 🎉"
      if (score >= 90) return "훌륭합니다! 👏"
      if (score >= 80) return "잘했습니다! 👍"
      return "통과했습니다! ✅"
    } else {
      if (score >= 60) return "조금만 더 노력하면 됩니다! 💪"
      return "다시 도전해보세요! 🔄"
    }
  }

  // 로딩 중
  if (authLoading || initialLoading || isLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='시험 결과를 불러오는 중...' />
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

  if (!examResult) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <div className='text-center'>
          <div className='text-black mb-4'>시험 결과를 불러올 수 없습니다.</div>
          <Link
            href='/games/exam'
            className='text-blue-600 hover:text-blue-700'
          >
            시험 목록으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      {/* 헤더 */}
      <div className='bg-white shadow-sm border-b'>
        <div className='max-w-4xl mx-auto px-4 py-6'>
          <div className='text-center'>
            <h1 className='text-3xl font-bold text-black mb-2'>🏆 시험 결과</h1>
            <p className='text-black'>
              {getGradeName(grade)} 시험이 완료되었습니다.
            </p>
          </div>
        </div>
      </div>

      <div className='max-w-4xl mx-auto px-4 py-8'>
        <div className='bg-white rounded-xl shadow-lg p-8'>
          {/* 결과 헤더 */}
          <div className='text-center mb-8'>
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${
                passed ? "bg-green-100" : "bg-red-100"
              }`}
            >
              {passed ? (
                <CheckCircle className='w-12 h-12 text-green-600' />
              ) : (
                <XCircle className='w-12 h-12 text-red-600' />
              )}
            </div>

            <h2
              className={`text-4xl font-bold mb-2 ${getScoreColor(
                examResult.score
              )}`}
            >
              {examResult.score}점
            </h2>

            <div
              className={`text-xl font-semibold mb-2 ${
                passed ? "text-green-600" : "text-red-600"
              }`}
            >
              {passed ? "합격" : "불합격"}
            </div>

            <p className='text-black text-lg'>
              {getScoreMessage(examResult.score, passed)}
            </p>
          </div>

          {/* 상세 결과 */}
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
            <div className='bg-blue-50 rounded-lg p-4 text-center'>
              <Target className='w-6 h-6 text-blue-600 mx-auto mb-2' />
              <div className='text-lg font-bold text-blue-600'>
                {examResult.correctAnswers}/{examResult.totalQuestions}
              </div>
              <div className='text-xs text-black'>정답</div>
            </div>

            <div className='bg-green-50 rounded-lg p-4 text-center'>
              <Trophy className='w-6 h-6 text-green-600 mx-auto mb-2' />
              <div className='text-lg font-bold text-green-600'>
                {examResult.score}점
              </div>
              <div className='text-xs text-black'>점수</div>
            </div>

            <div className='bg-purple-50 rounded-lg p-4 text-center'>
              <Award className='w-6 h-6 text-purple-600 mx-auto mb-2' />
              <div className='text-lg font-bold text-purple-600'>
                +{examResult.experienceGained || 0}
              </div>
              <div className='text-xs text-black'>획득 경험치</div>
              <div className='text-xs text-gray-600 mt-1'>
                {examResult.previousTotalExperience || 0} →{" "}
                {examResult.newTotalExperience || 0}
              </div>
            </div>

            <div className='bg-orange-50 rounded-lg p-4 text-center'>
              <Clock className='w-6 h-6 text-orange-600 mx-auto mb-2' />
              <div className='text-lg font-bold text-orange-600'>
                {examResult.actualDuration && examResult.actualDuration >= 3600
                  ? `${Math.floor(
                      examResult.actualDuration / 3600
                    )}시간 ${Math.floor(
                      (examResult.actualDuration % 3600) / 60
                    )}분`
                  : examResult.actualDuration
                  ? `${Math.floor(examResult.actualDuration / 60)}분 ${
                      examResult.actualDuration % 60
                    }초`
                  : "0분 0초"}
              </div>
              <div className='text-xs text-black'>소요시간</div>
            </div>
          </div>

          {/* 틀린 문제 표시 */}
          {examResult.wrongAnswers && examResult.wrongAnswers.length > 0 && (
            <div className='bg-red-50 rounded-lg p-6 mb-8'>
              <div className='flex items-center justify-between mb-4'>
                <div className='flex items-center'>
                  <XCircle className='w-6 h-6 text-red-600 mr-2' />
                  <h3 className='text-lg font-semibold text-red-800'>
                    틀린 문제 ({examResult.wrongAnswers.length}개)
                  </h3>
                </div>
                {examId &&
                  examResult.wrongAnswers &&
                  examResult.wrongAnswers.length > 0 && (
                    <button
                      onClick={() => setShowWrongAnswersModal(true)}
                      className='inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium'
                    >
                      상세 보기
                    </button>
                  )}
              </div>
              <div className='space-y-3'>
                {examResult.wrongAnswers.slice(0, 3).map((wrong, index) => (
                  <div
                    key={index}
                    className='bg-white rounded-lg p-4 border border-red-200'
                  >
                    <div className='flex items-center justify-between mb-2'>
                      <div className='font-semibold text-black'>
                        {wrong.questionNumber}번 문제
                      </div>
                      <div className='text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded'>
                        {wrong.pattern}
                      </div>
                    </div>

                    {wrong.character && (
                      <div className='text-sm text-gray-700 mb-2'>
                        한자:{" "}
                        <span className='font-medium'>{wrong.character}</span>
                      </div>
                    )}

                    <div className='flex items-center justify-between'>
                      <div className='text-red-600 font-medium'>
                        내 답: {getUserAnswerText(wrong)}
                      </div>
                      <div className='text-green-600 font-medium'>
                        정답: {getCorrectAnswerText(wrong)}
                      </div>
                    </div>
                  </div>
                ))}
                {examResult.wrongAnswers.length > 3 && (
                  <div className='text-center text-sm text-gray-600'>
                    ... 외 {examResult.wrongAnswers.length - 3}개 더
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 통과 기준 */}
          <div className='bg-gray-50 rounded-lg p-6 mb-8'>
            <h3 className='text-lg font-semibold text-black mb-4'>
              📊 통과 기준
            </h3>
            <div className='space-y-2'>
              <div className='flex justify-between items-center'>
                <span className='text-black'>합격 점수:</span>
                <span className='font-semibold text-black'>70점 이상</span>
              </div>
              <div className='flex justify-between items-center'>
                <span className='text-black'>현재 점수:</span>
                <span
                  className={`font-semibold ${getScoreColor(examResult.score)}`}
                >
                  {examResult.score}점
                </span>
              </div>
              <div className='flex justify-between items-center'>
                <span className='text-black'>결과:</span>
                <span
                  className={`font-semibold ${
                    passed ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {passed ? "합격" : "불합격"}
                </span>
              </div>
            </div>
          </div>

          {/* 시험 완료 안내 */}
          <div className='bg-blue-50 rounded-lg p-6 mb-8'>
            <h3 className='text-lg font-semibold text-blue-800 mb-2'>
              🎯 시험 완료!
            </h3>
            <p className='text-black mb-4'>
              {passed
                ? `${getGradeName(
                    grade
                  )} 시험에 합격하셨습니다! 다음 급수 시험에 도전해보세요.`
                : `아쉽게 불합격이지만, 조금만 더 공부하면 통과할 수 있습니다. 관련 한자들을 다시 학습해보세요.`}
            </p>
            <div className='text-sm text-black'>
              • 경험치 {examResult.experienceGained || 0}점 획득 (총{" "}
              {examResult.newTotalExperience || 0}점) • 시험 완료 기록 저장 •
              {passed ? "다음 급수 시험 해제" : "다시 시험 도전 가능"}
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className='flex flex-col sm:flex-row gap-4'>
            <Link
              href='/'
              className='flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg text-center hover:bg-blue-700 transition-colors'
            >
              메인페이지로 돌아가기
            </Link>
          </div>
        </div>
      </div>

      {/* 오답 상세 보기 모달 */}
      {examResult.wrongAnswers && examResult.wrongAnswers.length > 0 && (
        <WrongAnswersModal
          isOpen={showWrongAnswersModal}
          onClose={() => setShowWrongAnswersModal(false)}
          wrongAnswers={examResult.wrongAnswers.map((wrong) => ({
            questionNumber: wrong.questionNumber,
            questionId: wrong.questionId || `q_${wrong.questionNumber - 1}`,
            questionIndex: wrong.questionIndex ?? wrong.questionNumber - 1,
            userAnswer: String(wrong.userAnswer),
            userSelectedNumber: wrong.userSelectedNumber,
            correctAnswer: String(wrong.correctAnswer),
            pattern: wrong.pattern,
            character: wrong.character,
            questionText: wrong.questionText || "",
            options: wrong.options,
          }))}
          grade={grade}
          score={examResult.score}
          passed={examResult.passed}
          date={getKSTDateISO()}
        />
      )}
    </div>
  )
}
