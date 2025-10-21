import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 AI 채점 API 시작 (새로운 버전)")

    const formData = await request.formData()
    const file = formData.get("file") as File
    const userId = formData.get("userId") as string

    if (!file) {
      return NextResponse.json({ error: "파일이 필요합니다" }, { status: 400 })
    }

    if (!userId || userId === "undefined") {
      return NextResponse.json(
        { error: "로그인이 필요합니다. 다시 로그인해주세요." },
        { status: 401 }
      )
    }

    console.log("📁 파일 정보:", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      userId: userId,
    })

    // 일일 채점 제한 확인
    // 한국시간(KST, UTC+9) 기준으로 날짜 계산
    const kstDate = new Date(Date.now() + 9 * 60 * 60 * 1000) // UTC+9
    const today = kstDate.toISOString().split("T")[0]
    const dailyGradingKey = `daily_grading_${userId}_${today}`

    try {
      const { ApiClient } = await import("@/lib/apiClient")
      const userDoc = (await ApiClient.getDocument("users", userId)) as any
      const dailyCount = userDoc?.[dailyGradingKey] || 0
      const maxDailyGrading = 5

      console.log("✅ 일일 채점 제한 확인:", { dailyCount, maxDailyGrading })

      if (dailyCount >= maxDailyGrading) {
        return NextResponse.json(
          {
            error: "일일 채점 제한을 초과했습니다. 내일 다시 시도해주세요.",
            dailyCount,
            maxDailyGrading,
          },
          { status: 429 }
        )
      }
    } catch (error) {
      console.log("⚠️ 일일 제한 확인 실패, 계속 진행:", error)
    }

    // 이미지 변환 및 최적화
    console.log("🔄 이미지 변환 및 최적화 시작...")
    const arrayBuffer = await file.arrayBuffer()
    let buffer = Buffer.from(arrayBuffer)
    let mimeType = file.type

    // HEIC/HEIF 파일 처리
    console.log("🔍 파일 타입 확인:", {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      isHeic: file.type === "image/heic" || file.type === "image/heif",
      isHeicExtension:
        file.name.toLowerCase().endsWith(".heic") ||
        file.name.toLowerCase().endsWith(".heif"),
    })

    // HEIC/HEIF 파일은 클라이언트에서 JPEG로 변환되어 전송됨
    console.log("ℹ️ 클라이언트에서 변환된 이미지 파일 처리")

    // 이미지 최적화 (대비 강화)
    try {
      const sharp = await import("sharp")
      const optimizedBuffer = await sharp
        .default(buffer)
        .resize(1200, 1600, { fit: "inside", withoutEnlargement: true })
        .normalize() // 대비 정규화
        .sharpen() // 선명도 증가
        .jpeg({ quality: 90 })
        .toBuffer()

      buffer = optimizedBuffer as any
      mimeType = "image/jpeg"
      console.log("✅ 이미지 최적화 완료 (대비 강화)")
    } catch (error) {
      console.log("⚠️ 이미지 최적화 실패, 원본 사용:", error)
    }

    const base64Image = buffer.toString("base64")
    console.log("📸 이미지 처리 완료:", {
      mimeType,
      base64Length: base64Image.length,
      bufferSize: buffer.length,
    })

    // OpenAI Vision API 호출 - 7x8 격자 개별 칸 분석 + 한자 추출
    console.log("🔍 AI 7x8 격자 개별 칸 분석 및 한자 추출 시작...")
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `당신은 한자 쓰기 연습지의 7x8 격자를 분석하는 전문가입니다.

임무: 7x8 격자(총 56칸)에서 각 칸의 채워진 상태를 개별적으로 분석하고, 작성된 한자를 정확히 추출하세요.

격자 구조:
- 7열 x 8행 = 56칸
- 각 칸은 연한 회색 가이드 + 어두운 손글씨로 구성
- 칸 번호: 1행(1-7), 2행(8-14), 3행(15-21), 4행(22-28), 5행(29-35), 6행(36-42), 7행(43-49), 8행(50-56)

분석 규칙:
1. 연한 가이드만 있으면 = 미완성 (false)
2. 연한 가이드 위에 명확한 어두운 손글씨가 있으면 = 완성 (true)
3. 보수적으로 분석하세요 - 명확하지 않으면 미완성으로 처리
4. 의심스러운 경우 미완성으로 처리
5. 연한 가이드와 구분되는 명확한 대비가 있어야 완성으로 판단

한자 추출 규칙 (매우 중요):
- 완성된 칸(true)에서만 한자를 추출
- 연한 가이드 글자와 구분되는 어두운 손글씨 한자만 추출
- 한글이나 영어, 다른 문자는 절대 제외하고 중국 한자만 추출
- 중복된 한자는 제거하고 고유한 한자만 추출
- 각 한자는 한 번만 추출 (같은 한자가 여러 칸에 있어도 한 번만)
- 한자 하나씩 정확히 인식하여 추출 (예: "汉字写" → ["汉", "字", "写"])
- 연한 가이드 글자와 손글씨를 정확히 구분하여 손글씨 한자만 추출
- 불완전하거나 희미한 한자는 추출하지 않음

JSON 형식으로만 응답:
{
  "gridAnalysis": {
    "row1": [true/false, true/false, true/false, true/false, true/false, true/false, true/false],
    "row2": [true/false, true/false, true/false, true/false, true/false, true/false, true/false],
    "row3": [true/false, true/false, true/false, true/false, true/false, true/false, true/false],
    "row4": [true/false, true/false, true/false, true/false, true/false, true/false, true/false],
    "row5": [true/false, true/false, true/false, true/false, true/false, true/false, true/false],
    "row6": [true/false, true/false, true/false, true/false, true/false, true/false, true/false],
    "row7": [true/false, true/false, true/false, true/false, true/false, true/false, true/false],
    "row8": [true/false, true/false, true/false, true/false, true/false, true/false, true/false]
  },
  "extractedHanzi": ["추출된한자1", "추출된한자2", "추출된한자3"],
  "summary": {
    "totalCells": 56,
    "completedCells": 완성된 칸 수 (0-56),
    "completionRate": 완성률 (0-100),
    "confidence": 신뢰도 (0-100)
  },
  "reasoning": "분석 근거 설명"
}`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "이 7x8 격자(56칸) 한자 쓰기 연습지에서 각 칸의 채워진 상태를 개별적으로 분석하고, 작성된 한자를 정확히 추출해주세요. 연한 가이드 위에 명확한 어두운 손글씨가 있는 칸만 true로, 그렇지 않으면 false로 표시하세요. 보수적으로 분석하여 의심스러운 경우 false로 처리하세요. 한자 추출 시에는 연한 가이드 글자와 손글씨를 정확히 구분하여 손글씨 한자만 개별적으로 추출하고, 중복을 제거하여 고유한 한자만 추출하세요.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    })

    console.log("✅ OpenAI response received")
    console.log("📊 토큰 사용량:", {
      promptTokens: response.usage?.prompt_tokens,
      completionTokens: response.usage?.completion_tokens,
      totalTokens: response.usage?.total_tokens,
      estimatedCost: `$${(
        (response.usage?.total_tokens || 0) * 0.00015
      ).toFixed(4)}`,
    })

    const aiResponse = response.choices[0]?.message?.content || ""
    console.log("🔍 AI 응답 원본:", aiResponse)

    // JSON 파싱
    let aiAnalysis
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        aiAnalysis = JSON.parse(jsonMatch[0])
      } else {
        aiAnalysis = JSON.parse(aiResponse)
      }
    } catch (error) {
      console.log("⚠️ JSON 파싱 실패, 기본값 사용:", error)
      aiAnalysis = {
        aiDetectedCount: 0,
        confidence: 0,
        reasoning: "파싱 실패",
      }
    }

    console.log("✅ AI 분석 결과:", aiAnalysis)

    // 7x8 격자 상세 로그 출력
    if (aiAnalysis.gridAnalysis) {
      console.log("📊 7x8 격자 상세 분석 결과:")
      console.log("=".repeat(50))

      const rows = [
        "row1",
        "row2",
        "row3",
        "row4",
        "row5",
        "row6",
        "row7",
        "row8",
      ]
      let totalCompleted = 0

      rows.forEach((row, rowIndex) => {
        const rowData = aiAnalysis.gridAnalysis[row]
        if (rowData && Array.isArray(rowData)) {
          const completedInRow = rowData.filter((cell) => cell === true).length
          totalCompleted += completedInRow

          console.log(
            `📋 ${rowIndex + 1}행 (${row}): [${rowData
              .map((cell) => (cell ? "✅" : "❌"))
              .join(" ")}] - 완성: ${completedInRow}/7`
          )
        }
      })

      console.log("=".repeat(50))
      console.log(`📈 총 완성된 칸: ${totalCompleted}/56`)
      console.log(`📊 완성률: ${((totalCompleted / 56) * 100).toFixed(1)}%`)
      console.log(
        `🎯 AI 신뢰도: ${
          aiAnalysis.summary?.confidence || aiAnalysis.confidence || 0
        }%`
      )
      console.log("=".repeat(50))
    }

    // 추출된 한자 로그 출력 및 중복 제거
    if (aiAnalysis.extractedHanzi && aiAnalysis.extractedHanzi.length > 0) {
      // 한자만 필터링 (한글, 영어, 숫자 제거)
      const hanziOnly = aiAnalysis.extractedHanzi.filter((hanzi: string) => {
        // 한자 범위: U+4E00-U+9FFF
        return /[\u4e00-\u9fff]/.test(hanzi) && hanzi.length === 1
      })

      // 중복 제거
      const uniqueHanzi = [...new Set(hanziOnly)]
      aiAnalysis.extractedHanzi = uniqueHanzi
      console.log(
        "🔤 추출된 한자 (필터링 및 중복 제거 후):",
        aiAnalysis.extractedHanzi
      )
    }

    // 중복 한자 체크
    const alreadyPracticedToday = []
    const newCharactersToday = []

    try {
      const { ApiClient } = await import("@/lib/apiClient")

      if (aiAnalysis.extractedHanzi && aiAnalysis.extractedHanzi.length > 0) {
        console.log("🔍 중복 한자 체크 시작...")

        // 모든 한자 통계 가져오기
        const allHanziStats = await ApiClient.getHanziStatisticsNew(userId)
        console.log("📊 기존 한자 통계 개수:", allHanziStats?.length || 0)

        // 오늘 연습한 한자 필터링
        const todayPracticed =
          allHanziStats?.filter(
            (stat: any) => stat.lastWrited && stat.lastWrited.startsWith(today)
          ) || []
        console.log("📅 오늘 연습한 한자 통계:", todayPracticed.length)

        // 추출된 한자와 비교
        for (const hanzi of aiAnalysis.extractedHanzi) {
          // 해당 한자의 모든 통계 찾기 (여러 급수에 있을 수 있음)
          const hanziStats =
            allHanziStats?.filter((stat: any) => stat.character === hanzi) || []

          if (hanziStats.length > 0) {
            // 오늘 이미 연습했는지 확인
            const practicedToday = hanziStats.some(
              (stat: any) =>
                stat.lastWrited && stat.lastWrited.startsWith(today)
            )

            if (practicedToday) {
              alreadyPracticedToday.push(hanzi)
              console.log(`⚠️ 중복 한자 발견: ${hanzi} (오늘 이미 연습함)`)
            } else {
              newCharactersToday.push(hanzi)
              console.log(`✅ 새로운 한자: ${hanzi}`)
            }
          } else {
            newCharactersToday.push(hanzi)
            console.log(`✅ 새로운 한자: ${hanzi} (통계 없음)`)
          }
        }

        console.log("📋 중복 한자 목록:", alreadyPracticedToday)
        console.log("📋 새로운 한자 목록:", newCharactersToday)
      }
    } catch (error) {
      console.log("⚠️ 중복 체크 실패:", error)
    }

    // 중복 체크는 사용자가 최종 확인할 때 수행
    // 여기서는 AI 분석 결과만 반환

    // 일일 채점 카운트 증가
    try {
      const { ApiClient } = await import("@/lib/apiClient")
      const userDoc = (await ApiClient.getDocument("users", userId)) as any
      await ApiClient.updateDocument("users", userId, {
        [dailyGradingKey]: (userDoc?.[dailyGradingKey] || 0) + 1,
      })
      const newUserDoc = (await ApiClient.getDocument("users", userId)) as any
      const newCount = newUserDoc?.[dailyGradingKey]
      console.log("📊 일일 채점 카운트 증가:", { newCount })
    } catch (error) {
      console.log("⚠️ 일일 카운트 업데이트 실패:", error)
    }

    // 기존 형식과 호환되도록 변환
    const aiDetectedCount =
      aiAnalysis.summary?.completedCells || aiAnalysis.aiDetectedCount || 0
    const confidence =
      aiAnalysis.summary?.confidence || aiAnalysis.confidence || 0
    const reasoning = aiAnalysis.reasoning || "분석 완료"

    return NextResponse.json({
      success: true,
      aiDetectedCount: aiDetectedCount,
      confidence: confidence,
      reasoning: reasoning,
      message: "AI 분석이 완료되었습니다. 결과를 확인하고 수정해주세요.",
      gridAnalysis: aiAnalysis.gridAnalysis || null, // 상세 격자 분석 결과 추가
      summary: aiAnalysis.summary || null, // 요약 정보 추가
      extractedHanzi: aiAnalysis.extractedHanzi || [], // 추출된 한자 목록
      alreadyPracticedToday: alreadyPracticedToday, // 오늘 이미 연습한 한자
      newCharactersToday: newCharactersToday, // 오늘 새로 연습한 한자
    })
  } catch (error) {
    console.error("❌ AI 채점 오류:", error)
    return NextResponse.json(
      {
        error: "채점 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 }
    )
  }
}
