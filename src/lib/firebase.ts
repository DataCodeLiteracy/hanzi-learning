import { initializeApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Firebase 설정 디버깅
console.log("Firebase Config Check:", {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    ? "✅ 설정됨"
    : "❌ 설정 안됨",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    ? "✅ 설정됨"
    : "❌ 설정 안됨",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? "✅ 설정됨" : "❌ 설정 안됨",
})

// Firebase 초기화
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const googleProvider = new GoogleAuthProvider()

console.log("✅ Firebase 초기화 완료")

export { auth, db, googleProvider }
export default app
