"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import LoadingSpinner from "@/components/LoadingSpinner"
import {
  ArrowLeft,
  Trophy,
  BarChart3,
  Brain,
  BookOpen,
  PenTool,
  Puzzle,
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import {
  GameStatisticsService,
  GameStatistics,
} from "@/lib/services/gameStatisticsService"

export default function GameStatisticsPage() {
  const {
    user,
    loading: authLoading,
    initialLoading,
    isAuthenticated,
  } = useAuth()
  const { userStatistics } = useData()
  const [gameStatistics, setGameStatistics] = useState<{
    quiz?: GameStatistics
    writing?: GameStatistics
    partial?: GameStatistics
    memory?: GameStatistics
  }>({})

  // 게임 통계 로드
  useEffect(() => {
    if (user) {
      const loadGameStatistics = async () => {
        try {
          const stats = await GameStatisticsService.getGameStatistics(user.id)
          setGameStatistics(stats)
        } catch (error) {
          console.error("게임 통계 로드 실패:", error)
        }
      }
      loadGameStatistics()
    }
  }, [user])

  // 로딩 중일 때는 로딩 스피너 표시 (진짜 초기 로딩만)
  if (initialLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='인증 상태를 확인하는 중...' />
      </div>
    )
  }

  // 인증이 완료되었지만 사용자가 없을 때 (즉시 표시, 로딩 없음)
  if (isAuthenticated && !user) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-gray-900 mb-4'>
            로그인이 필요합니다
          </h1>
          <Link href='/' className='text-blue-600 hover:text-blue-700'>
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  const totalGames =
    (gameStatistics.quiz?.totalPlayed || 0) +
    (gameStatistics.writing?.totalPlayed || 0) +
    (gameStatistics.partial?.totalPlayed || 0) +
    (gameStatistics.memory?.totalPlayed || 0)

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      {/* 헤더 */}
      <header className='fixed top-0 left-0 right-0 bg-white shadow-sm z-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-4'>
            <div className='flex items-center space-x-4'>
              <Link
                href='/profile'
                className='text-blue-600 hover:text-blue-700'
              >
                <ArrowLeft className='h-5 w-5' />
              </Link>
              <h1 className='text-2xl font-bold text-gray-900'>게임별 통계</h1>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20'>
        <div className='space-y-6'>
          {/* 게임별 통계 */}
          <div className='bg-white rounded-lg shadow-lg p-6'>
            <h3 className='text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2'>
              <Trophy className='h-5 w-5' />
              <span>게임별 통계</span>
            </h3>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
              <div className='text-center p-4 bg-blue-50 rounded-lg'>
                <div className='text-2xl font-bold text-blue-600'>
                  {gameStatistics.memory?.totalPlayed || 0}
                </div>
                <div className='text-sm text-gray-700 font-medium'>
                  카드 뒤집기
                </div>
              </div>
              <div className='text-center p-4 bg-green-50 rounded-lg'>
                <div className='text-2xl font-bold text-green-600'>
                  {gameStatistics.quiz?.totalPlayed || 0}
                </div>
                <div className='text-sm text-gray-700 font-medium'>퀴즈</div>
              </div>
              <div className='text-center p-4 bg-purple-50 rounded-lg'>
                <div className='text-2xl font-bold text-purple-600'>
                  {gameStatistics.writing?.totalPlayed || 0}
                </div>
                <div className='text-sm text-gray-700 font-medium'>
                  쓰기 연습
                </div>
              </div>
              <div className='text-center p-4 bg-orange-50 rounded-lg'>
                <div className='text-2xl font-bold text-orange-600'>
                  {gameStatistics.partial?.totalPlayed || 0}
                </div>
                <div className='text-sm text-gray-700 font-medium'>
                  부분 맞추기
                </div>
              </div>
            </div>
            <div className='mt-4 text-center'>
              <p className='text-sm text-gray-600'>
                총 {totalGames}번의 게임을 플레이했습니다
              </p>
            </div>
          </div>

          {/* 게임별 상세 통계 */}
          <div className='bg-white rounded-lg shadow-lg p-6'>
            <h3 className='text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2'>
              <BarChart3 className='h-5 w-5' />
              <span>상세 통계</span>
            </h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              {/* 퀴즈 통계 */}
              {gameStatistics.quiz && (
                <div className='p-4 bg-green-50 rounded-lg'>
                  <div className='flex items-center space-x-2 mb-3'>
                    <BookOpen className='h-5 w-5 text-green-600' />
                    <h4 className='font-semibold text-green-800'>퀴즈</h4>
                  </div>
                  <div className='space-y-2 text-sm'>
                    <div className='flex justify-between'>
                      <span className='text-gray-700'>총 문제:</span>
                      <span className='font-semibold text-gray-900'>
                        {gameStatistics.quiz.totalPlayed}개
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-700'>정답:</span>
                      <span className='font-semibold text-green-600'>
                        {gameStatistics.quiz.correctAnswers}개
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-700'>오답:</span>
                      <span className='font-semibold text-red-600'>
                        {gameStatistics.quiz.wrongAnswers}개
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-700'>정답률:</span>
                      <span className='font-semibold text-blue-600'>
                        {gameStatistics.quiz.accuracy || 0}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 부분 맞추기 통계 */}
              {gameStatistics.partial && (
                <div className='p-4 bg-orange-50 rounded-lg'>
                  <div className='flex items-center space-x-2 mb-3'>
                    <Puzzle className='h-5 w-5 text-orange-600' />
                    <h4 className='font-semibold text-orange-800'>
                      부분 맞추기
                    </h4>
                  </div>
                  <div className='space-y-2 text-sm'>
                    <div className='flex justify-between'>
                      <span className='text-gray-700'>총 문제:</span>
                      <span className='font-semibold text-gray-900'>
                        {gameStatistics.partial.totalPlayed}개
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-700'>정답:</span>
                      <span className='font-semibold text-green-600'>
                        {gameStatistics.partial.correctAnswers}개
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-700'>오답:</span>
                      <span className='font-semibold text-red-600'>
                        {gameStatistics.partial.wrongAnswers}개
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-700'>정답률:</span>
                      <span className='font-semibold text-blue-600'>
                        {gameStatistics.partial.accuracy || 0}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 쓰기 연습 통계 */}
              {gameStatistics.writing && (
                <div className='p-4 bg-purple-50 rounded-lg'>
                  <div className='flex items-center space-x-2 mb-3'>
                    <PenTool className='h-5 w-5 text-purple-600' />
                    <h4 className='font-semibold text-purple-800'>쓰기 연습</h4>
                  </div>
                  <div className='space-y-2 text-sm'>
                    <div className='flex justify-between'>
                      <span className='text-gray-700'>총 플레이:</span>
                      <span className='font-semibold text-gray-900'>
                        {gameStatistics.writing.totalPlayed}회
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-700'>완료 세션:</span>
                      <span className='font-semibold text-green-600'>
                        {gameStatistics.writing.completedSessions}개
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-700'>총 세션:</span>
                      <span className='font-semibold text-gray-900'>
                        {gameStatistics.writing.totalSessions}개
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-700'>완료율:</span>
                      <span className='font-semibold text-blue-600'>
                        {gameStatistics.writing.totalSessions > 0
                          ? Math.round(
                              (gameStatistics.writing.completedSessions /
                                gameStatistics.writing.totalSessions) *
                                100
                            )
                          : 0}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 카드 뒤집기 통계 */}
              {gameStatistics.memory && (
                <div className='p-4 bg-blue-50 rounded-lg'>
                  <div className='flex items-center space-x-2 mb-3'>
                    <Brain className='h-5 w-5 text-blue-600' />
                    <h4 className='font-semibold text-blue-800'>카드 뒤집기</h4>
                  </div>
                  <div className='space-y-2 text-sm'>
                    <div className='flex justify-between'>
                      <span className='text-gray-700'>총 플레이:</span>
                      <span className='font-semibold text-gray-900'>
                        {gameStatistics.memory.totalPlayed || 0}회
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-700'>매칭 성공:</span>
                      <span className='font-semibold text-green-600'>
                        {gameStatistics.memory.correctAnswers || 0}쌍
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-700'>평균 매칭:</span>
                      <span className='font-semibold text-blue-600'>
                        {gameStatistics.memory.totalPlayed > 0
                          ? Math.round(
                              (gameStatistics.memory.correctAnswers || 0) /
                                gameStatistics.memory.totalPlayed
                            )
                          : 0}
                        쌍/게임
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
