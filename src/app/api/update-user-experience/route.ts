import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { doc, updateDoc, increment, getDoc } from "firebase/firestore"

export async function POST(request: NextRequest) {
  try {
    const { userId, experienceGained, activityType, activityDetails } =
      await request.json()

    if (!userId || !experienceGained) {
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
    const currentExperience = currentUserData.experience || 0
    const newExperience = currentExperience + experienceGained

    // 경험치 업데이트
    await updateDoc(userRef, {
      experience: increment(experienceGained),
      lastActivity: new Date(),
      lastActivityType: activityType,
      lastActivityDetails: activityDetails,
    })

    console.log(`🎯 사용자 경험치 업데이트:`, {
      userId: userId,
      기존경험치: currentExperience,
      획득경험치: experienceGained,
      새로운경험치: newExperience,
      활동유형: activityType,
    })

    return NextResponse.json({
      success: true,
      message: "경험치가 성공적으로 업데이트되었습니다.",
      data: {
        previousExperience: currentExperience,
        experienceGained: experienceGained,
        newExperience: newExperience,
      },
    })
  } catch (error) {
    console.error("경험치 업데이트 실패:", error)
    return NextResponse.json(
      { success: false, error: "경험치 업데이트에 실패했습니다." },
      { status: 500 }
    )
  }
}
