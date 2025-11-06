import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"

interface ExamData {
  examId?: string
  grade: number
  score: number
  passed: boolean
  duration?: number
  wrongAnswersRef?: string
}

interface WrongAnswerData {
  questionNumber: number
  questionId?: string
  questionIndex?: number
  userAnswer: string | number
  userSelectedNumber?: number
  correctAnswer: string | number
  pattern: string
  character?: string
  questionText?: string
  options?: string[]
}

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

    // 사용자별 examStatistics 문서 조회
    const userExamStatsRef = doc(db, "examStatistics", userId)
    const userExamStatsDoc = await getDoc(userExamStatsRef)

    if (!userExamStatsDoc.exists()) {
      return NextResponse.json(
        { error: "시험 정보를 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    const userExamStats = userExamStatsDoc.data()
    
    // exams 맵에서 examId로 시험 찾기
    let examData = null
    let examDate = null
    
    if (userExamStats.exams) {
      for (const [date, exam] of Object.entries(userExamStats.exams)) {
        const examEntry = exam as ExamData
        if (examEntry.examId === examId) {
          examData = examEntry
          examDate = date
          break
        }
      }
    }

    if (!examData) {
      return NextResponse.json(
        { error: "시험 정보를 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    // wrongAnswers 별도 컬렉션에서 조회
    let wrongAnswers: WrongAnswerData[] = []
    if (examData.wrongAnswersRef) {
      const wrongAnswersDoc = await getDoc(
        doc(db, "examWrongAnswers", examData.wrongAnswersRef)
      )
      if (wrongAnswersDoc.exists()) {
        const wrongAnswersData = wrongAnswersDoc.data()
        wrongAnswers = wrongAnswersData.wrongAnswers || []
      }
    }

    console.log("🔍 API에서 조회한 시험 데이터:", {
      examId,
      examDate,
      grade: examData.grade,
      score: examData.score,
      wrongAnswersCount: wrongAnswers.length,
    })

    // 틀린 문제 정보 반환
    return NextResponse.json({
      examId: examId,
      grade: examData.grade,
      date: examDate,
      score: examData.score,
      passed: examData.passed,
      duration: examData.duration || 0,
      wrongAnswers: wrongAnswers,
    })
  } catch (error) {
    console.error("시험 정보 조회 실패:", error)
    return NextResponse.json(
      { error: "시험 정보를 불러오는데 실패했습니다." },
      { status: 500 }
    )
  }
}
