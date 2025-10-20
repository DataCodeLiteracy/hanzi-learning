import { NextRequest, NextResponse } from "next/server"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const grade = searchParams.get("grade")

    if (!grade) {
      return NextResponse.json({ error: "급수가 필요합니다" }, { status: 400 })
    }

    console.log(`📚 ${grade}급 한자 목록 조회 시작`)

    // Firestore에서 해당 급수 한자 조회
    const q = query(
      collection(db, "hanzi"),
      where("grade", "==", parseInt(grade)),
      orderBy("character", "asc")
    )

    const querySnapshot = await getDocs(q)
    const hanziList = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    console.log(`✅ ${grade}급 한자 ${hanziList.length}개 조회 완료`)

    return NextResponse.json({
      success: true,
      hanziList,
      total: hanziList.length,
      grade: parseInt(grade),
    })
  } catch (error) {
    console.error("❌ 한자 조회 오류:", error)
    return NextResponse.json(
      { error: "한자 목록 조회에 실패했습니다" },
      { status: 500 }
    )
  }
}
