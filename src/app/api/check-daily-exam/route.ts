import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"

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

    // 사용자별 examStatistics 문서 조회
    const userExamStatsRef = doc(db, "examStatistics", userId)
    const userExamStatsDoc = await getDoc(userExamStatsRef)

    let hasTakenToday = false
    let examRecord = null

    if (userExamStatsDoc.exists()) {
      const data = userExamStatsDoc.data()
      // exams 맵에서 해당 날짜 확인
      if (data.exams && data.exams[date]) {
        hasTakenToday = true
        examRecord = {
          examId: data.exams[date].examId,
          grade: data.exams[date].grade,
          score: data.exams[date].score,
          passed: data.exams[date].passed,
          duration: data.exams[date].duration,
          examDate: date,
        }
      }
    }

    console.log(`🎯 일일 시험 확인 (examStatistics):`, {
      userId: userId,
      date: date,
      hasTakenToday: hasTakenToday,
      examRecord: examRecord,
    })

    return NextResponse.json({
      success: true,
      hasTakenToday: hasTakenToday,
      examRecords: examRecord ? [examRecord] : [],
    })
  } catch (error) {
    console.error("일일 시험 확인 실패:", error)
    return NextResponse.json(
      { success: false, error: "일일 시험 확인에 실패했습니다." },
      { status: 500 }
    )
  }
}
