"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Flame } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useModal } from "@/contexts/ModalContext"
import { ApiClient, getKSTDateISO } from "@/lib/apiClient"
import { CustomSelect } from "@/components/ui/CustomSelect"
import { CustomInput } from "@/components/ui/CustomInput"
import { CustomButton } from "@/components/ui/CustomButton"
import { addDaysISO } from "@/lib/statistics/periodStats"
import { UserStatistics } from "@/types"
import { AdminPageSkeleton } from "@/components/Skeleton"

type AdminUser = {
  id: string
  displayName?: string
  email?: string
}

type GoalHistoryRecord = {
  date: string
  achieved: boolean
  experience: number
  goal?: number
}

/** 연속 달성일이 재계산되어도 유지되도록 history를 N일 연속 달성 상태로 맞춤 */
function buildHistoryForStreak(
  history: GoalHistoryRecord[] | undefined,
  targetDays: number,
  defaultGoal: number
): GoalHistoryRecord[] {
  const map = new Map<string, GoalHistoryRecord>()
  ;(history || []).forEach((r) => map.set(r.date, { ...r }))

  const today = getKSTDateISO()
  const yesterday = addDaysISO(today, -1)
  const goal = defaultGoal > 0 ? defaultGoal : 100

  if (targetDays <= 0) {
    for (const d of [today, yesterday]) {
      const existing = map.get(d)
      if (existing) {
        map.set(d, { ...existing, achieved: false })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
  }

  for (let i = 0; i < targetDays; i++) {
    const date = addDaysISO(today, -i)
    const existing = map.get(date)
    const dayGoal = existing?.goal && existing.goal > 0 ? existing.goal : goal
    const experience = Math.max(existing?.experience ?? 0, dayGoal)
    map.set(date, {
      date,
      achieved: true,
      experience,
      goal: dayGoal,
    })
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}

export default function AdminStreakPage() {
  const { user, loading: authLoading, initialLoading } = useAuth()
  const { alert: showAlert, confirm: showConfirm } = useModal()
  const router = useRouter()

  const [users, setUsers] = useState<AdminUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [stats, setStats] = useState<UserStatistics | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [streakInput, setStreakInput] = useState("0")
  const [saving, setSaving] = useState(false)

  const loading = initialLoading || authLoading

  useEffect(() => {
    if (!loading && (!user || !user.isAdmin)) {
      router.push("/")
    }
  }, [user, loading, router])

  const loadUsers = useCallback(async () => {
    if (!user?.isAdmin) return
    setLoadingUsers(true)
    try {
      const res = await fetch("/api/admin/users")
      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || "사용자 목록 로드 실패")
      }
      setUsers(data.users || [])
    } catch (error) {
      console.error(error)
      showAlert("사용자 목록을 불러오지 못했습니다.", { type: "error" })
    } finally {
      setLoadingUsers(false)
    }
  }, [user?.isAdmin, showAlert])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const userOptions = useMemo(
    () =>
      users.map((u) => ({
        value: u.id,
        label: u.displayName?.trim()
          ? `${u.displayName}${u.email ? ` (${u.email})` : ""}`
          : u.email || u.id,
      })),
    [users]
  )

  const selectedUser = users.find((u) => u.id === selectedUserId) || null

  const loadStats = useCallback(
    async (userId: string) => {
      if (!userId) {
        setStats(null)
        setStreakInput("0")
        return
      }
      setLoadingStats(true)
      try {
        let userStats = await ApiClient.getUserStatistics(userId)
        if (!userStats) {
          await ApiClient.initializeUserStatistics(userId)
          userStats = await ApiClient.getUserStatistics(userId)
        }
        setStats(userStats)
        setStreakInput(String(userStats?.consecutiveGoalDays ?? 0))
      } catch (error) {
        console.error(error)
        showAlert("학습 통계를 불러오지 못했습니다.", { type: "error" })
        setStats(null)
      } finally {
        setLoadingStats(false)
      }
    },
    [showAlert]
  )

  useEffect(() => {
    if (selectedUserId) {
      loadStats(selectedUserId)
    } else {
      setStats(null)
      setStreakInput("0")
    }
  }, [selectedUserId, loadStats])

  const handleSave = async () => {
    if (!selectedUserId || !stats?.id) {
      showAlert("사용자를 먼저 선택해 주세요.", { type: "warning" })
      return
    }

    const next = Number.parseInt(streakInput, 10)
    if (!Number.isFinite(next) || next < 0) {
      showAlert("0 이상의 정수로 입력해 주세요.", { type: "warning" })
      return
    }
    if (next > 3650) {
      showAlert("연속 달성일은 3650일 이하로 설정해 주세요.", {
        type: "warning",
      })
      return
    }

    const name =
      selectedUser?.displayName?.trim() ||
      selectedUser?.email ||
      selectedUserId
    const ok = await showConfirm(
      `${name}님의 연속 목표 달성일을 ${stats.consecutiveGoalDays ?? 0}일 → ${next}일로 변경할까요?\n\n목표 달성 기록(history)도 함께 맞춰서, 다음 학습 후에도 값이 유지됩니다.`,
      { title: "연속 달성일 수정", confirmText: "저장", cancelText: "취소" }
    )
    if (!ok) return

    setSaving(true)
    try {
      const defaultGoal = stats.todayGoal && stats.todayGoal > 0 ? stats.todayGoal : 100
      const newHistory = buildHistoryForStreak(
        stats.goalAchievementHistory,
        next,
        defaultGoal
      )

      const updatePayload: Record<string, unknown> = {
        consecutiveGoalDays: next,
        goalAchievementHistory: newHistory,
        updatedAt: new Date().toISOString(),
      }

      // 수동 조정 구간이 reset 필터에 잘리지 않도록
      if (stats.consecutiveDaysResetAt) {
        updatePayload.consecutiveDaysResetAt = null
      }

      // 보너스 지급 기준이 새 연속일보다 크면 낮춰서 상태 꼬임 방지
      const lastGiven = stats.lastConsecutiveDaysBonusGiven ?? 0
      if (lastGiven > next) {
        updatePayload.lastConsecutiveDaysBonusGiven = next
      }

      await ApiClient.updateDocument("userStatistics", stats.id, updatePayload)

      const refreshed = await ApiClient.getUserStatistics(selectedUserId)
      setStats(refreshed)
      setStreakInput(String(refreshed?.consecutiveGoalDays ?? next))
      showAlert(`연속 목표 달성일을 ${next}일로 저장했습니다.`, {
        type: "success",
      })
    } catch (error) {
      console.error(error)
      showAlert("저장에 실패했습니다.", { type: "error" })
    } finally {
      setSaving(false)
    }
  }

  if (loading || loadingUsers) {
    return <AdminPageSkeleton />
  }

  if (!user?.isAdmin) {
    return null
  }

  return (
    <div className='min-h-screen bg-slate-50'>
      <header className='sticky top-0 z-10 bg-white border-b border-slate-200'>
        <div className='max-w-2xl mx-auto px-4 py-4 flex items-center gap-3'>
          <Link
            href='/admin'
            className='inline-flex items-center justify-center p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-100'
            aria-label='관리자 홈'
          >
            <ArrowLeft className='h-5 w-5' />
          </Link>
          <div>
            <h1 className='text-lg font-bold text-gray-900'>연속 달성일 조정</h1>
            <p className='text-xs text-slate-500'>
              이름으로 사용자를 선택해 연속 목표 달성일을 수기로 수정합니다
            </p>
          </div>
        </div>
      </header>

      <main className='max-w-2xl mx-auto px-4 py-6 space-y-5 pb-12'>
        <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4'>
          <div className='flex items-center gap-2'>
            <Flame className='h-4 w-4 text-orange-500' />
            <h2 className='font-bold text-gray-900'>사용자 선택</h2>
          </div>
          <CustomSelect
            value={selectedUserId}
            onChange={setSelectedUserId}
            options={userOptions}
            placeholder='이름을 검색·선택하세요'
            searchable
            searchPlaceholder='이름 또는 이메일 검색…'
            aria-label='사용자 선택'
            className='w-full'
          />
        </section>

        {selectedUserId && (
          <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4'>
            <h2 className='font-bold text-gray-900'>연속 목표 달성일</h2>

            {loadingStats ? (
              <p className='text-sm text-slate-500'>통계 불러오는 중…</p>
            ) : (
              <>
                <div className='rounded-xl bg-orange-50 border border-orange-100 p-4'>
                  <div className='text-xs text-orange-700 mb-1'>현재 값</div>
                  <div className='text-2xl font-bold text-orange-800 tabular-nums'>
                    {stats?.consecutiveGoalDays ?? 0}
                    <span className='text-base font-semibold ml-1'>일</span>
                  </div>
                  <div className='text-xs text-orange-700/80 mt-2'>
                    {selectedUser?.displayName || "이름 없음"}
                    {selectedUser?.email ? ` · ${selectedUser.email}` : ""}
                  </div>
                </div>

                <CustomInput
                  type='number'
                  label='변경할 연속 달성일'
                  value={streakInput}
                  min={0}
                  max={3650}
                  onChange={(e) => setStreakInput(e.target.value)}
                  suffix='일'
                />

                <p className='text-xs text-slate-500 leading-relaxed'>
                  저장 시 오늘부터 역으로 N일이 목표 달성으로 기록되어, 다음
                  학습 후에도 연속일이 유지됩니다. 0으로 두면 오늘·어제 달성이
                  해제됩니다.
                </p>

                <CustomButton
                  variant='primary'
                  fullWidth
                  loading={saving}
                  onClick={handleSave}
                  disabled={!stats?.id}
                >
                  저장
                </CustomButton>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
