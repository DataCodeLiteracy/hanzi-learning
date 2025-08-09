import { ApiClient } from "@/lib/apiClient"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

export interface HanziStatistics {
  hanziId: string
  character: string
  meaning: string
  sound: string
  gradeNumber: number // 급수 내에서의 번호
  totalStudied: number
  correctAnswers: number
  wrongAnswers: number
  accuracy: number // required로 변경
  lastStudied: string | null
}

export class HanziStatisticsService {
  /**
   * 한자 통계 업데이트
   */
  static async updateHanziStatistics(
    userId: string,
    hanziId: string,
    gameType: string,
    isCorrect: boolean
  ): Promise<void> {
    return ApiClient.updateHanziStatisticsNew(
      userId,
      hanziId,
      gameType,
      isCorrect
    )
  }

  /**
   * 사용자의 모든 한자 통계 조회
   */
  static async getHanziStatistics(userId: string): Promise<
    {
      hanziId: string
      character: string
      meaning: string
      sound: string
      gradeNumber: number
      totalStudied: number
      correctAnswers: number
      wrongAnswers: number
      accuracy: number
      lastStudied: string | null
    }[]
  > {
    return ApiClient.getHanziStatisticsNew(userId)
  }

  /**
   * 특정 한자의 통계 조회
   */
  static async getHanziStatisticsById(
    userId: string,
    hanziId: string
  ): Promise<HanziStatistics | null> {
    const allStats = await this.getHanziStatistics(userId)
    const hanziStat = allStats.find((stat) => stat.hanziId === hanziId)

    if (!hanziStat) {
      return null
    }

    return {
      hanziId: hanziStat.hanziId,
      character: hanziStat.character || "",
      meaning: hanziStat.meaning || "",
      sound: hanziStat.sound || "",
      gradeNumber: hanziStat.gradeNumber || 0,
      totalStudied: hanziStat.totalStudied || 0,
      correctAnswers: hanziStat.correctAnswers || 0,
      wrongAnswers: hanziStat.wrongAnswers || 0,
      accuracy: this.calculateAccuracy(
        hanziStat.correctAnswers || 0,
        hanziStat.wrongAnswers || 0
      ),
      lastStudied: hanziStat.lastStudied || null,
    }
  }

  /**
   * 급수별 한자 통계 조회
   */
  static async getGradeHanziStatistics(
    userId: string,
    grade: number
  ): Promise<HanziStatistics[]> {
    try {
      const hanziStatsRef = collection(db, "hanziStatistics")
      const q = query(
        hanziStatsRef,
        where("userId", "==", userId),
        where("grade", "==", grade)
      )
      const snapshot = await getDocs(q)

      return snapshot.docs.map((doc) => {
        const data = doc.data() as {
          hanziId: string
          character: string
          meaning: string
          sound: string
          gradeNumber: number
          totalStudied: number
          correctAnswers: number
          wrongAnswers: number
          accuracy: number
          lastStudied: string | null
          grade: number
        }
        return {
          hanziId: data.hanziId,
          character: data.character,
          meaning: data.meaning,
          sound: data.sound,
          gradeNumber: data.gradeNumber,
          totalStudied: data.totalStudied,
          correctAnswers: data.correctAnswers,
          wrongAnswers: data.wrongAnswers,
          accuracy: data.accuracy,
          lastStudied: data.lastStudied,
        }
      })
    } catch (error) {
      console.error("급수별 한자 통계 가져오기 실패:", error)
      return []
    }
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
   * 우선순위 기반 한자 선택
   */
  static async getPrioritizedHanzi(
    userId: string,
    grade: number,
    count: number
  ): Promise<
    {
      id: string
      character: string
      meaning: string
      sound: string
      pinyin?: string
      grade: number
      gradeNumber?: number
      strokes?: number
      radicals?: string[]
      relatedWords?: Array<{
        hanzi: string
        korean: string
        isTextBook?: boolean
      }>
      strokeOrder?: string[]
      difficulty?: string
      frequency?: number
      notes?: string
      totalStudied?: number
      correctAnswers?: number
      wrongAnswers?: number
      accuracy?: number
      lastStudied?: string | null
    }[]
  > {
    return ApiClient.getPrioritizedHanzi(userId, grade, count)
  }

  /**
   * 한자 통계 요약
   */
  static getHanziStatisticsSummary(stats: HanziStatistics[]) {
    const totalHanzi = stats.length
    const studiedHanzi = stats.filter((h) => h.totalStudied > 0).length
    const notStudiedHanzi = totalHanzi - studiedHanzi

    const studiedStats = stats.filter((h) => h.totalStudied > 0)
    const averageAccuracy =
      studiedStats.length > 0
        ? Math.round(
            studiedStats.reduce((sum, h) => sum + (h.accuracy || 0), 0) /
              studiedStats.length
          )
        : 0

    return {
      totalHanzi,
      studiedHanzi,
      notStudiedHanzi,
      averageAccuracy,
    }
  }
}
