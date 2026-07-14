"use client"

import { useAuth } from "@/contexts/AuthContext"
import { StatsContentSkeleton } from "./StatsContentSkeleton"
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Target,
  Trophy,
  Clock,
  Layers,
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect, useMemo } from "react"
import {
  calculateLevelProgress,
  calculateExperienceToNextLevel,
} from "@/lib/experienceSystem"
import { ApiClient, getKSTDateISO } from "@/lib/apiClient"
import { UserStatistics } from "@/types"
import { CustomInput } from "@/components/ui/CustomInput"
import {
  PeriodView,
  PeriodSummary,
  DayInfo,
  buildHistoryMap,
  getDayInfo,
  computePeriodSummary,
  buildMonthCalendarGrid,
  getMonthRange,
  getWeekRange,
  getMondayOfWeek,
  addDaysISO,
  formatWeekLabel,
  shiftMonth,
  listMonthsInRange,
  formatDateRangeLabel,
} from "@/lib/statistics/periodStats"

const formatStudyTime = (seconds: number): string => {
  if (!seconds) return "0분"
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`
}

const WEEKDAY_SUN = ["일", "월", "화", "수", "목", "금", "토"]
const WEEKDAY_MON = ["월", "화", "수", "목", "금", "토", "일"]

function dayCellClass(
  status: DayInfo["status"],
  selected: boolean,
  isToday: boolean,
  outOfRange = false
) {
  const base =
    "rounded-xl flex flex-col items-center justify-center text-xs border transition-all relative"
  const selectedRing = selected
    ? "ring-2 ring-blue-600 ring-offset-1"
    : isToday
      ? "ring-2 ring-blue-500 ring-offset-1"
      : ""

  if (outOfRange) {
    return `${base} bg-slate-50 text-slate-300 border-transparent cursor-default ${selectedRing}`
  }

  const clickable = "cursor-pointer"

  switch (status) {
    case "achieved":
      return `${base} ${clickable} bg-emerald-500 text-white border-emerald-600 ${selectedRing}`
    case "studied_missed":
      return `${base} ${clickable} bg-amber-200 text-amber-950 border-amber-300 ${selectedRing}`
    case "future":
      return `${base} bg-white text-slate-400 border-slate-100 cursor-default ${selectedRing}`
    default:
      return `${base} ${clickable} bg-white text-slate-700 border-slate-200 ${selectedRing}`
  }
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className='rounded-xl bg-slate-50 border border-slate-200 p-3 text-center'>
      <div className='text-lg font-bold text-gray-900 tabular-nums'>{value}</div>
      <div className='text-xs text-slate-600 mt-0.5'>{label}</div>
      {sub && <div className='text-[11px] text-slate-500 mt-0.5'>{sub}</div>}
    </div>
  )
}

function PeriodSummaryGrid({
  summary,
  view,
}: {
  summary: PeriodSummary
  view: PeriodView
}) {
  return (
    <div className='grid grid-cols-2 sm:grid-cols-3 gap-2.5'>
      <StatCard label='학습일' value={`${summary.studyDays}일`} />
      <StatCard label='미학습일' value={`${summary.nonStudyDays}일`} />
      <StatCard label='목표 달성일' value={`${summary.achievedDays}일`} />
      <StatCard
        label='학습·미달성'
        value={`${summary.studiedButMissedDays}일`}
      />
      <StatCard label='달성률' value={`${summary.achievementRate}%`} />
      <StatCard
        label='기간 최장 연속'
        value={`${summary.longestStreakInPeriod}일`}
      />
      <StatCard label='기간 총 EXP' value={summary.totalExp.toLocaleString()} />
      <StatCard
        label='일평균 EXP'
        value={summary.avgExpPerStudyDay}
        sub='학습일 기준'
      />
      <StatCard label='일 최고 EXP' value={summary.maxDailyExp} />
      <StatCard label='평균 일일 목표' value={summary.avgDailyGoal || "—"} />
      <StatCard
        label='목표 대비 달성도'
        value={
          summary.goalCompletionRatio > 0
            ? `${summary.goalCompletionRatio}%`
            : "—"
        }
      />
      <StatCard
        label='초과 달성일'
        value={`${summary.overAchievedDays}일`}
        sub='목표 150%+'
      />
      {(view === "month" || view === "custom") && (
        <StatCard
          label='완벽한 주'
          value={`${summary.perfectWeeks}회`}
          sub='월~일 7/7'
        />
      )}
    </div>
  )
}

export default function StatisticsOverviewPage() {
  const { user, loading: authLoading } = useAuth()
  const [userStatistics, setUserStatistics] = useState<UserStatistics | null>(
    null
  )
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [view, setView] = useState<PeriodView>("month")
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const kstToday = useMemo(() => {
    const iso = getKSTDateISO()
    const [y, m, d] = iso.split("-").map(Number)
    return { year: y, month: m, day: d, dateStr: iso }
  }, [])

  const [viewYear, setViewYear] = useState(kstToday.year)
  const [viewMonth, setViewMonth] = useState(kstToday.month)
  const [weekMonday, setWeekMonday] = useState(() =>
    getMondayOfWeek(kstToday.dateStr)
  )
  const [customStart, setCustomStart] = useState(() =>
    addDaysISO(kstToday.dateStr, -6)
  )
  const [customEnd, setCustomEnd] = useState(kstToday.dateStr)

  useEffect(() => {
    const loadUserStatistics = async () => {
      if (!user) return
      setIsLoadingStats(true)
      try {
        let stats = await ApiClient.getUserStatistics(user.id)
        if (!stats) {
          await ApiClient.initializeUserStatistics(user.id)
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

  const historyMap = useMemo(
    () =>
      buildHistoryMap(
        userStatistics?.goalAchievementHistory,
        userStatistics?.consecutiveDaysResetAt
      ),
    [
      userStatistics?.goalAchievementHistory,
      userStatistics?.consecutiveDaysResetAt,
    ]
  )

  /** Earliest selectable date: history start, or 2 years back */
  const minSelectableDate = useMemo(() => {
    const fallback = `${kstToday.year - 2}-01-01`
    const dates = userStatistics?.goalAchievementHistory?.map((r) => r.date)
    if (!dates?.length) return fallback
    const min = dates.reduce((a, b) => (a < b ? a : b))
    return min < fallback ? min : fallback
  }, [userStatistics?.goalAchievementHistory, kstToday.year])

  const periodRange = useMemo(() => {
    if (view === "week") return getWeekRange(weekMonday)
    if (view === "custom") {
      const start =
        customStart <= customEnd ? customStart : customEnd
      const end = customStart <= customEnd ? customEnd : customStart
      return { startISO: start, endISO: end }
    }
    return getMonthRange(viewYear, viewMonth)
  }, [view, weekMonday, viewYear, viewMonth, customStart, customEnd])

  const summary = useMemo(
    () =>
      computePeriodSummary(
        periodRange.startISO,
        periodRange.endISO,
        historyMap,
        kstToday.dateStr
      ),
    [periodRange, historyMap, kstToday.dateStr]
  )

  const monthGrid = useMemo(
    () => buildMonthCalendarGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  )

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const dateStr = addDaysISO(weekMonday, i)
      return getDayInfo(dateStr, historyMap, kstToday.dateStr)
    })
  }, [weekMonday, historyMap, kstToday.dateStr])

  const customMonths = useMemo(() => {
    if (view !== "custom") return []
    return listMonthsInRange(periodRange.startISO, periodRange.endISO).map(
      ({ year, month }) => ({
        year,
        month,
        label: `${year}년 ${month}월`,
        grid: buildMonthCalendarGrid(year, month),
      })
    )
  }, [view, periodRange.startISO, periodRange.endISO])

  const selectedDay = useMemo(() => {
    if (!selectedDate) return null
    return getDayInfo(selectedDate, historyMap, kstToday.dateStr)
  }, [selectedDate, historyMap, kstToday.dateStr])

  const currentLevel = user?.level || 1
  const currentExperience = user?.experience || 0
  const levelProgress = calculateLevelProgress(currentExperience)
  const expToNextLevel = calculateExperienceToNextLevel(currentExperience)

  const clampDate = (value: string) => {
    if (value < minSelectableDate) return minSelectableDate
    if (value > kstToday.dateStr) return kstToday.dateStr
    return value
  }

  const handleCustomStartChange = (value: string) => {
    if (!value) return
    const start = clampDate(value)
    setCustomStart(start)
    if (start > customEnd) setCustomEnd(start)
    setSelectedDate(null)
  }

  const handleCustomEndChange = (value: string) => {
    if (!value) return
    const end = clampDate(value)
    setCustomEnd(end)
    if (end < customStart) setCustomStart(end)
    setSelectedDate(null)
  }

  const goPrev = () => {
    if (view === "custom") return
    if (view === "week") {
      const prev = addDaysISO(weekMonday, -7)
      const minMonday = getMondayOfWeek(minSelectableDate)
      if (prev < minMonday) return
      setWeekMonday(prev)
    } else {
      const next = shiftMonth(viewYear, viewMonth, -1)
      const [sy, sm] = minSelectableDate.split("-").map(Number)
      if (next.year < sy || (next.year === sy && next.month < sm)) return
      setViewYear(next.year)
      setViewMonth(next.month)
    }
    setSelectedDate(null)
  }

  const goNext = () => {
    if (view === "custom") return
    if (view === "week") {
      const next = addDaysISO(weekMonday, 7)
      const maxMonday = getMondayOfWeek(kstToday.dateStr)
      if (next > maxMonday) return
      setWeekMonday(next)
    } else {
      const next = shiftMonth(viewYear, viewMonth, 1)
      if (
        next.year > kstToday.year ||
        (next.year === kstToday.year && next.month > kstToday.month)
      ) {
        return
      }
      setViewYear(next.year)
      setViewMonth(next.month)
    }
    setSelectedDate(null)
  }

  const switchView = (next: PeriodView) => {
    setView(next)
    setSelectedDate(null)
    if (next === "week") {
      const anchor =
        viewYear === kstToday.year && viewMonth === kstToday.month
          ? kstToday.dateStr
          : `${viewYear}-${String(viewMonth).padStart(2, "0")}-01`
      setWeekMonday(getMondayOfWeek(anchor))
    } else if (next === "month") {
      if (view === "custom") {
        const [y, m] = customEnd.split("-").map(Number)
        setViewYear(y)
        setViewMonth(m)
      } else {
        const [yy, mm] = weekMonday.split("-").map(Number)
        setViewYear(yy)
        setViewMonth(mm)
      }
    } else if (next === "custom") {
      if (view === "week") {
        setCustomStart(weekMonday)
        setCustomEnd(addDaysISO(weekMonday, 6))
      } else {
        const { startISO, endISO } = getMonthRange(viewYear, viewMonth)
        setCustomStart(startISO)
        setCustomEnd(endISO > kstToday.dateStr ? kstToday.dateStr : endISO)
      }
    }
  }

  if (authLoading || isLoadingStats) {
    return <StatsContentSkeleton />
  }

  if (!user) {
    return (
      <div className='flex items-center justify-center py-20'>
        <div className='text-center'>
          <h2 className='text-xl font-bold text-gray-900 mb-3'>
            로그인이 필요합니다
          </h2>
          <Link href='/' className='text-blue-600 hover:text-blue-700 text-sm'>
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }
  const periodLabel =
    view === "week"
      ? formatWeekLabel(weekMonday)
      : view === "custom"
        ? formatDateRangeLabel(periodRange.startISO, periodRange.endISO)
        : `${viewYear}년 ${viewMonth}월`

  const monthValue = `${viewYear}-${String(viewMonth).padStart(2, "0")}`
  const minMonth = minSelectableDate.slice(0, 7)
  const maxMonth = `${kstToday.year}-${String(kstToday.month).padStart(2, "0")}`
  const minMonday = getMondayOfWeek(minSelectableDate)
  const maxMonday = getMondayOfWeek(kstToday.dateStr)

  return (
    <div className='space-y-5'>
      {/* 누적 요약 */}
      <section className='rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,23,42,0.06)] p-5'>
        <div className='flex items-center gap-2 mb-4'>
          <Target className='h-4 w-4 text-blue-600' />
          <h2 className='font-bold text-gray-900'>나의 현황</h2>
        </div>
        <div className='mb-4'>
          <div className='flex items-baseline justify-between mb-1.5'>
            <span className='text-sm font-semibold text-gray-900'>
              레벨 {currentLevel}
            </span>
            <span className='text-xs text-slate-600'>
              다음 레벨까지 {expToNextLevel} EXP
            </span>
          </div>
          <div className='h-2 rounded-full bg-slate-100 overflow-hidden'>
            <div
              className='h-full rounded-full bg-blue-600 transition-all'
              style={{ width: `${Math.round(levelProgress * 100)}%` }}
            />
          </div>
        </div>
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-2.5'>
          <div className='rounded-xl bg-blue-50 p-3 text-center border border-blue-100'>
            <div className='text-base font-bold text-blue-800 tabular-nums'>
              {currentExperience.toLocaleString()}
            </div>
            <div className='text-xs text-blue-700 mt-0.5'>총 EXP</div>
          </div>
          <div className='rounded-xl bg-emerald-50 p-3 text-center border border-emerald-100'>
            <div className='text-base font-bold text-emerald-800 tabular-nums'>
              {userStatistics?.consecutiveGoalDays ?? 0}일
            </div>
            <div className='text-xs text-emerald-700 mt-0.5'>연속 달성</div>
          </div>
          <div className='rounded-xl bg-violet-50 p-3 text-center border border-violet-100 flex flex-col items-center justify-center'>
            <div className='flex items-center gap-1 text-base font-bold text-violet-800'>
              <Clock className='h-3.5 w-3.5' />
              {formatStudyTime(userStatistics?.totalStudyTime || 0)}
            </div>
            <div className='text-xs text-violet-700 mt-0.5'>누적 시간</div>
          </div>
          <div className='rounded-xl bg-orange-50 p-3 text-center border border-orange-100'>
            <div className='flex items-center justify-center gap-1 text-base font-bold text-orange-800 tabular-nums'>
              <Layers className='h-3.5 w-3.5' />
              {userStatistics?.totalSessions ?? 0}
            </div>
            <div className='text-xs text-orange-700 mt-0.5'>총 세션</div>
          </div>
        </div>
        <div className='grid grid-cols-3 gap-2 mt-3'>
          <Link
            href='/my/statistics/game'
            className='text-center text-xs font-semibold text-slate-700 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors'
          >
            게임 통계 →
          </Link>
          <Link
            href='/my/statistics/hanzi'
            className='text-center text-xs font-semibold text-slate-700 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors'
          >
            한자 통계 →
          </Link>
          <Link
            href='/my/statistics/exam'
            className='text-center text-xs font-semibold text-slate-700 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors'
          >
            시험 통계 →
          </Link>
        </div>
      </section>

      {/* 기간 + 달력 */}
      <section className='rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,23,42,0.06)] p-5'>
        <div className='flex items-center justify-between gap-3 mb-4'>
          <div className='flex items-center gap-2'>
            <Calendar className='h-4 w-4 text-blue-600' />
            <h2 className='font-bold text-gray-900'>기간별 학습</h2>
          </div>
          <div className='flex rounded-lg bg-slate-100 p-0.5'>
            {(
              [
                ["week", "주간"],
                ["month", "월간"],
                ["custom", "직접"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type='button'
                onClick={() => switchView(key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  view === key
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-slate-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {view === "custom" ? (
          <div className='grid grid-cols-2 gap-3 mb-4'>
            <CustomInput
              type='date'
              label='시작일'
              value={customStart}
              min={minSelectableDate}
              max={customEnd}
              onChange={(e) => handleCustomStartChange(e.target.value)}
            />
            <CustomInput
              type='date'
              label='종료일'
              value={customEnd}
              min={customStart}
              max={kstToday.dateStr}
              onChange={(e) => handleCustomEndChange(e.target.value)}
            />
          </div>
        ) : (
          <div className='flex items-center justify-between mb-4'>
            <button
              type='button'
              onClick={goPrev}
              disabled={
                view === "month"
                  ? monthValue <= minMonth
                  : weekMonday <= minMonday
              }
              className='p-2 rounded-lg hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:pointer-events-none'
              aria-label='이전 기간'
            >
              <ChevronLeft className='h-5 w-5' />
            </button>
            <span className='text-sm sm:text-base font-semibold text-gray-900 text-center'>
              {periodLabel}
            </span>
            <button
              type='button'
              onClick={goNext}
              disabled={
                view === "month"
                  ? monthValue >= maxMonth
                  : weekMonday >= maxMonday
              }
              className='p-2 rounded-lg hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:pointer-events-none'
              aria-label='다음 기간'
            >
              <ChevronRight className='h-5 w-5' />
            </button>
          </div>
        )}

        {view === "month" && (
          <>
            <div className='grid grid-cols-7 gap-1 mb-1'>
              {WEEKDAY_SUN.map((w) => (
                <div
                  key={w}
                  className='text-center text-xs font-semibold text-slate-600 py-1'
                >
                  {w}
                </div>
              ))}
            </div>
            <div className='grid grid-cols-7 gap-1'>
              {monthGrid.map((cell, idx) => {
                if (cell.day === null || !cell.dateStr) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className='aspect-square rounded-xl bg-slate-50'
                    />
                  )
                }
                const info = getDayInfo(
                  cell.dateStr,
                  historyMap,
                  kstToday.dateStr
                )
                const isToday = cell.dateStr === kstToday.dateStr
                const isSelected = selectedDate === cell.dateStr
                return (
                  <button
                    type='button'
                    key={cell.dateStr}
                    disabled={info.status === "future"}
                    onClick={() =>
                      setSelectedDate(isSelected ? null : cell.dateStr)
                    }
                    className={`aspect-square ${dayCellClass(info.status, isSelected, isToday)}`}
                  >
                    {isToday && (
                      <span
                        className={`absolute top-0.5 left-1/2 -translate-x-1/2 text-[9px] font-semibold leading-none ${
                          info.status === "achieved"
                            ? "text-white"
                            : "text-blue-700"
                        }`}
                      >
                        오늘
                      </span>
                    )}
                    <span className={`font-semibold ${isToday ? "mt-2" : ""}`}>
                      {cell.day}
                    </span>
                    {(info.status === "achieved" ||
                      info.status === "studied_missed") && (
                      <span className='mt-0.5 truncate w-full text-center px-0.5 font-medium'>
                        {info.experience > 0 ? info.experience : "—"}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {view === "week" && (
          <>
            <div className='grid grid-cols-7 gap-1.5 mb-1'>
              {WEEKDAY_MON.map((w) => (
                <div
                  key={w}
                  className='text-center text-xs font-semibold text-slate-600 py-1'
                >
                  {w}
                </div>
              ))}
            </div>
            <div className='grid grid-cols-7 gap-1.5'>
              {weekDays.map((info) => {
                const isToday = info.dateStr === kstToday.dateStr
                const isSelected = selectedDate === info.dateStr
                return (
                  <button
                    type='button'
                    key={info.dateStr}
                    disabled={info.status === "future"}
                    onClick={() =>
                      setSelectedDate(isSelected ? null : info.dateStr)
                    }
                    className={`min-h-[4.5rem] py-2 ${dayCellClass(info.status, isSelected, isToday)}`}
                  >
                    {isToday && (
                      <span
                        className={`text-[9px] font-semibold leading-none mb-0.5 ${
                          info.status === "achieved"
                            ? "text-white"
                            : "text-blue-700"
                        }`}
                      >
                        오늘
                      </span>
                    )}
                    <span className='font-semibold text-sm'>{info.day}</span>
                    {(info.status === "achieved" ||
                      info.status === "studied_missed") && (
                      <span className='mt-1 text-[11px] font-semibold'>
                        {info.experience} EXP
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {view === "custom" && (
          <div className='space-y-5'>
            {customMonths.map(({ year, month, label, grid }) => (
              <div key={`${year}-${month}`}>
                <div className='text-sm font-semibold text-gray-900 mb-2'>
                  {label}
                </div>
                <div className='grid grid-cols-7 gap-1 mb-1'>
                  {WEEKDAY_SUN.map((w) => (
                    <div
                      key={`${year}-${month}-${w}`}
                      className='text-center text-xs font-semibold text-slate-600 py-1'
                    >
                      {w}
                    </div>
                  ))}
                </div>
                <div className='grid grid-cols-7 gap-1'>
                  {grid.map((cell, idx) => {
                    if (cell.day === null || !cell.dateStr) {
                      return (
                        <div
                          key={`empty-${year}-${month}-${idx}`}
                          className='aspect-square rounded-xl bg-slate-50'
                        />
                      )
                    }
                    const inRange =
                      cell.dateStr >= periodRange.startISO &&
                      cell.dateStr <= periodRange.endISO
                    const info = getDayInfo(
                      cell.dateStr,
                      historyMap,
                      kstToday.dateStr
                    )
                    const isToday = cell.dateStr === kstToday.dateStr
                    const isSelected = selectedDate === cell.dateStr
                    return (
                      <button
                        type='button'
                        key={cell.dateStr}
                        disabled={!inRange || info.status === "future"}
                        onClick={() => {
                          if (!inRange) return
                          setSelectedDate(isSelected ? null : cell.dateStr)
                        }}
                        className={`aspect-square ${dayCellClass(
                          info.status,
                          isSelected && inRange,
                          isToday && inRange,
                          !inRange
                        )}`}
                      >
                        {isToday && inRange && (
                          <span
                            className={`absolute top-0.5 left-1/2 -translate-x-1/2 text-[9px] font-semibold leading-none ${
                              info.status === "achieved"
                                ? "text-white"
                                : "text-blue-700"
                            }`}
                          >
                            오늘
                          </span>
                        )}
                        <span
                          className={`font-semibold ${isToday && inRange ? "mt-2" : ""}`}
                        >
                          {cell.day}
                        </span>
                        {inRange &&
                          (info.status === "achieved" ||
                            info.status === "studied_missed") && (
                            <span className='mt-0.5 truncate w-full text-center px-0.5 font-medium'>
                              {info.experience > 0 ? info.experience : "—"}
                            </span>
                          )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className='flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-600'>
          <span className='flex items-center gap-1.5'>
            <span className='w-2.5 h-2.5 rounded bg-emerald-500' />
            목표 달성
          </span>
          <span className='flex items-center gap-1.5'>
            <span className='w-2.5 h-2.5 rounded bg-amber-200 border border-amber-300' />
            학습·미달성
          </span>
          <span className='flex items-center gap-1.5'>
            <span className='w-2.5 h-2.5 rounded bg-white border border-slate-200' />
            기록 없음
          </span>
        </div>

        {selectedDay && (
          <div className='mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4'>
            <div className='text-sm font-semibold text-gray-900 mb-2'>
              {selectedDay.dateStr}
            </div>
            {selectedDay.status === "none" ? (
              <p className='text-sm text-slate-600'>
                이 날의 학습 기록이 없습니다.
              </p>
            ) : (
              <div className='grid grid-cols-3 gap-2 text-center'>
                <div>
                  <div className='text-base font-bold text-gray-900'>
                    {selectedDay.experience}
                  </div>
                  <div className='text-xs text-slate-600'>EXP</div>
                </div>
                <div>
                  <div className='text-base font-bold text-gray-900'>
                    {selectedDay.goal ?? "—"}
                  </div>
                  <div className='text-xs text-slate-600'>목표</div>
                </div>
                <div>
                  <div
                    className={`text-base font-bold ${
                      selectedDay.achieved
                        ? "text-emerald-700"
                        : "text-amber-700"
                    }`}
                  >
                    {selectedDay.achieved ? "달성" : "미달성"}
                  </div>
                  <div className='text-xs text-slate-600'>상태</div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className='rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,23,42,0.06)] p-5'>
        <div className='flex items-center gap-2 mb-4'>
          <Trophy className='h-4 w-4 text-amber-600' />
          <h2 className='font-bold text-gray-900'>기간 요약</h2>
          <span className='text-xs text-slate-600 ml-auto'>{periodLabel}</span>
        </div>
        {summary.elapsedDays === 0 ? (
          <p className='text-sm text-slate-600 text-center py-6'>
            아직 이 기간의 데이터가 없습니다.
          </p>
        ) : (
          <PeriodSummaryGrid summary={summary} view={view} />
        )}
      </section>
    </div>
  )
}
