const admin = require("firebase-admin")
const fs = require("fs")
const path = require("path")

// Firebase Admin SDK 초기화
const serviceAccount = require("./serviceAccountKey.json") // 서비스 계정 키 파일 필요

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "hanzi-learning-prod",
})

const db = admin.firestore()

async function exportCollection(collectionName) {
  console.log(`📤 Exporting collection: ${collectionName}`)

  const snapshot = await db.collection(collectionName).get()
  const data = []

  snapshot.forEach((doc) => {
    data.push({
      id: doc.id,
      ...doc.data(),
    })
  })

  console.log(`✅ Exported ${data.length} documents from ${collectionName}`)
  return data
}

async function exportAllData() {
  try {
    console.log("🚀 Starting Firestore export...")

    // 모든 컬렉션 export
    const collections = [
      "users",
      "gameStatistics",
      "hanziStatistics",
      "timeTracking",
    ]
    const exportData = {}

    for (const collection of collections) {
      try {
        exportData[collection] = await exportCollection(collection)
      } catch (error) {
        console.log(`⚠️  Collection ${collection} not found or empty`)
        exportData[collection] = []
      }
    }

    // JSON 파일로 저장
    const outputPath = path.join(__dirname, "firestore-export.json")
    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2))

    console.log(`✅ Export completed! Data saved to: ${outputPath}`)
    console.log(
      `📊 Total collections exported: ${Object.keys(exportData).length}`
    )

    // 각 컬렉션별 문서 수 출력
    Object.entries(exportData).forEach(([collection, data]) => {
      console.log(`  - ${collection}: ${data.length} documents`)
    })
  } catch (error) {
    console.error("❌ Export failed:", error)
  }
}

exportAllData()
