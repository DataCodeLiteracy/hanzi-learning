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
  MessageSquare,
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import {
  calculateLevelProgress,
  calculateExperienceToNextLevel,
  calculateRequiredExperience,
} from "@/lib/experienceSystem"

// 학습시간 포맷팅 함수
const formatStudyTime = (seconds: number): string => {
  if (seconds === 0) return "0분"

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}시간 ${minutes}분`
  } else {
    return `${minutes}분`
  }
}
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
  const { userStatistics, learningSessions, clearIndexedDB } = useData()
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [gameStatistics, setGameStatistics] = useState<Record<
    string,
    GameStatistics
  > | null>(null)
  const [todayExperience, setTodayExperience] = useState<number>(0)
  const [todayGoal, setTodayGoal] = useState<number>(100)
  const [inputGoal, setInputGoal] = useState<string>("100") // string으로 변경
  const [isEditingGoal, setIsEditingGoal] = useState<boolean>(false) // 편집 모드 상태
  const [consecutiveGoalDays, setConsecutiveGoalDays] = useState<number>(0)
  const [weeklyGoalAchievement, setWeeklyGoalAchievement] = useState<{
    achievedDays: number
    totalDays: number
  }>({ achievedDays: 0, totalDays: 7 }) // 0/7로 시작
  const [totalStudyTime, setTotalStudyTime] = useState<number>(0) // 총 학습시간 (초 단위)

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
            const goal = userStats.todayGoal || 100
            setTodayGoal(goal)
            setInputGoal(goal.toString()) // inputGoal도 함께 설정
            setConsecutiveGoalDays(userStats.consecutiveGoalDays || 0)
            setTotalStudyTime(userStats.totalStudyTime || 0)
            if (userStats.weeklyGoalAchievement) {
              setWeeklyGoalAchievement({
                achievedDays: userStats.weeklyGoalAchievement.achievedDays || 0,
                totalDays: userStats.weeklyGoalAchievement.totalDays || 0,
              })
            }
          }
        } catch (error) {
          console.error("데이터 로드 실패:", error)
        }
      }
      loadData()
    }
  }, [user])

  // 목표 설정 핸들러
  const handleGoalSubmit = async () => {
    if (user && inputGoal !== todayGoal.toString()) {
      try {
        await ApiClient.updateTodayGoal(user.id, Number(inputGoal))
        setTodayGoal(Number(inputGoal)) // 성공 시에만 todayGoal 업데이트
        setIsEditingGoal(false) // 편집 모드 종료
        alert(`오늘의 학습 목표가 ${inputGoal}EXP로 설정되었습니다.`)
      } catch (error) {
        console.error("오늘의 학습 목표 설정 실패:", error)
        // 실패 시 원래 값으로 복원
        setInputGoal(todayGoal.toString())
      }
    }
  }

  // 목표 편집 취소
  const handleGoalCancel = () => {
    setInputGoal(todayGoal.toString()) // 원래 값으로 복원
    setIsEditingGoal(false) // 편집 모드 종료
  }

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
    <div
      className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'
      style={{ scrollBehavior: "smooth" }}
    >
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
          <div className='bg-white rounded-lg shadow-lg p-3'>
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

              {/* 목표 달성 통계 */}
              <div className='mt-3 pt-3 border-t border-blue-200'>
                <div className='flex justify-around items-center'>
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
                  {/* 누적 공부 시간 */}
                  <div className='text-center'>
                    <div className='text-lg font-bold text-orange-600'>
                      {formatStudyTime(totalStudyTime)}
                    </div>
                    <div className='text-xs text-gray-600'>누적 공부 시간</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 오늘의 학습 목표 설정 */}
            <div className='mb-6' id='study-goal'>
              <h3 className='text-lg font-semibold text-gray-900 mb-3'>
                오늘의 학습 목표
              </h3>
              <p className='text-sm text-gray-600 mb-3'>
                오늘 획득할 경험치(EXP)를 설정해보세요. 목표를 달성하면 더 많은
                동기부여를 받을 수 있습니다.
              </p>

              {isEditingGoal ? (
                // 편집 모드
                <div className='flex items-center space-x-3'>
                  <input
                    type='number'
                    value={inputGoal}
                    onChange={(e) => setInputGoal(e.target.value)}
                    className='px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium'
                    min='1'
                    max='1000'
                    autoFocus
                  />
                  <span className='text-sm text-gray-600'>EXP</span>
                  <button
                    onClick={async () => {
                      if (user) {
                        try {
                          const goalValue = parseInt(inputGoal) || 0 // 빈 문자열일 때 0
                          const finalGoal = goalValue <= 0 ? 100 : goalValue // 0 이하일 때 기본값 100
                          await ApiClient.updateTodayGoal(user.id, finalGoal)
                          setTodayGoal(finalGoal)
                          setInputGoal(finalGoal.toString())
                          alert(
                            `오늘의 학습 목표가 ${finalGoal}EXP로 설정되었습니다.`
                          )
                        } catch (error) {
                          console.error("오늘의 학습 목표 설정 실패:", error)
                        }
                      }
                    }}
                    className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
                  >
                    저장
                  </button>
                  <button
                    onClick={handleGoalCancel}
                    className='px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors'
                  >
                    취소
                  </button>
                </div>
              ) : (
                // 표시 모드
                <div className='flex items-center space-x-3'>
                  <div className='px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-900 font-medium'>
                    {todayGoal} EXP
                  </div>
                  <button
                    onClick={() => setIsEditingGoal(true)}
                    className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
                  >
                    수정
                  </button>
                </div>
              )}
            </div>

            {/* 학습 중인 급수 설정 */}
            <div className='mb-6' id='learning-grade'>
              <h3 className='text-lg font-semibold text-gray-900 mb-3'>
                학습 중인 급수
              </h3>
              <p className='text-sm text-gray-600 mb-3'>
                현재 학습하고 있는 급수를 설정하세요. 모든 게임에서 이 급수의
                한자로 문제가 출제됩니다.
              </p>
              <div className='flex items-center space-x-3'>
                <select
                  value={user?.preferredGrade || 8}
                  onChange={async (e) => {
                    console.log("🔍 급수 변경 시작 - onChange 이벤트 발생")
                    if (user) {
                      console.log("🔍 사용자 존재 확인:", user.id)
                      try {
                        const newGrade = Number(e.target.value)
                        console.log("🔍 새로운 급수:", newGrade)
                        console.log("🔍 기존 급수:", user.preferredGrade)
                        console.debug(
                          `🔄 Changing preferred grade from ${user.preferredGrade} to ${newGrade}`
                        )

                        // IndexedDB 클리어
                        await clearIndexedDB()

                        // 사용자 선호 급수 업데이트
                        await ApiClient.updateUserPreferredGrade(
                          user.id,
                          newGrade
                        )

                        console.debug(
                          "✅ Preferred grade updated, loading new grade data..."
                        )

                        // 새로운 급수 데이터를 IndexedDB에 저장
                        try {
                          console.warn(
                            "⚠️ 마이페이지 - 급수 변경으로 Firebase API 호출 시작!"
                          )
                          console.warn(
                            `🔥 Firebase hanzi 컬렉션 읽기 발생: ${newGrade}급`
                          )
                          console.debug(
                            "📥 Loading new grade data for IndexedDB..."
                          )

                          const newGradeData = await ApiClient.getHanziByGrade(
                            newGrade
                          )

                          console.warn(
                            `✅ Firebase API 호출 완료: ${newGradeData.length}개 문서 읽기`
                          )
                          console.debug("✅ New grade data loaded:", {
                            grade: newGrade,
                            charactersCount: newGradeData.length,
                            sampleCharacters: newGradeData
                              .slice(0, 3)
                              .map((h) => ({
                                character: h.character,
                                meaning: h.meaning,
                                sound: h.sound,
                              })),
                          })

                          // IndexedDB에 새로운 데이터 저장
                          if (
                            typeof window !== "undefined" &&
                            window.indexedDB
                          ) {
                            const request = window.indexedDB.open("hanziDB", 1)

                            request.onsuccess = () => {
                              const db = request.result
                              const transaction = db.transaction(
                                ["hanziStore"],
                                "readwrite"
                              )
                              const store =
                                transaction.objectStore("hanziStore")

                              const newData = {
                                grade: newGrade,
                                lastUpdated: new Date().toISOString(),
                                data: newGradeData,
                              }

                              const putRequest = store.put(
                                newData,
                                "currentHanziData"
                              )

                              putRequest.onsuccess = () => {
                                console.debug(
                                  "✅ New grade data saved to IndexedDB!"
                                )
                                console.debug("📦 Saved data:", {
                                  grade: newData.grade,
                                  charactersCount: newData.data.length,
                                  lastUpdated: newData.lastUpdated,
                                })
                                // 페이지 새로고침 없이 메인페이지로 이동
                                window.location.href = "/"
                              }

                              putRequest.onerror = () => {
                                console.error(
                                  "❌ Failed to save new grade data:",
                                  putRequest.error
                                )
                                // 에러가 발생해도 메인페이지로 이동
                                window.location.href = "/"
                              }
                            }

                            request.onerror = () => {
                              console.error(
                                "❌ Failed to open IndexedDB:",
                                request.error
                              )
                              // IndexedDB 열기 실패해도 메인페이지로 이동
                              window.location.href = "/"
                            }
                          } else {
                            console.warn(
                              "⚠️ IndexedDB not available, redirecting to main page"
                            )
                            window.location.href = "/"
                          }
                        } catch (error) {
                          console.error(
                            "❌ Failed to load new grade data:",
                            error
                          )
                          // API 호출 실패해도 메인페이지로 이동
                          window.location.href = "/"
                        }
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
                  현재 학습 중:{" "}
                  {user?.preferredGrade === 5.5
                    ? "준5급"
                    : user?.preferredGrade === 4.5
                    ? "준4급"
                    : user?.preferredGrade === 3.5
                    ? "준3급"
                    : `${user?.preferredGrade || 8}급`}
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
                        "모든 사용자에게 기본 학습 급수(8급) 설정이 완료되었습니다."
                      )
                    } catch (error) {
                      console.error("마이그레이션 실패:", error)
                      alert("마이그레이션에 실패했습니다.")
                    }
                  }}
                  className='inline-flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors'
                >
                  <Settings className='h-4 w-4' />
                  <span>사용자 학습 급수 마이그레이션</span>
                </button>
              </div>
            )}

            {/* 고객 게시판 */}
            <div className='mb-6'>
              <h3 className='text-lg font-semibold text-gray-900 mb-3'>
                고객 지원
              </h3>
              <p className='text-sm text-gray-600 mb-3'>
                불편사항이나 개선사항을 알려주세요. 더 나은 서비스를 만들기 위해
                노력하겠습니다.
              </p>
              <Link
                href='/profile/feedback'
                className='inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
              >
                <MessageSquare className='h-4 w-4' />
                <span>고객 게시판</span>
              </Link>
            </div>

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
