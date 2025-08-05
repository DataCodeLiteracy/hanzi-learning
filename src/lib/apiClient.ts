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
        const currentLevel = currentData.level || 1
        await updateDoc(userRef, {
          experience: newExperience,
          level: newLevel, // Level field updated
          updatedAt: new Date().toISOString(),
        })
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
}
