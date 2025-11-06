import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const date = searchParams.get("date")

    if (!userId || !date) {
      return NextResponse.json(
        { success: false, error: "필수 파라미터가 누락되었습니다." },
        { status: 400 }
      )
    }

    // examStatistics 컬렉션에서 해당 날짜에 시험 기록이 있는지 확인
    const examStatsRef = collection(db, "examStatistics")
    const q = query(
      examStatsRef,
      where("userId", "==", userId),
      where("examDate", "==", date)
    )

    const querySnapshot = await getDocs(q)
    const hasTakenToday = !querySnapshot.empty

    console.log(`🎯 일일 시험 확인 (examStatistics):`, {
      userId: userId,
      date: date,
      hasTakenToday: hasTakenToday,
      recordsFound: querySnapshot.size,
    })

    return NextResponse.json({
      success: true,
      hasTakenToday: hasTakenToday,
      examRecords: querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })),
    })
  } catch (error) {
    console.error("일일 시험 확인 실패:", error)
    return NextResponse.json(
      { success: false, error: "일일 시험 확인에 실패했습니다." },
      { status: 500 }
    )
  }
}
