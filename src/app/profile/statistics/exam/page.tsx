"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import LoadingSpinner from "@/components/LoadingSpinner"
import {
  ArrowLeft,
  Trophy,
  Target,
  Calendar,
  TrendingUp,
  Award,
} from "lucide-react"
import Link from "next/link"
import { ApiClient } from "@/lib/apiClient"

interface ExamStats {
  totalExams: number
  passedExams: number
  totalScore: number
  averageScore: number
  highestScore: number
  currentStreak: number
  longestStreak: number
  lastExamDate: string | null
  gradeStats: {
    [grade: number]: {
      totalExams: number
      passedExams: number
      averageScore: number
      lastExamDate: string | null
    }
  }
}

interface ExamResult {
  id: string
  grade: number
  score: number
  passed: boolean
  totalQuestions: number
  correctAnswers: number
  startTime: string
  endTime: string
  duration: number
  actualDuration: number
  createdAt: string
}

export default function ExamStatisticsPage() {
  const { user, loading: authLoading, initialLoading } = useAuth()
  const { isLoading: dataLoading } = useData()
  const [examStats, setExamStats] = useState<ExamStats | null>(null)
  const [recentExams, setRecentExams] = useState<ExamResult[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user && !authLoading && !initialLoading && !dataLoading) {
      loadExamStatistics()
    }
  }, [user, authLoading, initialLoading, dataLoading])

  const loadExamStatistics = async () => {
    try {
      setIsLoading(true)

      // 사용자 시험 통계 조회
      const userStats = await ApiClient.getDocument("userStatistics", user!.id)
      if (userStats && (userStats as any).examStats) {
        setExamStats((userStats as any).examStats)
      }

      // 최근 시험 결과 조회는 일단 빈 배열로 설정
      // TODO: examResults 컬렉션에서 데이터 조회 구현
      setRecentExams([])
    } catch (error) {
      console.error("시험 통계 로드 실패:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getGradeName = (grade: number): string => {
    const gradeNames: { [key: number]: string } = {
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
    return gradeNames[grade] || `${grade}급`
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}분 ${remainingSeconds}초`
  }

  if (authLoading || initialLoading || dataLoading || isLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='시험 통계를 불러오는 중...' />
      </div>
    )
  }

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

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      {/* 헤더 */}
      <div className='bg-white shadow-sm border-b'>
        <div className='max-w-4xl mx-auto px-4 py-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-4'>
              <Link
                href='/profile'
                className='p-2 hover:bg-gray-100 rounded-lg transition-colors'
              >
                <ArrowLeft className='w-5 h-5 text-gray-600' />
              </Link>
              <h1 className='text-2xl font-bold text-gray-900'>시험 통계</h1>
            </div>
          </div>
        </div>
      </div>

      <div className='max-w-4xl mx-auto px-4 py-6'>
        {!examStats ? (
          <div className='bg-white rounded-lg shadow-lg p-8 text-center'>
            <Trophy className='w-16 h-16 text-gray-400 mx-auto mb-4' />
            <h2 className='text-xl font-semibold text-gray-900 mb-2'>
              아직 시험 기록이 없습니다
            </h2>
            <p className='text-gray-600 mb-6'>
              급수 시험을 응시하면 여기에 통계가 표시됩니다.
            </p>
            <Link
              href='/games/exam'
              className='inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
            >
              <Award className='w-4 h-4 mr-2' />
              시험 시작하기
            </Link>
          </div>
        ) : (
          <>
            {/* 전체 통계 요약 */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
              <div className='bg-white rounded-lg shadow-lg p-6'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-600'>
                      총 시험 횟수
                    </p>
                    <p className='text-2xl font-bold text-gray-900'>
                      {examStats.totalExams}회
                    </p>
                  </div>
                  <Trophy className='w-8 h-8 text-blue-600' />
                </div>
              </div>

              <div className='bg-white rounded-lg shadow-lg p-6'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-600'>합격률</p>
                    <p className='text-2xl font-bold text-green-600'>
                      {examStats.totalExams > 0
                        ? Math.round(
                            (examStats.passedExams / examStats.totalExams) * 100
                          )
                        : 0}
                      %
                    </p>
                  </div>
                  <Target className='w-8 h-8 text-green-600' />
                </div>
              </div>

              <div className='bg-white rounded-lg shadow-lg p-6'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-600'>
                      평균 점수
                    </p>
                    <p className='text-2xl font-bold text-purple-600'>
                      {examStats.averageScore}점
                    </p>
                  </div>
                  <TrendingUp className='w-8 h-8 text-purple-600' />
                </div>
              </div>

              <div className='bg-white rounded-lg shadow-lg p-6'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-600'>
                      최고 점수
                    </p>
                    <p className='text-2xl font-bold text-orange-600'>
                      {examStats.highestScore}점
                    </p>
                  </div>
                  <Award className='w-8 h-8 text-orange-600' />
                </div>
              </div>
            </div>

            {/* 연속 합격 기록 */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-6'>
              <div className='bg-white rounded-lg shadow-lg p-6'>
                <h3 className='text-lg font-semibold text-gray-900 mb-4'>
                  연속 합격 기록
                </h3>
                <div className='space-y-4'>
                  <div className='flex justify-between items-center'>
                    <span className='text-gray-600'>현재 연속 합격</span>
                    <span className='text-xl font-bold text-blue-600'>
                      {examStats.currentStreak}회
                    </span>
                  </div>
                  <div className='flex justify-between items-center'>
                    <span className='text-gray-600'>최장 연속 합격</span>
                    <span className='text-xl font-bold text-green-600'>
                      {examStats.longestStreak}회
                    </span>
                  </div>
                </div>
              </div>

              <div className='bg-white rounded-lg shadow-lg p-6'>
                <h3 className='text-lg font-semibold text-gray-900 mb-4'>
                  마지막 시험
                </h3>
                <div className='text-gray-600'>
                  {examStats.lastExamDate ? (
                    <p>{formatDate(examStats.lastExamDate)}</p>
                  ) : (
                    <p>시험 기록이 없습니다</p>
                  )}
                </div>
              </div>
            </div>

            {/* 급수별 통계 */}
            <div className='bg-white rounded-lg shadow-lg p-6 mb-6'>
              <h3 className='text-lg font-semibold text-gray-900 mb-4'>
                급수별 시험 현황
              </h3>
              <div className='overflow-x-auto'>
                <table className='w-full'>
                  <thead>
                    <tr className='border-b'>
                      <th className='text-left py-3 px-4 font-medium text-gray-600'>
                        급수
                      </th>
                      <th className='text-left py-3 px-4 font-medium text-gray-600'>
                        시험 횟수
                      </th>
                      <th className='text-left py-3 px-4 font-medium text-gray-600'>
                        합격률
                      </th>
                      <th className='text-left py-3 px-4 font-medium text-gray-600'>
                        평균 점수
                      </th>
                      <th className='text-left py-3 px-4 font-medium text-gray-600'>
                        마지막 시험
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(examStats.gradeStats)
                      .sort(([a], [b]) => parseInt(b) - parseInt(a))
                      .map(([grade, stats]) => (
                        <tr key={grade} className='border-b'>
                          <td className='py-3 px-4 font-medium'>
                            {getGradeName(parseInt(grade))}
                          </td>
                          <td className='py-3 px-4'>{stats.totalExams}회</td>
                          <td className='py-3 px-4'>
                            {stats.totalExams > 0
                              ? Math.round(
                                  (stats.passedExams / stats.totalExams) * 100
                                )
                              : 0}
                            %
                          </td>
                          <td className='py-3 px-4'>{stats.averageScore}점</td>
                          <td className='py-3 px-4 text-sm text-gray-600'>
                            {stats.lastExamDate
                              ? formatDate(stats.lastExamDate)
                              : "-"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 최근 시험 결과 */}
            {recentExams.length > 0 && (
              <div className='bg-white rounded-lg shadow-lg p-6'>
                <h3 className='text-lg font-semibold text-gray-900 mb-4'>
                  최근 시험 결과
                </h3>
                <div className='space-y-3'>
                  {recentExams.map((exam) => (
                    <div
                      key={exam.id}
                      className='flex items-center justify-between p-4 bg-gray-50 rounded-lg'
                    >
                      <div className='flex items-center space-x-4'>
                        <div
                          className={`w-3 h-3 rounded-full ${
                            exam.passed ? "bg-green-500" : "bg-red-500"
                          }`}
                        />
                        <div>
                          <p className='font-medium'>
                            {getGradeName(exam.grade)} 시험
                          </p>
                          <p className='text-sm text-gray-600'>
                            {formatDate(exam.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className='text-right'>
                        <p
                          className={`font-bold ${
                            exam.passed ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {exam.score}점 ({exam.correctAnswers}/
                          {exam.totalQuestions})
                        </p>
                        <p className='text-sm text-gray-600'>
                          {formatDuration(exam.actualDuration)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
