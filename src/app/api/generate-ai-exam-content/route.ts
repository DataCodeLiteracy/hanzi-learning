import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { aiPrompts } from "@/lib/aiPrompts"

// Lazy initialization: 함수 내부에서 필요할 때만 생성
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error(
      "Missing credentials. Please pass an `apiKey`, or set the `OPENAI_API_KEY` environment variable."
    )
  }
  return new OpenAI({
    apiKey,
  })
}

export async function POST(request: NextRequest) {
  try {
    const { questions } = await request.json()

    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json(
        { error: "문제 데이터가 필요합니다." },
        { status: 400 }
      )
    }

    const processedQuestions = []

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i]
      console.log(`🎯 AI API 처리 중:`, {
        questionId: question.id,
        type: question.type,
        hasAiPrompt: !!question.aiPrompt,
        aiPrompt: question.aiPrompt,
      })

      if (question.aiPrompt) {
        try {
          const openai = getOpenAIClient()
          const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content:
                  aiPrompts[question.type as keyof typeof aiPrompts]
                    ?.systemPrompt ||
                  "당신은 한자능력검정시험 문제를 생성하는 전문가입니다.",
              },
              {
                role: "user",
                content: question.aiPrompt,
              },
            ],
            max_tokens:
              aiPrompts[question.type as keyof typeof aiPrompts]?.maxTokens ||
              200,
            temperature:
              aiPrompts[question.type as keyof typeof aiPrompts]?.temperature ||
              0.7,
          })

          const aiContent = completion.choices[0]?.message?.content || ""
          console.log(`🎯 AI 생성 완료:`, {
            questionId: question.id,
            type: question.type,
            aiContent: aiContent,
          })

          // AI 생성 내용을 문제에 적용
          const updatedQuestion = { ...question }

          if (question.type === "word_meaning") {
            // 패턴 4: 문장 생성 - AI 생성 문장을 그대로 사용 (괄호 포함)
            updatedQuestion.aiGeneratedContent = aiContent
            // 문제 설명은 이미 카드에서 했으므로 문장만 표시 (괄호 포함)
            updatedQuestion.question = aiContent
          } else if (question.type === "blank_hanzi") {
            // 패턴 5: 문장 생성
            updatedQuestion.aiGeneratedContent = aiContent
            updatedQuestion.question = `${aiContent}\n\n○에 들어갈 알맞은 한자를 <보기>에서 찾아 번호를 쓰세요.`
          } else if (question.type === "word_meaning_select") {
            // 패턴 6: 한자어 뜻과 오답 생성
            const lines = aiContent.split("\n").filter((line) => line.trim())
            const correctMeaning =
              lines[0]?.replace(/^\d+\.\s*/, "") || question.options?.[0] || ""
            const wrongMeanings = lines
              .slice(1, 4)
              .map((line) => line.replace(/^\d+\.\s*/, ""))

            updatedQuestion.options = [correctMeaning, ...wrongMeanings].slice(
              0,
              4
            )
            updatedQuestion.correctAnswer = 1
            updatedQuestion.aiGeneratedContent = aiContent
          } else if (question.type === "sentence_reading") {
            // 패턴 9: 문장 생성
            updatedQuestion.aiGeneratedContent = aiContent
            updatedQuestion.question = `${aiContent}\n\n[${question.hanziData?.character}] 안의 한자어의 독음(소리)을 <보기>에서 선택하세요.`
          }

          processedQuestions.push(updatedQuestion)
        } catch (aiError) {
          console.error("AI 생성 실패:", aiError)
          // AI 실패 시 원본 문제 사용
          processedQuestions.push(question)
        }
      } else {
        processedQuestions.push(question)
      }
    }

    return NextResponse.json({
      success: true,
      questions: processedQuestions,
    })
  } catch (error) {
    console.error("AI 문제 생성 실패:", error)
    return NextResponse.json(
      { error: "AI 문제 생성에 실패했습니다." },
      { status: 500 }
    )
  }
}
