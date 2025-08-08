// 7급 한자들을 삭제하는 Node.js 스크립트
// 사용법: node scripts/delete7GradeHanziNode.js

require("dotenv").config({ path: ".env.local" })
const { initializeApp } = require("firebase/app")
const {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
} = require("firebase/firestore")

// Firebase 설정
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

console.log("Firebase 설정 확인:", {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "설정됨" : "설정 안됨",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? "설정됨" : "설정 안됨",
})

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function delete7GradeHanzi() {
  try {
    console.log("7급 한자들을 삭제하는 중...")

    // 7급 한자들 조회
    const hanziRef = collection(db, "hanzi")
    const q = query(hanziRef, where("grade", "==", 7))
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      console.log("7급 한자가 없습니다.")
      return
    }

    console.log(`${snapshot.docs.length}개의 7급 한자를 찾았습니다.`)

    // 삭제할 한자들의 정보 출력
    const hanziToDelete = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        character: data.character,
        meaning: data.meaning,
        sound: data.sound,
      }
    })

    console.log("삭제할 한자들:", hanziToDelete)
    console.log("한자들:", hanziToDelete.map((h) => h.character).join(", "))

    // batch로 일괄 삭제
    const batch = writeBatch(db)
    snapshot.docs.forEach((doc) => {
      const hanziRef = doc.ref
      batch.delete(hanziRef)
    })

    await batch.commit()
    console.log(`${snapshot.docs.length}개의 7급 한자가 삭제되었습니다!`)
  } catch (error) {
    console.error("오류 발생:", error)
  }
}

// 스크립트 실행
delete7GradeHanzi()
