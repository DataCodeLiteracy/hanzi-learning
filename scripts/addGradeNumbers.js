// 기존 8급 한자들에 gradeNumber를 일괄 추가하는 스크립트
// 사용법: node scripts/addGradeNumbers.js

const { initializeApp } = require("firebase/app")
const {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
} = require("firebase/firestore")

// Firebase 설정 (실제 프로젝트 설정으로 교체 필요)
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "hanzi-learning.firebaseapp.com",
  projectId: "hanzi-learning",
  storageBucket: "hanzi-learning.firebasestorage.app",
  messagingSenderId: "256373578987",
  appId: "your-app-id",
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function addGradeNumbersTo8Grade() {
  try {
    console.log("8급 한자들에 gradeNumber를 추가하는 중...")

    // 8급 한자들 조회
    const hanziRef = collection(db, "hanzi")
    const q = query(hanziRef, where("grade", "==", 8))
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      console.log("8급 한자가 없습니다.")
      return
    }

    console.log(`${snapshot.docs.length}개의 8급 한자를 찾았습니다.`)

    // gradeNumber가 없는 한자들만 필터링
    const hanziWithoutGradeNumber = snapshot.docs.filter((doc) => {
      const data = doc.data()
      return !data.gradeNumber || data.gradeNumber === 0
    })

    if (hanziWithoutGradeNumber.length === 0) {
      console.log("모든 8급 한자에 이미 gradeNumber가 설정되어 있습니다.")
      return
    }

    console.log(
      `${hanziWithoutGradeNumber.length}개의 한자에 gradeNumber를 추가합니다.`
    )

    // batch로 일괄 업데이트
    const batch = writeBatch(db)
    hanziWithoutGradeNumber.forEach((doc, index) => {
      const hanziRef = doc.ref
      batch.update(hanziRef, {
        gradeNumber: index + 1,
        updatedAt: new Date().toISOString(),
      })
    })

    await batch.commit()
    console.log("gradeNumber 추가가 완료되었습니다!")
  } catch (error) {
    console.error("오류 발생:", error)
  }
}

// 스크립트 실행
addGradeNumbersTo8Grade()
