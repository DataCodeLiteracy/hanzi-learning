import { useEffect, useRef, useCallback, useState } from "react"
import { TimeTrackingService } from "@/lib/services/timeTrackingService"

export interface UseTimeTrackingOptions {
  userId: string
  type: "game" | "page"
  activity: string
  autoStart?: boolean
  autoEnd?: boolean
}

export interface UseTimeTrackingReturn {
  startSession: () => Promise<string>
  endSession: () => number
  isActive: boolean
  currentDuration: number
  totalStudyTime: number
  formatTime: (seconds: number) => string
}

export function useTimeTracking({
  userId,
  type,
  activity,
  autoStart = false,
  autoEnd = true,
}: UseTimeTrackingOptions): UseTimeTrackingReturn {
  const sessionIdRef = useRef<string | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [currentDuration, setCurrentDuration] = useState<number>(0)
  const [totalStudyTime, setTotalStudyTime] = useState<number>(0)
  const [isActive, setIsActive] = useState<boolean>(false)

  // 총 학습시간 조회
  const loadTotalStudyTime = useCallback(async () => {
    try {
      const totalTime = await TimeTrackingService.getTotalStudyTime(userId)
      setTotalStudyTime(totalTime)
    } catch (error) {
      console.error("총 학습시간 조회 실패:", error)
    }
  }, [userId])

  // 세션 시작
  const startSession = useCallback(async (): Promise<string> => {
    if (sessionIdRef.current) {
      console.warn("이미 활성 세션이 있습니다.")
      return sessionIdRef.current
    }

    // 세션 시작 전에 현재 총 학습시간 로드
    await loadTotalStudyTime()

    const sessionId = TimeTrackingService.startSession(userId, type, activity)
    sessionIdRef.current = sessionId
    startTimeRef.current = Date.now()
    setIsActive(true)
    setCurrentDuration(0)

    // 1초마다 현재 시간 업데이트
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setCurrentDuration(duration)
      }
    }, 1000)

    return sessionId
  }, [userId, type, activity, loadTotalStudyTime, totalStudyTime])

  // 세션 종료
  const endSession = useCallback((): number => {
    if (!sessionIdRef.current) {
      console.warn("활성 세션이 없습니다.")
      return 0
    }

    const duration = TimeTrackingService.endSession(sessionIdRef.current)

    // 총 학습시간 업데이트 (현재 세션 시간을 기존 totalStudyTime에 추가)
    TimeTrackingService.updateTotalStudyTime(userId, duration)
      .then(() => {
        // 로컬 상태도 즉시 업데이트
        setTotalStudyTime((prev) => prev + duration)
        console.log(
          `📊 총 학습시간 업데이트: +${duration}초 (새 총합: ${
            totalStudyTime + duration
          }초)`
        )
      })
      .catch((error) => {
        console.error("총 학습시간 업데이트 실패:", error)
      })

    // 정리
    sessionIdRef.current = null
    startTimeRef.current = null
    setIsActive(false)
    setCurrentDuration(0)

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    console.log(`🕐 세션 종료: ${activity} - ${duration}초`)
    return duration
  }, [userId, activity, totalStudyTime])

  // 시간 포맷팅
  const formatTime = useCallback((seconds: number): string => {
    return TimeTrackingService.formatStudyTime(seconds)
  }, [])

  // 컴포넌트 마운트 시 총 학습시간 로드
  useEffect(() => {
    loadTotalStudyTime()
  }, [loadTotalStudyTime])

  // 자동 시작
  useEffect(() => {
    if (autoStart && userId) {
      startSession()
    }
  }, [autoStart, userId, startSession])

  // 자동 종료 (페이지 이탈 시)
  useEffect(() => {
    if (!autoEnd) return

    const handleBeforeUnload = () => {
      if (sessionIdRef.current) {
        endSession()
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden && sessionIdRef.current) {
        endSession()
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      document.removeEventListener("visibilitychange", handleVisibilityChange)

      // 컴포넌트 언마운트 시 세션 정리
      if (sessionIdRef.current) {
        endSession()
      }
    }
  }, [autoEnd, endSession])

  return {
    startSession,
    endSession,
    isActive,
    currentDuration,
    totalStudyTime,
    formatTime,
  }
}
