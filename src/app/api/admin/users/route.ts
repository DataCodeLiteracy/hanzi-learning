import { NextResponse } from "next/server"
import { collection, query, orderBy, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

export async function GET() {
  try {
    console.log("👥 관리자 사용자 목록 조회 시작")

    // 모든 사용자 조회
    const q = query(collection(db, "users"), orderBy("displayName", "asc"))

    const querySnapshot = await getDocs(q)
    const users = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    console.log(`✅ ${users.length}명의 사용자 조회 완료`)

    return NextResponse.json({
      success: true,
      users,
      total: users.length,
    })
  } catch (error) {
    console.error("❌ 사용자 목록 조회 오류:", error)
    return NextResponse.json(
      { error: "사용자 목록 조회에 실패했습니다" },
      { status: 500 }
    )
  }
}
