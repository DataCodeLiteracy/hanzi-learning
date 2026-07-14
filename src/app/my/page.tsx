"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import { MyPageSkeleton } from "@/components/Skeleton"
import ConfirmModal from "@/components/ConfirmModal"
import { CustomButton } from "@/components/ui/CustomButton"
import { useModal } from "@/contexts/ModalContext"
import Image from "next/image"
import Link from "next/link"
import { useState, useEffect, type ReactNode } from "react"
import {
  ArrowLeft,
  User,
  BarChart3,
  MessageSquare,
  ChevronRight,
  TrendingUp,
  Settings,
  Crown,
  LogOut,
  Trash2,
} from "lucide-react"
import {
  calculateLevelProgress,
  calculateExperienceToNextLevel,
  calculateRequiredExperience,
} from "@/lib/experienceSystem"
import { formatGradeLabel } from "@/lib/gradeLabels"
import { ApiClient } from "@/lib/apiClient"
import {
  GameStatisticsService,
  GameStatistics,
} from "@/lib/services/gameStatisticsService"

const formatStudyTime = (seconds: number): string => {
  if (seconds === 0) return "0분"
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`
}

function MenuRow({
  href,
  icon,
  title,
  subtitle,
  accent,
}: {
  href: string
  icon: ReactNode
  title: string
  subtitle: string
  accent: string
}) {
  return (
    <Link
      href={href}
      className='flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors group'
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent}`}
      >
        {icon}
      </div>
      <div className='flex-1 min-w-0'>
        <div className='font-semibold text-gray-900'>{title}</div>
        <div className='text-sm text-gray-500 truncate'>{subtitle}</div>
      </div>
      <ChevronRight className='h-5 w-5 text-gray-300 group-hover:text-gray-400 shrink-0' />
    </Link>
  )
}

export default function ProfilePage() {
  const { user, initialLoading, isAuthenticated, signOutUser } = useAuth()
  const { learningSessions } = useData()
  const { alert: showAlert } = useModal()
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const [gameStatistics, setGameStatistics] = useState<Record<
    string,
    GameStatistics
  > | null>(null)
  const [todayExperience, setTodayExperience] = useState(0)
  const [todayGoal, setTodayGoal] = useState(100)
  const [consecutiveGoalDays, setConsecutiveGoalDays] = useState(0)
  const [weeklyGoalAchievement, setWeeklyGoalAchievement] = useState({
    achievedDays: 0,
    totalDays: 7,
  })
  const [totalStudyTime, setTotalStudyTime] = useState(0)

  const currentLevel = user?.level || 1
  const currentExperience = user?.experience || 0
  const levelProgress = calculateLevelProgress(currentExperience)
  const expToNextLevel = calculateExperienceToNextLevel(currentExperience)

  useEffect(() => {
    if (!user) return
    const loadData = async () => {
      try {
        await ApiClient.checkAndResetTodayExperience(user.id)
        const stats = await GameStatisticsService.getGameStatistics(user.id)
        setGameStatistics(stats)
        const todayExp = await ApiClient.getTodayExperience(user.id)
        setTodayExperience(todayExp)
        const userStats = await ApiClient.getUserStatistics(user.id)
        if (userStats) {
          setTodayGoal(userStats.todayGoal || 100)
          setTotalStudyTime(userStats.totalStudyTime || 0)
          const history = userStats.goalAchievementHistory || []
          const effectiveHistory = userStats.consecutiveDaysResetAt
            ? history.filter((r) => r.date > userStats.consecutiveDaysResetAt!)
            : history
          setConsecutiveGoalDays(
            ApiClient.calculateConsecutiveGoalDays(effectiveHistory)
          )
          const weekly = ApiClient.calculateWeeklyGoalAchievement(history)
          setWeeklyGoalAchievement({
            achievedDays: weekly.achievedDays,
            totalDays: weekly.totalDays,
          })
        }
      } catch (error) {
        console.error("데이터 로드 실패:", error)
      }
    }
    loadData()
  }, [user])

  if (initialLoading) {
    return <MyPageSkeleton />
  }

  if (isAuthenticated && !user) {
    return (
      <div className='min-h-screen bg-slate-50 flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-xl font-bold text-gray-900 mb-3'>
            로그인이 필요합니다
          </h1>
          <Link href='/' className='text-blue-600 hover:text-blue-700'>
            홈으로
          </Link>
        </div>
      </div>
    )
  }

  const gameTypeLabel = (type: string) =>
    type === "memory"
      ? "카드 뒤집기"
      : type === "quiz"
      ? "퀴즈"
      : type === "writing"
      ? "쓰기 연습"
      : "부분 맞추기"

  return (
    <div className='min-h-screen bg-slate-50'>
      <header className='bg-white border-b border-slate-100'>
        <div className='max-w-2xl mx-auto px-4 py-4 flex items-center gap-3'>
          <Link
            href='/'
            className='p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100'
          >
            <ArrowLeft className='h-5 w-5' />
          </Link>
          <h1 className='text-lg font-bold text-gray-900'>마이페이지</h1>
        </div>
      </header>

      <main className='max-w-2xl mx-auto px-4 py-6 space-y-5 pb-12'>
        {/* 프로필 요약 */}
        <div className='rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,23,42,0.06)] p-5'>
          <div className='flex items-center gap-4 mb-5'>
            {user?.photoURL ? (
              <Image
                src={user.photoURL}
                alt=''
                width={64}
                height={64}
                className='w-16 h-16 rounded-2xl object-cover ring-2 ring-white shadow'
                unoptimized
              />
            ) : (
              <div className='w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow'>
                <User className='h-8 w-8 text-white' />
              </div>
            )}
            <div className='min-w-0 flex-1'>
              <h2 className='text-xl font-bold text-gray-900 truncate'>
                {user?.displayName || "학습자"}
              </h2>
              <p className='text-sm text-gray-500 truncate'>{user?.email}</p>
              <div className='flex flex-wrap items-center gap-2 mt-1.5'>
                <span className='text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700'>
                  {formatGradeLabel(user?.preferredGrade || 8)}
                </span>
                {user?.isAdmin && (
                  <span className='inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700'>
                    <Crown className='h-3 w-3' />
                    관리자
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className='mb-1 flex justify-between text-sm'>
            <span className='font-semibold text-gray-800'>
              레벨 {currentLevel}
            </span>
            <span className='text-gray-500'>
              다음까지 {expToNextLevel} EXP
            </span>
          </div>
          <div className='w-full bg-slate-100 rounded-full h-2.5 mb-1'>
            <div
              className='bg-blue-600 h-2.5 rounded-full transition-all'
              style={{ width: `${levelProgress * 100}%` }}
            />
          </div>
          <div className='flex justify-between text-xs text-gray-400'>
            <span>{calculateRequiredExperience(currentLevel)}</span>
            <span className='font-medium text-blue-600'>
              {currentExperience} EXP
            </span>
            <span>{calculateRequiredExperience(currentLevel + 1)}</span>
          </div>
        </div>

        {/* 오늘 학습 */}
        <div className='rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,23,42,0.06)] p-5'>
          <div className='flex items-center gap-2 mb-3'>
            <TrendingUp className='h-4 w-4 text-blue-600' />
            <h3 className='font-bold text-gray-900'>오늘의 학습</h3>
          </div>
          <div className='flex items-baseline gap-2 mb-3'>
            <span className='text-3xl font-extrabold text-blue-600'>
              {todayExperience}
            </span>
            <span className='text-sm text-gray-500'>/ {todayGoal} EXP</span>
          </div>
          <div className='w-full bg-slate-100 rounded-full h-2 mb-4'>
            <div
              className='bg-blue-600 h-2 rounded-full transition-all'
              style={{
                width: `${Math.min(100, (todayExperience / todayGoal) * 100)}%`,
              }}
            />
          </div>
          <div className='grid grid-cols-3 gap-2 text-center'>
            <div className='rounded-xl bg-green-50 py-2.5 px-1'>
              <div className='text-lg font-bold text-green-600'>
                {consecutiveGoalDays}일
              </div>
              <div className='text-[11px] text-gray-500'>연속 달성</div>
            </div>
            <div className='rounded-xl bg-purple-50 py-2.5 px-1'>
              <div className='text-lg font-bold text-purple-600'>
                {weeklyGoalAchievement.achievedDays}/
                {weeklyGoalAchievement.totalDays}
              </div>
              <div className='text-[11px] text-gray-500'>이번주</div>
            </div>
            <div className='rounded-xl bg-orange-50 py-2.5 px-1'>
              <div className='text-lg font-bold text-orange-600 text-sm leading-tight pt-0.5'>
                {formatStudyTime(totalStudyTime)}
              </div>
              <div className='text-[11px] text-gray-500'>누적 시간</div>
            </div>
          </div>
        </div>

        {/* 메뉴 허브 */}
        <div className='rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,23,42,0.06)] divide-y divide-slate-100'>
          <MenuRow
            href='/my/profile'
            icon={<Settings className='h-5 w-5 text-blue-600' />}
            title='프로필 정보'
            subtitle='이름, 출생년도, 급수, 학습 목표'
            accent='bg-blue-50'
          />
          <MenuRow
            href='/my/statistics'
            icon={<BarChart3 className='h-5 w-5 text-indigo-600' />}
            title='학습 통계'
            subtitle='기간별 목표·학습 현황'
            accent='bg-indigo-50'
          />
          <MenuRow
            href='/my/feedback'
            icon={<MessageSquare className='h-5 w-5 text-emerald-600' />}
            title='고객 지원'
            subtitle='불편사항 및 개선 제안'
            accent='bg-emerald-50'
          />
        </div>

        {/* 게임 통계 요약 */}
        {gameStatistics && Object.keys(gameStatistics).length > 0 && (
          <div className='rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,23,42,0.06)] p-5'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='font-bold text-gray-900'>게임 요약</h3>
              <Link
                href='/my/statistics/game'
                className='text-xs font-medium text-blue-600 hover:text-blue-700'
              >
                자세히 →
              </Link>
            </div>
            <div className='grid grid-cols-2 gap-3'>
              {Object.entries(gameStatistics).slice(0, 4).map(([type, stats]) => (
                <div
                  key={type}
                  className='rounded-xl bg-slate-50 p-3 text-center border border-slate-100'
                >
                  <div className='text-sm font-semibold text-gray-800 mb-1'>
                    {gameTypeLabel(type)}
                  </div>
                  <div className='text-xs text-gray-500'>
                    정답률 {Math.round(stats.accuracy)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 최근 학습 */}
        {learningSessions.length > 0 && (
          <div className='rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,23,42,0.06)] p-5'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='font-bold text-gray-900'>최근 학습</h3>
              <Link
                href='/my/statistics'
                className='text-xs font-medium text-blue-600 hover:text-blue-700'
              >
                전체 →
              </Link>
            </div>
            <div className='space-y-2'>
              {learningSessions.slice(0, 3).map((session) => (
                <div
                  key={session.id}
                  className='flex items-center justify-between py-2.5 px-3 rounded-xl bg-slate-50'
                >
                  <span className='text-sm font-medium text-gray-800'>
                    {gameTypeLabel(session.gameType)}
                  </span>
                  <div className='text-right'>
                    <div className='text-sm font-bold text-gray-900'>
                      {session.score}점
                    </div>
                    <div className='text-[11px] text-gray-400'>
                      {new Date(session.createdAt).toLocaleDateString("ko-KR")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 계정 */}
        <div className='rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,23,42,0.06)] p-5 space-y-3'>
          {user?.isAdmin && (
            <Link
              href='/admin'
              className='flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors shadow-sm'
            >
              <Crown className='h-4 w-4' />
              관리자 페이지
            </Link>
          )}
          <CustomButton
            variant='ghost'
            fullWidth
            icon={<LogOut className='h-4 w-4' />}
            onClick={() => setShowLogoutModal(true)}
            className='!bg-gray-100 !text-gray-700 hover:!bg-gray-200 focus:ring-gray-400'
          >
            로그아웃
          </CustomButton>
          {user?.isAdmin && (
            <CustomButton
              variant='danger'
              fullWidth
              icon={<Trash2 className='h-4 w-4' />}
              onClick={() => setShowDeleteModal(true)}
            >
              탈퇴하기
            </CustomButton>
          )}
        </div>
      </main>

      <ConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => {
          setShowLogoutModal(false)
          void signOutUser()
        }}
        title='로그아웃'
        message='정말 로그아웃하시겠습니까?'
        confirmText='로그아웃'
        cancelText='취소'
        type='warning'
      />
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          setShowDeleteModal(false)
          showAlert("탈퇴 기능은 준비 중입니다.", { type: "info" })
        }}
        title='계정 탈퇴'
        message='정말 계정을 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
        confirmText='탈퇴하기'
        cancelText='취소'
        type='warning'
      />
    </div>
  )
}
