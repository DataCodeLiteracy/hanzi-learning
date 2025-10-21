import { ApiClient } from "@/lib/apiClient"

export interface TimeTrackingSession {
  id: string
  userId: string
  type: "game" | "page"
  activity: string // "memory", "partial", "quiz", "writing", "textbook-words", "hanzi-list"
  startTime: number
  endTime?: number
  duration?: number // 초 단위
  createdAt: string
  updatedAt: string
}

export class TimeTrackingService {
  private static sessions: Map<string, TimeTrackingSession> = new Map()

  /**
   * 학습 세션 시작
   */
  static startSession(
    userId: string,
    type: "game" | "page",
    activity: string
  ): string {
    const sessionId = `${userId}_${type}_${activity}_${Date.now()}`
    const session: TimeTrackingSession = {
      id: sessionId,
      userId,
      type,
      activity,
      startTime: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.sessions.set(sessionId, session)
    console.log(`🕐 학습 세션 시작: ${activity} (${type})`)
    return sessionId
  }

  /**
   * 학습 세션 종료
   */
  static endSession(sessionId: string): number {
    const session = this.sessions.get(sessionId)
    if (!session) {
      console.warn(`⚠️ 세션을 찾을 수 없습니다: ${sessionId}`)
      return 0
    }

    const endTime = Date.now()
    const duration = Math.floor((endTime - session.startTime) / 1000) // 초 단위

    session.endTime = endTime
    session.duration = duration
    session.updatedAt = new Date().toISOString()

    console.log(
      `🕐 학습 세션 종료: ${session.activity} (${session.type}) - ${duration}초`
    )

    // 세션을 메모리에서 제거
    this.sessions.delete(sessionId)

    return duration
  }

  /**
   * 사용자의 총 학습시간 업데이트
   */
  static async updateTotalStudyTime(
    userId: string,
    additionalTime: number
  ): Promise<void> {
    try {
      console.log(`🕐 총 학습시간 업데이트: +${additionalTime}초`)

      // userStatistics에서 현재 총 학습시간 조회
      const userStats = await ApiClient.getUserStatistics(userId)

      if (userStats) {
        // 기존 통계 업데이트
        const currentTotalTime = userStats.totalStudyTime || 0
        const newTotalTime = currentTotalTime + additionalTime

        console.log(
          `📊 학습시간 업데이트: ${currentTotalTime}초 → ${newTotalTime}초`
        )

        // userStatistics 업데이트
        await ApiClient.updateDocument("userStatistics", userStats.id!, {
          totalStudyTime: newTotalTime,
        })

        console.log(`✅ 총 학습시간 업데이트 완료: ${newTotalTime}초`)
      } else {
        // 새로운 userStatistics 생성
        console.log(`📝 새로운 userStatistics 생성 (학습시간 포함)`)
        await ApiClient.createDocument("userStatistics", {
          userId,
          totalStudyTime: additionalTime,
          totalSessions: 0,
          todayExperience: 0,
          todayGoal: 100,
          lastResetDate: new Date(Date.now() + 9 * 60 * 60 * 1000).toDateString(),
          lastPlayedAt: new Date().toISOString(),
          goalAchievementHistory: [],
          consecutiveGoalDays: 0,
          weeklyGoalAchievement: {
            currentWeek: this.getWeekNumber(new Date()),
            achievedDays: 0,
            totalDays: 7,
          },
          monthlyGoalAchievement: {
            currentMonth: new Date().toISOString().slice(0, 7),
            achievedDays: 0,
            totalDays: new Date(
              new Date().getFullYear(),
              new Date().getMonth() + 1,
              0
            ).getDate(),
          },
        })

        console.log(
          `✅ 새로운 userStatistics 생성 완료: totalStudyTime=${additionalTime}초`
        )
      }
    } catch (error) {
      console.error("총 학습시간 업데이트 실패:", error)
      throw error
    }
  }

  /**
   * 사용자의 총 학습시간 조회
   */
  static async getTotalStudyTime(userId: string): Promise<number> {
    try {
      const userStats = await ApiClient.getUserStatistics(userId)
      return userStats?.totalStudyTime || 0
    } catch (error) {
      console.error("총 학습시간 조회 실패:", error)
      return 0
    }
  }

  /**
   * 학습시간을 읽기 쉬운 형식으로 변환
   */
  static formatStudyTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

    if (hours > 0) {
      return `${hours}시간 ${minutes}분 ${remainingSeconds}초`
    } else if (minutes > 0) {
      return `${minutes}분 ${remainingSeconds}초`
    } else {
      return `${remainingSeconds}초`
    }
  }

  /**
   * 주차 번호 계산 (YYYY-WW 형식)
   */
  private static getWeekNumber(date: Date): string {
    const year = date.getFullYear()
    const startOfYear = new Date(year, 0, 1)
    const days = Math.floor(
      (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
    )
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7)
    return `${year}-${weekNumber.toString().padStart(2, "0")}`
  }

  /**
   * 활성 세션 정리 (페이지 이탈 시)
   */
  static cleanupActiveSessions(userId: string): void {
    const userSessions = Array.from(this.sessions.values()).filter(
      (session) => session.userId === userId
    )

    userSessions.forEach((session) => {
      if (!session.endTime) {
        console.log(`🧹 활성 세션 정리: ${session.activity}`)
        this.endSession(session.id)
      }
    })
  }

  /**
   * 현재 활성 세션 조회
   */
  static getActiveSessions(userId: string): TimeTrackingSession[] {
    return Array.from(this.sessions.values()).filter(
      (session) => session.userId === userId && !session.endTime
    )
  }
}
