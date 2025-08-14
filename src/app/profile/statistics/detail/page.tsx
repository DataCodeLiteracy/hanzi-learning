"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import LoadingSpinner from "@/components/LoadingSpinner"
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Calendar,
  Target,
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import {
  calculateLevelProgress,
  calculateExperienceToNextLevel,
  calculateRequiredExperience,
} from "@/lib/experienceSystem"
import { ApiClient } from "@/lib/apiClient"
import { UserStatistics } from "@/types"

export default function DetailStatisticsPage() {
  const { user, loading: authLoading } = useAuth()
  const { learningSessions } = useData()
  const [userStatistics, setUserStatistics] = useState<UserStatistics | null>(
    null
  )
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  // 데이터베이스의 level과 experience 사용
  const currentLevel = user?.level || 1
  const currentExperience = user?.experience || 0
  const levelProgress = calculateLevelProgress(currentExperience)
  const expToNextLevel = calculateExperienceToNextLevel(currentExperience)

  // userStatistics 직접 로드
  useEffect(() => {
    const loadUserStatistics = async () => {
      if (!user) return

      setIsLoadingStats(true)
      try {
        let stats = await ApiClient.getUserStatistics(user.id)

        // userStatistics가 없으면 초기화
        if (!stats) {
          console.log("UserStatistics not found, initializing...")
          await ApiClient.initializeUserStatistics(user.id)
          stats = await ApiClient.getUserStatistics(user.id)
        }

        // totalExperience를 users 컬렉션과 동기화
        if (stats && stats.totalExperience !== user.experience) {
          console.log(
            `동기화 필요: userStatistics.totalExperience(${stats.totalExperience}) !== user.experience(${user.experience})`
          )
          await ApiClient.syncUserStatisticsTotalExperience(user.id)
          stats = await ApiClient.getUserStatistics(user.id)
        }

        setUserStatistics(stats)
      } catch (error) {
        console.error("사용자 통계 로드 에러:", error)
      } finally {
        setIsLoadingStats(false)
      }
    }

    loadUserStatistics()
  }, [user])

  // 로딩 중일 때는 로딩 스피너 표시
  if (authLoading || isLoadingStats) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='통계 데이터를 불러오는 중...' />
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
              <h1 className='text-2xl font-bold text-gray-900'>상세 통계</h1>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='space-y-6'>
          {/* 레벨 정보 */}
          <div className='bg-white rounded-lg shadow-lg p-6'>
            <h3 className='text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2'>
              <Target className='h-5 w-5' />
              <span>레벨 정보</span>
            </h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='space-y-4'>
                {/* 레벨 표시 */}
                <h4 className='text-lg font-semibold text-gray-900'>
                  레벨 {currentLevel}
                </h4>

                {/* 다음 레벨까지와 진행률 */}
                <div className='flex items-center justify-between text-sm text-gray-600'>
                  <span>다음 레벨까지 {expToNextLevel} EXP 필요</span>
                  <span>
                    진행률:{" "}
                    <span className='text-blue-600 font-semibold'>
                      {Math.round(levelProgress * 100)}%
                    </span>
                  </span>
                </div>

                {/* 경험치 바와 정보 */}
                <div className='space-y-2 pb-4'>
                  {/* 레벨 시작/끝 경험치 (바 위) */}
                  <div className='flex justify-between text-xs text-gray-500'>
                    <span>{calculateRequiredExperience(currentLevel)}</span>
                    <span>{calculateRequiredExperience(currentLevel + 1)}</span>
                  </div>

                  {/* 경험치 바 */}
                  <div className='w-full bg-gray-200 rounded-full h-4 relative'>
                    <div
                      className='bg-blue-600 h-4 rounded-full transition-all duration-300'
                      style={{ width: `${levelProgress * 100}%` }}
                    ></div>
                  </div>

                  {/* 화살표와 현재 경험치 (바 아래, 진행률에 따라 위치) */}
                  <div className='relative'>
                    <div
                      className='absolute transform -translate-x-1/2 text-center'
                      style={{
                        left: `${Math.min(
                          100,
                          Math.max(0, levelProgress * 100)
                        )}%`,
                        top: "-8px",
                      }}
                    >
                      <div className='text-blue-600 text-xs'>▲</div>
                      <div className='text-blue-600 text-xs font-medium'>
                        {currentExperience}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className='space-y-2'>
                <div className='flex justify-between'>
                  <span className='text-gray-700'>현재 레벨:</span>
                  <span className='font-semibold text-gray-900'>
                    {currentLevel}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-700'>총 경험치:</span>
                  <span className='font-semibold text-blue-600'>
                    {currentExperience} EXP
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-700'>다음 레벨까지:</span>
                  <span className='font-semibold text-green-600'>
                    {expToNextLevel} EXP
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-700'>진행률:</span>
                  <span className='font-semibold text-purple-600'>
                    {Math.round(levelProgress * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 학습 통계 */}
          {userStatistics && (
            <div className='bg-white rounded-lg shadow-lg p-6'>
              <h3 className='text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2'>
                <TrendingUp className='h-5 w-5' />
                <span>학습 통계</span>
              </h3>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='text-center p-4 bg-blue-50 rounded-lg'>
                  <div className='text-2xl font-bold text-blue-600'>
                    {userStatistics.totalExperience}
                  </div>
                  <div className='text-sm text-gray-600'>총 경험치</div>
                </div>
                <div className='text-center p-4 bg-green-50 rounded-lg'>
                  <div className='text-2xl font-bold text-green-600'>
                    {userStatistics.totalSessions}
                  </div>
                  <div className='text-sm text-gray-600'>학습 세션</div>
                </div>
              </div>
            </div>
          )}

          {/* 최근 학습 기록 */}
          {learningSessions.length > 0 && (
            <div className='bg-white rounded-lg shadow-lg p-6'>
              <h3 className='text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2'>
                <Calendar className='h-5 w-5' />
                <span>최근 학습 기록</span>
              </h3>
              <div className='space-y-3'>
                {learningSessions.slice(0, 10).map((session) => (
                  <div
                    key={session.id}
                    className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'
                  >
                    <div className='flex items-center space-x-3'>
                      <div
                        className={`w-3 h-3 rounded-full ${
                          session.gameType === "memory"
                            ? "bg-blue-500"
                            : session.gameType === "quiz"
                            ? "bg-green-500"
                            : session.gameType === "writing"
                            ? "bg-purple-500"
                            : "bg-orange-500"
                        }`}
                      ></div>
                      <span className='font-medium text-gray-900'>
                        {session.gameType === "memory"
                          ? "카드 뒤집기"
                          : session.gameType === "quiz"
                          ? "퀴즈"
                          : session.gameType === "writing"
                          ? "쓰기 연습"
                          : "부분 맞추기"}
                      </span>
                    </div>
                    <div className='text-right'>
                      <div className='text-sm font-semibold text-gray-900'>
                        {session.score}점
                      </div>
                      <div className='text-xs text-gray-500'>
                        {new Date(session.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
