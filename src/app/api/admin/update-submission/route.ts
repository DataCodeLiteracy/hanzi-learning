import { NextRequest, NextResponse } from "next/server"
import { doc, updateDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export async function POST(request: NextRequest) {
  try {
    const { submissionId, status, experienceAwarded, adminNotes } =
      await request.json()

    if (!submissionId || !status) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다" },
        { status: 400 }
      )
    }

    console.log("📝 제출물 상태 업데이트:", {
      submissionId,
      status,
      experienceAwarded,
      adminNotes,
    })

    // 기존 제출물 정보 조회
    const submissionRef = doc(db, "writing_submissions", submissionId)
    const submissionDoc = await getDoc(submissionRef)

    if (!submissionDoc.exists()) {
      return NextResponse.json(
        { error: "제출물을 찾을 수 없습니다" },
        { status: 404 }
      )
    }

    const submissionData = submissionDoc.data()
    const userId = submissionData.userId
    const currentExperience = submissionData.experienceAwarded || 0

    // 상태별 경험치 처리 (실제 저장된 값을 기준으로 계산)
    let experienceChange = 0

    if (status === "rejected") {
      // 거부 시: 현재 경험치만큼 차감
      experienceChange = -currentExperience
      console.log(`🚫 거부: ${currentExperience} 경험치 차감`)
    } else if (experienceAwarded !== undefined) {
      // 경험치 조정: 현재 경험치와 새 경험치의 차이만큼 조정
      experienceChange = experienceAwarded - currentExperience
      if (experienceChange > 0) {
        console.log(
          `💰 경험치 조정: ${currentExperience} → ${experienceAwarded} (추가: +${experienceChange})`
        )
      } else if (experienceChange < 0) {
        console.log(
          `💰 경험치 조정: ${currentExperience} → ${experienceAwarded} (차감: ${experienceChange})`
        )
      } else {
        console.log(
          `💰 경험치 조정: ${currentExperience} → ${experienceAwarded} (변화 없음)`
        )
      }
    }

    // 제출물 상태 업데이트
    const updateData: any = {
      status,
      updatedAt: new Date().toISOString(),
    }

    if (experienceAwarded !== undefined) {
      updateData.experienceAwarded = experienceAwarded
    }

    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes
    }

    await updateDoc(submissionRef, updateData)

    // 경험치 변경이 있으면 사용자 경험치 업데이트
    if (experienceChange !== 0) {
      try {
        const { ApiClient } = await import("@/lib/apiClient")
        await ApiClient.addUserExperience(userId, experienceChange)

        console.log("💰 사용자 경험치 업데이트:", {
          userId,
          experienceChange,
        })
      } catch (error) {
        console.error("⚠️ 경험치 업데이트 실패:", error)
        // 경험치 업데이트 실패해도 제출물 상태는 업데이트됨
      }
    }

    console.log("✅ 제출물 상태 업데이트 완료:", {
      submissionId,
      status,
      experienceAwarded,
      experienceChange,
      adminNotes,
    })

    return NextResponse.json({
      success: true,
      message: "상태가 성공적으로 업데이트되었습니다",
      experienceChange,
      adjustedExperience:
        experienceAwarded !== undefined ? experienceAwarded : currentExperience,
      baseExperience: currentExperience,
    })
  } catch (error) {
    console.error("❌ 제출물 상태 업데이트 오류:", error)
    return NextResponse.json(
      { error: "상태 업데이트에 실패했습니다" },
      { status: 500 }
    )
  }
}
