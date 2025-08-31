"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import LoadingSpinner from "@/components/LoadingSpinner"
import {
  BookOpen,
  PenTool,
  Trophy,
  User,
  LogIn,
  Gamepad2,
  Eye,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"
import {
  calculateLevelProgress,
  calculateExperienceToNextLevel,
  calculateRequiredExperience,
  calculateBonusExperience,
} from "@/lib/experienceSystem"
import BonusExperienceModal from "@/components/BonusExperienceModal"
import { useState, useEffect } from "react"
import { ApiClient } from "@/lib/apiClient"

export default function Home() {
  const { user, initialLoading, signIn } = useAuth()
  const { isLoading: dataLoading } = useData()
  const [showWritingModal, setShowWritingModal] = useState(false)
  const [showGuideModal, setShowGuideModal] = useState(false)
  const [todayExperience, setTodayExperience] = useState<number>(0)
  const [todayGoal, setTodayGoal] = useState<number>(100)
  const [consecutiveGoalDays, setConsecutiveGoalDays] = useState<number>(0)
  const [weeklyGoalAchievement, setWeeklyGoalAchievement] = useState<{
    achievedDays: number
    totalDays: number
  }>({ achievedDays: 0, totalDays: 7 }) // 0/7로 시작

  // 보너스 경험치 모달 상태
  const [showBonusModal, setShowBonusModal] = useState(false)
  const [bonusInfo, setBonusInfo] = useState<{
    consecutiveDays: number
    bonusExperience: number
    dailyGoal: number
  }>({ consecutiveDays: 0, bonusExperience: 0, dailyGoal: 100 })

  // 유저 순위 상태
  const [userRankings, setUserRankings] = useState<
    Array<{
      userId: string
      username: string
      level: number
      experience: number
      totalPlayed: number
      accuracy: number
      preferredGrade?: number
      rank: number
    }>
  >([])
  const [isLoadingRankings, setIsLoadingRankings] = useState<boolean>(false)

  // 데이터베이스의 level과 experience 사용
  const currentLevel = user?.level || 1
  const currentExperience = user?.experience || 0
  const levelProgress = calculateLevelProgress(currentExperience)
  const expToNextLevel = calculateExperienceToNextLevel(currentExperience)

  // 오늘 경험치 로드
  useEffect(() => {
    if (user) {
      const loadTodayExperience = async () => {
        try {
          // 자정 리셋 확인 및 처리
          await ApiClient.checkAndResetTodayExperience(user.id)

          const todayExp = await ApiClient.getTodayExperience(user.id)
          setTodayExperience(todayExp)

          // 오늘의 학습 목표와 목표 달성 통계 로드
          const userStats = await ApiClient.getUserStatistics(user.id)
          if (userStats) {
            setTodayGoal(userStats.todayGoal || 100)
            setConsecutiveGoalDays(userStats.consecutiveGoalDays || 0)
            if (userStats.weeklyGoalAchievement) {
              setWeeklyGoalAchievement({
                achievedDays: userStats.weeklyGoalAchievement.achievedDays || 0,
                totalDays: userStats.weeklyGoalAchievement.totalDays || 0,
              })
            }

            // 보너스 경험치 확인 및 모달 표시
            if (
              userStats.consecutiveGoalDays &&
              userStats.consecutiveGoalDays >= 10
            ) {
              const bonusExp = calculateBonusExperience(
                userStats.consecutiveGoalDays,
                userStats.todayGoal || 100
              )
              if (bonusExp > 0) {
                // 보너스 모달 표시
                setBonusInfo({
                  consecutiveDays: userStats.consecutiveGoalDays,
                  bonusExperience: bonusExp,
                  dailyGoal: userStats.todayGoal || 100,
                })
                setShowBonusModal(true)
              }
            }
          }
        } catch (error) {
          console.error("오늘 경험치 로드 실패:", error)
        }
      }
      loadTodayExperience()
    }
  }, [user])

  // 보너스 경험치 획득 시 모달 표시 (현재 사용하지 않음)
  // const handleBonusEarned = (
  //   consecutiveDays: number,
  //   bonusExperience: number,
  //   dailyGoal: number
  // ) => {
  //   setBonusInfo({ consecutiveDays, bonusExperience, dailyGoal })
  //   setShowBonusModal(true)
  // }

  // 유저 순위 로드
  useEffect(() => {
    const loadUserRankings = async () => {
      try {
        setIsLoadingRankings(true)

        // 디버깅: 모든 유저 조회
        console.log("🔍 디버깅: 모든 유저 조회 시작")
        const allUsers = await ApiClient.getAllUsers()
        console.log("📊 모든 유저:", allUsers)

        // 유저 순위 조회
        const rankings = await ApiClient.getUserRankings()
        console.log("🏆 유저 순위:", rankings)

        setUserRankings(rankings)
      } catch (error) {
        console.error("유저 순위 로드 실패:", error)
      } finally {
        setIsLoadingRankings(false)
      }
    }

    loadUserRankings()
  }, [])

  // 로딩 중일 때는 로딩 스피너만 표시 (진짜 초기 로딩만)
  if (initialLoading) {
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

  const handleGameClick = (gameId: string, href: string) => {
    if (gameId === "writing") {
      setShowWritingModal(true)
    } else {
      window.location.href = href
    }
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      {/* 헤더 */}
      <header className='bg-white shadow-sm'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-4'>
            <h1 className='text-xl sm:text-2xl font-bold text-gray-900'>
              한자 학습 앱
              <span className='text-sm sm:text-base font-normal text-gray-600 ml-2'>
                (한자 진흥회 기반)
              </span>
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
                <Link
                  href='/login'
                  className='flex items-center space-x-1 px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors'
                >
                  <LogIn className='h-3 w-3 sm:h-4 sm:w-4' />
                  <span className='hidden sm:inline'>로그인</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-16'>
        {user ? (
          <div className='space-y-6 sm:space-y-8'>
            {/* 사용자 정보 및 환영 메시지 */}
            <div className='bg-white rounded-lg shadow-sm p-4 sm:p-6 pb-8'>
              <div className='flex items-center justify-between mb-4'>
                <div>
                  <h2 className='text-lg sm:text-xl font-semibold text-gray-900 mb-1'>
                    안녕하세요, {user.displayName}님!
                  </h2>
                  <p className='text-sm sm:text-base text-gray-600'>
                    오늘도 한자 학습을 시작해보세요.
                  </p>
                </div>
              </div>

              {/* 레벨 정보 */}
              <div className='space-y-3'>
                {/* 레벨 표시 */}
                <h3 className='text-lg font-semibold text-gray-900'>
                  레벨 {currentLevel}
                </h3>

                {/* 오늘의 학습 성과 */}
                <div className='bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100'>
                  <div className='flex items-center space-x-2 mb-2'>
                    <TrendingUp className='h-5 w-5 text-blue-600' />
                    <span className='text-sm font-semibold text-blue-800'>
                      오늘의 학습
                    </span>
                  </div>
                  <div className='flex items-baseline space-x-2 mb-2'>
                    <span className='text-2xl font-bold text-blue-600'>
                      {todayExperience}
                    </span>
                    <span className='text-sm text-blue-600'>EXP 획득</span>
                    <span className='text-sm text-gray-500'>
                      / {todayGoal} 목표
                    </span>
                  </div>

                  {/* 진행률 바 */}
                  <div className='w-full bg-gray-200 rounded-full h-2 mb-2'>
                    <div
                      className='bg-blue-600 h-2 rounded-full transition-all duration-300'
                      style={{
                        width: `${Math.min(
                          100,
                          (todayExperience / todayGoal) * 100
                        )}%`,
                      }}
                    ></div>
                  </div>

                  <p className='text-xs text-blue-700'>
                    {todayExperience >= todayGoal
                      ? `🎉 목표 달성! ${todayExperience}EXP를 획득했어요!`
                      : `목표까지 ${
                          todayGoal - todayExperience
                        }EXP 남았어요! 🎯`}
                  </p>

                  {/* 목표 달성 통계 */}
                  <div className='mt-3 pt-3 border-t border-blue-200'>
                    <div className='grid grid-cols-2 gap-3'>
                      {/* 연속 목표 달성일 */}
                      <div className='text-center'>
                        <div className='text-lg font-bold text-green-600'>
                          {consecutiveGoalDays}일
                        </div>
                        <div className='text-xs text-gray-600'>연속 달성</div>
                        {consecutiveGoalDays >= 10 && (
                          <div className='text-xs text-blue-600 mt-1 font-medium'>
                            🎁 보너스!
                          </div>
                        )}
                      </div>
                      {/* 이번주 달성 현황 */}
                      <div className='text-center'>
                        <div className='text-lg font-bold text-purple-600'>
                          {weeklyGoalAchievement.achievedDays}/
                          {weeklyGoalAchievement.totalDays}
                        </div>
                        <div className='text-xs text-gray-600'>이번주 달성</div>
                      </div>
                    </div>

                    {/* 보너스 경험치 정보 */}
                    {consecutiveGoalDays >= 10 && (
                      <div className='mt-3 pt-3 border-t border-blue-100'>
                        <div className='text-center'>
                          <div className='text-sm font-medium text-blue-600 mb-1'>
                            🎁 보너스 경험치 정보
                          </div>
                          <div className='text-xs text-gray-600 space-y-1'>
                            {consecutiveGoalDays >= 30 ? (
                              <div>
                                30일 연속: +
                                {Math.round(
                                  500 *
                                    Math.min(
                                      Math.max(todayGoal / 100, 1.0),
                                      3.0
                                    )
                                )}{" "}
                                EXP
                              </div>
                            ) : consecutiveGoalDays >= 20 ? (
                              <div>
                                20일 연속: +
                                {Math.round(
                                  200 *
                                    Math.min(
                                      Math.max(todayGoal / 100, 1.0),
                                      3.0
                                    )
                                )}{" "}
                                EXP
                              </div>
                            ) : (
                              <div>
                                10일 연속: +
                                {Math.round(
                                  50 *
                                    Math.min(
                                      Math.max(todayGoal / 100, 1.0),
                                      3.0
                                    )
                                )}{" "}
                                EXP
                              </div>
                            )}
                            <div className='text-blue-500'>
                              목표 {todayGoal} EXP ×{" "}
                              {Math.min(
                                Math.max(todayGoal / 100, 1.0),
                                3.0
                              ).toFixed(1)}
                              배
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

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
                <div className='space-y-2'>
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
            </div>

            {/* 보너스 경험치 모달 */}
            <BonusExperienceModal
              isOpen={showBonusModal}
              onClose={() => setShowBonusModal(false)}
              consecutiveDays={bonusInfo.consecutiveDays}
              bonusExperience={bonusInfo.bonusExperience}
              dailyGoal={bonusInfo.dailyGoal}
            />

            {/* 유저 순위 */}
            <div className='mb-6 sm:mb-8'>
              <h2 className='text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6'>
                🏆 유저 순위
              </h2>
              <div className='bg-white rounded-lg shadow-sm p-4 sm:p-6'>
                {isLoadingRankings ? (
                  <div className='flex items-center justify-center py-8'>
                    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500'></div>
                    <span className='ml-2 text-gray-600'>
                      순위를 불러오는 중...
                    </span>
                  </div>
                ) : userRankings.length > 0 ? (
                  <div className='space-y-3'>
                    {/* 모든 순위를 동일한 UI로 표시 (5등까지만) */}
                    {userRankings.slice(0, 5).map((user) => (
                      <div
                        key={user.userId}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          user.rank === 1
                            ? "bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200"
                            : user.rank === 2
                            ? "bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200"
                            : user.rank === 3
                            ? "bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200"
                            : "bg-gray-50 border border-gray-100"
                        }`}
                      >
                        <div className='flex items-center space-x-3'>
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              user.rank === 1
                                ? "bg-yellow-400 text-white"
                                : user.rank === 2
                                ? "bg-gray-400 text-white"
                                : user.rank === 3
                                ? "bg-orange-400 text-white"
                                : "bg-blue-400 text-white"
                            }`}
                          >
                            {user.rank}
                          </div>
                          <div className='flex-1 min-w-0'>
                            <div className='font-semibold text-gray-900 truncate'>
                              {user.username}
                            </div>
                            <div className='text-xs text-gray-600 space-y-1'>
                              <div className='flex items-center space-x-2'>
                                <span>레벨 {user.level}</span>
                                <span>•</span>
                                <span>
                                  {user.experience.toLocaleString()} EXP
                                </span>
                              </div>
                              <div className='flex items-center space-x-2'>
                                <span>{user.totalPlayed}문제</span>
                                <span>•</span>
                                <span className='text-green-600 font-medium'>
                                  정답률 {user.accuracy}%
                                </span>
                                <span>•</span>
                                <span className='text-blue-600 font-medium'>
                                  {user.preferredGrade}급
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='text-center py-8 text-gray-500'>
                    아직 순위 데이터가 없습니다.
                  </div>
                )}
              </div>
            </div>

            {/* 게임 선택 */}
            <div>
              <h2 className='text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6'>
                학습 게임
              </h2>
              <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6'>
                {games.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => handleGameClick(game.id, game.href)}
                    className='bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow cursor-pointer text-left w-full'
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
                  </button>
                ))}
              </div>
            </div>

            {/* 한자 정보 */}
            <div>
              <h2 className='text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6'>
                한자 정보
              </h2>
              <div className='grid grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6'>
                {/* 한자 목록 카드 */}
                <button
                  onClick={() => (window.location.href = "/hanzi/list")}
                  className='bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow cursor-pointer text-left w-full'
                >
                  <div className='w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-3 sm:mb-4'>
                    <BookOpen className='h-5 w-5 sm:h-6 sm:w-6 text-white' />
                  </div>
                  <h3 className='text-sm sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2'>
                    한자 목록
                  </h3>
                  <p className='text-xs sm:text-sm text-gray-600'>
                    급수별 한자 현황과 학습 통계를 확인하세요
                  </p>
                </button>

                {/* 교과서 한자어 카드 */}
                <button
                  onClick={() => (window.location.href = "/textbook-words")}
                  className='bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow cursor-pointer text-left w-full'
                >
                  <div className='w-10 h-10 sm:w-12 sm:h-12 bg-orange-500 rounded-lg flex items-center justify-center mb-3 sm:mb-4'>
                    <BookOpen className='h-5 w-5 sm:h-6 sm:w-6 text-white' />
                  </div>
                  <h3 className='text-sm sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2'>
                    교과서 한자어
                  </h3>
                  <p className='text-xs sm:text-sm text-gray-600'>
                    교과서에 나오는 한자어를 학습하세요
                  </p>
                </button>
              </div>

              {/* 학습 가이드 카드 (아래에 배치) */}
              <div className='grid grid-cols-1 gap-4 sm:gap-6'>
                <button
                  onClick={() => setShowGuideModal(true)}
                  className='bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow cursor-pointer text-left w-full'
                >
                  <div className='w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-lg flex items-center justify-center mb-3 sm:mb-4'>
                    <Trophy className='h-5 w-5 sm:h-6 sm:w-6 text-white' />
                  </div>
                  <h3 className='text-sm sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2'>
                    학습 가이드
                  </h3>
                  <p className='text-xs sm:text-sm text-gray-600'>
                    효과적인 한자 학습 방법과 팁을 확인하세요
                  </p>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 로그인 전 화면 */
          <div className='text-center py-8 sm:py-12 pb-16'>
            <div className='max-w-md mx-auto'>
              <h2 className='text-2xl sm:text-3xl font-bold text-gray-900 mb-4'>
                한자 학습에 오신 것을 환영합니다
              </h2>
              <p className='text-sm sm:text-base text-gray-600 mb-6 sm:mb-8'>
                한자 진흥회 데이터를 기반으로 한 다양한 학습 게임을 통해 한자를
                재미있게 배워보세요.
              </p>
              <button
                onClick={() => (window.location.href = "/login")}
                className='flex items-center space-x-2 px-4 py-3 sm:px-6 sm:py-3 text-base sm:text-lg text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors mx-auto'
              >
                <LogIn className='h-4 w-4 sm:h-5 sm:w-5' />
                <span>Google로 시작하기</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 쓰기 게임 준비 중 모달 */}
      {showWritingModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center'>
          {/* 배경 오버레이 */}
          <div
            className='absolute inset-0'
            style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
            onClick={() => setShowWritingModal(false)}
          />

          {/* 모달 */}
          <div className='relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6'>
            <div className='text-center'>
              <div className='text-yellow-500 text-4xl mb-4'>🚧</div>
              <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                준비 중인 기능
              </h3>
              <p className='text-gray-700 mb-6'>
                쓰기 연습 기능은 현재 개발 중입니다.
              </p>
              <button
                onClick={() => setShowWritingModal(false)}
                className='px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 학습 가이드 준비 중 모달 */}
      {showGuideModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center'>
          {/* 배경 오버레이 */}
          <div
            className='absolute inset-0'
            style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
            onClick={() => setShowGuideModal(false)}
          />

          {/* 모달 */}
          <div className='relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6'>
            <div className='text-center'>
              <div className='text-yellow-500 text-4xl mb-4'>🚧</div>
              <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                준비 중인 기능
              </h3>
              <p className='text-gray-700 mb-6'>
                학습 가이드 기능은 현재 개발 중입니다.
              </p>
              <button
                onClick={() => setShowGuideModal(false)}
                className='px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors'
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
