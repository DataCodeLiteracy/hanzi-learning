"use client"

import { useState, useEffect, use } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import LoadingSpinner from "@/components/LoadingSpinner"
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

interface ExamResult {
  score: number
  passed: boolean
  grade: number
  totalQuestions: number
  correctAnswers: number
  duration: number
  actualDuration?: number // 실제 소요 시간 (초)
}

export default function ExamResultPage({
  params,
}: {
  params: Promise<{ grade: string }>
}) {
  const { user, loading: authLoading, initialLoading } = useAuth()
  const { refreshUserStatistics } = useData()
  const searchParams = useSearchParams()

  const resolvedParams = use(params)
  const grade = parseInt(resolvedParams.grade)
  const score = parseInt(searchParams.get("score") || "0")
  const passed = searchParams.get("passed") === "true"

  const [isLoading, setIsLoading] = useState(true)
  const [examResult, setExamResult] = useState<ExamResult | null>(null)

  useEffect(() => {
    if (user) {
      loadExamResult()
    }
  }, [user, score, passed])

  const loadExamResult = async () => {
    try {
      setIsLoading(true)

      // 시험 결과 데이터 구성
      const result: ExamResult = {
        score,
        passed,
        grade,
        totalQuestions: getQuestionCount(grade),
        correctAnswers: Math.round((score / 100) * getQuestionCount(grade)),
        duration: 0, // 실제로는 시험 시간을 계산해야 함
      }

      setExamResult(result)

      // 사용자 통계 새로고침
      await refreshUserStatistics()
    } catch (error) {
      console.error("시험 결과 로드 실패:", error)
    } finally {
      setIsLoading(false)
    }
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
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
            <div className='bg-blue-50 rounded-lg p-6 text-center'>
              <Target className='w-8 h-8 text-blue-600 mx-auto mb-3' />
              <div className='text-2xl font-bold text-blue-600'>
                {examResult.correctAnswers}/{examResult.totalQuestions}
              </div>
              <div className='text-sm text-black'>정답 수</div>
            </div>

            <div className='bg-green-50 rounded-lg p-6 text-center'>
              <Trophy className='w-8 h-8 text-green-600 mx-auto mb-3' />
              <div className='text-2xl font-bold text-green-600'>
                {examResult.score}점
              </div>
              <div className='text-sm text-black'>점수</div>
            </div>

            <div className='bg-blue-50 rounded-lg p-6 text-center'>
              <Award className='w-8 h-8 text-blue-600 mx-auto mb-3' />
              <div className='text-2xl font-bold text-blue-600'>
                {getGradeName(grade)}
              </div>
              <div className='text-sm text-black'>시험 급수</div>
            </div>
          </div>

          {/* 실제 소요 시간 표시 */}
          {examResult.actualDuration && (
            <div className='bg-purple-50 rounded-lg p-6 mb-8'>
              <div className='flex items-center justify-center mb-4'>
                <Clock className='w-8 h-8 text-purple-600 mr-3' />
                <h3 className='text-lg font-semibold text-purple-800'>
                  시험 소요 시간
                </h3>
              </div>
              <div className='text-center'>
                <div className='text-3xl font-bold text-purple-600 mb-2'>
                  {Math.floor(examResult.actualDuration / 60)}분{" "}
                  {examResult.actualDuration % 60}초
                </div>
                <div className='text-sm text-black'>
                  총 {examResult.actualDuration}초 동안 시험을 진행했습니다
                </div>
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
              • 경험치 10점 획득 • 시험 완료 기록 저장 •
              {passed ? "다음 급수 시험 해제" : "다시 시험 도전 가능"}
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className='flex flex-col sm:flex-row gap-4'>
            <Link
              href='/games/exam'
              className='flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg text-center hover:bg-blue-700 transition-colors'
            >
              다른 급수 시험 보기
            </Link>

            {!passed && (
              <Link
                href={`/games/exam/${grade}`}
                className='flex-1 bg-gray-600 text-white py-3 px-6 rounded-lg text-center hover:bg-gray-700 transition-colors'
              >
                다시 시험 보기
              </Link>
            )}

            <Link
              href='/games'
              className='flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg text-center hover:bg-blue-700 transition-colors'
            >
              학습 게임 하기
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
