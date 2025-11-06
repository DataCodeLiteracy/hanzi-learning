"use client"
import { useEffect, useState } from "react"
import { EXAM_DURATION_SECONDS } from "@/lib/examConstants"

export function useExamTimer(
  examStartTime: Date | null,
  isExamStarted: boolean,
  isSessionReady: boolean,
  onTimeout: () => void
) {
  const [timeLeft, setTimeLeft] = useState<number>(0)

  useEffect(() => {
    if (isSessionReady && isExamStarted && examStartTime) {
      const updateTimer = () => {
        const now = new Date()
        const elapsedSeconds = Math.floor(
          (now.getTime() - examStartTime.getTime()) / 1000
        )
        const remainingTime = Math.max(
          0,
          EXAM_DURATION_SECONDS - elapsedSeconds
        )
        setTimeLeft(remainingTime)
        if (remainingTime <= 0) onTimeout()
      }

      updateTimer()
      const timer = setInterval(updateTimer, 1000)
      return () => clearInterval(timer)
    }
  }, [isSessionReady, isExamStarted, examStartTime, onTimeout])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  return { timeLeft, formatTime }
}
