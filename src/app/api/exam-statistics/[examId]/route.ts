import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const resolvedParams = await params
    const { examId } = resolvedParams

    // URL에서 userId 파라미터 가져오기
    const url = new URL(request.url)
    const userId = url.searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { error: "사용자 ID가 필요합니다." },
        { status: 400 }
      )
    }

    // examStatistics 컬렉션에서 해당 시험 정보 조회
    const examDoc = await getDoc(doc(db, "examStatistics", examId))

    if (!examDoc.exists) {
      return NextResponse.json(
        { error: "시험 정보를 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    const examData = examDoc.data()
    console.log("🔍 API에서 조회한 시험 데이터:", examData)
    console.log("🔍 틀린 문제 데이터:", examData?.wrongAnswers)

    // 사용자 확인
    if (examData?.userId !== userId) {
      return NextResponse.json(
        { error: "접근 권한이 없습니다." },
        { status: 403 }
      )
    }

    // 틀린 문제 정보 반환
    return NextResponse.json({
      examId: examId,
      grade: examData.grade,
      date: examData.examDate,
      score: examData.score,
      passed: examData.passed,
      duration: examData.duration || examData.examDurationSeconds || 0, // 소요 시간 (초)
      wrongAnswers: examData.wrongAnswers || [],
    })
  } catch (error) {
    console.error("시험 정보 조회 실패:", error)
    return NextResponse.json(
      { error: "시험 정보를 불러오는데 실패했습니다." },
      { status: 500 }
    )
  }
}
