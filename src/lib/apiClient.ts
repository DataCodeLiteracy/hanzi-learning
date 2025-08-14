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
      console.error(`사용자 ${collection} 데이터 로드 실패:`, error)
      return []
    }
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
      console.error("Error updating user preferred grade:", error)
      throw new Error("선호 급수 업데이트에 실패했습니다.")
    }
  }

  // 오늘 달성한 경험치 조회 (userStatistics에서 가져오기)
  static async getTodayExperience(userId: string): Promise<number> {
    try {
      // userStatistics에서 todayExperience 가져오기
      const userStats = await this.getUserStatistics(userId)
      return userStats?.todayExperience || 0
    } catch (error) {
      console.error("Error getting today's experience:", error)
      return 0 // 에러 시 0 반환
    }
  }

  // 오늘 경험치 업데이트 (userStatistics에 저장)
  static async updateTodayExperience(
    userId: string,
    experienceToAdd: number
  ): Promise<void> {
    try {
      // 기존 userStatistics 조회
      const userStats = await this.getUserStatistics(userId)

      if (userStats) {
        // 기존 통계 업데이트
        const userStatsRef = doc(db, "userStatistics", userStats.id!)
        await updateDoc(userStatsRef, {
          todayExperience: (userStats.todayExperience || 0) + experienceToAdd,
          updatedAt: new Date().toISOString(),
        })
      } else {
        // 새로운 userStatistics 생성
        const newStatsRef = doc(collection(db, "userStatistics"))
        await setDoc(newStatsRef, {
          id: newStatsRef.id,
          userId,
          totalSessions: 0,
          todayExperience: experienceToAdd,
          lastPlayedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }
    } catch (error) {
      console.error("Error updating today's experience:", error)
      throw new Error("오늘 경험치 업데이트에 실패했습니다.")
    }
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
        console.log("UserStatistics not found, waiting and retrying...")
        await new Promise((resolve) => setTimeout(resolve, 1000)) // 1초 대기
        userStats = await this.getUserStatistics(userId)
      }

      if (!userStats) {
        // 여전히 없으면 생성 (기존 데이터 보존)
        console.log("Creating new UserStatistics for user:", userId)
        await this.initializeUserStatistics(userId)
        return
      }

      const today = new Date().toDateString()
      const lastResetDate = userStats.lastResetDate || ""

      if (lastResetDate !== today) {
        // 자정이 지났으면 오늘 경험치 리셋
        const userStatsRef = doc(db, "userStatistics", userStats.id!)
        await updateDoc(userStatsRef, {
          todayExperience: 0,
          lastResetDate: today,
          updatedAt: new Date().toISOString(),
        })
        console.log("자정 리셋 완료: 오늘 경험치 초기화")
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
        console.log(
          `${updatePromises.length}명의 사용자에게 기본 선호 급수(8급) 설정 완료`
        )
      } else {
        console.log("모든 사용자가 이미 preferredGrade 필드를 가지고 있습니다.")
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

      // 15% 비율로 학습 완료된 한자 선택
      const completedCount = Math.max(1, Math.floor(count * 0.15)) // 최소 1개는 보장
      const incompleteCount = count - completedCount

      // 미완료 한자에서 필요한 개수만큼 선택
      const selectedIncomplete = sortedIncomplete.slice(0, incompleteCount)

      // 학습 완료된 한자에서 필요한 개수만큼 선택
      const selectedCompleted = shuffledCompleted.slice(0, completedCount)

      // 두 그룹을 합치고 랜덤하게 섞기
      const combined = [...selectedIncomplete, ...selectedCompleted]
      const finalSelection = combined.sort(() => Math.random() - 0.5)

      // 요청된 개수만큼 반환
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
      console.log(`🔧 updateGameStatisticsNew 호출됨:`)
      console.log(`  - userId: ${userId}`)
      console.log(`  - gameType: ${gameType}`)
      console.log(`  - stats:`, stats)

      // completedSessions 업데이트 시 특별 로그
      if (stats.completedSessions && stats.completedSessions > 0) {
        console.log(
          `🎯 completedSessions 업데이트 감지: +${stats.completedSessions}`
        )
      }

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

        console.log(`📊 기존 게임 통계 업데이트:`)
        console.log(
          `  - 기존 completedSessions: ${existingData.completedSessions || 0}`
        )
        console.log(
          `  - 추가할 completedSessions: ${stats.completedSessions || 0}`
        )
        console.log(`  - 새로운 completedSessions: ${newCompletedSessions}`)

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
      console.error("게임 통계 업데이트 실패:", error)
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
      console.log(`🔧 updateUserStatisticsTotalSessions 호출됨:`)
      console.log(`  - userId: ${userId}`)
      console.log(`  - sessionsToAdd: ${sessionsToAdd}`)

      const userStats = await this.getUserStatistics(userId)

      if (userStats) {
        // 기존 통계 업데이트
        console.log(`📊 기존 userStatistics 업데이트:`)
        console.log(`  - 기존 totalSessions: ${userStats.totalSessions || 0}`)
        console.log(`  - 추가할 sessionsToAdd: ${sessionsToAdd}`)
        console.log(
          `  - 새로운 totalSessions: ${
            (userStats.totalSessions || 0) + sessionsToAdd
          }`
        )

        const userStatsRef = doc(db, "userStatistics", userStats.id!)
        await updateDoc(userStatsRef, {
          totalSessions: (userStats.totalSessions || 0) + sessionsToAdd,
          updatedAt: new Date().toISOString(),
        })
        console.log(`✅ userStatistics totalSessions 업데이트 완료`)
      } else {
        // 새로운 userStatistics 생성
        console.log(`📝 새로운 userStatistics 생성`)
        const newStatsRef = doc(collection(db, "userStatistics"))
        await setDoc(newStatsRef, {
          id: newStatsRef.id,
          userId,
          totalExperience: 0,
          totalSessions: sessionsToAdd,
          todayExperience: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        console.log(
          `✅ 새로운 userStatistics 생성 완료: totalSessions=${sessionsToAdd}`
        )
      }
    } catch (error) {
      console.error("userStatistics totalSessions 업데이트 실패:", error)
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
   * 한자 통계 업데이트 (isKnown 필드 포함)
   */
  static async updateHanziStatisticsWithKnown(
    userId: string,
    hanziId: string,
    gameType: string,
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
      console.error("한자 통계 업데이트 실패:", error)
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
      console.error("게임 통계 가져오기 실패:", error)
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
      console.error("한자 통계 가져오기 실패:", error)
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
        const allStats: any[] = []

        for (let i = 0; i < gradeHanziIds.length; i += batchSize) {
          const batch = gradeHanziIds.slice(i, i + batchSize)

          const hanziStatsRef = collection(db, "hanziStatistics")
          const q = query(
            hanziStatsRef,
            where("userId", "==", userId),
            where("hanziId", "in", batch)
          )

          const snapshot = await getDocs(q)
          const batchStats = snapshot.docs.map((doc) => doc.data())
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
      console.error(`${grade}급 한자 통계 가져오기 실패:`, error)
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
   * 새로운 급수 데이터 추가 시 기존 사용자들의 학습완료 상태 동기화
   * @param newGrade 새로 추가된 급수
   * @param newGradeData 새로 추가된 급수의 한자 데이터
   */
  static async syncKnownStatusForNewGrade(
    newGrade: number,
    newGradeData: Hanzi[]
  ): Promise<void> {
    try {
      console.log(`${newGrade}급 데이터 추가 시 학습완료 상태 동기화 시작...`)

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

      console.log(
        `${newGrade}급 학습완료 상태 동기화 완료: ${syncPromises.length}개 업데이트`
      )
    } catch (error) {
      console.error("새 급수 학습완료 상태 동기화 실패:", error)
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

  /**
   * 사용자 통계 초기화 (기존 사용자 데이터에서 생성)
   */
  static async initializeUserStatistics(userId: string): Promise<void> {
    try {
      // 기존 userStatistics가 있는지 확인
      const existingStats = await this.getUserStatistics(userId)
      if (existingStats) {
        console.log("UserStatistics already exists for user:", userId)
        return
      }

      // 사용자 정보 조회
      const userRef = doc(db, "users", userId)
      const userDoc = await getDoc(userRef)

      if (!userDoc.exists()) {
        console.log("User not found:", userId)
        return
      }

      const userData = userDoc.data()

      // 게임 통계 조회하여 totalSessions 계산
      const gameStats = await this.getGameStatisticsNew(userId)
      let totalSessions = 0

      Object.entries(gameStats).forEach(([gameType, stats]) => {
        // 모든 게임에서 completedSessions 사용 (세션 완료 수)
        totalSessions += stats.completedSessions || 0
      })

      // 새로운 userStatistics 생성
      const newStatsRef = doc(collection(db, "userStatistics"))
      await setDoc(newStatsRef, {
        id: newStatsRef.id,
        userId,
        totalExperience: userData.experience || 0,
        totalSessions: totalSessions,
        todayExperience: 0, // 새로운 사용자는 0으로 시작
        lastResetDate: new Date().toDateString(), // 오늘 날짜로 초기화
        lastPlayedAt: userData.updatedAt || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      console.log("UserStatistics initialized for user:", userId)
    } catch (error) {
      console.error("Error initializing user statistics:", error)
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
      console.log(
        `UserStatistics initialization completed for ${initPromises.length} users`
      )
    } catch (error) {
      console.error("Error initializing all user statistics:", error)
      throw error
    }
  }

  /**
   * userStatistics의 totalExperience를 users 컬렉션과 동기화
   */
  static async syncUserStatisticsTotalExperience(
    userId: string
  ): Promise<void> {
    try {
      // 사용자 정보 조회
      const userRef = doc(db, "users", userId)
      const userDoc = await getDoc(userRef)

      if (!userDoc.exists()) {
        console.log("User not found:", userId)
        return
      }

      const userData = userDoc.data()
      const userStats = await this.getUserStatistics(userId)

      if (userStats) {
        // 기존 통계 업데이트
        const userStatsRef = doc(db, "userStatistics", userStats.id!)
        await updateDoc(userStatsRef, {
          totalExperience: userData.experience || 0,
          updatedAt: new Date().toISOString(),
        })
      } else {
        // 새로운 userStatistics 생성 (initializeUserStatistics 호출)
        await this.initializeUserStatistics(userId)
      }
    } catch (error) {
      console.error("Error syncing user statistics totalExperience:", error)
      throw new Error("사용자 통계 동기화에 실패했습니다.")
    }
  }

  /**
   * 모든 사용자의 totalExperience 동기화 (마이그레이션용)
   */
  static async syncAllUserStatisticsTotalExperience(): Promise<void> {
    try {
      const usersRef = collection(db, "users")
      const usersSnapshot = await getDocs(usersRef)

      const syncPromises: Promise<void>[] = []

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id
        syncPromises.push(this.syncUserStatisticsTotalExperience(userId))
      }

      await Promise.all(syncPromises)
      console.log(
        `UserStatistics totalExperience sync completed for ${syncPromises.length} users`
      )
    } catch (error) {
      console.error("Error syncing all user statistics totalExperience:", error)
      throw error
    }
  }
}
