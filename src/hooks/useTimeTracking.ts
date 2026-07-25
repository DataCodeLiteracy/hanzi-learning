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
  }, [userId, type, activity, loadTotalStudyTime])

  // 세션 종료
  const endSession = useCallback((): number => {
    if (!sessionIdRef.current) {
      console.warn("활성 세션이 없습니다.")
      return 0
    }

    const ended = TimeTrackingService.endSession(sessionIdRef.current)
    const duration = ended?.duration ?? 0

    if (duration > 0) {
      TimeTrackingService.updateTotalStudyTime(userId, duration)
        .then(() => {
          setTotalStudyTime((prev) => prev + duration)
        })
        .catch((error) => {
          console.error("총 학습시간 업데이트 실패:", error)
        })
    }

    if (ended && duration >= 30) {
      void (async () => {
        try {
          const { getClientIdToken } = await import("@/lib/getClientIdToken")
          const idToken = await getClientIdToken()
          const res = await fetch("/api/focus-level/sync-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              idToken,
              op: "upsert",
              sessionId: ended.id,
              startTime: new Date(ended.startTime).toISOString(),
              endTime: new Date(ended.endTime).toISOString(),
              durationSeconds: ended.duration,
              activity: ended.activity,
              type: ended.type,
            }),
          })
          const data = (await res.json().catch(() => ({}))) as {
            error?: string
            ok?: boolean
            skipped?: boolean
            reason?: string
          }
          if (!res.ok) {
            console.warn("[focus-level sync] fail", data.error ?? res.status)
            return
          }
          if (data.skipped) {
            console.warn("[focus-level sync] skipped", {
              reason: data.reason,
              activity: ended.activity,
              durationSeconds: ended.duration,
              sessionId: ended.id,
            })
            return
          }
          console.log("[focus-level sync] ok", {
            activity: ended.activity,
            durationSeconds: ended.duration,
            sessionId: ended.id,
          })
        } catch (e) {
          console.warn("[focus-level sync] error", e)
        }
      })()
    } else if (ended) {
      console.log("[focus-level sync] skipped locally", {
        reason: "too_short_client",
        activity: ended.activity,
        durationSeconds: duration,
      })
    }

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
  }, [userId, activity])

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
