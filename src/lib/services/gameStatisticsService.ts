import { ApiClient } from "@/lib/apiClient"

export interface GameStatistics {
  totalPlayed: number
  correctAnswers: number
  wrongAnswers: number
  completedSessions: number
  totalSessions: number
  accuracy: number // required로 변경
}

export class GameStatisticsService {
  /**
   * 게임 통계 업데이트
   */
  static async updateGameStatistics(
    userId: string,
    gameType: string,
    stats: {
      totalPlayed?: number
      correctAnswers?: number
      wrongAnswers?: number
      completedSessions?: number
      totalSessions?: number
    }
  ): Promise<void> {
    return ApiClient.updateGameStatisticsNew(userId, gameType, stats)
  }

  /**
   * 사용자의 모든 게임 통계 조회
   */
  static async getGameStatistics(
    userId: string
  ): Promise<Record<string, GameStatistics>> {
    const stats = await ApiClient.getGameStatisticsNew(userId)

    // 각 게임별로 정확도 계산
    Object.keys(stats).forEach((gameType) => {
      const gameStats = stats[gameType]
      gameStats.accuracy = this.calculateAccuracy(
        gameStats.correctAnswers || 0,
        gameStats.wrongAnswers || 0
      )
    })

    return stats
  }

  /**
   * 특정 게임의 통계 조회
   */
  static async getGameStatisticsByType(
    userId: string,
    gameType: string
  ): Promise<GameStatistics | null> {
    const allStats = await this.getGameStatistics(userId)
    return allStats[gameType] || null
  }

  /**
   * 정확도 계산
   */
  static calculateAccuracy(
    correctAnswers: number,
    wrongAnswers: number
  ): number {
    const total = correctAnswers + wrongAnswers
    return total > 0 ? Math.round((correctAnswers / total) * 100) : 0
  }

  /**
   * 게임별 통계 요약
   */
  static getGameStatisticsSummary(stats: Record<string, GameStatistics>) {
    const totalGames = Object.values(stats).reduce(
      (sum, stat) => sum + stat.totalPlayed,
      0
    )
    const totalCorrect = Object.values(stats).reduce(
      (sum, stat) => sum + stat.correctAnswers,
      0
    )
    const totalWrong = Object.values(stats).reduce(
      (sum, stat) => sum + stat.wrongAnswers,
      0
    )
    const overallAccuracy = this.calculateAccuracy(totalCorrect, totalWrong)

    return {
      totalGames,
      totalCorrect,
      totalWrong,
      overallAccuracy,
    }
  }
}
