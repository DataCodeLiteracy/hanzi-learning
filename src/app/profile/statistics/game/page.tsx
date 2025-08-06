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
import { ApiClient } from "@/lib/apiClient"

interface GameStatistics {
  totalPlayed: number
  correctAnswers: number
  wrongAnswers: number
  completedSessions: number
  totalSessions: number
  accuracy: number
}

export default function GameStatisticsPage() {
  const { user, loading: authLoading } = useAuth()
  const { userStatistics } = useData()
  const [gameStats, setGameStats] = useState<{
    quiz?: GameStatistics
    writing?: GameStatistics
    partial?: GameStatistics
    memory?: GameStatistics
  }>({})

  // 게임별 통계 로드
  useEffect(() => {
    if (user) {
      const loadGameStats = async () => {
        try {
          const [quizStats, writingStats, partialStats, memoryStats] =
            await Promise.all([
              ApiClient.getGameStatistics(user.id, "quiz"),
              ApiClient.getGameStatistics(user.id, "writing"),
              ApiClient.getGameStatistics(user.id, "partial"),
              ApiClient.getGameStatistics(user.id, "memory"),
            ])

          setGameStats({
            quiz: quizStats || undefined,
            writing: writingStats || undefined,
            partial: partialStats || undefined,
            memory: memoryStats || undefined,
          })
        } catch (error) {
          console.error("게임 통계 로드 실패:", error)
        }
      }

      loadGameStats()
    }
  }, [user])

  // 로딩 중일 때는 로딩 스피너 표시
  if (authLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='인증 상태를 확인하는 중...' />
      </div>
    )
  }

  // 인증이 완료되었지만 사용자가 없을 때
  if (!user) {
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
    (gameStats.quiz?.totalPlayed || 0) +
    (gameStats.writing?.totalPlayed || 0) +
    (gameStats.partial?.totalPlayed || 0) +
    (gameStats.memory?.totalPlayed || 0)

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      {/* 헤더 */}
      <header className='bg-white shadow-sm'>
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
      <main className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
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
                  {gameStats.memory?.totalPlayed || 0}
                </div>
                <div className='text-sm text-gray-700 font-medium'>
                  카드 뒤집기
                </div>
              </div>
              <div className='text-center p-4 bg-green-50 rounded-lg'>
                <div className='text-2xl font-bold text-green-600'>
                  {gameStats.quiz?.totalPlayed || 0}
                </div>
                <div className='text-sm text-gray-700 font-medium'>퀴즈</div>
              </div>
              <div className='text-center p-4 bg-purple-50 rounded-lg'>
                <div className='text-2xl font-bold text-purple-600'>
                  {gameStats.writing?.totalPlayed || 0}
                </div>
                <div className='text-sm text-gray-700 font-medium'>
                  쓰기 연습
                </div>
              </div>
              <div className='text-center p-4 bg-orange-50 rounded-lg'>
                <div className='text-2xl font-bold text-orange-600'>
                  {gameStats.partial?.totalPlayed || 0}
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
              {gameStats.quiz && (
                <div className='p-4 bg-green-50 rounded-lg'>
                  <div className='flex items-center space-x-2 mb-3'>
                    <BookOpen className='h-5 w-5 text-green-600' />
                    <h4 className='font-semibold text-green-800'>퀴즈</h4>
                  </div>
                  <div className='space-y-2 text-sm'>
                    <div className='flex justify-between'>
                      <span className='text-gray-700'>총 플레이:</span>
                      <span className='font-semibold text-gray-900'>
                        {gameStats.quiz.totalPlayed}회
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-700'>정답:</span>
                      <span className='font-semibold text-green-600'>
                        {gameStats.quiz.correctAnswers}개
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-700'>오답:</span>
                      <span className='font-semibold text-red-600'>
                        {gameStats.quiz.wrongAnswers}개
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-700'>정답률:</span>
                      <span className='font-semibold text-blue-600'>
                        {gameStats.quiz.accuracy}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 부분 맞추기 통계 */}
              {gameStats.partial && (
                <div className='p-4 bg-orange-50 rounded-lg'>
                  <div className='flex items-center space-x-2 mb-3'>
                    <Puzzle className='h-5 w-5 text-orange-600' />
                    <h4 className='font-semibold text-orange-800'>
                      부분 맞추기
                    </h4>
                  </div>
                  <div className='space-y-2 text-sm'>
                    <div className='flex justify-between'>
                      <span className='text-gray-700'>총 플레이:</span>
                      <span className='font-semibold text-gray-900'>
                        {gameStats.partial.totalPlayed}회
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-700'>정답:</span>
                      <span className='font-semibold text-green-600'>
                        {gameStats.partial.correctAnswers}개
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-700'>오답:</span>
                      <span className='font-semibold text-red-600'>
                        {gameStats.partial.wrongAnswers}개
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-700'>정답률:</span>
                      <span className='font-semibold text-blue-600'>
                        {gameStats.partial.accuracy}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 쓰기 연습 통계 */}
              {gameStats.writing && (
                <div className='p-4 bg-purple-50 rounded-lg'>
                  <div className='flex items-center space-x-2 mb-3'>
                    <PenTool className='h-5 w-5 text-purple-600' />
                    <h4 className='font-semibold text-purple-800'>쓰기 연습</h4>
                  </div>
                  <div className='space-y-2 text-sm'>
                    <div className='flex justify-between'>
                      <span className='text-gray-700'>총 플레이:</span>
                      <span className='font-semibold text-gray-900'>
                        {gameStats.writing.totalPlayed}회
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-700'>완료 세션:</span>
                      <span className='font-semibold text-green-600'>
                        {gameStats.writing.completedSessions}개
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-700'>총 세션:</span>
                      <span className='font-semibold text-gray-900'>
                        {gameStats.writing.totalSessions}개
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-700'>완료율:</span>
                      <span className='font-semibold text-blue-600'>
                        {gameStats.writing.totalSessions > 0
                          ? Math.round(
                              (gameStats.writing.completedSessions /
                                gameStats.writing.totalSessions) *
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
              {gameStats.memory && (
                <div className='p-4 bg-blue-50 rounded-lg'>
                  <div className='flex items-center space-x-2 mb-3'>
                    <Brain className='h-5 w-5 text-blue-600' />
                    <h4 className='font-semibold text-blue-800'>카드 뒤집기</h4>
                  </div>
                  <div className='space-y-2 text-sm'>
                    <div className='flex justify-between'>
                      <span className='text-gray-700'>총 플레이:</span>
                      <span className='font-semibold text-gray-900'>
                        {gameStats.memory.totalPlayed}회
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-700'>매칭 성공:</span>
                      <span className='font-semibold text-green-600'>
                        {gameStats.memory.correctAnswers}쌍
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-700'>평균 매칭:</span>
                      <span className='font-semibold text-blue-600'>
                        {gameStats.memory.totalPlayed > 0
                          ? Math.round(
                              gameStats.memory.correctAnswers /
                                gameStats.memory.totalPlayed
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
