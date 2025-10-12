const admin = require("firebase-admin")

// Firebase Admin SDK 초기화
const serviceAccount = require("./firebase-service-account.json") // 서비스 계정 키 파일 필요

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://hanzi-learning-default-rtdb.firebaseio.com", // 실제 프로젝트 URL로 변경
})

const db = admin.firestore()

async function updateUserIdInHanziStatistics() {
  try {
    console.log("🔄 hanziStatistics 컬렉션에서 userId 업데이트 시작...")

    const oldUserId = "gX83VflzZ6YmBTiOdlurqCb6rw63"
    const newUserId = "b1FuaEfDv4XFrmgxyK17E1BglBi1"

    // 기존 userId로 문서들 조회
    const hanziStatsRef = db.collection("hanziStatistics")
    const querySnapshot = await hanziStatsRef
      .where("userId", "==", oldUserId)
      .get()

    if (querySnapshot.empty) {
      console.log("❌ 해당 userId로 된 문서를 찾을 수 없습니다.")
      return
    }

    console.log(`📊 ${querySnapshot.size}개의 문서를 찾았습니다.`)

    // 배치 업데이트
    const batch = db.batch()
    let updateCount = 0

    querySnapshot.forEach((doc) => {
      const docRef = hanziStatsRef.doc(doc.id)
      batch.update(docRef, { userId: newUserId })
      updateCount++
    })

    // 배치 실행
    await batch.commit()

    console.log(`✅ ${updateCount}개의 문서가 성공적으로 업데이트되었습니다.`)
    console.log(`🔄 ${oldUserId} → ${newUserId}`)
  } catch (error) {
    console.error("❌ 업데이트 중 오류 발생:", error)
  }
}

// 실행
updateUserIdInHanziStatistics()
  .then(() => {
    console.log("🎉 업데이트 완료!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("❌ 스크립트 실행 실패:", error)
    process.exit(1)
  })
