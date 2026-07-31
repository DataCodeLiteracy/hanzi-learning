"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useModal } from "@/contexts/ModalContext"
import ConfirmModal from "@/components/ConfirmModal"
import { CustomButton } from "@/components/ui/CustomButton"
import { CustomInput } from "@/components/ui/CustomInput"
import { getKSTDateISO } from "@/lib/apiClient"
import { MileageService } from "@/lib/services/mileageService"
import {
  DAILY_MILEAGE_CAP,
  formatMileage,
  MILEAGE_PER_XP,
} from "@/lib/mileageSystem"
import {
  buildMonthCalendarGrid,
  getMonthRange,
  shiftMonth,
} from "@/lib/statistics/periodStats"
import type { MileageTransaction } from "@/types"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Coins,
  MinusCircle,
} from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"

const WEEKDAY_SUN = ["일", "월", "화", "수", "목", "금", "토"]

type DayAgg = {
  earned: number
  withdrawn: number
}

function parseYearMonth(ym: string): { year: number; month: number } {
  const [y, m] = ym.split("-").map(Number)
  return { year: y, month: m }
}

function toYearMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`
}

export default function MileagePage() {
  const { user, initialLoading, isAuthenticated, refreshUserData } = useAuth()
  const { alert: showAlert } = useModal()

  const todayISO = getKSTDateISO()
  const todayYm = todayISO.slice(0, 7)

  const [viewYm, setViewYm] = useState(todayYm)
  const [balance, setBalance] = useState(0)
  const [todayEarned, setTodayEarned] = useState(0)
  const [transactions, setTransactions] = useState<MileageTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(todayISO)

  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [withdrawNote, setWithdrawNote] = useState("")
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)

  const { year: viewYear, month: viewMonth } = parseYearMonth(viewYm)

  const loadMonth = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [bal, todayMileage, txs] = await Promise.all([
        MileageService.getBalance(user.id),
        MileageService.getTodayEarned(user.id),
        MileageService.getTransactionsForMonth(user.id, viewYm),
      ])
      setBalance(bal)
      setTodayEarned(todayMileage)
      setTransactions(txs)
    } catch (error) {
      console.error(error)
      showAlert("마일리지 내역을 불러오지 못했습니다.", { type: "error" })
    } finally {
      setLoading(false)
    }
  }, [user, viewYm, showAlert])

  useEffect(() => {
    if (user) void loadMonth()
  }, [user, loadMonth])

  const dayMap = useMemo(() => {
    const map = new Map<string, DayAgg>()
    for (const tx of transactions) {
      const prev = map.get(tx.date) || { earned: 0, withdrawn: 0 }
      if (tx.type === "earn") prev.earned += tx.amount
      else prev.withdrawn += tx.amount
      map.set(tx.date, prev)
    }
    return map
  }, [transactions])

  const monthSummary = useMemo(() => {
    let earned = 0
    let withdrawn = 0
    for (const tx of transactions) {
      if (tx.type === "earn") earned += tx.amount
      else withdrawn += tx.amount
    }
    return { earned, withdrawn }
  }, [transactions])

  const monthGrid = useMemo(
    () => buildMonthCalendarGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  )

  const { startISO, endISO } = useMemo(
    () => getMonthRange(viewYear, viewMonth),
    [viewYear, viewMonth]
  )

  const selectedDayTxs = useMemo(() => {
    if (!selectedDate) return []
    return transactions.filter((t) => t.date === selectedDate)
  }, [transactions, selectedDate])

  const goPrevMonth = () => {
    const next = shiftMonth(viewYear, viewMonth, -1)
    setViewYm(toYearMonth(next.year, next.month))
    setSelectedDate(null)
  }

  const goNextMonth = () => {
    const next = shiftMonth(viewYear, viewMonth, 1)
    const nextYm = toYearMonth(next.year, next.month)
    if (nextYm > todayYm) return
    setViewYm(nextYm)
    setSelectedDate(null)
  }

  const parsedWithdraw = Math.floor(Number(withdrawAmount))
  const canWithdraw =
    Number.isFinite(parsedWithdraw) &&
    parsedWithdraw > 0 &&
    parsedWithdraw <= balance

  const handleWithdraw = async () => {
    if (!user || !canWithdraw) return
    setWithdrawing(true)
    try {
      const newBalance = await MileageService.withdraw(
        user.id,
        parsedWithdraw,
        withdrawNote || "용돈 출금"
      )
      setBalance(newBalance)
      setWithdrawAmount("")
      setWithdrawNote("")
      setShowWithdrawConfirm(false)
      setSelectedDate(todayISO)
      setViewYm(todayYm)
      await refreshUserData()

      const [bal, todayMileage, txs] = await Promise.all([
        MileageService.getBalance(user.id),
        MileageService.getTodayEarned(user.id),
        MileageService.getTransactionsForMonth(user.id, todayYm),
      ])
      setBalance(bal)
      setTodayEarned(todayMileage)
      setTransactions(txs)

      showAlert(`${formatMileage(parsedWithdraw)} 출금했습니다. 내역에 기록됐어요.`, {
        type: "success",
      })
    } catch (error) {
      showAlert(
        error instanceof Error ? error.message : "출금에 실패했습니다.",
        { type: "error" }
      )
    } finally {
      setWithdrawing(false)
    }
  }

  if (initialLoading) {
    return (
      <div className='min-h-screen bg-slate-50 flex items-center justify-center'>
        <div className='text-gray-500'>불러오는 중…</div>
      </div>
    )
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

  return (
    <div className='min-h-screen bg-slate-50'>
      <header className='bg-white border-b border-slate-100'>
        <div className='max-w-2xl mx-auto px-4 py-4 flex items-center gap-3'>
          <Link
            href='/my'
            className='p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100'
          >
            <ArrowLeft className='h-5 w-5' />
          </Link>
          <h1 className='text-lg font-bold text-gray-900'>마일리지</h1>
        </div>
      </header>

      <main className='max-w-2xl mx-auto px-4 py-6 space-y-5 pb-12'>
        {/* 잔액 */}
        <div className='rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-5'>
          <div className='flex items-center gap-2 mb-3'>
            <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white'>
              <Coins className='h-5 w-5' />
            </div>
            <div>
              <div className='text-sm font-bold text-amber-900'>보유 마일리지</div>
              <div className='text-xs font-medium text-amber-800'>
                200 EXP = 1,000P · 하루 상한 {formatMileage(DAILY_MILEAGE_CAP)}
              </div>
            </div>
          </div>
          <div className='flex items-baseline gap-1.5 mb-3'>
            <span className='text-4xl font-extrabold text-amber-800'>
              {balance.toLocaleString("ko-KR")}
            </span>
            <span className='text-lg font-bold text-amber-700'>P</span>
            <span className='text-sm font-medium text-amber-800 ml-1'>
              = {balance.toLocaleString("ko-KR")}원
            </span>
          </div>
          <div className='w-full bg-amber-200/60 rounded-full h-2 mb-1.5'>
            <div
              className='bg-amber-500 h-2 rounded-full transition-all'
              style={{
                width: `${Math.min(100, (todayEarned / DAILY_MILEAGE_CAP) * 100)}%`,
              }}
            />
          </div>
          <p className='text-xs font-medium text-amber-900'>
            오늘 적립 {formatMileage(todayEarned)} / {formatMileage(DAILY_MILEAGE_CAP)}
            <span className='text-amber-800'>
              {" "}
              (1 EXP = {MILEAGE_PER_XP}P)
            </span>
          </p>
        </div>

        {/* 월 달력 */}
        <div className='rounded-2xl border border-slate-200/90 bg-white p-5'>
          <div className='flex items-center justify-between mb-4'>
            <button
              type='button'
              onClick={goPrevMonth}
              className='p-2 rounded-lg hover:bg-slate-100 text-slate-600'
              aria-label='이전 달'
            >
              <ChevronLeft className='h-5 w-5' />
            </button>
            <h2 className='font-bold text-gray-900'>
              {viewYear}년 {viewMonth}월
            </h2>
            <button
              type='button'
              onClick={goNextMonth}
              disabled={viewYm >= todayYm}
              className='p-2 rounded-lg hover:bg-slate-100 text-slate-600 disabled:opacity-30'
              aria-label='다음 달'
            >
              <ChevronRight className='h-5 w-5' />
            </button>
          </div>

          <div className='grid grid-cols-3 gap-2 mb-4 text-center'>
            <div className='rounded-xl bg-amber-50 py-2 px-1'>
              <div className='text-sm font-bold text-amber-700'>
                {formatMileage(monthSummary.earned)}
              </div>
              <div className='text-[11px] text-gray-500'>적립</div>
            </div>
            <div className='rounded-xl bg-rose-50 py-2 px-1'>
              <div className='text-sm font-bold text-rose-600'>
                {formatMileage(monthSummary.withdrawn)}
              </div>
              <div className='text-[11px] text-gray-500'>출금</div>
            </div>
            <div className='rounded-xl bg-slate-50 py-2 px-1'>
              <div className='text-sm font-bold text-slate-700'>
                {formatMileage(monthSummary.earned - monthSummary.withdrawn)}
              </div>
              <div className='text-[11px] text-gray-500'>순증감</div>
            </div>
          </div>

          <div className='grid grid-cols-7 gap-1 mb-1'>
            {WEEKDAY_SUN.map((d) => (
              <div
                key={d}
                className='text-center text-[11px] font-semibold text-gray-600 py-1'
              >
                {d}
              </div>
            ))}
          </div>

          {loading ? (
            <div className='py-12 text-center text-sm font-medium text-gray-600'>
              불러오는 중…
            </div>
          ) : (
            <div className='grid grid-cols-7 gap-1'>
              {monthGrid.map((cell, idx) => {
                if (!cell.dateStr || cell.day === null) {
                  return <div key={`empty-${idx}`} className='aspect-square' />
                }
                const agg = dayMap.get(cell.dateStr)
                const isFuture = cell.dateStr > todayISO
                const isSelected = selectedDate === cell.dateStr
                const isToday = cell.dateStr === todayISO
                const hasEarn = (agg?.earned || 0) > 0
                const hasWithdraw = (agg?.withdrawn || 0) > 0
                const hasActivity = hasEarn || hasWithdraw
                const outOfMonth =
                  cell.dateStr < startISO || cell.dateStr > endISO

                return (
                  <button
                    key={cell.dateStr}
                    type='button'
                    disabled={isFuture || outOfMonth}
                    onClick={() => setSelectedDate(cell.dateStr)}
                    className={[
                      "aspect-square rounded-xl flex flex-col items-center justify-center text-xs border transition-all",
                      isSelected
                        ? "ring-2 ring-amber-500 ring-offset-1"
                        : isToday
                          ? "ring-2 ring-amber-300 ring-offset-1"
                          : "",
                      isFuture
                        ? "bg-white text-slate-300 border-slate-100 cursor-default"
                        : hasWithdraw && !hasEarn
                          ? "bg-rose-50 text-rose-900 border-rose-200 cursor-pointer"
                          : hasEarn
                            ? "bg-amber-100 text-amber-900 border-amber-200 cursor-pointer"
                            : "bg-white text-slate-700 border-slate-200 cursor-pointer hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <span className='font-semibold'>{cell.day}</span>
                    {hasActivity && (
                      <span
                        className={`text-[9px] font-medium leading-none mt-0.5 ${
                          hasEarn ? "text-amber-700" : "text-rose-600"
                        }`}
                      >
                        {hasEarn
                          ? `+${agg!.earned}`
                          : `-${agg!.withdrawn}`}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 선택일 상세 */}
        <div className='rounded-2xl border border-slate-200/90 bg-white p-5'>
          <h2 className='font-bold text-gray-900 mb-3'>
            {selectedDate
              ? `${selectedDate.replace(/-/g, ".")} 내역`
              : "날짜를 선택하세요"}
          </h2>
          {!selectedDate ? (
            <p className='text-sm font-medium text-gray-600'>달력에서 날짜를 눌러보세요.</p>
          ) : selectedDayTxs.length === 0 ? (
            <p className='text-sm font-medium text-gray-600'>이 날의 내역이 없습니다.</p>
          ) : (
            <ul className='space-y-2'>
              {selectedDayTxs.map((tx) => (
                <li
                  key={tx.id}
                  className='flex items-center justify-between py-2.5 px-3 rounded-xl bg-slate-50'
                >
                  <div className='min-w-0'>
                    <div className='text-sm font-medium text-gray-800'>
                      {tx.type === "earn" ? "적립" : "출금"}
                      {tx.xpConverted != null && tx.type === "earn" && (
                        <span className='text-xs text-gray-600 font-medium ml-1.5'>
                          ({tx.xpConverted} EXP)
                        </span>
                      )}
                    </div>
                    {tx.note && (
                      <div className='text-xs text-gray-600 truncate'>
                        {tx.note}
                      </div>
                    )}
                    <div className='text-[11px] font-medium text-gray-500'>
                      {new Date(tx.createdAt).toLocaleTimeString("ko-KR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div
                    className={`text-sm font-bold shrink-0 ${
                      tx.type === "earn" ? "text-amber-700" : "text-rose-600"
                    }`}
                  >
                    {tx.type === "earn" ? "+" : "-"}
                    {formatMileage(tx.amount)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 출금 — 내역 아래, 출금도 위 달력·일별 내역에 기록됨 */}
        <div className='rounded-2xl border border-slate-200/90 bg-white p-5 space-y-3'>
          <div className='flex items-center gap-2'>
            <MinusCircle className='h-4 w-4 text-rose-500' />
            <h2 className='font-bold text-gray-900'>출금 (수동 차감)</h2>
          </div>
          <p className='text-xs font-medium text-gray-600'>
            용돈을 지급한 뒤 여기서 차감하면 위 내역에 출금으로 기록됩니다.
          </p>
          <CustomInput
            type='number'
            label='출금 금액 (P)'
            suffix='P'
            min={1}
            max={balance}
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder='예: 1000'
          />
          <CustomInput
            label='메모 (선택)'
            value={withdrawNote}
            onChange={(e) => setWithdrawNote(e.target.value)}
            placeholder='예: 8월 용돈'
          />
          <CustomButton
            fullWidth
            disabled={!canWithdraw || withdrawing}
            onClick={() => setShowWithdrawConfirm(true)}
            className='!bg-rose-500 hover:!bg-rose-600 focus:ring-rose-400'
          >
            출금하기
          </CustomButton>
        </div>
      </main>

      <ConfirmModal
        isOpen={showWithdrawConfirm}
        onClose={() => setShowWithdrawConfirm(false)}
        onConfirm={() => {
          void handleWithdraw()
        }}
        title='마일리지 출금'
        message={`${formatMileage(parsedWithdraw)}을(를) 차감할까요?${
          withdrawNote ? `\n메모: ${withdrawNote}` : ""
        }`}
        confirmText={withdrawing ? "처리 중…" : "출금"}
        cancelText='취소'
        type='warning'
      />
    </div>
  )
}
