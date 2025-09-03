const admin = require("firebase-admin")

// Firebase Admin SDK 초기화
const serviceAccount = require("../firebase-service-account.json") // 실제 서비스 계정 파일 경로로 변경

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // databaseURL: "your-database-url" // 필요시 추가
})

const db = admin.firestore()

/**
 * userStatistics 컬렉션에서 totalExperience 필드 제거
 */
async function removeTotalExperienceField() {
  try {
    console.log(
      "🔄 userStatistics 컬렉션에서 totalExperience 필드 제거 시작..."
    )

    const userStatsRef = db.collection("userStatistics")
    const snapshot = await userStatsRef.get()

    if (snapshot.empty) {
      console.log("📝 userStatistics 컬렉션이 비어있습니다.")
      return
    }

    const batch = db.batch()
    let updateCount = 0

    snapshot.forEach((doc) => {
      const data = doc.data()

      // totalExperience 필드가 있는 경우에만 제거
      if (data.hasOwnProperty("totalExperience")) {
        console.log(
          `📝 ${doc.id}: totalExperience 필드 제거 (값: ${data.totalExperience})`
        )
        batch.update(doc.ref, {
          totalExperience: admin.firestore.FieldValue.delete(),
        })
        updateCount++
      }
    })

    if (updateCount > 0) {
      await batch.commit()
      console.log(`✅ ${updateCount}개 문서에서 totalExperience 필드 제거 완료`)
    } else {
      console.log("ℹ️ totalExperience 필드가 있는 문서가 없습니다.")
    }
  } catch (error) {
    console.error("❌ totalExperience 필드 제거 실패:", error)
    throw error
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  try {
    console.log("🚀 totalExperience 필드 제거 스크립트 시작")
    console.log("⚠️  이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?")

    // 실제 실행 전에 확인 메시지
    // 실제 환경에서는 주석을 해제하고 확인 후 실행
    // await removeTotalExperienceField();

    console.log("✅ 스크립트 완료")
  } catch (error) {
    console.error("❌ 스크립트 실행 실패:", error)
    process.exit(1)
  } finally {
    admin.app().delete()
  }
}

// 스크립트 실행
main()
