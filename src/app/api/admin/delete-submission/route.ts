import { NextRequest, NextResponse } from "next/server"
import { doc, getDoc, deleteDoc } from "firebase/firestore"
import { ref, deleteObject } from "firebase/storage"
import { db, storage } from "@/lib/firebase"
import { ApiClient } from "@/lib/apiClient"

export async function DELETE(request: NextRequest) {
  try {
    const { submissionId } = await request.json()

    if (!submissionId) {
      return NextResponse.json(
        { error: "제출물 ID가 필요합니다" },
        { status: 400 }
      )
    }

    console.log("🗑️ 제출물 삭제 시작:", { submissionId })

    // 제출물 정보 조회
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
    const experienceAwarded = submissionData.experienceAwarded || 0
    const storagePath = submissionData.storagePath

    console.log("📋 삭제할 제출물 정보:", {
      submissionId,
      userId,
      character: submissionData.character,
      experienceAwarded,
      storagePath,
    })

    // 1. 사용자 경험치에서 차감 (경험치가 있었다면)
    if (experienceAwarded > 0) {
      try {
        await ApiClient.addUserExperience(userId, -experienceAwarded)
        console.log("💰 경험치 차감 완료:", {
          userId,
          experienceDeducted: -experienceAwarded,
        })
      } catch (error) {
        console.error("⚠️ 경험치 차감 실패:", error)
        // 경험치 차감 실패해도 삭제는 진행
      }
    }

    // 2. hanziStatistics에서 차감
    try {
      const hanziStatsRef = doc(
        db,
        "hanziStatistics",
        `${userId}_${submissionData.hanziId}`
      )
      const hanziStatsDoc = await getDoc(hanziStatsRef)

      if (hanziStatsDoc.exists()) {
        const currentData = hanziStatsDoc.data()
        const newTotalWrited = Math.max(0, (currentData.totalWrited || 1) - 1)

        if (newTotalWrited === 0) {
          // totalWrited가 0이 되면 문서 삭제
          await deleteDoc(hanziStatsRef)
          console.log("📊 hanziStatistics 문서 삭제 완료")
        } else {
          // totalWrited 감소
          await ApiClient.updateDocument(hanziStatsRef.id, "hanziStatistics", {
            totalWrited: newTotalWrited,
            updatedAt: new Date().toISOString(),
          })
          console.log("📊 hanziStatistics totalWrited 감소:", {
            newTotalWrited,
          })
        }
      }
    } catch (error) {
      console.error("⚠️ hanziStatistics 업데이트 실패:", error)
      // 통계 업데이트 실패해도 삭제는 진행
    }

    // 3. Firebase Storage에서 이미지 삭제
    if (storagePath) {
      try {
        const imageRef = ref(storage, storagePath)
        await deleteObject(imageRef)
        console.log("🖼️ Storage 이미지 삭제 완료:", storagePath)
      } catch (error) {
        console.error("⚠️ Storage 이미지 삭제 실패:", error)
        // 이미지 삭제 실패해도 Firestore 삭제는 진행
      }
    }

    // 4. Firestore에서 제출물 문서 삭제
    await deleteDoc(submissionRef)
    console.log("🗑️ Firestore 제출물 삭제 완료:", submissionId)

    return NextResponse.json({
      success: true,
      message: "제출물이 성공적으로 삭제되었습니다",
      deletedSubmission: {
        id: submissionId,
        character: submissionData.character,
        experienceDeducted: experienceAwarded,
      },
    })
  } catch (error) {
    console.error("❌ 제출물 삭제 오류:", error)
    return NextResponse.json(
      { error: "제출물 삭제에 실패했습니다" },
      { status: 500 }
    )
  }
}
