import { NextRequest, NextResponse } from "next/server"
import { storage } from "@/lib/firebase"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { collection, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export async function POST(request: NextRequest) {
  try {
    console.log("📸 한자 쓰기 이미지 업로드 시작")

    const formData = await request.formData()
    const file = formData.get("file") as File
    const userId = formData.get("userId") as string
    const grade = formData.get("grade") as string
    const hanziId = formData.get("hanziId") as string
    const character = formData.get("character") as string

    // 파일 정보 로그
    console.log("📁 업로드 파일 정보:", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      userId: userId,
      isHeic: file.type === "image/heic" || file.type === "image/heif",
      isHeicExtension:
        file.name.toLowerCase().endsWith(".heic") ||
        file.name.toLowerCase().endsWith(".heif"),
    })

    if (!file || !userId || !grade || !hanziId || !character) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다" },
        { status: 400 }
      )
    }

    // userId가 'undefined' 문자열인지 체크
    if (userId === "undefined" || userId === "null") {
      return NextResponse.json(
        { error: "로그인이 필요합니다. 다시 로그인해주세요." },
        { status: 401 }
      )
    }

    // 오늘 이미 같은 한자를 업로드했는지 체크
    try {
      const { ApiClient } = await import("@/lib/apiClient")
      // 한국시간(KST, UTC+9) 기준으로 날짜 계산
      const kstDate = new Date(Date.now() + 9 * 60 * 60 * 1000) // UTC+9
      const today = kstDate.toISOString().split("T")[0] // YYYY-MM-DD

      // 해당 한자의 통계 조회 (새로운 구조 사용)
      const allHanziStats = await ApiClient.getHanziStatisticsNew(userId)
      const hanziStats = allHanziStats?.find((stat) => stat.hanziId === hanziId)

      if (
        hanziStats &&
        hanziStats.lastWrited &&
        hanziStats.lastWrited.startsWith(today)
      ) {
        console.log("⚠️ 중복 한자 발견:", {
          character,
          lastWrited: hanziStats.lastWrited,
          today,
        })
        return NextResponse.json(
          {
            error: "duplicate",
            message: `오늘 이미 '${character}' 한자를 연습하셨습니다. 내일 다시 시도해주세요.`,
            character: character,
            lastWrited: hanziStats.lastWrited,
          },
          { status: 409 }
        )
      }
    } catch (error) {
      console.error("⚠️ 중복 체크 실패:", error)
      // 중복 체크 실패해도 업로드는 진행
    }

    // 파일명 생성 (날짜_시간_랜덤)
    const now = new Date()
    const dateStr = now.toISOString().split("T")[0] // YYYY-MM-DD
    const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-") // HH-MM-SS
    const randomStr = Math.random().toString(36).substring(2, 8)
    const fileExtension = file.name.split(".").pop() || "jpg"
    const fileName = `${dateStr}_${timeStr}_${randomStr}.${fileExtension}`

    // Storage 경로 생성 (더 안전한 경로)
    const storagePath = `writing_submissions/${userId}/${dateStr}/${fileName}`
    const storageRef = ref(storage, storagePath)

    console.log("🔗 Storage 참조 생성:", {
      storagePath,
      fullPath: storageRef.fullPath,
    })

    console.log("📁 파일 정보:", {
      fileName: file.name,
      fileSize: file.size,
      storagePath,
      userId,
      grade,
      hanziId,
      character,
    })

    // userId 타입 확인
    console.log("🔍 userId 타입 확인:", {
      userId,
      type: typeof userId,
      isString: typeof userId === "string",
      length: userId?.length,
    })

    // 중복 업로드 체크 (갤러리에서 오늘 같은 한자 확인) - 업로드 전에 체크
    try {
      const { query, collection, where, getDocs } = await import(
        "firebase/firestore"
      )

      const submissionsQuery = query(
        collection(db, "writing_submissions"),
        where("userId", "==", userId),
        where("hanziId", "==", hanziId),
        where("submissionDate", "==", dateStr)
      )

      const existingSubmissions = await getDocs(submissionsQuery)

      if (!existingSubmissions.empty) {
        console.log("⚠️ 오늘 이미 업로드된 한자 발견:", { character, dateStr })
        return NextResponse.json(
          {
            error: "duplicate",
            message: `오늘 이미 '${character}' 한자를 연습하셨습니다.`,
            character: character,
          },
          { status: 409 }
        )
      }

      console.log("✅ 중복 체크 통과:", { character, dateStr })
    } catch (error) {
      console.error("⚠️ 중복 체크 실패:", error)
      // 중복 체크 실패해도 업로드는 진행
    }

    // Firebase Storage에 업로드
    try {
      const snapshot = await uploadBytes(storageRef, file)
      console.log("✅ Storage 업로드 완료:", snapshot.metadata.fullPath)
    } catch (storageError) {
      console.error("❌ Storage 업로드 실패:", storageError)
      throw new Error(
        `Storage 업로드 실패: ${
          storageError instanceof Error ? storageError.message : "Unknown error"
        }`
      )
    }

    // 다운로드 URL 생성
    const downloadURL = await getDownloadURL(storageRef)
    console.log("🔗 다운로드 URL 생성:", downloadURL)

    // Firestore에 메타데이터 저장
    const submissionData = {
      userId,
      hanziId,
      character,
      imageUrl: downloadURL,
      fileName,
      storagePath,
      grade: parseInt(grade),
      submissionDate: dateStr,
      status: "pending", // pending, approved, rejected
      adminNotes: "",
      experienceAwarded: 150,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }

    const docRef = await addDoc(
      collection(db, "writing_submissions"),
      submissionData
    )
    console.log("💾 Firestore 저장 완료:", docRef.id)

    // hanziStatistics 업데이트 및 경험치 즉시 반영
    let experienceAdded = 0
    let experienceUpdateSuccess = false

    try {
      const { ApiClient } = await import("@/lib/apiClient")

      // 해당 한자의 통계 업데이트
      await ApiClient.updateHanziWritingStatistics(
        userId,
        hanziId,
        character,
        parseInt(grade)
      )

      // 경험치 즉시 반영 (150exp)
      console.log("💰 경험치 반영 시작:", { userId, experienceToAdd: 150 })
      await ApiClient.addUserExperience(userId, 150, { accrueMileage: true })
      experienceAdded = 150
      experienceUpdateSuccess = true

      console.log("📊 hanziStatistics 업데이트 및 경험치 반영 완료:", {
        hanziId,
        character,
        experienceAdded: 150,
        userId,
      })
    } catch (error) {
      console.error("⚠️ hanziStatistics 업데이트 또는 경험치 반영 실패:", error)

      // 중복 에러인 경우 사용자에게 알림
      if (error instanceof Error && error.message.includes("오늘 이미")) {
        return NextResponse.json(
          {
            error: "duplicate",
            message: error.message,
            character: character,
          },
          { status: 409 }
        )
      }

      // 통계 업데이트 실패해도 업로드는 성공으로 처리
    }

    return NextResponse.json({
      success: true,
      submissionId: docRef.id,
      imageUrl: downloadURL,
      message: "이미지가 성공적으로 업로드되었습니다",
      experienceAdded,
      experienceUpdateSuccess,
    })
  } catch (error) {
    console.error("❌ 업로드 오류:", error)
    return NextResponse.json(
      { error: "이미지 업로드에 실패했습니다" },
      { status: 500 }
    )
  }
}
