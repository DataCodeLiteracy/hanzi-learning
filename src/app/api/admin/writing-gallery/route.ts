import { NextRequest, NextResponse } from "next/server"
import { collection, query, orderBy, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

export async function GET(request: NextRequest) {
  try {
    console.log("📚 관리자 쓰기 갤러리 조회 시작")

    // 모든 제출물 조회 (관리자용)
    const q = query(
      collection(db, "writing_submissions"),
      orderBy("createdAt", "desc")
    )

    const querySnapshot = await getDocs(q)
    const submissions = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    console.log(`✅ ${submissions.length}개의 제출물 조회 완료`)

    return NextResponse.json({
      success: true,
      submissions,
      total: submissions.length,
    })
  } catch (error) {
    console.error("❌ 관리자 갤러리 조회 오류:", error)
    return NextResponse.json(
      { error: "갤러리 조회에 실패했습니다" },
      { status: 500 }
    )
  }
}
