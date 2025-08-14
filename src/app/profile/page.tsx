"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import LoadingSpinner from "@/components/LoadingSpinner"
import ConfirmModal from "@/components/ConfirmModal"
import {
  ArrowLeft,
  User,
  Trophy,
  BarChart3,
  Settings,
  Crown,
  LogOut,
  Trash2,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import {
  calculateLevelProgress,
  calculateExperienceToNextLevel,
  calculateRequiredExperience,
} from "@/lib/experienceSystem"
import { ApiClient } from "@/lib/apiClient"
import {
  GameStatisticsService,
  GameStatistics,
} from "@/lib/services/gameStatisticsService"

export default function ProfilePage() {
  const {
    user,
    loading: authLoading,
    initialLoading,
    isAuthenticated,
    signOutUser,
  } = useAuth()
  const { userStatistics, learningSessions } = useData()
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [gameStatistics, setGameStatistics] = useState<Record<
    string,
    GameStatistics
  > | null>(null)
  const [todayExperience, setTodayExperience] = useState<number>(0)
  const [todayGoal, setTodayGoal] = useState<number>(100)

  // 데이터베이스의 level과 experience 사용
  const currentLevel = user?.level || 1
  const currentExperience = user?.experience || 0
  const levelProgress = calculateLevelProgress(currentExperience)
  const expToNextLevel = calculateExperienceToNextLevel(currentExperience)

  // 게임 통계 및 오늘 경험치 로드
  useEffect(() => {
    if (user) {
      const loadData = async () => {
        try {
          // 자정 리셋 확인 및 처리
          await ApiClient.checkAndResetTodayExperience(user.id)

          // 게임 통계 로드
          const stats = await GameStatisticsService.getGameStatistics(user.id)
          setGameStatistics(stats)

          // 오늘 경험치 로드
          const todayExp = await ApiClient.getTodayExperience(user.id)
          setTodayExperience(todayExp)

          // 오늘의 학습 목표 로드
          const userStats = await ApiClient.getUserStatistics(user.id)
          if (userStats) {
            setTodayGoal(userStats.todayGoal || 100)
          }
        } catch (error) {
          console.error("데이터 로드 실패:", error)
        }
      }
      loadData()
    }
  }, [user])

  const handleLogout = async () => {
    try {
      await signOutUser()
    } catch (error) {
      console.error("로그아웃 에러:", error)
    }
  }

  const handleDeleteAccount = async () => {
    // 탈퇴 기능 구현 (Firebase에서 사용자 삭제)
    try {
      // TODO: 실제 탈퇴 로직 구현
      console.log("탈퇴 기능 구현 필요")
    } catch (error) {
      console.error("탈퇴 에러:", error)
    }
  }

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

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      {/* 헤더 */}
      <header className='bg-white shadow-sm'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-4'>
            <div className='flex items-center space-x-4'>
              <Link href='/' className='text-blue-600 hover:text-blue-700'>
                <ArrowLeft className='h-5 w-5' />
              </Link>
              <h1 className='text-2xl font-bold text-gray-900'>마이페이지</h1>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='space-y-6'>
          {/* 사용자 정보 카드 */}
          <div className='bg-white rounded-lg shadow-lg p-6'>
            <div className='flex items-center space-x-4 mb-6'>
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || ""}
                  className='w-16 h-16 rounded-full'
                />
              ) : (
                <div className='w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center'>
                  <User className='h-8 w-8 text-white' />
                </div>
              )}
              <div>
                <h2 className='text-2xl font-bold text-gray-900'>
                  {user?.displayName || ""}
                </h2>
                <p className='text-gray-600'>{user?.email || ""}</p>
                {user?.isAdmin && (
                  <div className='flex items-center space-x-1 mt-1'>
                    <Crown className='h-4 w-4 text-yellow-500' />
                    <span className='text-sm text-yellow-600 font-semibold'>
                      관리자
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 레벨 정보 */}
            <div className='mb-10'>
              {/* 레벨 표시 */}
              <h3 className='text-lg font-semibold text-gray-900 mb-3'>
                레벨 {currentLevel}
              </h3>

              {/* 다음 레벨까지와 진행률 */}
              <div className='flex items-center justify-between text-sm text-gray-600 mb-3'>
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

            {/* 오늘의 학습 성과 */}
            <div className='bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100 mb-6'>
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
                  : `목표까지 ${todayGoal - todayExperience}EXP 남았어요! 🎯`}
              </p>
            </div>

            {/* 오늘의 학습 목표 설정 */}
            <div className='mb-6'>
              <h3 className='text-lg font-semibold text-gray-900 mb-3'>
                오늘의 학습 목표
              </h3>
              <p className='text-sm text-gray-600 mb-3'>
                오늘 획득할 경험치(EXP)를 설정해보세요. 목표를 달성하면 더 많은
                동기부여를 받을 수 있습니다.
              </p>
              <div className='flex items-center space-x-3'>
                <input
                  type='number'
                  value={todayGoal}
                  onChange={(e) => setTodayGoal(Number(e.target.value))}
                  className='px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium'
                  min='1'
                  max='1000'
                />
                <span className='text-sm text-gray-600'>EXP</span>
                <button
                  onClick={async () => {
                    if (user) {
                      try {
                        await ApiClient.updateTodayGoal(user.id, todayGoal)
                        alert(
                          `오늘의 학습 목표가 ${todayGoal}EXP로 설정되었습니다.`
                        )
                      } catch (error) {
                        console.error("오늘의 학습 목표 설정 실패:", error)
                      }
                    }
                  }}
                  className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
                >
                  목표 설정
                </button>
              </div>
            </div>

            {/* 선호 급수 설정 */}
            <div className='mb-6'>
              <h3 className='text-lg font-semibold text-gray-900 mb-3'>
                선호하는 급수
              </h3>
              <p className='text-sm text-gray-600 mb-3'>
                설정한 급수가 다른 페이지의 급수 선택에서 기본값으로 사용됩니다.
              </p>
              <div className='flex items-center space-x-3'>
                <select
                  value={user?.preferredGrade || 8}
                  onChange={async (e) => {
                    if (user) {
                      try {
                        await ApiClient.updateUserPreferredGrade(
                          user.id,
                          Number(e.target.value)
                        )
                        // 사용자 정보 새로고침
                        window.location.reload()
                      } catch (error) {
                        console.error("선호 급수 업데이트 실패:", error)
                      }
                    }
                  }}
                  className='px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium'
                >
                  {[8, 7, 6, 5.5, 5, 4.5, 4, 3.5, 3].map((grade) => (
                    <option key={grade} value={grade} className='font-medium'>
                      {grade === 5.5
                        ? "준5급"
                        : grade === 4.5
                        ? "준4급"
                        : grade === 3.5
                        ? "준3급"
                        : `${grade}급`}
                    </option>
                  ))}
                </select>
                <span className='text-sm text-gray-500'>
                  현재: {user?.preferredGrade || 8}급
                </span>
              </div>
            </div>

            {/* 관리자 버튼 */}
            {user?.isAdmin && (
              <div className='mb-6 space-y-3'>
                <Link
                  href='/admin'
                  className='inline-flex items-center space-x-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors'
                >
                  <Settings className='h-4 w-4' />
                  <span>관리자 페이지</span>
                </Link>

                <button
                  onClick={async () => {
                    try {
                      await ApiClient.ensureAllUsersHavePreferredGrade()
                      alert(
                        "모든 사용자에게 기본 선호 급수(8급) 설정이 완료되었습니다."
                      )
                    } catch (error) {
                      console.error("마이그레이션 실패:", error)
                      alert("마이그레이션에 실패했습니다.")
                    }
                  }}
                  className='inline-flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors'
                >
                  <Settings className='h-4 w-4' />
                  <span>사용자 선호 급수 마이그레이션</span>
                </button>

                <button
                  onClick={async () => {
                    try {
                      await ApiClient.syncAllUserStatisticsTotalExperience()
                      alert("모든 사용자의 총 경험치 동기화가 완료되었습니다.")
                    } catch (error) {
                      console.error("총 경험치 동기화 실패:", error)
                      alert("총 경험치 동기화에 실패했습니다.")
                    }
                  }}
                  className='inline-flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors'
                >
                  <Settings className='h-4 w-4' />
                  <span>총 경험치 동기화</span>
                </button>
              </div>
            )}

            {/* 계정 관리 버튼 */}
            <div className='space-y-3'>
              <button
                onClick={() => setShowLogoutModal(true)}
                className='w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors'
              >
                <LogOut className='h-4 w-4' />
                <span>로그아웃</span>
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className='w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors'
              >
                <Trash2 className='h-4 w-4' />
                <span>탈퇴하기</span>
              </button>
            </div>
          </div>

          {/* 통계 링크 */}
          <div className='bg-white rounded-lg shadow-lg p-6'>
            <h3 className='text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2'>
              <BarChart3 className='h-5 w-5' />
              <span>통계 보기</span>
            </h3>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <Link
                href='/profile/statistics/game'
                className='p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-center'
              >
                <div className='text-lg font-semibold text-blue-600 mb-2'>
                  게임별 통계
                </div>
                <div className='text-sm text-gray-600'>
                  각 게임의 성과를 확인하세요
                </div>
              </Link>
              <Link
                href='/profile/statistics/detail'
                className='p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-center'
              >
                <div className='text-lg font-semibold text-green-600 mb-2'>
                  상세 통계
                </div>
                <div className='text-sm text-gray-600'>
                  레벨과 학습 기록을 확인하세요
                </div>
              </Link>
              <Link
                href='/profile/statistics/hanzi'
                className='p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-center'
              >
                <div className='text-lg font-semibold text-purple-600 mb-2'>
                  한자별 통계
                </div>
                <div className='text-sm text-gray-600'>
                  각 한자의 학습 현황을 확인하세요
                </div>
              </Link>
            </div>
          </div>

          {/* 게임별 통계 요약 */}
          {gameStatistics && (
            <div className='bg-white rounded-lg shadow-lg p-6'>
              <h3 className='text-xl font-semibold text-gray-900 mb-4'>
                게임별 통계 요약
              </h3>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
                {Object.entries(gameStatistics).map(([gameType, stats]) => (
                  <div
                    key={gameType}
                    className='p-4 bg-gray-50 rounded-lg text-center'
                  >
                    <div className='text-lg font-semibold text-gray-900 mb-2'>
                      {gameType === "memory"
                        ? "카드 뒤집기"
                        : gameType === "quiz"
                        ? "퀴즈"
                        : gameType === "writing"
                        ? "쓰기 연습"
                        : "부분 맞추기"}
                    </div>
                    <div className='text-sm text-gray-600'>
                      {gameType === "memory" ? "총 게임: " : "총 문제: "}
                      {stats.totalPlayed}
                      {gameType === "memory" ? "회" : "개"}
                    </div>
                    <div className='text-sm text-gray-600'>
                      정답률: {Math.round(stats.accuracy)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 최근 학습 기록 */}
          {learningSessions.length > 0 && (
            <div className='bg-white rounded-lg shadow-lg p-6'>
              <h3 className='text-xl font-semibold text-gray-900 mb-4'>
                최근 학습 기록
              </h3>
              <div className='space-y-3'>
                {learningSessions.slice(0, 5).map((session) => (
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

      {/* 로그아웃 확인 모달 */}
      <ConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        title='로그아웃'
        message='정말 로그아웃하시겠습니까?'
        confirmText='로그아웃'
        cancelText='취소'
        type='warning'
      />

      {/* 탈퇴 확인 모달 */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        title='계정 탈퇴'
        message='정말 계정을 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
        confirmText='탈퇴하기'
        cancelText='취소'
        type='warning'
      />
    </div>
  )
}
