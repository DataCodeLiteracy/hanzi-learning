import { db } from "@/lib/firebase"
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore"

interface MigrationResult {
  success: boolean
  message: string
  migratedData?: any
}

/**
 * 기존 사용자 데이터를 새로운 구조로 마이그레이션
 */
export const migrateUserData = async (
  userId: string
): Promise<MigrationResult> => {
  try {
    // 1. 기존 사용자 데이터 가져오기
    const userRef = doc(db, "users", userId)
    const userDoc = await getDoc(userRef)

    if (!userDoc.exists()) {
      return {
        success: false,
        message: "사용자를 찾을 수 없습니다.",
      }
    }

    const userData = userDoc.data()

    // 2. 기존 gameStatistics와 hanziStatistics 추출
    const existingGameStats = userData.gameStatistics || {}
    const existingHanziStats = userData.hanziStatistics || {}

    // 3. 새로운 컬렉션에 데이터 마이그레이션
    const migrationPromises: Promise<any>[] = []

    // gameStatistics 마이그레이션
    for (const [gameType, stats] of Object.entries(existingGameStats)) {
      const gameStatsRef = doc(collection(db, "gameStatistics"))
      migrationPromises.push(
        setDoc(gameStatsRef, {
          id: gameStatsRef.id,
          userId,
          gameType,
          ...(stats as object),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      )
    }

    // hanziStatistics 마이그레이션
    for (const [hanziId, stats] of Object.entries(existingHanziStats)) {
      const hanziStatsRef = doc(collection(db, "hanziStatistics"))
      migrationPromises.push(
        setDoc(hanziStatsRef, {
          id: hanziStatsRef.id,
          userId,
          hanziId,
          ...(stats as object),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      )
    }

    // 4. 모든 마이그레이션 완료 대기
    await Promise.all(migrationPromises)

    // 5. 기존 사용자 데이터에서 gameStatistics와 hanziStatistics 제거
    const updatedUserData = { ...userData }
    delete updatedUserData.gameStatistics
    delete updatedUserData.hanziStatistics

    await setDoc(userRef, {
      ...updatedUserData,
      updatedAt: new Date().toISOString(),
    })

    return {
      success: true,
      message: "데이터 마이그레이션이 완료되었습니다.",
      migratedData: {
        gameStatistics: Object.keys(existingGameStats).length,
        hanziStatistics: Object.keys(existingHanziStats).length,
      },
    }
  } catch (error) {
    console.error("마이그레이션 실패:", error)
    return {
      success: false,
      message: `마이그레이션 중 오류가 발생했습니다: ${error}`,
    }
  }
}

/**
 * 모든 사용자 데이터 일괄 마이그레이션
 */
export const migrateAllUsers = async (): Promise<MigrationResult> => {
  try {
    // 모든 사용자 가져오기
    const usersRef = collection(db, "users")
    const usersSnapshot = await getDocs(usersRef)

    const migrationResults = []

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id
      const result = await migrateUserData(userId)
      migrationResults.push({ userId, ...result })
    }

    const successCount = migrationResults.filter((r) => r.success).length
    const totalCount = migrationResults.length

    return {
      success: true,
      message: `${totalCount}명 중 ${successCount}명의 데이터 마이그레이션이 완료되었습니다.`,
      migratedData: migrationResults,
    }
  } catch (error) {
    console.error("전체 마이그레이션 실패:", error)
    return {
      success: false,
      message: `전체 마이그레이션 중 오류가 발생했습니다: ${error}`,
    }
  }
}
