import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, addDoc, query, where, getDocs } from "firebase/firestore"

export async function POST(request: NextRequest) {
  try {
    const {
      userId,
      grade,
      examDate,
      score,
      passed,
      correctCount,
      totalQuestions,
    } = await request.json()

    if (!userId || !grade || !examDate) {
      return NextResponse.json(
        { success: false, error: "필수 파라미터가 누락되었습니다." },
        { status: 400 }
      )
    }

    // 이미 해당 날짜에 시험 기록이 있는지 확인
    const dailyExamRef = collection(db, "dailyExamRecords")
    const q = query(
      dailyExamRef,
      where("userId", "==", userId),
      where("examDate", "==", examDate)
    )

    const querySnapshot = await getDocs(q)

    if (!querySnapshot.empty) {
      return NextResponse.json(
        { success: false, error: "이미 해당 날짜에 시험 기록이 존재합니다." },
        { status: 409 }
      )
    }

    // 새로운 시험 기록 저장
    const examRecord = {
      userId: userId,
      grade: grade,
      examDate: examDate,
      score: score,
      passed: passed,
      correctCount: correctCount,
      totalQuestions: totalQuestions,
      completedAt: new Date(),
      createdAt: new Date(),
    }

    const docRef = await addDoc(dailyExamRef, examRecord)

    console.log(`🎯 일일 시험 기록 저장:`, {
      recordId: docRef.id,
      userId: userId,
      grade: grade,
      examDate: examDate,
      score: score,
      passed: passed,
    })

    return NextResponse.json({
      success: true,
      message: "시험 기록이 성공적으로 저장되었습니다.",
      data: {
        recordId: docRef.id,
        ...examRecord,
      },
    })
  } catch (error) {
    console.error("시험 기록 저장 실패:", error)
    return NextResponse.json(
      { success: false, error: "시험 기록 저장에 실패했습니다." },
      { status: 500 }
    )
  }
}
