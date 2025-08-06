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
} from "firebase/firestore"
import { db } from "./firebase"
import { Hanzi, UserStatistics } from "@/types"
import { calculateLevel } from "./experienceSystem"

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
    } catch (error) {
      console.error("Error creating document:", error)
      throw new Error("문서 생성에 실패했습니다.")
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
      console.error("Error getting document:", error)
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
      console.error("Error updating document:", error)
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
      console.error("Error deleting document:", error)
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
      console.error("Error querying documents:", error)
      throw new Error("문서 쿼리에 실패했습니다.")
    }
  }

  // 사용자별 데이터 조회
  static async getUserData<T>(
    collectionName: string,
    userId: string,
    constraints: QueryConstraint[] = []
  ): Promise<T[]> {
    const userConstraint = where("userId", "==", userId)
    return this.queryDocuments<T>(collectionName, [
      userConstraint,
      ...constraints,
    ])
  }

  // 등급별 한자 조회
  static async getHanziByGrade(grade: number): Promise<Hanzi[]> {
    const gradeConstraint = where("grade", "==", grade)
    return this.queryDocuments<Hanzi>("hanzi", [gradeConstraint])
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
      console.error("Error updating user experience:", error)
      throw new Error("경험치 업데이트에 실패했습니다.")
    }
  }

  // 사용자 경험치 추가
  static async addUserExperience(
    userId: string,
    experienceToAdd: number
  ): Promise<void> {
    try {
      const userRef = doc(db, "users", userId)
      const userDoc = await getDoc(userRef)
      if (userDoc.exists()) {
        const currentData = userDoc.data()
        const currentExperience = currentData.experience || 0
        const newExperience = currentExperience + experienceToAdd
        const newLevel = calculateLevel(newExperience)
        const updatedData = {
          experience: currentExperience + experienceToAdd,
          level: newLevel,
          updatedAt: new Date().toISOString(),
        }
        await updateDoc(userRef, updatedData)
      }
    } catch (error) {
      console.error("Error adding user experience:", error)
      throw new Error("경험치 추가에 실패했습니다.")
    }
  }

  // 게임별 통계 업데이트
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
    try {
      const userRef = doc(db, "users", userId)
      const userDoc = await getDoc(userRef)
      if (userDoc.exists()) {
        const currentData = userDoc.data()
        const currentStats = currentData.gameStatistics || {}
        const gameStats = currentStats[gameType] || {}

        // 기존 통계와 새로운 데이터를 병합
        const updatedGameStats = {
          totalPlayed:
            (gameStats.totalPlayed || 0) + (gameData.totalPlayed || 0),
          correctAnswers:
            (gameStats.correctAnswers || 0) + (gameData.correctAnswers || 0),
          wrongAnswers:
            (gameStats.wrongAnswers || 0) + (gameData.wrongAnswers || 0),
          completedSessions:
            (gameStats.completedSessions || 0) +
            (gameData.completedSessions || 0),
          totalSessions:
            (gameStats.totalSessions || 0) + (gameData.totalSessions || 0),
        }

        const updatedStats = {
          ...currentStats,
          [gameType]: updatedGameStats,
        }

        await updateDoc(userRef, {
          gameStatistics: updatedStats,
          updatedAt: new Date().toISOString(),
        })
      }
    } catch (error) {
      console.error("Error updating game statistics:", error)
      throw new Error("게임 통계 업데이트에 실패했습니다.")
    }
  }

  // 게임별 통계 조회
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
    try {
      const userRef = doc(db, "users", userId)
      const userDoc = await getDoc(userRef)
      if (userDoc.exists()) {
        const currentData = userDoc.data()
        const gameStats = currentData.gameStatistics?.[gameType] || {
          totalPlayed: 0,
          correctAnswers: 0,
          wrongAnswers: 0,
          completedSessions: 0,
          totalSessions: 0,
        }

        const totalAnswers = gameStats.correctAnswers + gameStats.wrongAnswers
        const accuracy =
          totalAnswers > 0 ? (gameStats.correctAnswers / totalAnswers) * 100 : 0

        return {
          ...gameStats,
          accuracy: Math.round(accuracy),
        }
      }
      return null
    } catch (error) {
      console.error("Error getting game statistics:", error)
      throw new Error("게임 통계 조회에 실패했습니다.")
    }
  }

  // 한자별 통계 업데이트
  static async updateHanziStatistics(
    userId: string,
    hanziId: string,
    gameType: "quiz" | "writing" | "partial" | "memory",
    isCorrect: boolean
  ): Promise<void> {
    try {
      const userRef = doc(db, "users", userId)
      const userDoc = await getDoc(userRef)
      if (userDoc.exists()) {
        const currentData = userDoc.data()
        const currentStats = currentData.hanziStatistics || {}
        const hanziStats = currentStats[hanziId] || {
          totalStudied: 0,
          correctAnswers: 0,
          wrongAnswers: 0,
          lastStudied: null,
        }

        // 통계 업데이트
        const updatedHanziStats = {
          ...hanziStats,
          totalStudied: hanziStats.totalStudied + 1,
          correctAnswers: hanziStats.correctAnswers + (isCorrect ? 1 : 0),
          wrongAnswers: hanziStats.wrongAnswers + (isCorrect ? 0 : 1),
          lastStudied: new Date().toISOString(),
        }

        const updatedStats = {
          ...currentStats,
          [hanziId]: updatedHanziStats,
        }

        await updateDoc(userRef, {
          hanziStatistics: updatedStats,
          updatedAt: new Date().toISOString(),
        })
      }
    } catch (error) {
      console.error("Error updating hanzi statistics:", error)
      throw new Error("한자 통계 업데이트에 실패했습니다.")
    }
  }

  // 한자별 통계 조회
  static async getHanziStatistics(
    userId: string,
    hanziId: string
  ): Promise<{
    totalStudied: number
    correctAnswers: number
    wrongAnswers: number
    lastStudied: string | null
    accuracy: number
  } | null> {
    try {
      const userRef = doc(db, "users", userId)
      const userDoc = await getDoc(userRef)
      if (userDoc.exists()) {
        const currentData = userDoc.data()
        const hanziStats = currentData.hanziStatistics?.[hanziId] || {
          totalStudied: 0,
          correctAnswers: 0,
          wrongAnswers: 0,
          lastStudied: null,
        }

        const accuracy =
          hanziStats.totalStudied > 0
            ? (hanziStats.correctAnswers / hanziStats.totalStudied) * 100
            : 0

        return {
          ...hanziStats,
          accuracy: Math.round(accuracy),
        }
      }
      return null
    } catch (error) {
      console.error("Error getting hanzi statistics:", error)
      throw new Error("한자 통계 조회에 실패했습니다.")
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

      // 각 한자의 통계 조회
      const hanziStatsPromises = gradeHanzi.map(async (hanzi) => {
        const stats = await this.getHanziStatistics(userId, hanzi.id)
        return {
          hanziId: hanzi.id,
          character: hanzi.character,
          meaning: hanzi.meaning,
          sound: hanzi.sound,
          totalStudied: stats?.totalStudied || 0,
          correctAnswers: stats?.correctAnswers || 0,
          wrongAnswers: stats?.wrongAnswers || 0,
          accuracy: stats?.accuracy || 0,
          lastStudied: stats?.lastStudied || null,
        }
      })

      const hanziStats = await Promise.all(hanziStatsPromises)

      // 학습한 횟수가 많은 순으로 정렬 (정답률이 높은 것 우선)
      return hanziStats.sort((a, b) => {
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

  // 우선순위 기반 한자 선택
  static async getPrioritizedHanzi(
    userId: string,
    grade: number,
    count: number
  ): Promise<Hanzi[]> {
    try {
      // 해당 급수의 한자들 조회
      const gradeHanzi = await this.getHanziByGrade(grade)

      // 각 한자의 통계 조회
      const hanziStatsPromises = gradeHanzi.map(async (hanzi) => {
        const stats = await this.getHanziStatistics(userId, hanzi.id)
        return {
          ...hanzi,
          totalStudied: stats?.totalStudied || 0,
          correctAnswers: stats?.correctAnswers || 0,
          wrongAnswers: stats?.wrongAnswers || 0,
          accuracy: stats?.accuracy || 0,
          lastStudied: stats?.lastStudied || null,
        }
      })

      const hanziWithStats = await Promise.all(hanziStatsPromises)

      // 우선순위 정렬:
      // 1. 오답률이 높은 한자 우선 (accuracy가 낮은 순)
      // 2. 학습이 부족한 한자 우선 (totalStudied가 적은 순)
      // 3. 최근에 학습하지 않은 한자 우선 (lastStudied가 null이거나 오래된 순)
      const sortedHanzi = hanziWithStats.sort((a, b) => {
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

      // 요청된 개수만큼 반환
      return sortedHanzi.slice(0, count)
    } catch (error) {
      console.error("Error getting prioritized hanzi:", error)
      throw new Error("우선순위 기반 한자 선택에 실패했습니다.")
    }
  }
}
