import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  QueryConstraint,
  DocumentData,
  QueryDocumentSnapshot,
  setDoc,
  writeBatch,
  deleteField,
} from "firebase/firestore"
import { db } from "./firebase"
import { Hanzi, UserStatistics } from "@/types"
import { calculateLevel } from "./experienceSystem"

// 한국시간(KST, UTC+9) 기준으로 날짜를 계산하는 유틸리티 함수
// 한국 시간대(Asia/Seoul)를 직접 사용하여 정확한 날짜 계산
export const getKSTDate = () => {
  // 한국 시간대의 현재 시간을 가져옴
  const now = new Date()
  const kstTimeString = now.toLocaleString("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
  // "MM/DD/YYYY, HH:MM:SS" 형식을 파싱
  const [datePart, timePart] = kstTimeString.split(", ")
  const [month, day, year] = datePart.split("/")
  const [hour, minute, second] = timePart.split(":")
  return new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  )
}

const getKSTDateString = () => {
  return getKSTDate().toDateString()
}

export const getKSTDateISO = () => {
  // KST 문자열에서 연/월/일만 사용 (Date 객체의 로컬 해석 방지)
  const now = new Date()
  const kstTimeString = now.toLocaleString("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour12: false,
  })
  const [datePart] = kstTimeString.split(", ")
  const [month, day, year] = datePart.split("/")
  return `${year}-${month}-${day}` // YYYY-MM-DD
}

export class ApiClient {
  // 문서 생성
  static async createDocument<T>(
    collectionName: string,
    data: Omit<T, "id">
  ): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      return docRef.id
    } catch {
      throw new Error("문서 생성에 실패했습니다.")
    }
  }

  // 피드백 목록 가져오기 (관리자용)
  static async getFeedbackList(): Promise<
    {
      id: string
      userId: string
      userEmail: string
      userName: string
      type: "bug" | "feature" | "improvement" | "other"
      title: string
      content: string
      status: "pending" | "in_progress" | "completed"
      createdAt: string
      updatedAt: string
    }[]
  > {
    try {
      const feedbackRef = collection(db, "feedback")
      const q = query(feedbackRef, where("status", "!=", "deleted"))
      const snapshot = await getDocs(q)

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as {
        id: string
        userId: string
        userEmail: string
        userName: string
        type: "bug" | "feature" | "improvement" | "other"
        title: string
        content: string
        status: "pending" | "in_progress" | "completed"
        createdAt: string
        updatedAt: string
      }[]
    } catch {
      throw new Error("피드백 목록을 가져오는데 실패했습니다.")
    }
  }

  // 피드백 상태 업데이트 (관리자용)
  static async updateFeedbackStatus(
    feedbackId: string,
    status: "pending" | "in_progress" | "completed"
  ): Promise<void> {
    try {
      const feedbackRef = doc(db, "feedback", feedbackId)
      await updateDoc(feedbackRef, {
        status,
        updatedAt: new Date().toISOString(),
      })
    } catch {
      throw new Error("피드백 상태 업데이트에 실패했습니다.")
    }
  }

  // 피드백 삭제 (관리자용)
  static async deleteFeedback(feedbackId: string): Promise<void> {
    try {
      const feedbackRef = doc(db, "feedback", feedbackId)
      await deleteDoc(feedbackRef)
    } catch {
      throw new Error("피드백 삭제에 실패했습니다.")
    }
  }

  // 문서 조회
  static async getDocument<T>(
    collectionName: string,
    id: string
  ): Promise<T | null> {
    try {
      const docRef = doc(db, collectionName, id)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T
      }
      return null
    } catch (error) {
      console.error("문서 조회 실패:", error)
      throw new Error("문서 조회에 실패했습니다.")
    }
  }

  // 문서 업데이트
  static async updateDocument(
    collectionName: string,
    id: string,
    data: Partial<DocumentData>
  ): Promise<void> {
    try {
      const docRef = doc(db, collectionName, id)
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error("문서 업데이트 실패:", error)
      throw new Error("문서 업데이트에 실패했습니다.")
    }
  }

  // 문서 삭제
  static async deleteDocument(
    collectionName: string,
    id: string
  ): Promise<void> {
    try {
      const docRef = doc(db, collectionName, id)
      await deleteDoc(docRef)
    } catch (error) {
      console.error("문서 삭제 실패:", error)
      throw new Error("문서 삭제에 실패했습니다.")
    }
  }

  // 문서 쿼리
  static async queryDocuments<T>(
    collectionName: string,
    constraints: QueryConstraint[] = []
  ): Promise<T[]> {
    try {
      const q = query(collection(db, collectionName), ...constraints)
      const querySnapshot = await getDocs(q)

      return querySnapshot.docs.map((doc: QueryDocumentSnapshot) => ({
        id: doc.id,
        ...doc.data(),
      })) as T[]
    } catch (error) {
      console.error("문서 쿼리 실패:", error)
      // 오류가 발생해도 빈 배열을 반환하여 앱이 중단되지 않도록 함
      return []
    }
  }

  // 사용자별 데이터 조회
  static async getUserData<T>(
    collection: string,
    userId: string
  ): Promise<T[]> {
    try {
      const userRef = doc(db, "users", userId)
      const userDoc = await getDoc(userRef)

      if (!userDoc.exists()) {
        return []
      }

      const userData = userDoc.data()
      return (userData[collection] as T[]) || []
    } catch (error) {
      console.error("사용자 데이터 조회 실패:", error)
      return []
    }
  }

  // 등급별 한자 조회
  static async getHanziByGrade(grade: number): Promise<Hanzi[]> {
    try {
      const gradeConstraint = where("grade", "==", grade)

      const results = await this.queryDocuments<Hanzi>("hanzi", [
        gradeConstraint,
      ])

      // gradeNumber 순서대로 정렬
      const sortedResults = results.sort(
        (a, b) => (a.gradeNumber || 0) - (b.gradeNumber || 0)
      )

      return sortedResults
    } catch (error) {
      console.error("등급별 한자 조회 실패:", error)
      // 오류가 발생해도 빈 배열을 반환하여 앱이 중단되지 않도록 함
      return []
    }
  }

  // 모든 한자 조회 (테스트용)
  static async getAllHanzi(): Promise<Hanzi[]> {
    try {
      const results = await this.queryDocuments<Hanzi>("hanzi", [])

      return results
    } catch (error) {
      console.error("등급별 한자 조회 실패:", error)
      return []
    }
  }

  // 한자 데이터 오류 신고 (관련단어 잘못됨 등)
  static async reportHanziDataIssue(
    hanziId: string,
    reportedRelatedWord?: string
  ): Promise<void> {
    try {
      await this.updateDocument("hanzi", hanziId, {
        hasDataIssue: true,
        ...(reportedRelatedWord && { reportedRelatedWord }),
      })
    } catch (error) {
      console.error("한자 데이터 신고 실패:", error)
      throw error
    }
  }

  /** 한자 추가/수정/삭제 등 변경 시 신고 상태 해제 (신고 안 된 한자로 전환) */
  static async clearHanziDataIssue(hanziId: string): Promise<void> {
    try {
      const docRef = doc(db, "hanzi", hanziId)
      await updateDoc(docRef, {
        hasDataIssue: false,
        reportedRelatedWord: deleteField(),
        updatedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error("한자 신고 상태 해제 실패:", error)
      throw error
    }
  }

  // 사용자 통계 조회
  static async getUserStatistics(
    userId: string
  ): Promise<UserStatistics | null> {
    const userConstraint = where("userId", "==", userId)
    const results = await this.queryDocuments<UserStatistics>(
      "userStatistics",
      [userConstraint]
    )
    return results.length > 0 ? results[0] : null
  }

  // 사용자 총 학습시간 업데이트
  static async updateTotalStudyTime(
    userId: string,
    additionalTime: number
  ): Promise<void> {
    try {
      const userStats = await this.getUserStatistics(userId)

      if (userStats) {
        // 기존 통계 업데이트
        const currentTotalTime = userStats.totalStudyTime || 0
        const newTotalTime = currentTotalTime + additionalTime

        await this.updateDocument("userStatistics", userStats.id!, {
          totalStudyTime: newTotalTime,
        })
      } else {
        // 새로운 userStatistics 생성
        await this.createDocument("userStatistics", {
          userId,
          totalStudyTime: additionalTime,
          totalSessions: 0,
          todayExperience: 0,
          todayGoal: 100,
          lastResetDate: getKSTDateString(),
          lastPlayedAt: new Date().toISOString(),
          goalAchievementHistory: [],
          consecutiveGoalDays: 0,
          weeklyGoalAchievement: {
            currentWeek: this.getWeekNumber(getKSTDate()),
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
      }
    } catch (error) {
      console.error("사용자 통계 업데이트 실패:", error)
      throw error
    }
  }

  // 사용자 총 학습시간 조회
  static async getTotalStudyTime(userId: string): Promise<number> {
    try {
      const userStats = await this.getUserStatistics(userId)
      return userStats?.totalStudyTime || 0
    } catch (error) {
      console.error("총 학습시간 조회 실패:", error)
      return 0
    }
  }

  // 사용자 경험치 업데이트
  static async updateUserExperience(
    userId: string,
    experience: number
  ): Promise<void> {
    try {
      // 사용자 문서 업데이트
      const userRef = doc(db, "users", userId)
      await updateDoc(userRef, {
        experience: experience,
        updatedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error("경험치 업데이트 실패:", error)
      throw new Error("경험치 업데이트에 실패했습니다.")
    }
  }

  // 사용자 경험치 추가
  static async addUserExperience(
    userId: string,
    experienceToAdd: number
  ): Promise<void> {
    try {
      console.log("🔍 사용자 경험치 업데이트 시작:", {
        userId,
        experienceToAdd,
      })

      const userRef = doc(db, "users", userId)
      const userDoc = await getDoc(userRef)

      if (userDoc.exists()) {
        const currentData = userDoc.data()
        const currentExperience = currentData.experience || 0
        const newExperience = currentExperience + experienceToAdd
        const newLevel = calculateLevel(newExperience)

        console.log("📊 경험치 업데이트 정보:", {
          userId,
          currentExperience,
          experienceToAdd,
          newExperience,
          currentLevel: currentData.level || 1,
          newLevel,
        })

        const updatedData = {
          experience: newExperience,
          level: newLevel,
          updatedAt: new Date().toISOString(),
        }

        await updateDoc(userRef, updatedData)
        console.log("✅ 사용자 경험치 업데이트 완료:", {
          userId,
          newExperience,
          newLevel,
        })
      } else {
        console.error("❌ 사용자 문서를 찾을 수 없습니다:", userId)
        throw new Error("사용자를 찾을 수 없습니다.")
      }
    } catch (error) {
      console.error("❌ 경험치 업데이트 오류:", error)
      throw new Error("경험치 추가에 실패했습니다.")
    }
  }

  // 사용자 선호 급수 업데이트
  static async updateUserPreferredGrade(
    userId: string,
    preferredGrade: number
  ): Promise<void> {
    try {
      const userRef = doc(db, "users", userId)
      await updateDoc(userRef, {
        preferredGrade,
        updatedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error("선호 급수 업데이트 실패:", error)
      throw new Error("선호 급수 업데이트에 실패했습니다.")
    }
  }

  // 한자 쓰기 통계 업데이트
  static async updateHanziWritingStatistics(
    userId: string,
    hanziId: string,
    character: string,
    grade: number
  ): Promise<void> {
    try {
      console.log("📊 한자 쓰기 통계 업데이트:", {
        userId,
        hanziId,
        character,
        grade,
      })

      // 기존 hanziStatistics에서 해당 한자 통계 찾기
      const hanziStatsRef = collection(db, "hanziStatistics")
      const q = query(
        hanziStatsRef,
        where("userId", "==", userId),
        where("hanziId", "==", hanziId)
      )
      const snapshot = await getDocs(q)

      const now = new Date().toISOString()
      const today = getKSTDateISO() // 한국시간 기준 YYYY-MM-DD

      if (!snapshot.empty) {
        // 기존 통계 업데이트
        const existingDoc = snapshot.docs[0]
        const currentData = existingDoc.data()
        const lastWrited = currentData.lastWrited || ""

        // 오늘 이미 연습했는지 확인
        if (lastWrited.startsWith(today)) {
          console.log("⚠️ 오늘 이미 연습한 한자:", { character, lastWrited })
          throw new Error(`오늘 이미 '${character}' 한자를 연습하셨습니다.`)
        }

        await updateDoc(existingDoc.ref, {
          totalWrited: (currentData.totalWrited || 0) + 1,
          lastWrited: now,
          updatedAt: now,
        })

        console.log("✅ 한자 쓰기 통계 업데이트 완료 (기존):", {
          character,
          totalWrited: (currentData.totalWrited || 0) + 1,
        })
      } else {
        // 새 통계 생성
        const newStatsRef = doc(collection(db, "hanziStatistics"))
        await setDoc(newStatsRef, {
          id: newStatsRef.id,
          userId,
          hanziId,
          character,
          grade,
          totalWrited: 1,
          lastWrited: now,
          createdAt: now,
          updatedAt: now,
        })

        console.log("✅ 한자 쓰기 통계 생성 완료 (신규):", {
          character,
          totalWrited: 1,
        })
      }
    } catch (error) {
      console.error("❌ 한자 쓰기 통계 업데이트 오류:", error)
      throw error
    }
  }

  // 오늘 달성한 경험치 조회 (userStatistics에서 가져오기)
  static async getTodayExperience(userId: string): Promise<number> {
    try {
      // userStatistics에서 todayExperience 가져오기
      const userStats = await this.getUserStatistics(userId)
      return userStats?.todayExperience || 0
    } catch (error) {
      console.error("오늘 경험치 조회 실패:", error)
      return 0 // 에러 시 0 반환
    }
  }

  // 오늘 경험치 업데이트 (userStatistics에 저장)
  static async updateTodayExperience(
    userId: string,
    experienceToAdd: number,
    onBonusEarned?: (
      consecutiveDays: number,
      bonusExperience: number,
      averageGoal: number,
      milestone: number,
      isOneYearReset: boolean
    ) => void
  ): Promise<void> {
    try {
      // 기존 userStatistics 조회
      const userStats = await this.getUserStatistics(userId)

      if (userStats) {
        // 기존 통계 업데이트
        const userStatsRef = doc(db, "userStatistics", userStats.id!)
        const newTodayExperience =
          (userStats.todayExperience || 0) + experienceToAdd

        await updateDoc(userStatsRef, {
          todayExperience: newTodayExperience,
          updatedAt: new Date().toISOString(),
        })

        // 목표 달성 통계도 함께 업데이트 (보너스 콜백 포함)
        await this.updateGoalAchievementStats(
          userId,
          newTodayExperience,
          onBonusEarned
        )
      } else {
        // 새로운 userStatistics 생성
        const newStatsRef = doc(collection(db, "userStatistics"))
        await setDoc(newStatsRef, {
          id: newStatsRef.id,
          userId,
          totalSessions: 0,
          todayExperience: experienceToAdd,
          todayGoal: 100, // 기본 목표값
          lastPlayedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })

        // 목표 달성 통계도 함께 업데이트 (보너스 콜백 포함)
        await this.updateGoalAchievementStats(
          userId,
          experienceToAdd,
          onBonusEarned
        )
      }
    } catch (error) {
      console.error("오늘 경험치 업데이트 실패:", error)
      throw new Error("오늘 경험치 업데이트에 실패했습니다.")
    }
  }

  // 오늘의 학습 목표 업데이트
  static async updateTodayGoal(userId: string, goal: number): Promise<void> {
    try {
      const userStats = await this.getUserStatistics(userId)

      if (userStats) {
        // 기존 통계 업데이트
        const userStatsRef = doc(db, "userStatistics", userStats.id!)
        await updateDoc(userStatsRef, {
          todayGoal: goal,
          updatedAt: new Date().toISOString(),
        })
      } else {
        // 새로운 userStatistics 생성
        const newStatsRef = doc(collection(db, "userStatistics"))
        await setDoc(newStatsRef, {
          id: newStatsRef.id,
          userId,
          totalSessions: 0,
          todayExperience: 0,
          todayGoal: goal,
          lastResetDate: getKSTDateString(),
          lastPlayedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }
    } catch (error) {
      console.error("오늘의 학습 목표 업데이트 실패:", error)
      throw new Error("오늘의 학습 목표 업데이트에 실패했습니다.")
    }
  }

  // 목표 달성 통계 업데이트 (오늘 경험치 업데이트 시 호출)
  static async updateGoalAchievementStats(
    userId: string,
    todayExperience: number,
    onBonusEarned?: (
      consecutiveDays: number,
      bonusExperience: number,
      averageGoal: number,
      milestone: number,
      isOneYearReset: boolean
    ) => void
  ): Promise<void> {
    try {
      const userStats = await this.getUserStatistics(userId)
      if (!userStats) return

      const today = getKSTDateISO() // 한국시간 기준 YYYY-MM-DD
      const todayGoal = userStats.todayGoal || 100

      // 목표가 0 이하일 때는 달성으로 처리하지 않음
      const achieved = todayGoal > 0 && todayExperience >= todayGoal

      // 오늘 목표 달성 기록 추가 (목표값 저장하여 평균 목표 계산에 사용)
      const todayRecord = {
        date: today,
        achieved,
        experience: todayExperience,
        goal: todayGoal,
      }

      // 기존 기록에서 오늘 기록 업데이트 또는 추가
      const existingHistory = userStats.goalAchievementHistory || []
      const todayIndex = existingHistory.findIndex(
        (record) => record.date === today
      )

      let newHistory: Array<{
        date: string
        achieved: boolean
        experience: number
        goal?: number
      }>
      if (todayIndex >= 0) {
        newHistory = [...existingHistory]
        newHistory[todayIndex] = todayRecord
      } else {
        newHistory = [...existingHistory, todayRecord]
      }

      // 리셋일 이후 기록만 사용 (1년 달성 후 리셋 시)
      const resetAt = userStats.consecutiveDaysResetAt
      const effectiveHistory = resetAt
        ? newHistory.filter((r) => r.date > resetAt)
        : newHistory

      // 연속 목표 달성일 계산
      const consecutiveDays =
        ApiClient.calculateConsecutiveGoalDays(effectiveHistory)

      // 연속 달성 마일스톤 보너스 (10일 단위 1회만 지급)
      const MILESTONES = [10, 20, 30, 100, 200, 365] as const
      const PERCENTAGES: Record<number, number> = {
        10: 0.5,
        20: 0.55,
        30: 0.6,
        100: 0.6,
        200: 0.7,
        365: 0.9,
      }
      const lastGiven = userStats.lastConsecutiveDaysBonusGiven ?? 0
      const milestoneToGive = [...MILESTONES]
        .sort((a, b) => b - a)
        .find((M) => consecutiveDays >= M && lastGiven < M)

      let bonusExperience = 0
      let bonusMilestone: number | undefined
      let isOneYearReset = false

      if (milestoneToGive != null) {
        // 연속 구간 날짜 목록으로 평균 목표 계산
        const streakDates = ApiClient.getConsecutiveStreakDates(effectiveHistory)
        const historyByDate = new Map(
          newHistory.map((r) => [r.date, r])
        )
        let sumGoal = 0
        let count = 0
        for (const d of streakDates) {
          const rec = historyByDate.get(d)
          const g = rec?.goal ?? todayGoal
          sumGoal += g
          count++
        }
        const averageGoal = count > 0 ? sumGoal / count : todayGoal

        const pct = PERCENTAGES[milestoneToGive] ?? 0.5
        bonusExperience = Math.round(averageGoal * pct)
        bonusMilestone = milestoneToGive
        if (milestoneToGive === 365) {
          isOneYearReset = true
        }

        if (bonusExperience > 0) {
          const userRef = doc(db, "users", userId)
          const userDoc = await getDoc(userRef)
          if (userDoc.exists()) {
            const currentExp = userDoc.data().experience || 0
            const newExp = currentExp + bonusExperience
            const newLevel = calculateLevel(newExp)

            await updateDoc(userRef, {
              experience: newExp,
              level: newLevel,
              updatedAt: new Date().toISOString(),
            })
          }

          if (onBonusEarned) {
            onBonusEarned(
              consecutiveDays,
              bonusExperience,
              Math.round(averageGoal),
              bonusMilestone,
              isOneYearReset
            )
          }
        }
      }

      // 주간이 바뀌었는지 확인 (한국 시간 기준, 월요일 00:00 기준)
      const kstToday = getKSTDate()
      const currentWeek = this.getWeekNumber(kstToday)
      const lastWeek = userStats.lastWeekNumber || ""
      const isNewWeek = lastWeek !== currentWeek

      // 이번주/이번달 달성 현황 계산
      let weeklyStats = this.calculateWeeklyGoalAchievement(newHistory)
      const monthlyStats = this.calculateMonthlyGoalAchievement(newHistory)

      // 주간 달성 보너스 체크 (하루 목표 100 이상이고, 이번주 7일 모두 달성했을 때)
      const lastWeeklyBonusWeek = userStats.lastWeeklyBonusWeek || ""
      if (
        todayGoal >= 100 &&
        weeklyStats.achievedDays === 7 &&
        weeklyStats.totalDays === 7 &&
        lastWeeklyBonusWeek !== currentWeek &&
        !isNewWeek
      ) {
        // 주간 보너스 경험치 계산 (목표 * 3)
        const weeklyBonus = todayGoal * 3

        // users 컬렉션에 주간 보너스 경험치 추가
        const userRef = doc(db, "users", userId)
        const userDoc = await getDoc(userRef)
        if (userDoc.exists()) {
          const currentExp = userDoc.data().experience || 0
          const newExp = currentExp + weeklyBonus
          const newLevel = calculateLevel(newExp)

          await updateDoc(userRef, {
            experience: newExp,
            level: newLevel,
            updatedAt: new Date().toISOString(),
          })
          // 주간 보너스는 별도 모달 없이 적용만 함
        }
      }

      // 새로운 주가 시작되었으면 주간 달성 초기화
      if (isNewWeek) {
        weeklyStats = {
          currentWeek,
          achievedDays: 0,
          totalDays: 7,
        }
      }

      // 데이터베이스 업데이트
      const userStatsRef = doc(db, "userStatistics", userStats.id!)
      const updateData: Record<string, unknown> = {
        goalAchievementHistory: newHistory,
        consecutiveGoalDays: consecutiveDays,
        weeklyGoalAchievement: weeklyStats,
        monthlyGoalAchievement: monthlyStats,
        lastWeekNumber: currentWeek,
        updatedAt: new Date().toISOString(),
      }

      if (bonusMilestone != null) {
        updateData.lastConsecutiveDaysBonusGiven = bonusMilestone
        if (isOneYearReset) {
          updateData.consecutiveDaysResetAt = today
        }
      }

      if (
        todayGoal >= 100 &&
        weeklyStats.achievedDays === 7 &&
        weeklyStats.totalDays === 7 &&
        lastWeeklyBonusWeek !== currentWeek &&
        !isNewWeek
      ) {
        updateData.lastWeeklyBonusWeek = currentWeek
      }

      await updateDoc(userStatsRef, updateData)
    } catch (error) {
      console.error("목표 달성 통계 업데이트 실패:", error)
    }
  }

  // 연속 목표 달성일 계산 (한국 시간 기준 자정 기준)
  // public 메서드로 변경하여 외부에서도 사용 가능하도록
  static calculateConsecutiveGoalDays(
    history: Array<{ date: string; achieved: boolean; experience: number }>
  ): number {
    if (!history || history.length === 0) return 0

    // 한국 시간 기준 오늘 날짜
    const today = getKSTDateISO()

    // 날짜별 달성 여부를 Map으로 변환 (빠른 조회를 위해)
    const historyMap = new Map<string, boolean>()
    history.forEach((record) => {
      historyMap.set(record.date, record.achieved)
    })

    // 오늘 기록 확인
    const todayRecord = historyMap.get(today)

    // 오늘 기록이 있고 달성했으면 오늘부터 역순으로 계산
    if (todayRecord === true) {
      let consecutiveDays = 0
      let currentDate = today

      while (true) {
        const achieved = historyMap.get(currentDate)
        if (achieved === undefined || !achieved) {
          break
        }

        consecutiveDays++

        // 하루 전 날짜 계산
        const date = new Date(currentDate + "T00:00:00")
        date.setDate(date.getDate() - 1)
        currentDate =
          date.getFullYear() +
          "-" +
          String(date.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(date.getDate()).padStart(2, "0")
      }

      return consecutiveDays
    }

    // 오늘 기록이 없거나 달성하지 못한 경우
    // 자정 전: 어제부터 역순으로 계산하여 연속 달성일 유지
    // 자정 후: 오늘 기록이 없으면 0 (이미 새로운 날이므로 어제 기록 확인)

    // 어제 날짜 계산
    const todayDate = new Date(today + "T00:00:00")
    todayDate.setDate(todayDate.getDate() - 1)
    const yesterday =
      todayDate.getFullYear() +
      "-" +
      String(todayDate.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(todayDate.getDate()).padStart(2, "0")

    // 어제 기록 확인
    const yesterdayRecord = historyMap.get(yesterday)

    // 어제 기록이 없거나 달성하지 못했으면 0 (연속 끊김)
    if (yesterdayRecord === undefined || !yesterdayRecord) {
      return 0
    }

    // 어제 기록이 있으면 어제부터 역순으로 계산
    let consecutiveDays = 0
    let currentDate = yesterday

    while (true) {
      const achieved = historyMap.get(currentDate)
      if (achieved === undefined || !achieved) {
        break
      }

      consecutiveDays++

      // 하루 전 날짜 계산
      const date = new Date(currentDate + "T00:00:00")
      date.setDate(date.getDate() - 1)
      currentDate =
        date.getFullYear() +
        "-" +
        String(date.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(date.getDate()).padStart(2, "0")
    }

    return consecutiveDays
  }

  // 연속 달성 구간의 날짜 목록 반환 (평균 목표 계산용)
  static getConsecutiveStreakDates(
    history: Array<{ date: string; achieved: boolean; experience: number }>
  ): string[] {
    if (!history || history.length === 0) return []

    const today = getKSTDateISO()
    const historyMap = new Map<string, boolean>()
    history.forEach((record) => {
      historyMap.set(record.date, record.achieved)
    })

    const todayRecord = historyMap.get(today)
    const dates: string[] = []

    if (todayRecord === true) {
      let currentDate = today
      while (true) {
        const achieved = historyMap.get(currentDate)
        if (achieved === undefined || !achieved) break
        dates.push(currentDate)
        const date = new Date(currentDate + "T00:00:00")
        date.setDate(date.getDate() - 1)
        currentDate =
          date.getFullYear() +
          "-" +
          String(date.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(date.getDate()).padStart(2, "0")
      }
      return dates
    }

    const todayDate = new Date(today + "T00:00:00")
    todayDate.setDate(todayDate.getDate() - 1)
    const yesterday =
      todayDate.getFullYear() +
      "-" +
      String(todayDate.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(todayDate.getDate()).padStart(2, "0")

    if (historyMap.get(yesterday) === undefined || !historyMap.get(yesterday)) {
      return []
    }

    let currentDate = yesterday
    while (true) {
      const achieved = historyMap.get(currentDate)
      if (achieved === undefined || !achieved) break
      dates.push(currentDate)
      const date = new Date(currentDate + "T00:00:00")
      date.setDate(date.getDate() - 1)
      currentDate =
        date.getFullYear() +
        "-" +
        String(date.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(date.getDate()).padStart(2, "0")
    }
    return dates
  }

  // 이번주 목표 달성 현황 계산 (한국 시간 기준, 월요일~일요일)
  private static calculateWeeklyGoalAchievement(
    history: Array<{ date: string; achieved: boolean; experience: number }>
  ): {
    currentWeek: string
    achievedDays: number
    totalDays: number
  } {
    const today = getKSTDate() // 한국 시간 기준
    const currentWeek = this.getWeekNumber(today)

    // 이번주 시작일과 끝일 계산 (월요일 ~ 일요일)
    const weekStart = this.getWeekStart(today)
    const weekEnd = this.getWeekEnd(today)

    let achievedDays = 0
    let totalDays = 0

    // 이번주 기록 확인 (월요일부터 일요일까지 7일)
    for (
      let d = new Date(weekStart);
      d <= weekEnd;
      d.setDate(d.getDate() + 1)
    ) {
      // 한국 시간 기준 날짜 문자열 생성
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, "0")
      const day = String(d.getDate()).padStart(2, "0")
      const dateStr = `${year}-${month}-${day}`
      
      const record = history.find((h) => h.date === dateStr)

      // 항상 totalDays는 증가 (일주일은 7일)
      totalDays++

      // 기록이 있으면 달성 여부 확인
      if (record && record.achieved) {
        achievedDays++
      }
    }

    return {
      currentWeek,
      achievedDays,
      totalDays: totalDays, // 항상 7일
    }
  }

  // 이번달 목표 달성 현황 계산
  private static calculateMonthlyGoalAchievement(
    history: Array<{ date: string; achieved: boolean; experience: number }>
  ): {
    currentMonth: string
    achievedDays: number
    totalDays: number
  } {
    const today = getKSTDate() // 한국 시간 기준
    const currentMonth = today.toISOString().slice(0, 7) // YYYY-MM

    // 이번달 시작일과 끝일 계산
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    let achievedDays = 0
    let totalDays = 0

    // 이번달 기록 확인 (해당 월의 총 날짜)
    for (
      let d = new Date(monthStart);
      d <= monthEnd;
      d.setDate(d.getDate() + 1)
    ) {
      const dateStr = d.toISOString().split("T")[0]
      const record = history.find((h) => h.date === dateStr)

      // 항상 totalDays는 증가 (해당 월의 총 날짜)
      totalDays++

      // 기록이 있으면 달성 여부 확인
      if (record && record.achieved) {
        achievedDays++
      }
    }

    return {
      currentMonth,
      achievedDays,
      totalDays,
    }
  }

  // 주차 번호 계산 (YYYY-WW 형식)
  static getWeekNumber(date: Date): string {
    const year = date.getFullYear()
    const startOfYear = new Date(year, 0, 1)
    const days = Math.floor(
      (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
    )
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7)
    return `${year}-${weekNumber.toString().padStart(2, "0")}`
  }

  // 주 시작일 계산 (월요일)
  private static getWeekStart(date: Date): Date {
    const day = date.getDay()
    // 월요일이 1, 일요일이 0이므로 월요일을 시작으로 설정
    const diff = date.getDate() - (day === 0 ? 6 : day - 1)
    return new Date(date.getFullYear(), date.getMonth(), diff)
  }

  // 주 끝일 계산 (일요일)
  private static getWeekEnd(date: Date): Date {
    const weekStart = this.getWeekStart(date)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    return weekEnd
  }

  // 오늘 경험치 리셋 (자정에 호출)
  static async resetTodayExperience(userId: string): Promise<void> {
    try {
      const userStats = await this.getUserStatistics(userId)

      if (userStats) {
        const userStatsRef = doc(db, "userStatistics", userStats.id!)
        await updateDoc(userStatsRef, {
          todayExperience: 0,
          updatedAt: new Date().toISOString(),
        })
      }
    } catch (error) {
      console.error("Error resetting today's experience:", error)
      throw new Error("오늘 경험치 리셋에 실패했습니다.")
    }
  }

  // 자정 리셋 확인 및 처리 (데이터베이스 기반)
  static async checkAndResetTodayExperience(userId: string): Promise<void> {
    try {
      let userStats = await this.getUserStatistics(userId)

      // userStatistics가 없으면 잠시 대기 후 다시 확인 (네트워크 지연 대응)
      if (!userStats) {
        await new Promise((resolve) => setTimeout(resolve, 1000)) // 1초 대기
        userStats = await this.getUserStatistics(userId)
      }

      if (!userStats) {
        // 여전히 없으면 생성 (기존 데이터 보존)
        await this.initializeUserStatistics(userId)
        return
      }

      const today = getKSTDateString() // 한국시간 기준 날짜 문자열
      const lastResetDate = userStats.lastResetDate || ""

      if (lastResetDate !== today) {
        // 자정이 지났으면 오늘 경험치 리셋
        const userStatsRef = doc(db, "userStatistics", userStats.id!)
        await updateDoc(userStatsRef, {
          todayExperience: 0,
          lastResetDate: today,
          updatedAt: new Date().toISOString(),
        })
      }

      // 주간 리셋 확인 (월요일 00:00 기준) - 한국 시간 기준
      const kstToday = getKSTDate()
      const currentWeek = this.getWeekNumber(kstToday)
      const lastWeek = userStats.lastWeekNumber || ""

      if (lastWeek !== currentWeek) {
        // 새로운 주가 시작되었으면 주간 달성 초기화 (월요일 00:00)
        const userStatsRef = doc(db, "userStatistics", userStats.id!)
        await updateDoc(userStatsRef, {
          lastWeekNumber: currentWeek,
          weeklyGoalAchievement: {
            currentWeek: currentWeek,
            achievedDays: 0,
            totalDays: 7,
          },
          updatedAt: new Date().toISOString(),
        })
      }
    } catch (error) {
      console.error("Error checking and resetting today's experience:", error)
      throw new Error("오늘 경험치 리셋 확인에 실패했습니다.")
    }
  }

  // 모든 사용자에게 기본 선호 급수 설정 (마이그레이션용)
  static async ensureAllUsersHavePreferredGrade(): Promise<void> {
    try {
      const usersRef = collection(db, "users")
      const usersSnapshot = await getDocs(usersRef)

      const updatePromises: Promise<void>[] = []

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data()

        // preferredGrade 필드가 없거나 undefined인 경우 8로 설정
        if (
          !userData.hasOwnProperty("preferredGrade") ||
          userData.preferredGrade === undefined
        ) {
          const updatePromise = updateDoc(userDoc.ref, {
            preferredGrade: 8,
            updatedAt: new Date().toISOString(),
          })
          updatePromises.push(updatePromise)
        }
      }

      if (updatePromises.length > 0) {
        await Promise.all(updatePromises)
      } else {
      }
    } catch (error) {
      console.error("사용자 선호 급수 마이그레이션 실패:", error)
      throw error
    }
  }

  // 게임별 통계 업데이트 (기존 구조 - 제거 예정)
  static async updateGameStatistics(
    userId: string,
    gameType: "quiz" | "writing" | "partial" | "memory",
    gameData: {
      totalPlayed?: number
      correctAnswers?: number
      wrongAnswers?: number
      completedSessions?: number
      totalSessions?: number
    }
  ): Promise<void> {
    // 새로운 구조로 리다이렉트
    return this.updateGameStatisticsNew(userId, gameType, gameData)
  }

  // 게임별 통계 조회 (기존 구조 - 제거 예정)
  static async getGameStatistics(
    userId: string,
    gameType: "quiz" | "writing" | "partial" | "memory"
  ): Promise<{
    totalPlayed: number
    correctAnswers: number
    wrongAnswers: number
    completedSessions: number
    totalSessions: number
    accuracy: number
  } | null> {
    // 새로운 구조로 리다이렉트
    const allStats = await this.getGameStatisticsNew(userId)
    return allStats[gameType] || null
  }

  // 한자별 통계 업데이트 (기존 구조 - 제거 예정)
  static async updateHanziStatistics(
    userId: string,
    hanziId: string,
    gameType: "quiz" | "writing" | "partial" | "memory",
    isCorrect: boolean
  ): Promise<void> {
    // 새로운 구조로 리다이렉트
    return this.updateHanziStatisticsNew(userId, hanziId, gameType, isCorrect)
  }

  // 한자별 통계 조회 (기존 구조 - 제거 예정)
  static async getHanziStatistics(
    userId: string,
    hanziId: string
  ): Promise<{
    id?: string
    totalStudied: number
    correctAnswers: number
    wrongAnswers: number
    lastStudied: string | null
    accuracy: number
    // 쓰기 전용 필드 추가
    totalWrited?: number
    lastWrited?: string
    isKnown?: boolean
    createdAt?: string
    updatedAt?: string
  } | null> {
    // 새로운 구조로 리다이렉트
    const allStats = await this.getHanziStatisticsNew(userId)
    const hanziStat = allStats.find((stat) => stat.hanziId === hanziId)

    if (!hanziStat) {
      return {
        totalStudied: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        lastStudied: null,
        accuracy: 0,
        totalWrited: 0,
        lastWrited: undefined,
        isKnown: false,
      }
    }

    interface HanziStatData {
      id?: string
      totalStudied?: number
      correctAnswers?: number
      wrongAnswers?: number
      lastStudied?: string | null
      accuracy?: number
      totalWrited?: number
      lastWrited?: string | null
      isKnown?: boolean
      createdAt?: string | null
      updatedAt?: string | null
    }

    const statData = hanziStat as HanziStatData
    return {
      id: statData.id || "",
      totalStudied: statData.totalStudied || 0,
      correctAnswers: statData.correctAnswers || 0,
      wrongAnswers: statData.wrongAnswers || 0,
      lastStudied: statData.lastStudied || null,
      accuracy: statData.accuracy || 0,
      // 쓰기 전용 필드 포함
      totalWrited: statData.totalWrited || 0,
      lastWrited: statData.lastWrited || undefined,
      isKnown: statData.isKnown || false,
      createdAt: statData.createdAt || undefined,
      updatedAt: statData.updatedAt || undefined,
    }
  }

  // 급수별 한자 통계 조회
  static async getGradeHanziStatistics(
    userId: string,
    grade: number
  ): Promise<
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
    try {
      // 해당 급수의 한자들 조회
      const gradeHanzi = await this.getHanziByGrade(grade)

      // 새로운 구조의 한자 통계 조회
      const hanziStats = await this.getHanziStatisticsNew(userId)

      // 각 한자의 통계 매핑
      const hanziStatsMap = new Map()
      hanziStats.forEach((stat) => {
        hanziStatsMap.set(stat.hanziId, stat)
      })

      const result = gradeHanzi.map((hanzi) => {
        const stats = hanziStatsMap.get(hanzi.id)
        return {
          hanziId: hanzi.id,
          character: hanzi.character,
          meaning: hanzi.meaning,
          sound: hanzi.sound,
          gradeNumber: hanzi.gradeNumber || 0,
          totalStudied: stats?.totalStudied || 0,
          correctAnswers: stats?.correctAnswers || 0,
          wrongAnswers: stats?.wrongAnswers || 0,
          accuracy: stats?.accuracy || 0,
          lastStudied: stats?.lastStudied || null,
        }
      })

      // 학습한 횟수가 많은 순으로 정렬 (정답률이 높은 것 우선)
      return result.sort((a, b) => {
        // 학습한 한자 우선
        if (a.totalStudied > 0 && b.totalStudied === 0) return -1
        if (b.totalStudied > 0 && a.totalStudied === 0) return 1

        // 학습한 횟수가 많은 순
        if (a.totalStudied !== b.totalStudied) {
          return b.totalStudied - a.totalStudied
        }

        // 정답률이 높은 순
        return b.accuracy - a.accuracy
      })
    } catch (error) {
      console.error("Error getting grade hanzi statistics:", error)
      throw new Error("급수별 한자 통계 조회에 실패했습니다.")
    }
  }

  // 급수별 한자 학습 완료도 체크
  static async checkGradeCompletionStatus(
    userId: string,
    grade: number
  ): Promise<{
    totalHanzi: number
    completedHanzi: number
    completionRate: number
    isFullyCompleted: boolean
    isEligibleForBonus: boolean
  }> {
    try {
      // 해당 급수의 한자들 조회
      const gradeHanzi = await this.getHanziByGrade(grade)
      const totalHanzi = gradeHanzi.length

      // 새로운 구조의 한자 통계 조회
      const hanziStats = await this.getHanziStatisticsNew(userId)

      // 각 한자의 통계 매핑
      const hanziStatsMap = new Map()
      hanziStats.forEach((stat) => {
        hanziStatsMap.set(stat.hanziId, stat)
      })

      // 50번 이상 정답을 맞춘 한자 수 계산
      let completedHanzi = 0
      let eligibleForBonus = 0

      gradeHanzi.forEach((hanzi) => {
        const stats = hanziStatsMap.get(hanzi.id)
        if (stats && stats.correctAnswers >= 50) {
          completedHanzi++
        }
        if (stats && stats.correctAnswers >= 100) {
          eligibleForBonus++
        }
      })

      const completionRate =
        totalHanzi > 0 ? (completedHanzi / totalHanzi) * 100 : 0
      const isFullyCompleted = eligibleForBonus === totalHanzi
      const isEligibleForBonus = completionRate >= 80

      return {
        totalHanzi,
        completedHanzi,
        completionRate,
        isFullyCompleted,
        isEligibleForBonus,
      }
    } catch (error) {
      console.error("Error checking grade completion status:", error)
      throw new Error("급수별 학습 완료도 체크에 실패했습니다.")
    }
  }

  // 우선순위 기반 한자 선택
  static async getPrioritizedHanzi(
    userId: string,
    grade: number,
    count: number
  ): Promise<Hanzi[]> {
    try {
      // 해당 급수의 한자들 조회
      const gradeHanzi = await this.getHanziByGrade(grade)

      // 새로운 구조의 한자 통계 조회
      const hanziStats = await this.getHanziStatisticsNew(userId)

      // 각 한자의 통계 매핑
      const hanziStatsMap = new Map()
      hanziStats.forEach((stat) => {
        hanziStatsMap.set(stat.hanziId, stat)
      })

      const hanziWithStats = gradeHanzi.map((hanzi) => {
        const stats = hanziStatsMap.get(hanzi.id)
        return {
          ...hanzi,
          totalStudied: stats?.totalStudied || 0,
          correctAnswers: stats?.correctAnswers || 0,
          wrongAnswers: stats?.wrongAnswers || 0,
          accuracy: stats?.accuracy || 0,
          lastStudied: stats?.lastStudied || null,
          isKnown: stats?.isKnown || false, // 학습 완료 상태 추가
        }
      })

      // 우선순위 정렬:
      // 1. 학습 완료된 한자는 15% 빈도로 줄이기 (가중치 적용)
      // 2. 오답률이 높은 한자 우선 (accuracy가 낮은 순)
      // 3. 학습이 부족한 한자 우선 (totalStudied가 적은 순)
      // 4. 최근에 학습하지 않은 한자 우선 (lastStudied가 null이거나 오래된 순)

      // 학습 완료된 한자와 미완료 한자 분리
      const completedHanzi = hanziWithStats.filter((hanzi) => hanzi.isKnown)
      const incompleteHanzi = hanziWithStats.filter((hanzi) => !hanzi.isKnown)

      // 미완료 한자들을 우선순위에 따라 정렬
      const sortedIncomplete = incompleteHanzi.sort((a, b) => {
        // 1순위: 오답률이 높은 한자 우선
        if (a.accuracy !== b.accuracy) {
          return a.accuracy - b.accuracy // 낮은 정답률 우선
        }

        // 2순위: 학습이 부족한 한자 우선
        if (a.totalStudied !== b.totalStudied) {
          return a.totalStudied - b.totalStudied // 적은 학습 횟수 우선
        }

        // 3순위: 최근에 학습하지 않은 한자 우선
        if (a.lastStudied === null && b.lastStudied !== null) return -1
        if (b.lastStudied === null && a.lastStudied !== null) return 1
        if (a.lastStudied && b.lastStudied) {
          return (
            new Date(a.lastStudied).getTime() -
            new Date(b.lastStudied).getTime()
          )
        }

        // 모든 조건이 같으면 랜덤
        return Math.random() - 0.5
      })

      // 학습 완료된 한자들을 랜덤하게 섞기
      const shuffledCompleted = completedHanzi.sort(() => Math.random() - 0.5)

      // 10% 비율로 학습 완료된 한자 선택 (최소 0개, 최대 2개)
      const completedCount = Math.min(2, Math.floor(count * 0.1))
      const incompleteCount = count - completedCount

      // 미완료 한자에서 필요한 개수만큼 선택 (상위 50%에서 랜덤 선택)
      const topHalf = Math.ceil(sortedIncomplete.length / 2)
      const topHalfHanzi = sortedIncomplete.slice(0, topHalf)
      const shuffledTopHalf = topHalfHanzi.sort(() => Math.random() - 0.5)
      const selectedIncomplete = shuffledTopHalf.slice(
        0,
        Math.min(incompleteCount, shuffledTopHalf.length)
      )

      // 학습 완료된 한자에서 필요한 개수만큼 선택 (부족하면 전체 사용)
      const selectedCompleted = shuffledCompleted.slice(
        0,
        Math.min(completedCount, shuffledCompleted.length)
      )

      // 두 그룹을 합치고 랜덤하게 섞기
      let combined = [...selectedIncomplete, ...selectedCompleted]

      // 요청된 개수만큼 확보되지 않았다면 부족한 만큼 추가
      if (combined.length < count) {
        const remainingCount = count - combined.length

        // 미완료 한자가 더 있다면 추가
        if (selectedIncomplete.length < sortedIncomplete.length) {
          const additionalIncomplete = sortedIncomplete.slice(
            selectedIncomplete.length,
            selectedIncomplete.length + remainingCount
          )
          combined = [...combined, ...additionalIncomplete]
        }

        // 여전히 부족하다면 학습 완료된 한자로 채우기
        if (combined.length < count) {
          const stillRemaining = count - combined.length
          const additionalCompleted = shuffledCompleted.slice(
            selectedCompleted.length,
            selectedCompleted.length + stillRemaining
          )
          combined = [...combined, ...additionalCompleted]
        }

        // 그래도 부족하다면 전체 한자 목록에서 랜덤하게 선택
        if (combined.length < count) {
          const usedIds = new Set(combined.map((h) => h.id))
          const unusedHanzi = hanziWithStats.filter((h) => !usedIds.has(h.id))
          const shuffledUnused = unusedHanzi.sort(() => Math.random() - 0.5)
          const additionalRandom = shuffledUnused.slice(
            0,
            count - combined.length
          )
          combined = [...combined, ...additionalRandom]
        }
      }

      // 최종적으로 요청된 개수만큼 랜덤하게 섞어서 반환
      const finalSelection = combined.sort(() => Math.random() - 0.5)
      return finalSelection.slice(0, count)
    } catch (error) {
      console.error("Error getting prioritized hanzi:", error)
      throw new Error("우선순위 기반 한자 선택에 실패했습니다.")
    }
  }

  // 새로운 분리된 컬렉션 구조의 함수들

  /**
   * 게임 통계 업데이트 (새로운 구조)
   */
  static async updateGameStatisticsNew(
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
    try {
      // 기존 통계 찾기
      const gameStatsRef = collection(db, "gameStatistics")
      const q = query(
        gameStatsRef,
        where("userId", "==", userId),
        where("gameType", "==", gameType)
      )
      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        // 새로운 통계 생성
        console.log(`📝 새로운 게임 통계 생성: ${gameType}`)
        const newStatsRef = doc(collection(db, "gameStatistics"))
        await setDoc(newStatsRef, {
          id: newStatsRef.id,
          userId,
          gameType,
          totalPlayed: stats.totalPlayed || 0,
          correctAnswers: stats.correctAnswers || 0,
          wrongAnswers: stats.wrongAnswers || 0,
          completedSessions: stats.completedSessions || 0,
          totalSessions: stats.totalSessions || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        console.log(
          `✅ 새로운 게임 통계 생성 완료: completedSessions=${
            stats.completedSessions || 0
          }`
        )
      } else {
        // 기존 통계 업데이트 (누적)
        const existingDoc = snapshot.docs[0]
        const existingData = existingDoc.data()

        const newTotalPlayed =
          existingData.totalPlayed + (stats.totalPlayed || 0)
        const newCorrectAnswers =
          existingData.correctAnswers + (stats.correctAnswers || 0)
        const newWrongAnswers =
          existingData.wrongAnswers + (stats.wrongAnswers || 0)
        const newCompletedSessions =
          existingData.completedSessions + (stats.completedSessions || 0)
        const newTotalSessions =
          existingData.totalSessions + (stats.totalSessions || 0)

        const updatedData = {
          ...existingData,
          totalPlayed: newTotalPlayed,
          correctAnswers: newCorrectAnswers,
          wrongAnswers: newWrongAnswers,
          completedSessions: newCompletedSessions,
          totalSessions: newTotalSessions,
          updatedAt: new Date().toISOString(),
        }

        await setDoc(existingDoc.ref, updatedData)
        console.log(
          `✅ 기존 게임 통계 업데이트 완료: completedSessions=${newCompletedSessions}`
        )
      }

      // userStatistics의 totalSessions도 함께 업데이트
      await this.updateUserStatisticsTotalSessions(
        userId,
        stats.completedSessions || 0 // totalPlayed 대신 completedSessions 사용
      )
    } catch (error) {
      throw error
    }
  }

  /**
   * userStatistics의 totalSessions 업데이트
   */
  static async updateUserStatisticsTotalSessions(
    userId: string,
    sessionsToAdd: number
  ): Promise<void> {
    try {
      const userStats = await this.getUserStatistics(userId)

      if (userStats) {
        // 기존 통계 업데이트

        const userStatsRef = doc(db, "userStatistics", userStats.id!)
        await updateDoc(userStatsRef, {
          totalSessions: (userStats.totalSessions || 0) + sessionsToAdd,
          updatedAt: new Date().toISOString(),
        })
      } else {
        // 새로운 userStatistics 생성
        const newStatsRef = doc(collection(db, "userStatistics"))
        await setDoc(newStatsRef, {
          id: newStatsRef.id,
          userId,
          totalSessions: sessionsToAdd,
          todayExperience: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * 한자 통계 업데이트 (새로운 구조)
   */
  static async updateHanziStatisticsNew(
    userId: string,
    hanziId: string,
    gameType: string,
    isCorrect: boolean
  ): Promise<void> {
    try {
      // 기존 통계 찾기
      const hanziStatsRef = collection(db, "hanziStatistics")
      const q = query(
        hanziStatsRef,
        where("userId", "==", userId),
        where("hanziId", "==", hanziId)
      )
      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        // 새로운 통계 생성
        const newStatsRef = doc(collection(db, "hanziStatistics"))
        await setDoc(newStatsRef, {
          id: newStatsRef.id,
          userId,
          hanziId,
          totalStudied: 1,
          correctAnswers: isCorrect ? 1 : 0,
          wrongAnswers: isCorrect ? 0 : 1,
          lastStudied: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      } else {
        // 기존 통계 업데이트
        const existingDoc = snapshot.docs[0]
        const existingData = existingDoc.data()

        const newTotalStudied = existingData.totalStudied + 1
        const newCorrectAnswers =
          existingData.correctAnswers + (isCorrect ? 1 : 0)
        const newWrongAnswers = existingData.wrongAnswers + (isCorrect ? 0 : 1)

        const updatedData = {
          ...existingData,
          totalStudied: newTotalStudied,
          correctAnswers: newCorrectAnswers,
          wrongAnswers: newWrongAnswers,
          lastStudied: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        await setDoc(existingDoc.ref, updatedData)
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * 한자 통계 직접 설정 (쓰기 연습용)
   */
  static async setHanziStatistics(
    userId: string,
    hanziId: string,
    statsData: {
      hanziId: string
      userId: string
      totalStudied: number
      correctAnswers: number
      wrongAnswers: number
      // 쓰기 전용 필드
      totalWrited?: number
      lastWrited?: string
      isKnown: boolean
      lastStudied: string
      createdAt: string
      updatedAt: string
    }
  ): Promise<void> {
    try {
      // 기존 통계 찾기
      const hanziStatsRef = collection(db, "hanziStatistics")
      const q = query(
        hanziStatsRef,
        where("userId", "==", userId),
        where("hanziId", "==", hanziId)
      )
      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        // 새로운 통계 생성
        const newStatsRef = doc(collection(db, "hanziStatistics"))
        await setDoc(newStatsRef, {
          id: newStatsRef.id,
          ...statsData,
        })
      } else {
        // 기존 통계 업데이트
        const existingDoc = snapshot.docs[0]
        await setDoc(existingDoc.ref, {
          ...statsData,
        })
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * 한자 통계 업데이트 (isKnown 필드 포함)
   */
  static async updateHanziStatisticsWithKnown(
    userId: string,
    hanziId: string,
    _gameType: string,
    isCorrect: boolean,
    isKnown?: boolean
  ): Promise<void> {
    try {
      // 기존 통계 찾기
      const hanziStatsRef = collection(db, "hanziStatistics")
      const q = query(
        hanziStatsRef,
        where("userId", "==", userId),
        where("hanziId", "==", hanziId)
      )
      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        // 새로운 통계 생성
        const newStatsRef = doc(collection(db, "hanziStatistics"))
        await setDoc(newStatsRef, {
          id: newStatsRef.id,
          userId,
          hanziId,
          totalStudied: 1,
          correctAnswers: isCorrect ? 1 : 0,
          wrongAnswers: isCorrect ? 0 : 1,
          isKnown: isKnown || false,
          lastStudied: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      } else {
        // 기존 통계 업데이트
        const existingDoc = snapshot.docs[0]
        const existingData = existingDoc.data()

        const newTotalStudied = existingData.totalStudied + 1
        const newCorrectAnswers =
          existingData.correctAnswers + (isCorrect ? 1 : 0)
        const newWrongAnswers = existingData.wrongAnswers + (isCorrect ? 0 : 1)

        const updatedData = {
          ...existingData,
          totalStudied: newTotalStudied,
          correctAnswers: newCorrectAnswers,
          wrongAnswers: newWrongAnswers,
          isKnown:
            isKnown !== undefined ? isKnown : existingData.isKnown || false,
          lastStudied: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        await setDoc(existingDoc.ref, updatedData)
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * 사용자의 게임 통계 가져오기 (새로운 구조)
   */
  static async getGameStatisticsNew(userId: string): Promise<{
    [gameType: string]: {
      totalPlayed: number
      correctAnswers: number
      wrongAnswers: number
      completedSessions: number
      totalSessions: number
      accuracy: number
    }
  }> {
    try {
      const gameStatsRef = collection(db, "gameStatistics")
      const q = query(gameStatsRef, where("userId", "==", userId))
      const snapshot = await getDocs(q)

      const gameStats: {
        [gameType: string]: {
          totalPlayed: number
          correctAnswers: number
          wrongAnswers: number
          completedSessions: number
          totalSessions: number
          accuracy: number
        }
      } = {}
      snapshot.docs.forEach((doc) => {
        const data = doc.data()
        gameStats[data.gameType] = {
          totalPlayed: data.totalPlayed || 0,
          correctAnswers: data.correctAnswers || 0,
          wrongAnswers: data.wrongAnswers || 0,
          completedSessions: data.completedSessions || 0,
          totalSessions: data.totalSessions || 0,
          accuracy: data.accuracy || 0,
        }
      })

      return gameStats
    } catch (error) {
      throw error
    }
  }

  /**
   * 사용자의 한자 통계 가져오기 (새로운 구조)
   */
  static async getHanziStatisticsNew(userId: string): Promise<
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
      isKnown?: boolean
      // 쓰기 전용 필드 추가
      totalWrited?: number
      lastWrited?: string
    }[]
  > {
    try {
      const hanziStatsRef = collection(db, "hanziStatistics")
      const q = query(hanziStatsRef, where("userId", "==", userId))
      const snapshot = await getDocs(q)

      return snapshot.docs.map(
        (doc) =>
          doc.data() as {
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
            isKnown?: boolean
          }
      )
    } catch (error) {
      throw error
    }
  }

  /**
   * 특정 급수의 한자들에 대한 한자 통계만 가져오기 (한자 목록 페이지용)
   */
  static async getHanziStatisticsByGrade(
    userId: string,
    grade: number
  ): Promise<
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
      isKnown?: boolean
    }[]
  > {
    try {
      // 1. 해당 급수의 한자들 조회
      const gradeHanzi = await this.getHanziByGrade(grade)

      if (gradeHanzi.length === 0) {
        return []
      }

      const gradeHanziIds = gradeHanzi.map((hanzi) => hanzi.id)

      // Firestore 'in' 쿼리 제한 확인 (최대 10개)
      if (gradeHanziIds.length > 10) {
        // 배치로 나누어 처리
        const batchSize = 10
        const allStats: {
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
          isKnown?: boolean
        }[] = []

        for (let i = 0; i < gradeHanziIds.length; i += batchSize) {
          const batch = gradeHanziIds.slice(i, i + batchSize)

          const hanziStatsRef = collection(db, "hanziStatistics")
          const q = query(
            hanziStatsRef,
            where("userId", "==", userId),
            where("hanziId", "in", batch)
          )

          const snapshot = await getDocs(q)
          const batchStats = snapshot.docs.map((doc) => {
            const data = doc.data()
            return {
              hanziId: data.hanziId || "",
              character: data.character || "",
              meaning: data.meaning || "",
              sound: data.sound || "",
              gradeNumber: data.gradeNumber || 0,
              totalStudied: data.totalStudied || 0,
              correctAnswers: data.correctAnswers || 0,
              wrongAnswers: data.wrongAnswers || 0,
              accuracy: data.accuracy || 0,
              lastStudied: data.lastStudied || null,
              isKnown: data.isKnown || false,
            }
          })
          allStats.push(...batchStats)
        }

        return allStats
      } else {
        // 10개 이하인 경우 일반 쿼리
        const hanziStatsRef = collection(db, "hanziStatistics")
        const q = query(
          hanziStatsRef,
          where("userId", "==", userId),
          where("hanziId", "in", gradeHanziIds)
        )

        const snapshot = await getDocs(q)

        const result = snapshot.docs.map((doc) => {
          const data = doc.data()
          return data as {
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
            isKnown?: boolean
          }
        })

        return result
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * 한자들에 gradeNumber를 일괄 추가하는 메서드
   */
  static async addGradeNumberToHanzi(
    hanziIds: string[],
    gradeNumber: number
  ): Promise<void> {
    try {
      const batch = writeBatch(db)
      hanziIds.forEach((hanziId) => {
        const hanziRef = doc(collection(db, "hanzi"), hanziId)
        batch.update(hanziRef, { gradeNumber })
      })
      await batch.commit()
    } catch (error) {
      throw error
    }
  }

  /**
   * 새로운 급수 데이터 추가 시 기존 사용자들의 학습완료 상태 동기화
   * @param newGrade 새로 추가된 급수
   * @param newGradeData 새로 추가된 급수의 한자 데이터
   */
  static async syncKnownStatusForNewGrade(
    newGrade: number,
    newGradeData: Hanzi[]
  ): Promise<void> {
    try {
      // 모든 사용자 조회
      const usersRef = collection(db, "users")
      const usersSnapshot = await getDocs(usersRef)

      const syncPromises: Promise<void>[] = []

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id

        // 각 사용자의 기존 한자 통계 조회
        const userHanziStats = await this.getHanziStatisticsNew(userId)

        // 새로 추가된 급수의 각 한자에 대해
        for (const newHanzi of newGradeData) {
          // 기존 통계에서 동일한 한자 찾기
          const existingStat = userHanziStats.find(
            (stat) => stat.character === newHanzi.character
          )

          if (existingStat && existingStat.isKnown) {
            // 기존에 학습완료로 체크된 한자라면 새 급수에서도 동일하게 설정
            syncPromises.push(
              this.updateHanziStatisticsWithKnown(
                userId,
                newHanzi.id,
                "quiz",
                true,
                true // isKnown = true
              )
            )
          }
        }
      }

      // 모든 동기화 완료 대기
      await Promise.all(syncPromises)
    } catch (error) {
      throw error
    }
  }

  /**
   * 등급별 한자 삭제
   */
  static async deleteGradeHanzi(grade: number): Promise<void> {
    try {
      const hanziList = await this.getHanziByGrade(grade)
      const batch = writeBatch(db)

      hanziList.forEach((hanzi) => {
        const docRef = doc(db, "hanzi", hanzi.id)
        batch.delete(docRef)
      })

      await batch.commit()
    } catch (error) {
      throw error
    }
  }

  /**
   * 사용자 통계 초기화 (기존 사용자 데이터에서 생성)
   */
  static async initializeUserStatistics(userId: string): Promise<void> {
    try {
      // 기존 userStatistics가 있는지 확인
      const existingStats = await this.getUserStatistics(userId)
      if (existingStats) {
        return
      }

      // 사용자 정보 조회
      const userRef = doc(db, "users", userId)
      const userDoc = await getDoc(userRef)

      if (!userDoc.exists()) {
        return
      }

      const userData = userDoc.data()

      // 게임 통계 조회하여 totalSessions 계산
      const gameStats = await this.getGameStatisticsNew(userId)
      let totalSessions = 0

      Object.values(gameStats).forEach((stats) => {
        // 모든 게임에서 completedSessions 사용 (세션 완료 수)
        totalSessions += stats.completedSessions || 0
      })

      // 새로운 userStatistics 생성
      const newStatsRef = doc(collection(db, "userStatistics"))
      await setDoc(newStatsRef, {
        id: newStatsRef.id,
        userId,
        totalSessions: totalSessions,
        todayExperience: 0, // 새로운 사용자는 0으로 시작
        todayGoal: 100, // 기본 목표값
        lastResetDate: getKSTDateString(), // 한국 시간 기준 오늘 날짜로 초기화
        lastWeekNumber: this.getWeekNumber(getKSTDate()), // 한국 시간 기준 현재 주차로 초기화

        // 목표 달성 통계 필드들 초기화
        goalAchievementHistory: [], // 빈 배열로 시작
        consecutiveGoalDays: 0, // 0일로 시작
        weeklyGoalAchievement: {
          currentWeek: this.getWeekNumber(getKSTDate()),
          achievedDays: 0,
          totalDays: 7, // 항상 7일로 시작
        },
        monthlyGoalAchievement: {
          currentMonth: new Date().toISOString().slice(0, 7),
          achievedDays: 0,
          totalDays: new Date(
            new Date().getFullYear(),
            new Date().getMonth() + 1,
            0
          ).getDate(), // 해당 월의 총 날짜
        },

        lastPlayedAt: userData.updatedAt || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error("사용자 통계 초기화 실패:", error)
      throw new Error("사용자 통계 초기화에 실패했습니다.")
    }
  }

  /**
   * 모든 사용자의 통계 초기화 (마이그레이션용)
   */
  static async initializeAllUserStatistics(): Promise<void> {
    try {
      const usersRef = collection(db, "users")
      const usersSnapshot = await getDocs(usersRef)

      const initPromises: Promise<void>[] = []

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id
        initPromises.push(this.initializeUserStatistics(userId))
      }

      await Promise.all(initPromises)
    } catch (error) {
      throw error
    }
  }

  /**
   * 유저 레벨 순위 조회 (상위 20명) - 모든 사용자 포함
   */
  static async getUserRankings(): Promise<
    Array<{
      userId: string
      username: string
      level: number
      experience: number
      totalPlayed: number
      accuracy: number
      totalStudyTime: number
      rank: number
    }>
  > {
    try {
      // 1. 모든 사용자 조회 (users 컬렉션)
      const usersRef = collection(db, "users")
      const usersSnapshot = await getDocs(usersRef)

      // 2. gameStatistics 컬렉션에서 데이터 조회
      const gameStatsRef = collection(db, "gameStatistics")
      const gameStatsSnapshot = await getDocs(gameStatsRef)

      // 3. userStatistics 데이터를 userId별로 조회하는 함수
      const getUserStudyTime = async (userId: string): Promise<number> => {
        try {
          const userStats = await this.getUserStatistics(userId)
          return userStats?.totalStudyTime || 0
        } catch (error) {
          console.error("사용자 학습시간 조회 실패:", error)
          return 0
        }
      }

      // 4. gameStatistics 데이터를 userId별로 그룹화 (게임 타입별로 분리)
      const userStatsMap = new Map()
      const processedDocs = new Set() // 중복 문서 확인용

      for (const statDoc of gameStatsSnapshot.docs) {
        const statData = statDoc.data()
        if (statData.userId) {
          const actualUserId = statData.userId
          // const gameType = statData.gameType || "unknown"
          const docKey = `${actualUserId}_${statData.gameType}`

          // 중복 문서 확인
          if (processedDocs.has(docKey)) {
            continue
          }
          processedDocs.add(docKey)

          if (!userStatsMap.has(actualUserId)) {
            userStatsMap.set(actualUserId, {
              games: new Map(), // 게임 타입별 통계
              totalPlayed: 0,
              totalCorrect: 0,
              totalWrong: 0,
              completedSessions: 0,
            })
          }

          const userStats = userStatsMap.get(actualUserId)

          // 게임 타입별 통계 저장 (누적하지 않고 덮어쓰기)
          userStats.games.set(statData.gameType, {
            totalPlayed: statData.totalPlayed || 0,
            correctAnswers: statData.correctAnswers || 0,
            wrongAnswers: statData.wrongAnswers || 0,
          })

          // 전체 통계도 누적
          userStats.totalPlayed += statData.totalPlayed || 0
          userStats.totalCorrect += statData.correctAnswers || 0
          userStats.totalWrong += statData.wrongAnswers || 0
          userStats.completedSessions += statData.completedSessions || 0
        }
      }

      // 6. 모든 사용자를 순위에 포함
      const userRankings: Array<{
        userId: string
        username: string
        level: number
        experience: number
        totalPlayed: number
        accuracy: number
        totalStudyTime: number
        preferredGrade: number
        rank: number
      }> = []

      for (const userDoc of usersSnapshot.docs) {
        try {
          const userData = userDoc.data()
          const userId = userDoc.id
          const username =
            userData.displayName ||
            userData.username ||
            `User_${userId.slice(0, 8)}`
          const totalExp = userData.experience || 0
          const level = userData.level || 1

          // gameStatistics가 있는 경우 해당 데이터 사용, 없으면 기본값
          const userStats = userStatsMap.get(userId) || {
            games: new Map(),
            totalPlayed: 0,
            totalCorrect: 0,
            totalWrong: 0,
            completedSessions: 0,
          }

          // 게임 타입별 정답률 계산
          let totalAccuracy = 0
          let gameCount = 0

          if (userStats.games && userStats.games.size > 0) {
            for (const [, gameStats] of userStats.games) {
              const totalAnswers =
                gameStats.correctAnswers + gameStats.wrongAnswers
              if (totalAnswers > 0) {
                const gameAccuracy =
                  (gameStats.correctAnswers / totalAnswers) * 100
                totalAccuracy += gameAccuracy
                gameCount++
              }
            }
          }

          // 전체 평균 정답률 계산 (게임을 한 적이 없으면 0%)
          const accuracy =
            gameCount > 0 ? Math.round(totalAccuracy / gameCount) : 0

          // userStatistics에서 totalStudyTime 개별 조회
          const totalStudyTime = await getUserStudyTime(userId)

          // 모든 사용자를 순위에 포함 (경험치가 0이어도 포함)
          userRankings.push({
            userId,
            username,
            level,
            experience: totalExp,
            totalPlayed: userStats.totalPlayed,
            accuracy: accuracy,
            totalStudyTime: totalStudyTime,
            preferredGrade: userData.preferredGrade || 8,
            rank: 0, // 임시로 0 설정
          })
        } catch (error) {
          console.error("사용자 랭킹 처리 중 오류:", error)
          // 사용자 처리 중 오류 발생 시 무시
        }
      }

      // 경험치 기준으로 내림차순 정렬
      userRankings.sort((a, b) => b.experience - a.experience)

      // 순위 부여
      userRankings.forEach((user, index) => {
        user.rank = index + 1
      })

      // 상위 20명만 반환
      return userRankings.slice(0, 20)
    } catch (error) {
      console.error("유저 순위 조회 실패:", error)
      throw new Error("유저 순위 조회에 실패했습니다.")
    }
  }

  /**
   * 경험치로 레벨 계산 (ApiClient 내부에서 사용)
   */
  private static calculateLevel(experience: number): number {
    if (experience < 100) return 1
    if (experience < 250) return 2
    if (experience < 450) return 3
    if (experience < 700) return 4
    if (experience < 1000) return 5
    if (experience < 1350) return 6
    if (experience < 1750) return 7
    if (experience < 2200) return 8
    if (experience < 2700) return 9
    if (experience < 3200) return 10

    // 레벨 10 이상은 복잡한 계산이 필요하므로 간단한 공식 사용
    let level = 10
    let requiredExp = 2700
    let increment = 550

    while (experience >= requiredExp) {
      level++
      requiredExp += increment
      if (level <= 50) {
        increment += 50
      } else if (level <= 80) {
        increment += 600
      } else {
        increment += 1200
      }
    }

    return level
  }

  /**
   * 모든 유저 조회 (디버깅용)
   */
  static async getAllUsers(): Promise<
    Array<{
      userId: string
      username: string
      experience: number
      level: number
      totalSessions: number
    }>
  > {
    try {
      // 1. users 컬렉션 확인
      const usersRef = collection(db, "users")
      const usersSnapshot = await getDocs(usersRef)

      // 2. userStatistics 컬렉션도 확인
      // const userStatsRef = collection(db, "userStatistics")
      // const userStatsSnapshot = await getDocs(userStatsRef)

      // 3. gameStatistics 컬렉션도 확인
      // const gameStatsRef = collection(db, "gameStatistics")
      // const gameStatsSnapshot = await getDocs(gameStatsRef)

      const users: Array<{
        userId: string
        username: string
        experience: number
        level: number
        totalSessions: number
      }> = []

      // users 컬렉션에서 데이터 수집
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data()

        if (userData.displayName || userData.username) {
          users.push({
            userId: userDoc.id,
            username: userData.displayName || userData.username || "이름없음",
            experience: userData.experience || 0,
            level: userData.level || 1,
            totalSessions: userData.totalSessions || 0,
          })
        }
      }

      // userStatistics 컬렉션에서도 데이터 수집 시도
      // for (const statDoc of userStatsSnapshot.docs) {
      //   const statData = statDoc.data()
      // }

      return users
    } catch {
      throw new Error("모든 유저 조회에 실패했습니다.")
    }
  }

  // 사용자의 examStats 조회 (급수별 시험 통계)
  static async getExamStats(userId: string): Promise<{
    gradeStats: Record<string, {
      totalExams: number
      passedExams: number
      averageScore: number
      lastExamDate: string | null
      highScorePassCount?: number
    }>
  } | null> {
    try {
      const userStats = await this.getUserStatistics(userId)
      if (!userStats || !userStats.examStats) {
        return null
      }
      
      return {
        gradeStats: userStats.examStats.gradeStats || {},
      }
    } catch (error) {
      console.error("examStats 조회 실패:", error)
      return null
    }
  }

  // 시험 결과로부터 한자 통계 업데이트
  static async updateHanziStatisticsFromExam(
    userId: string,
    hanziId: string,
    isCorrect: boolean,
    examPassed: boolean
  ): Promise<void> {
    try {
      // 기존 통계 찾기
      const hanziStatsRef = collection(db, "hanziStatistics")
      const q = query(
        hanziStatsRef,
        where("userId", "==", userId),
        where("hanziId", "==", hanziId)
      )
      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        // 새로운 통계 생성
        const newStatsRef = doc(collection(db, "hanziStatistics"))
        await setDoc(newStatsRef, {
          id: newStatsRef.id,
          userId,
          hanziId,
          totalStudied: 1,
          correctAnswers: isCorrect ? 1 : 0,
          wrongAnswers: isCorrect ? 0 : 1,
          lastStudied: new Date().toISOString(),
          accuracy: isCorrect ? 100 : 0,
          isKnown: false,
          // 시험 관련 필드 추가
          examAttempts: 1,
          examCorrect: isCorrect ? 1 : 0,
          examPassed: examPassed ? 1 : 0,
          examAccuracy: isCorrect ? 100 : 0,
          lastExamDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      } else {
        // 기존 통계 업데이트
        const existingDoc = snapshot.docs[0]
        const currentData = existingDoc.data()

        await updateDoc(existingDoc.ref, {
          totalStudied: (currentData.totalStudied || 0) + 1,
          correctAnswers:
            (currentData.correctAnswers || 0) + (isCorrect ? 1 : 0),
          wrongAnswers: (currentData.wrongAnswers || 0) + (isCorrect ? 0 : 1),
          lastStudied: new Date().toISOString(),
          accuracy: Math.round(
            (((currentData.correctAnswers || 0) + (isCorrect ? 1 : 0)) /
              ((currentData.totalStudied || 0) + 1)) *
              100
          ),
          // 시험 관련 필드 업데이트
          examAttempts: (currentData.examAttempts || 0) + 1,
          examCorrect: (currentData.examCorrect || 0) + (isCorrect ? 1 : 0),
          examPassed: (currentData.examPassed || 0) + (examPassed ? 1 : 0),
          examAccuracy: Math.round(
            (((currentData.examCorrect || 0) + (isCorrect ? 1 : 0)) /
              ((currentData.examAttempts || 0) + 1)) *
              100
          ),
          lastExamDate: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }
    } catch (error) {
      console.error("시험 한자 통계 업데이트 실패:", error)
      throw error
    }
  }
}
