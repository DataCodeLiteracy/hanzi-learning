import { cert, getApps, initializeApp, type App } from "firebase-admin/app"
import { getFirestore, type Firestore } from "firebase-admin/firestore"

let adminApp: App | undefined

function parseServiceAccount(): Record<string, unknown> {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON 환경 변수가 없습니다. Firebase 서비스 계정 키 JSON을 한 줄로 넣어 주세요.",
    )
  }
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON 파싱에 실패했습니다.")
  }
}

export function getFirebaseAdminApp(): App {
  if (adminApp) return adminApp
  const existing = getApps()[0]
  if (existing) {
    adminApp = existing
    return adminApp
  }
  adminApp = initializeApp({
    credential: cert(parseServiceAccount() as Parameters<typeof cert>[0]),
  })
  return adminApp
}

export function getAdminFirestore(): Firestore {
  return getFirestore(getFirebaseAdminApp())
}
