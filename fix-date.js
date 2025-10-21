// 기존 데이터의 날짜를 한국시간 기준으로 수정하는 스크립트
const { initializeApp } = require("firebase/app")
const {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc,
} = require("firebase/firestore")

// Firebase 설정 (환경변수에서 가져오거나 직접 입력)
const firebaseConfig = {
  // 여기에 Firebase 설정을 입력하세요
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function fixDates() {
  try {
    console.log("🔧 날짜 수정 시작...")

    // hanziStatistics 컬렉션의 모든 문서 조회
    const hanziStatsRef = collection(db, "hanziStatistics")
    const snapshot = await getDocs(hanziStatsRef)

    let updatedCount = 0

    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data()

      // lastWrited 필드가 있고 2025-10-20 날짜인 경우
      if (data.lastWrited && data.lastWrited.startsWith("2025-10-20")) {
        // 2025-10-21로 변경
        const newLastWrited = data.lastWrited.replace(
          "2025-10-20",
          "2025-10-21"
        )

        await updateDoc(docSnapshot.ref, {
          lastWrited: newLastWrited,
          updatedAt: new Date().toISOString(),
        })

        console.log(
          `✅ 수정됨: ${data.character} - ${data.lastWrited} → ${newLastWrited}`
        )
        updatedCount++
      }
    }

    console.log(`🎉 완료! 총 ${updatedCount}개 문서가 수정되었습니다.`)
  } catch (error) {
    console.error("❌ 오류 발생:", error)
  }
}

// 실행
fixDates()
