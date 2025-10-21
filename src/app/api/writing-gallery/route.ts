import { NextRequest, NextResponse } from "next/server"
import { collection, query, where, orderBy, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const grade = searchParams.get("grade")
    const date = searchParams.get("date")

    if (!userId) {
      return NextResponse.json(
        { error: "사용자 ID가 필요합니다" },
        { status: 400 }
      )
    }

    console.log("📚 한자 쓰기 갤러리 조회:", { userId, grade, date })

    // 임시 해결책: userId만으로 쿼리하고 클라이언트에서 필터링
    const q = query(
      collection(db, "writing_submissions"),
      where("userId", "==", userId)
    )

    console.log("🔍 Firestore 쿼리 실행 중...")
    const querySnapshot = await getDocs(q)

    let submissions = querySnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
      }
    })

    // 클라이언트 사이드에서 필터링 (임시 해결책)
    if (grade && grade !== "all") {
      submissions = submissions.filter(
        (sub: any) => sub.grade === parseInt(grade)
      )
    }
    if (date) {
      submissions = submissions.filter(
        (sub: any) => sub.submissionDate === date
      )
    }

    // 클라이언트 사이드에서 정렬
    submissions = submissions.sort((a: any, b: any) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    console.log(`✅ ${submissions.length}개의 제출물 조회 완료`)

    return NextResponse.json({
      success: true,
      submissions,
      total: submissions.length,
    })
  } catch (error) {
    console.error("❌ 갤러리 조회 오류:", error)
    return NextResponse.json(
      { error: "갤러리 조회에 실패했습니다" },
      { status: 500 }
    )
  }
}
