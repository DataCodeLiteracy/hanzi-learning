import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore"

interface MigrationResult {
  success: boolean
  message: string
  migratedData?: {
    gameStatistics: number
    hanziStatistics: number
  }
}

/**
 * 기존 사용자 데이터를 새로운 구조로 마이그레이션
 */
export async function migrateUserData(
  userId: string
): Promise<MigrationResult> {
  try {
    console.log(`🔄 사용자 ${userId} 데이터 마이그레이션 시작...`)

    // 기존 사용자 데이터 가져오기
    const userRef = doc(db, "users", userId)
    const userDoc = await getDoc(userRef)

    if (!userDoc.exists()) {
      console.log(`❌ 사용자 ${userId}를 찾을 수 없습니다.`)
      return {
        success: false,
        message: "사용자를 찾을 수 없습니다.",
      }
    }

    const userData = userDoc.data() as {
      id: string
      email: string
      displayName: string
      photoURL: string
      level: number
      experience: number
      isAdmin: boolean
      createdAt: string
      updatedAt: string
      statistics?: {
        totalSessions: number
        quizStats?: {
          totalPlayed: number
          correctAnswers: number
          wrongAnswers: number
          completedSessions: number
          totalSessions: number
          accuracy: number
        }
        writingStats?: {
          totalPlayed: number
          correctAnswers: number
          wrongAnswers: number
          completedSessions: number
          totalSessions: number
          accuracy: number
        }
        partialStats?: {
          totalPlayed: number
          correctAnswers: number
          wrongAnswers: number
          completedSessions: number
          totalSessions: number
          accuracy: number
        }
        memoryStats?: {
          totalPlayed: number
          correctAnswers: number
          wrongAnswers: number
          completedSessions: number
          totalSessions: number
          accuracy: number
        }
      }
      // 기존 구조의 통계 데이터 (마이그레이션 대상)
      gameStatistics?: {
        [gameType: string]: {
          totalPlayed: number
          correctAnswers: number
          wrongAnswers: number
          completedSessions: number
          totalSessions: number
          accuracy: number
        }
      }
      hanziStatistics?: {
        [hanziId: string]: {
          character: string
          meaning: string
          sound: string
          gradeNumber: number
          totalStudied: number
          correctAnswers: number
          wrongAnswers: number
          accuracy: number
          lastStudied: string | null
        }
      }
    }

    // 2. 기존 gameStatistics와 hanziStatistics 추출
    const existingGameStats = userData.gameStatistics || {}
    const existingHanziStats = userData.hanziStatistics || {}

    // 3. 새로운 컬렉션에 데이터 마이그레이션
    const migrationPromises: Promise<void>[] = []

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

    // 마이그레이션된 데이터 수 계산
    const migratedGameStats = Object.keys(existingGameStats).length
    const migratedHanziStats = Object.keys(existingHanziStats).length

    console.log(`✅ 사용자 ${userId} 데이터 마이그레이션 완료.`)
    return {
      success: true,
      message: `사용자 ${userId} 데이터 마이그레이션이 완료되었습니다.`,
      migratedData: {
        gameStatistics: migratedGameStats,
        hanziStatistics: migratedHanziStats,
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

    const migrationResults: Array<{
      userId: string
      success: boolean
      message: string
      gameStatistics?: number
      hanziStatistics?: number
    }> = []

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id
      const result = await migrateUserData(userId)
      migrationResults.push({ userId, ...result })
    }

    const successCount = migrationResults.filter((r) => r.success).length
    const totalCount = migrationResults.length

    // 마이그레이션된 데이터 수 계산
    const totalGameStats = migrationResults.reduce(
      (sum, r) => sum + (r.gameStatistics || 0),
      0
    )
    const totalHanziStats = migrationResults.reduce(
      (sum, r) => sum + (r.hanziStatistics || 0),
      0
    )

    return {
      success: true,
      message: `${totalCount}명 중 ${successCount}명의 데이터 마이그레이션이 완료되었습니다.`,
      migratedData: {
        gameStatistics: totalGameStats,
        hanziStatistics: totalHanziStats,
      },
    }
  } catch (error) {
    console.error("전체 마이그레이션 실패:", error)
    return {
      success: false,
      message: `전체 마이그레이션 중 오류가 발생했습니다: ${error}`,
    }
  }
}
