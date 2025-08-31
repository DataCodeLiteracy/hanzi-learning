// gameStatistics 복구 스크립트
// Firebase Admin SDK를 사용하여 데이터 복구

const admin = require("firebase-admin")

// Firebase Admin 초기화 (서비스 계정 키 필요)
const serviceAccount = require("./firebase-service-account.json")

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://your-project-id.firebaseio.com",
})

const db = admin.firestore()

// 복구할 사용자 ID
const userId = "gX83VflzZ6YmBTiOdlurqCb6rw63"

// 복구할 게임 통계 데이터
const gameStatsData = {
  // Quiz 게임 통계
  quiz: {
    totalPlayed: 997,
    correctAnswers: 750, // 예상 정답률 75%
    wrongAnswers: 247, // 997 - 750
    completedSessions: 25, // 예상 세션 수
    totalSessions: 0,
    createdAt: new Date("2025-01-01T00:00:00.000Z").toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Memory 게임 통계 (카드 뒤집기)
  memory: {
    totalPlayed: 150,
    correctAnswers: 120, // 예상 정답률 80%
    wrongAnswers: 30, // 150 - 120
    completedSessions: 8, // 예상 세션 수
    totalSessions: 0,
    createdAt: new Date("2025-01-01T00:00:00.000Z").toISOString(),
    updatedAt: new Date().toISOString(),
  },
}

async function restoreGameStatistics() {
  try {
    console.log(`🔍 사용자 ${userId}의 게임 통계 복구 시작...`)

    // 기존 partial 게임 통계 확인
    const partialQuery = await db
      .collection("gameStatistics")
      .where("userId", "==", userId)
      .where("gameType", "==", "partial")
      .get()

    if (!partialQuery.empty) {
      console.log(`✅ Partial 게임 통계 발견: ${partialQuery.docs[0].id}`)
    } else {
      console.log(`⚠️ Partial 게임 통계를 찾을 수 없습니다.`)
    }

    // Quiz 게임 통계 생성
    const quizData = {
      userId: userId,
      gameType: "quiz",
      ...gameStatsData.quiz,
    }

    const quizRef = await db.collection("gameStatistics").add(quizData)
    console.log(`✅ Quiz 게임 통계 생성 완료: ${quizRef.id}`)

    // Memory 게임 통계 생성
    const memoryData = {
      userId: userId,
      gameType: "memory",
      ...gameStatsData.memory,
    }

    const memoryRef = await db.collection("gameStatistics").add(memoryData)
    console.log(`✅ Memory 게임 통계 생성 완료: ${memoryRef.id}`)

    console.log(`🎉 게임 통계 복구 완료!`)
    console.log(`📊 생성된 문서:`)
    console.log(`  - Quiz: ${quizRef.id}`)
    console.log(`  - Memory: ${memoryRef.id}`)
  } catch (error) {
    console.error("❌ 게임 통계 복구 실패:", error)
  } finally {
    process.exit(0)
  }
}

// 스크립트 실행
restoreGameStatistics()
