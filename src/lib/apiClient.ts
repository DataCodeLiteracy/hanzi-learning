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
      // 오류가 발생해도 빈 배열을 반환하여 앱이 중단되지 않도록 함
      return []
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
    try {
      console.log(`🔍 ${grade}급 한자 조회 시작...`)
      const gradeConstraint = where("grade", "==", grade)
      console.log(`🔍 쿼리 제약조건: grade == ${grade}`)

      const results = await this.queryDocuments<Hanzi>("hanzi", [
        gradeConstraint,
      ])
      console.log(`✅ ${grade}급 한자 조회 결과: ${results.length}개`)

      // gradeNumber 순서대로 정렬
      const sortedResults = results.sort(
        (a, b) => (a.gradeNumber || 0) - (b.gradeNumber || 0)
      )
      console.log(`📊 ${grade}급 한자 정렬 완료: ${sortedResults.length}개`)

      // 결과 상세 로깅
      if (sortedResults.length > 0) {
        console.log(`📝 첫 번째 결과:`, sortedResults[0])
      }

      return sortedResults
    } catch (error) {
      console.error(`❌ ${grade}급 한자 조회 실패:`, error)
      // 오류가 발생해도 빈 배열을 반환하여 앱이 중단되지 않도록 함
      return []
    }
  }

  // 모든 한자 조회 (테스트용)
  static async getAllHanzi(): Promise<Hanzi[]> {
    try {
      console.log(`🔍 모든 한자 조회 시작...`)
      const results = await this.queryDocuments<Hanzi>("hanzi", [])
      console.log(`✅ 모든 한자 조회 결과: ${results.length}개`)

      // 급수별 통계
      const gradeStats: { [key: number]: number } = {}
      results.forEach((hanzi) => {
        const grade = hanzi.grade
        gradeStats[grade] = (gradeStats[grade] || 0) + 1
      })
      console.log(`📊 급수별 통계:`, gradeStats)

      return results
    } catch (error) {
      console.error(`❌ 모든 한자 조회 실패:`, error)
      return []
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
    totalStudied: number
    correctAnswers: number
    wrongAnswers: number
    lastStudied: string | null
    accuracy: number
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
      }
    }

    return {
      totalStudied: hanziStat.totalStudied || 0,
      correctAnswers: hanziStat.correctAnswers || 0,
      wrongAnswers: hanziStat.wrongAnswers || 0,
      lastStudied: hanziStat.lastStudied || null,
      accuracy: hanziStat.accuracy || 0,
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
        }
      })

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
      } else {
        // 기존 통계 업데이트
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
      }
    } catch (error) {
      console.error("게임 통계 업데이트 실패:", error)
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
      console.error("한자 통계 업데이트 실패:", error)
      throw error
    }
  }

  /**
   * 사용자의 게임 통계 가져오기 (새로운 구조)
   */
  static async getGameStatisticsNew(userId: string): Promise<any> {
    try {
      const gameStatsRef = collection(db, "gameStatistics")
      const q = query(gameStatsRef, where("userId", "==", userId))
      const snapshot = await getDocs(q)

      const gameStats: any = {}
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
      console.error("게임 통계 가져오기 실패:", error)
      throw error
    }
  }

  /**
   * 사용자의 한자 통계 가져오기 (새로운 구조)
   */
  static async getHanziStatisticsNew(userId: string): Promise<any[]> {
    try {
      const hanziStatsRef = collection(db, "hanziStatistics")
      const q = query(hanziStatsRef, where("userId", "==", userId))
      const snapshot = await getDocs(q)

      return snapshot.docs.map((doc) => doc.data())
    } catch (error) {
      console.error("한자 통계 가져오기 실패:", error)
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
      console.error("한자들에 gradeNumber 추가 실패:", error)
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
      console.log(`🗑️ ${grade}급 한자 ${hanziList.length}개 삭제 완료`)
    } catch (error) {
      console.error(`${grade}급 한자 삭제 실패:`, error)
      throw error
    }
  }
}
