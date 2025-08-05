"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import LoadingSpinner from "@/components/LoadingSpinner"
import { BookOpen, Gamepad2, PenTool, Eye, LogIn, User } from "lucide-react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  calculateLevel,
  calculateLevelProgress,
  calculateExperienceToNextLevel,
} from "@/lib/experienceSystem"

export default function Home() {
  const { user, loading: authLoading, signIn } = useAuth()
  const { userStatistics, isLoading: dataLoading } = useData()

  // 데이터베이스의 level과 experience 사용
  const currentLevel = user?.level || 1
  const currentExperience = user?.experience || 0
  const levelProgress = calculateLevelProgress(currentExperience)
  const expToNextLevel = calculateExperienceToNextLevel(currentExperience)

  useEffect(() => {
    if (user && !authLoading) {
      console.log("사용자 로그인됨:", user.displayName)
    }
  }, [user, authLoading])

  // 로딩 중일 때는 로딩 스피너만 표시
  if (authLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='인증 상태를 확인하는 중...' />
      </div>
    )
  }

  // 데이터 로딩 중일 때는 기본 레이아웃을 유지하면서 로딩 표시
  if (dataLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
        <header className='bg-white shadow-sm'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
            <div className='flex justify-between items-center py-4'>
              <h1 className='text-xl sm:text-2xl font-bold text-gray-900'>
                한자 학습 앱
              </h1>
              <div className='flex items-center space-x-2 sm:space-x-4'>
                {user ? (
                  <Link
                    href='/profile'
                    className='flex items-center space-x-2 px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors'
                  >
                    <User className='h-4 w-4 sm:h-5 sm:w-5' />
                    <span>마이페이지</span>
                  </Link>
                ) : (
                  <button
                    onClick={signIn}
                    className='flex items-center space-x-1 px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors'
                  >
                    <LogIn className='h-3 w-3 sm:h-4 sm:w-4' />
                    <span className='hidden sm:inline'>로그인</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>
        <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8'>
          <div className='flex items-center justify-center py-12'>
            <LoadingSpinner message='데이터를 불러오는 중...' />
          </div>
        </main>
      </div>
    )
  }

  const games = [
    {
      id: "memory",
      title: "카드 뒤집기",
      description: "같은 한자를 찾아보세요",
      icon: Gamepad2,
      color: "bg-blue-500",
      href: "/games/memory",
    },
    {
      id: "quiz",
      title: "퀴즈",
      description: "한자의 뜻과 음을 맞춰보세요",
      icon: BookOpen,
      color: "bg-green-500",
      href: "/games/quiz",
    },
    {
      id: "writing",
      title: "쓰기 연습",
      description: "획순을 따라 한자를 써보세요",
      icon: PenTool,
      color: "bg-purple-500",
      href: "/games/writing",
    },
    {
      id: "partial",
      title: "부분 맞추기",
      description: "가려진 한자를 맞춰보세요",
      icon: Eye,
      color: "bg-orange-500",
      href: "/games/partial",
    },
  ]

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      {/* 헤더 */}
      <header className='bg-white shadow-sm'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-4'>
            <h1 className='text-xl sm:text-2xl font-bold text-gray-900'>
              한자 학습 앱
            </h1>
            <div className='flex items-center space-x-2 sm:space-x-4'>
              {user ? (
                <Link
                  href='/profile'
                  className='flex items-center space-x-2 px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors'
                >
                  <User className='h-4 w-4 sm:h-5 sm:w-5' />
                  <span>마이페이지</span>
                </Link>
              ) : (
                <button
                  onClick={signIn}
                  className='flex items-center space-x-1 px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors'
                >
                  <LogIn className='h-3 w-3 sm:h-4 sm:w-4' />
                  <span className='hidden sm:inline'>로그인</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8'>
        {user ? (
          <div className='space-y-6 sm:space-y-8'>
            {/* 사용자 정보 및 환영 메시지 */}
            <div className='bg-white rounded-lg shadow-sm p-4 sm:p-6'>
              <div className='flex items-center justify-between mb-4'>
                <div>
                  <h2 className='text-lg sm:text-xl font-semibold text-gray-900 mb-1'>
                    안녕하세요, {user.displayName}님!
                  </h2>
                  <p className='text-sm sm:text-base text-gray-600'>
                    오늘도 한자 학습을 시작해보세요.
                  </p>
                </div>
                <div className='text-right'>
                  <p className='text-xs sm:text-sm font-medium text-gray-900'>
                    레벨 {currentLevel}
                  </p>
                  <p className='text-xs sm:text-sm text-gray-500'>
                    경험치 {user.experience}
                  </p>
                </div>
              </div>

              {/* 레벨 진행률 바 */}
              <div className='mb-2'>
                <div className='flex justify-between text-xs text-gray-500 mb-1'>
                  <span>다음 레벨까지 {expToNextLevel} EXP</span>
                  <span>{Math.round(levelProgress * 100)}%</span>
                </div>
                <div className='w-full bg-gray-200 rounded-full h-2'>
                  <div
                    className='bg-blue-600 h-2 rounded-full transition-all duration-300'
                    style={{ width: `${levelProgress * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* 통계 카드 */}
            {userStatistics && (
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6'>
                <div className='bg-white rounded-lg shadow-sm p-4 sm:p-6'>
                  <h3 className='text-sm sm:text-lg font-semibold text-gray-900 mb-2'>
                    총 경험치
                  </h3>
                  <p className='text-2xl sm:text-3xl font-bold text-blue-600'>
                    {userStatistics.totalExperience}
                  </p>
                </div>
                <div className='bg-white rounded-lg shadow-sm p-4 sm:p-6'>
                  <h3 className='text-sm sm:text-lg font-semibold text-gray-900 mb-2'>
                    학습 세션
                  </h3>
                  <p className='text-2xl sm:text-3xl font-bold text-green-600'>
                    {userStatistics.totalSessions}
                  </p>
                </div>
                <div className='bg-white rounded-lg shadow-sm p-4 sm:p-6'>
                  <h3 className='text-sm sm:text-lg font-semibold text-gray-900 mb-2'>
                    평균 점수
                  </h3>
                  <p className='text-2xl sm:text-3xl font-bold text-purple-600'>
                    {Math.round(userStatistics.averageScore)}%
                  </p>
                </div>
              </div>
            )}

            {/* 게임 선택 */}
            <div>
              <h2 className='text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6'>
                학습 게임
              </h2>
              <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6'>
                {games.map((game) => (
                  <a
                    key={game.id}
                    href={game.href}
                    className='bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow cursor-pointer'
                  >
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 ${game.color} rounded-lg flex items-center justify-center mb-3 sm:mb-4`}
                    >
                      <game.icon className='h-5 w-5 sm:h-6 sm:w-6 text-white' />
                    </div>
                    <h3 className='text-sm sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2'>
                      {game.title}
                    </h3>
                    <p className='text-xs sm:text-sm text-gray-600'>
                      {game.description}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* 로그인 전 화면 */
          <div className='text-center py-8 sm:py-12'>
            <div className='max-w-md mx-auto'>
              <h2 className='text-2xl sm:text-3xl font-bold text-gray-900 mb-4'>
                한자 학습에 오신 것을 환영합니다
              </h2>
              <p className='text-sm sm:text-base text-gray-600 mb-6 sm:mb-8'>
                한자 진흥회 데이터를 기반으로 한 다양한 학습 게임을 통해 한자를
                재미있게 배워보세요.
              </p>
              <button
                onClick={signIn}
                className='flex items-center space-x-2 px-4 py-3 sm:px-6 sm:py-3 text-base sm:text-lg text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors mx-auto'
              >
                <LogIn className='h-4 w-4 sm:h-5 sm:w-5' />
                <span>Google로 시작하기</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
