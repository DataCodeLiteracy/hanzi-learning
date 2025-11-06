import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { doc, updateDoc, increment, getDoc } from "firebase/firestore"

export async function POST(request: NextRequest) {
  try {
    const { userId, studyTimeSeconds, activityType, activityDetails } =
      await request.json()

    if (!userId || !studyTimeSeconds) {
      return NextResponse.json(
        { success: false, error: "필수 파라미터가 누락되었습니다." },
        { status: 400 }
      )
    }

    // 사용자 문서 참조
    const userRef = doc(db, "users", userId)

    // 현재 사용자 정보 가져오기
    const userDoc = await getDoc(userRef)
    if (!userDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    const currentUserData = userDoc.data()
    const currentStudyTime = currentUserData.totalStudyTime || 0
    const newStudyTime = currentStudyTime + studyTimeSeconds

    // 학습 시간 업데이트
    await updateDoc(userRef, {
      totalStudyTime: increment(studyTimeSeconds),
      lastActivity: new Date(),
      lastActivityType: activityType,
      lastActivityDetails: activityDetails,
    })

    console.log(`🎯 사용자 학습시간 업데이트:`, {
      userId: userId,
      기존학습시간: currentStudyTime,
      추가학습시간: studyTimeSeconds,
      새로운학습시간: newStudyTime,
      활동유형: activityType,
    })

    return NextResponse.json({
      success: true,
      message: "학습시간이 성공적으로 업데이트되었습니다.",
      data: {
        previousStudyTime: currentStudyTime,
        studyTimeAdded: studyTimeSeconds,
        newStudyTime: newStudyTime,
      },
    })
  } catch (error) {
    console.error("학습시간 업데이트 실패:", error)
    return NextResponse.json(
      { success: false, error: "학습시간 업데이트에 실패했습니다." },
      { status: 500 }
    )
  }
}
