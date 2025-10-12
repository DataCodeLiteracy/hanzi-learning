// Firebase 클라이언트 SDK를 사용하여 데이터 확인
const { initializeApp } = require("firebase/app")
const { getFirestore, collection, getDocs } = require("firebase/firestore")

// Firebase 설정 (기존 프로젝트 설정 사용)
const firebaseConfig = {
  apiKey: "AIzaSyBvQZvQZvQZvQZvQZvQZvQZvQZvQZvQZvQ", // 실제 API 키로 교체 필요
  authDomain: "hanzi-learning-prod.firebaseapp.com",
  projectId: "hanzi-learning-prod",
  storageBucket: "hanzi-learning-prod.appspot.com",
  messagingSenderId: "1051729402768",
  appId: "1:1051729402768:web:your-app-id", // 실제 App ID로 교체 필요
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function checkCollections() {
  try {
    console.log("🔍 Checking Firestore collections...")

    const collections = [
      "users",
      "gameStatistics",
      "hanziStatistics",
      "timeTracking",
    ]

    for (const collectionName of collections) {
      try {
        console.log(`\n📂 Checking collection: ${collectionName}`)
        const querySnapshot = await getDocs(collection(db, collectionName))

        console.log(
          `✅ Found ${querySnapshot.size} documents in ${collectionName}`
        )

        if (querySnapshot.size > 0) {
          console.log("📄 Sample document:")
          const firstDoc = querySnapshot.docs[0]
          console.log(`  ID: ${firstDoc.id}`)
          console.log(`  Data:`, JSON.stringify(firstDoc.data(), null, 2))
        }
      } catch (error) {
        console.log(`❌ Error accessing ${collectionName}:`, error.message)
      }
    }
  } catch (error) {
    console.error("❌ Error:", error)
  }
}

checkCollections()
