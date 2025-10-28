"use client"

import { useState, useEffect, useCallback, use } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import LoadingSpinner from "@/components/LoadingSpinner"
import { ArrowLeft, Clock, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTimeTracking } from "@/hooks/useTimeTracking"
import { getGradePatterns } from "@/lib/gradePatterns"
import { patterns } from "@/lib/patterns"
import { aiPrompts } from "@/lib/aiPrompts"

interface HanziData {
  character: string
  sound: string
  meaning: string
  relatedWords: Array<{
    hanzi: string
    korean: string
    isTextBook: boolean
  }>
}

interface ExamQuestion {
  id: string
  type:
    | "sound"
    | "meaning"
    | "word_reading"
    | "word_meaning"
    | "blank_hanzi"
    | "word_meaning_select"
    | "hanzi_write"
    | "word_reading_write"
    | "sentence_reading"
    | "subjective"
  question: string
  options?: string[]
  correctAnswer: string | number
  explanation?: string
  hanziData?: HanziData
  needsAI?: boolean
  aiPrompt?: string
  aiGeneratedContent?: string
}

interface ExamSession {
  id: string
  userId: string
  grade: number
  questions: ExamQuestion[]
  answers: Record<string, string | number>
  startTime: Date
  endTime?: Date
  score?: number
  passed?: boolean
}

const gradeInfo: Record<
  number,
  { name: string; questionCount: number; timeLimit: number }
> = {
  8: { name: "8급", questionCount: 50, timeLimit: 60 },
  7: { name: "7급", questionCount: 50, timeLimit: 60 },
  6: { name: "6급", questionCount: 80, timeLimit: 60 },
  5: { name: "5급", questionCount: 100, timeLimit: 60 },
  4: { name: "4급", questionCount: 100, timeLimit: 60 },
  3: { name: "3급", questionCount: 100, timeLimit: 60 },
  2: { name: "2급", questionCount: 100, timeLimit: 60 },
  1: { name: "1급", questionCount: 100, timeLimit: 60 },
  0: { name: "사범급", questionCount: 100, timeLimit: 60 },
}

export default function ExamGradePage({
  params,
}: {
  params: Promise<{ grade: string }>
}) {
  const { user, loading: authLoading, initialLoading } = useAuth()
  const { refreshUserStatistics, hanziList } = useData()
  const router = useRouter()

  const resolvedParams = use(params)
  const grade = parseInt(resolvedParams.grade)
  const currentGradeInfo = gradeInfo[grade]

  // 시간 추적 훅
  const { startSession, endSession, currentDuration } = useTimeTracking({
    userId: user?.id || "",
    type: "game",
    activity: "exam",
    autoStart: false,
    autoEnd: true,
  })

  const [examSession, setExamSession] = useState<ExamSession | null>(null)
  const [currentPattern, setCurrentPattern] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | number>>({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState("한자 데이터 분석 중...")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDailyLimitModal, setShowDailyLimitModal] = useState(false)

  // 패턴 4 관련 상태
  const [pattern4Options, setPattern4Options] = useState<string[]>([])
  const [currentPattern4Options, setCurrentPattern4Options] = useState<
    string[]
  >([])

  // 최종 50개 문제 배열 상태
  const [finalQuestionsArray, setFinalQuestionsArray] = useState<any[]>([])
  const [correctAnswersArray, setCorrectAnswersArray] = useState<any[]>([])

  // 급수별 패턴 정보를 동적으로 가져오기
  const gradePatterns = getGradePatterns(grade)

  // 한자 뜻을 자연스러운 형태로 변환하는 함수
  const convertMeaningToNatural = (meaning: string): string => {
    const conversions: Record<string, string> = {
      무거울: "무거운",
      작을: "작은",
      클: "큰",
      높을: "높은",
      낮을: "낮은",
      좋을: "좋은",
      나쁠: "나쁜",
      빠를: "빠른",
      느릴: "느린",
      밝을: "밝은",
      어두울: "어두운",
      따뜻할: "따뜻한",
      차가울: "차가운",
      많을: "많은",
      적을: "적은",
      새로울: "새로운",
      오래될: "오래된",
      젊을: "젊은",
      늙을: "늙은",
      아름다울: "아름다운",
      못생길: "못생긴",
      똑똑할: "똑똑한",
      바쁠: "바쁜",
      한가할: "한가한",
      기쁠: "기쁜",
      슬플: "슬픈",
      화날: "화난",
      무서울: "무서운",
      재미있을: "재미있는",
      지루할: "지루한",
      편안할: "편안한",
      불편할: "불편한",
      깨끗할: "깨끗한",
      더러울: "더러운",
      건강할: "건강한",
      아플: "아픈",
      피곤할: "피곤한",
      졸릴: "졸린",
      배고플: "배고픈",
      목마를: "목마른",
      춥을: "추운",
      더울: "더운",
      습할: "습한",
      건조할: "건조한",
      시원할: "시원한",
      조용할: "조용한",
      시끌벅적할: "시끌벅적한",
      평화로울: "평화로운",
      위험할: "위험한",
      안전할: "안전한",
      쉬울: "쉬운",
      어려울: "어려운",
      중요할: "중요한",
      필요할: "필요한",
      불필요할: "불필요한",
      유용할: "유용한",
      쓸모없을: "쓸모없는",
      가치있을: "가치있는",
      소중할: "소중한",
      특별할: "특별한",
      일반적일: "일반적인",
      보통일: "보통인",
      평범할: "평범한",
      특이할: "특이한",
      이상할: "이상한",
      정상일: "정상인",
      비정상일: "비정상인",
      올바를: "올바른",
      틀릴: "틀린",
      맞을: "맞는",
      정확할: "정확한",
      부정확할: "부정확한",
      완전할: "완전한",
      불완전할: "불완전한",
      충분할: "충분한",
      부족할: "부족한",
      모든: "모든",
      일부일: "일부인",
      전체일: "전체인",
      부분일: "부분인",
      절반일: "절반인",
      전부일: "전부인",
      아무것도: "아무것도",
      아무도: "아무도",
      아무나: "아무나",
      누구나: "누구나",
      언제나: "언제나",
      어디나: "어디나",
      어떻게나: "어떻게나",
      왜나: "왜나",
      어디서나: "어디서나",
      언제든지: "언제든지",
      어디든지: "어디든지",
      어떻게든지: "어떻게든지",
      왜든지: "왜든지",
      어디서든지: "어디서든지",
      // 추가 변환
      넉: "넷",
      고를: "고르는",
      벌일: "벌이는",
      다스릴: "다스리는",
      갖출: "갖추는",
      시험할: "시험하는",
      볼: "보는",
      들: "들어가는",
      나눌: "나누는",
      생각: "생각하는",
      물을: "물어보는",
      느낄: "느끼는",
      착할: "착한",
      살: "사는",
      설: "서는",
      눈: "눈으로",
      불: "불이",
      두: "두 개의",
      계집: "여자",
      장인: "장인이",
      지경: "경계",
      셀: "계산하는",
      일천: "천",
      일백: "백",
      가운데: "중간",
      아홉: "아홉 개의",
      문: "문이",
      자태: "자세",
      믿을: "믿는",
      위: "위쪽",
      정오: "정오에",
      여덟: "여덟 개의",
      모양: "형태",
      손: "손으로",
      돌: "돌이",
      여섯: "여섯 개의",
      임금: "왕이",
      사내: "남자가",
    }

    return conversions[meaning] || meaning
  }

  // 1단계: 한자 분류 및 선택
  const classifyAndSelectHanzi = useCallback(() => {
    // 전체 문제 수 계산
    const totalQuestions = gradePatterns.reduce(
      (sum, pattern) => sum + pattern.questionCount,
      0
    )

    // isTextBook: true 패턴들의 문제수 합계 계산
    let textBookNeeded = 0
    gradePatterns.forEach((pattern: any) => {
      if (pattern.isTextBook) {
        textBookNeeded += pattern.questionCount
      }
    })

    const normalNeeded = totalQuestions - textBookNeeded

    console.log(`🎯 패턴별 필요 한자 수:`, {
      isTextBook필요: textBookNeeded,
      일반필요: normalNeeded,
      총필요: totalQuestions,
    })

    // isTextBook 한자들을 미리 필터링
    const textBookHanzi = hanziList.filter((hanzi: any) => {
      if (!hanzi.relatedWords) return false

      if (Array.isArray(hanzi.relatedWords)) {
        return hanzi.relatedWords.some((word: any) => word.isTextBook)
      } else {
        return hanzi.relatedWords.isTextBook
      }
    })

    const normalHanzi = hanziList.filter(
      (hanzi: any) => !textBookHanzi.includes(hanzi)
    )

    console.log(`🎯 한자 분류 결과:`, {
      전체한자수: hanziList.length,
      isTextBook한자수: textBookHanzi.length,
      일반한자수: normalHanzi.length,
    })

    // 필요한 만큼 각각에서 랜덤 추출
    const shuffledTextBook = [...textBookHanzi].sort(() => Math.random() - 0.5)
    const shuffledNormal = [...normalHanzi].sort(() => Math.random() - 0.5)

    // isTextBook 한자들을 필요한 수만큼 추출
    const selectedTextBookHanzi = shuffledTextBook.slice(0, textBookNeeded)
    // 나머지 문제수만큼 일반 한자들에서 추출
    const selectedNormalHanzi = shuffledNormal.slice(0, normalNeeded)

    console.log(`🎯 선택된 한자 수:`, {
      선택된isTextBook수: selectedTextBookHanzi.length,
      선택된일반수: selectedNormalHanzi.length,
      총선택수: selectedTextBookHanzi.length + selectedNormalHanzi.length,
    })

    return {
      selectedTextBookHanzi,
      selectedNormalHanzi,
      totalQuestions,
    }
  }, [hanziList, gradePatterns])

  // 2단계: 패턴별 문제 생성
  const generateQuestionsByPattern = useCallback(
    (selectedTextBookHanzi: any[], selectedNormalHanzi: any[]) => {
      const structuredQuestions: any[] = []
      let textBookIndex = 0
      let normalIndex = 0

      gradePatterns.forEach((pattern: any) => {
        let patternQuestionCount = 0
        let attempts = 0
        const maxAttempts = pattern.questionCount * 3 // 무한루프 방지

        while (
          patternQuestionCount < pattern.questionCount &&
          attempts < maxAttempts
        ) {
          attempts++

          // 패턴에 따라 적절한 한자 선택
          let hanzi = null
          if (pattern.isTextBook) {
            if (textBookIndex >= selectedTextBookHanzi.length) {
              textBookIndex = 0 // 처음부터 다시 시작
            }
            hanzi = selectedTextBookHanzi[textBookIndex]
            textBookIndex++
          } else {
            if (normalIndex >= selectedNormalHanzi.length) {
              normalIndex = 0 // 처음부터 다시 시작
            }
            hanzi = selectedNormalHanzi[normalIndex]
            normalIndex++
          }

          if (!hanzi) {
            console.log(
              `⚠️ 패턴 ${pattern.pattern} 문제 ${
                patternQuestionCount + 1
              } 생성 실패: 한자 부족`
            )
            continue
          }

          const question = createQuestionByPattern(
            pattern,
            hanzi,
            structuredQuestions.length
          )

          if (question) {
            structuredQuestions.push(question)
            patternQuestionCount++
          }
        }

        // 패턴 9만 로그 출력
        if (pattern.type === "sentence_reading") {
          console.log(
            `🎯 패턴 ${pattern.type} 생성 완료: ${patternQuestionCount}/${pattern.questionCount}개`
          )
        }
      })

      console.log(
        `🎯 2단계 완료: 패턴별로 구성된 ${structuredQuestions.length}개 문제:`,
        structuredQuestions
      )

      return structuredQuestions
    },
    [gradePatterns]
  )

  // 3단계: 개별 문제 생성
  const createQuestionByPattern = useCallback(
    (pattern: any, hanzi: any, questionIndex: number) => {
      const patternInfo = patterns[pattern.type as keyof typeof patterns]

      // 기본 구조 생성
      const question: any = {
        id: `q_${questionIndex}`, // ID 추가
        type: pattern.type,
        character: hanzi.character,
        meaning: hanzi.meaning,
        sound: hanzi.sound,
        relatedWords: hanzi.relatedWords?.[0] || null, // 첫 번째 관련 단어만
        aiText: "",
      }

      // 패턴별 특별 처리
      switch (pattern.type) {
        case "word_reading_write":
          const textBookWord8 = findTextBookWord(hanzi)
          if (textBookWord8) {
            question.textBookWord = textBookWord8
            question.correctAnswer = textBookWord8.korean
          } else {
            return null // 문제 생성 실패
          }
          break

        case "blank_hanzi":
          const textBookWord5 = findTextBookWord(hanzi)
          if (textBookWord5) {
            question.aiText = aiPrompts.blank_hanzi.userPrompt({
              ...hanzi,
              relatedWord: {
                hanzi: textBookWord5.hanzi,
                meaning: textBookWord5.korean,
              },
            })
          } else {
            return null // 문제 생성 실패
          }
          break

        case "word_meaning_select":
          const textBookWord6 = findTextBookWord(hanzi)
          if (textBookWord6) {
            question.textBookWord = textBookWord6
            question.aiText = aiPrompts.word_meaning_select.userPrompt({
              ...hanzi,
              character: textBookWord6.hanzi,
              meaning: textBookWord6.korean,
            })
          } else {
            return null // 문제 생성 실패
          }
          break

        case "sentence_reading":
          const textBookWord9 = findTextBookWord(hanzi)
          if (textBookWord9) {
            question.textBookWord = textBookWord9
            question.aiText = aiPrompts.sentence_reading.userPrompt({
              ...hanzi,
              character: textBookWord9.hanzi,
              meaning: textBookWord9.korean,
            })
          } else {
            return null // 문제 생성 실패
          }
          break

        case "word_meaning":
          const naturalMeaning = convertMeaningToNatural(hanzi.meaning)
          question.aiText = aiPrompts.word_meaning.userPrompt({
            ...hanzi,
            meaning: naturalMeaning,
          })
          break
      }

      return question
    },
    [convertMeaningToNatural]
  )

  // isTextBook 단어 찾기 헬퍼 함수
  const findTextBookWord = useCallback((hanzi: any) => {
    if (!hanzi.relatedWords) return null

    if (Array.isArray(hanzi.relatedWords)) {
      return hanzi.relatedWords.find((word: any) => word.isTextBook)
    } else if (hanzi.relatedWords.isTextBook) {
      return hanzi.relatedWords
    }
    return null
  }, [])

  // 4단계: 정답 배열 생성 (문제 순서대로)
  const generateCorrectAnswers = useCallback((structuredQuestions: any[]) => {
    const correctAnswers: any[] = []

    structuredQuestions.forEach((question, index) => {
      let correctAnswer: any = null

      switch (question.type) {
        case "sound":
          correctAnswer = question.sound
          break
        case "meaning":
          correctAnswer = question.character
          break
        case "word_reading":
          correctAnswer = question.relatedWords?.korean || question.sound
          break
        case "word_meaning":
          correctAnswer = question.character
          break
        case "blank_hanzi":
          correctAnswer = question.character
          break
        case "word_meaning_select":
          // AI가 생성한 정답이 있으면 사용, 없으면 기본값 사용
          correctAnswer =
            question.correctAnswer ||
            question.textBookWord?.korean ||
            question.relatedWords?.korean ||
            question.meaning
          break
        case "hanzi_write":
          correctAnswer = `${question.meaning} ${question.sound}`
          break
        case "word_reading_write":
          correctAnswer =
            question.correctAnswer ||
            question.textBookWord?.korean ||
            question.sound
          break
        case "sentence_reading":
          correctAnswer =
            question.textBookWord?.korean ||
            question.relatedWords?.korean ||
            question.sound
          break
      }

      correctAnswers.push({
        questionIndex: index,
        type: question.type,
        character: question.character,
        correctAnswer: correctAnswer,
      })
    })

    console.log(`🎯 정답 배열 생성 완료:`, {
      문제수: structuredQuestions.length,
      정답배열수: correctAnswers.length,
      정답예시: correctAnswers.slice(0, 3).map((ca) => ({
        문제번호: ca.questionIndex + 1,
        타입: ca.type,
        정답: ca.correctAnswer,
      })),
    })

    return correctAnswers
  }, [])

  // 5단계: AI 처리
  const processAIQuestions = useCallback(async (structuredQuestions: any[]) => {
    const aiQuestionsToProcess = structuredQuestions.filter((q) => q.aiText)

    console.log(`🎯 AI 처리할 문제들:`, {
      전체문제수: structuredQuestions.length,
      AI처리필요: aiQuestionsToProcess.length,
      패턴별분류: aiQuestionsToProcess.reduce((acc: any, q) => {
        acc[q.type] = (acc[q.type] || 0) + 1
        return acc
      }, {}),
    })

    if (aiQuestionsToProcess.length > 0) {
      setLoadingProgress(30)
      setLoadingMessage("문제 문장 생성 중...")

      // 순차적 진행률 표시
      setTimeout(() => setLoadingProgress(40), 500)
      setTimeout(() => setLoadingProgress(50), 1000)
      setTimeout(() => setLoadingProgress(60), 1500)

      try {
        const response = await fetch("/api/generate-ai-exam-content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questions: aiQuestionsToProcess.map((q) => ({
              id: q.id,
              type: q.type,
              aiPrompt: q.aiText,
              hanziData: {
                character: q.character,
                meaning: q.meaning,
                sound: q.sound,
                relatedWords: q.relatedWords,
              },
            })),
          }),
        })

        if (!response.ok) throw new Error("AI 처리 실패")

        const aiResult = await response.json()
        console.log(`🎯 AI API 응답:`, aiResult)

        if (aiResult.success && aiResult.questions) {
          aiResult.questions.forEach((aiProcessed: any) => {
            const questionIndex = parseInt(aiProcessed.id.replace("q_", ""))
            if (structuredQuestions[questionIndex]) {
              let processedContent = aiProcessed.aiGeneratedContent

              // 패턴 5 (blank_hanzi) 후처리
              if (structuredQuestions[questionIndex].type === "blank_hanzi") {
                const question = structuredQuestions[questionIndex]
                // relatedWords가 배열인지 객체인지 확인
                let relatedWord = null
                if (Array.isArray(question.relatedWords)) {
                  relatedWord = question.relatedWords.find(
                    (word: any) => word.isTextBook
                  )
                } else if (
                  question.relatedWords &&
                  question.relatedWords.isTextBook
                ) {
                  relatedWord = question.relatedWords
                }

                if (relatedWord) {
                  // 1단계: 한글 의미를 한자어로 바꾸기
                  processedContent = processedContent.replace(
                    new RegExp(relatedWord.korean, "g"),
                    relatedWord.hanzi
                  )

                  // 2단계: 정답 한자를 ○로 바꾸기
                  processedContent = processedContent.replace(
                    new RegExp(question.character, "g"),
                    "○"
                  )
                }
              } else if (
                structuredQuestions[questionIndex].type ===
                "word_meaning_select"
              ) {
                // 패턴 6 (word_meaning_select) 후처리
                // AI 응답에서 정답과 오답 추출
                const lines = processedContent
                  .split("\n")
                  .filter((line: string) => line.trim())
                let correctAnswer = ""
                let wrongAnswers: string[] = []

                lines.forEach((line: string) => {
                  if (line.includes("정답:")) {
                    correctAnswer = line.replace("정답:", "").trim()
                  } else if (line.includes("오답")) {
                    wrongAnswers.push(line.replace(/오답\d*:/, "").trim())
                  }
                })

                // 정답이 제대로 파싱되지 않았을 경우 기본값 사용
                if (!correctAnswer || wrongAnswers.length < 3) {
                  correctAnswer =
                    structuredQuestions[questionIndex].textBookWord?.korean ||
                    structuredQuestions[questionIndex].relatedWords?.korean ||
                    structuredQuestions[questionIndex].meaning

                  // 더 의미있는 오답 생성
                  const baseAnswer = correctAnswer
                  wrongAnswers = [
                    `${baseAnswer}의 반대`,
                    `${baseAnswer}와 유사한`,
                    `${baseAnswer}의 다른 의미`,
                  ]
                }

                // 정답과 오답을 structuredQuestions에 저장
                structuredQuestions[questionIndex].correctAnswer = correctAnswer
                structuredQuestions[questionIndex].wrongAnswers = wrongAnswers
                structuredQuestions[questionIndex].allOptions = [
                  correctAnswer,
                  ...wrongAnswers,
                ].sort(() => Math.random() - 0.5)
              }

              structuredQuestions[questionIndex].aiGeneratedContent =
                processedContent
            }
          })
        }

        setLoadingProgress(70)
        setTimeout(() => setLoadingProgress(80), 100)
        setTimeout(() => setLoadingProgress(90), 200)
      } catch (error) {
        console.warn("⚠️ AI 처리 실패했지만 시험 계속 진행:", error)
      }
    }

    return structuredQuestions
  }, [])

  // 메인 함수: 모든 단계를 통합
  const generateSimpleExamQuestions = useCallback(async () => {
    console.log(`🔄 시험 문제 로드 시작`)

    // 1단계: 한자 분류 및 선택
    const { selectedTextBookHanzi, selectedNormalHanzi } =
      classifyAndSelectHanzi()

    // 2단계: 패턴별 문제 생성
    const structuredQuestions = generateQuestionsByPattern(
      selectedTextBookHanzi,
      selectedNormalHanzi
    )

    // 3단계: 정답 배열 생성 (문제 순서대로)
    const correctAnswers = generateCorrectAnswers(structuredQuestions)

    // 4단계: AI 처리
    const finalQuestions = await processAIQuestions(structuredQuestions)

    // 5단계: 상태 저장
    setFinalQuestionsArray(finalQuestions)
    setCorrectAnswersArray(correctAnswers)

    // 6단계: 패턴 4 보기 생성
    const pattern4Questions = finalQuestions.filter(
      (q) => q.type === "word_meaning"
    )
    if (pattern4Questions.length > 0) {
      const correctAnswers = pattern4Questions.map((q) => q.character)
      const uniqueAnswers = [...new Set(correctAnswers)]

      const allHanziCharacters = [
        ...selectedTextBookHanzi,
        ...selectedNormalHanzi,
      ].map((h: any) => h.character)
      const wrongAnswers = allHanziCharacters
        .filter((char: string) => !uniqueAnswers.includes(char))
        .sort(() => Math.random() - 0.5)
        .slice(0, 9 - uniqueAnswers.length)

      const allOptions = [...uniqueAnswers, ...wrongAnswers]
      const shuffledOptions = allOptions.sort(() => Math.random() - 0.5)

      setPattern4Options(shuffledOptions)
      setCurrentPattern4Options(shuffledOptions)
    }

    console.log(`🎯 최종 문제 생성 완료:`, {
      요청문제수: gradePatterns.reduce(
        (sum, pattern) => sum + pattern.questionCount,
        0
      ),
      실제생성수: finalQuestions.length,
      정답배열수: correctAnswers.length,
    })

    return finalQuestions
  }, [
    classifyAndSelectHanzi,
    generateQuestionsByPattern,
    generateCorrectAnswers,
    processAIQuestions,
    gradePatterns,
  ])

  // 중복되지 않는 선택지 생성 함수
  const generateUniqueOptions = (
    correctAnswer: string,
    shuffled: any[],
    field: string
  ) => {
    const options = [correctAnswer]
    const usedValues = new Set([correctAnswer])
    let attempts = 0
    const maxAttempts = Math.min(shuffled.length * 3, 100) // 무한루프 방지 강화

    while (
      options.length < 4 &&
      usedValues.size < shuffled.length &&
      attempts < maxAttempts
    ) {
      attempts++
      const randomHanzi = shuffled[Math.floor(Math.random() * shuffled.length)]
      let value = ""

      if (field === "sound") {
        value = randomHanzi.sound
      } else if (field === "character") {
        value = randomHanzi.character
      } else if (field === "relatedWords") {
        // relatedWords가 배열인 경우
        if (
          randomHanzi.relatedWords &&
          Array.isArray(randomHanzi.relatedWords)
        ) {
          const randomWord =
            randomHanzi.relatedWords[
              Math.floor(Math.random() * randomHanzi.relatedWords.length)
            ]
          value = randomWord.korean
        } else if (
          randomHanzi.relatedWords &&
          randomHanzi.relatedWords.korean
        ) {
          // relatedWords가 단일 객체인 경우
          value = randomHanzi.relatedWords.korean
        } else {
          continue
        }
      }

      if (value && !usedValues.has(value)) {
        options.push(value)
        usedValues.add(value)
      }
    }

    // 4개가 안 되면 나머지 채우기
    let fillAttempts = 0
    const maxFillAttempts = Math.min(shuffled.length * 2, 50) // 무한루프 방지 강화

    while (options.length < 4 && fillAttempts < maxFillAttempts) {
      fillAttempts++
      const randomHanzi = shuffled[Math.floor(Math.random() * shuffled.length)]
      let value = ""

      if (field === "sound") {
        value = randomHanzi.sound
      } else if (field === "character") {
        value = randomHanzi.character
      } else if (field === "relatedWords") {
        // relatedWords가 배열인 경우
        if (
          randomHanzi.relatedWords &&
          Array.isArray(randomHanzi.relatedWords)
        ) {
          const randomWord =
            randomHanzi.relatedWords[
              Math.floor(Math.random() * randomHanzi.relatedWords.length)
            ]
          value = randomWord.korean
        } else if (
          randomHanzi.relatedWords &&
          randomHanzi.relatedWords.korean
        ) {
          // relatedWords가 단일 객체인 경우
          value = randomHanzi.relatedWords.korean
        } else {
          continue
        }
      }

      if (value) {
        options.push(value)
      }
    }

    // 최소 4개는 보장
    while (options.length < 4) {
      options.push(`선택지${options.length + 1}`)
    }

    return options.slice(0, 4).sort(() => Math.random() - 0.5)
  }

  // 패턴별 문제 분류는 외부 파일에서 가져온 patterns 사용

  const loadExamQuestions = useCallback(async () => {
    if (examSession) {
      console.log("⚠️ 이미 시험 세션이 존재합니다. 중복 실행 방지")
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      setLoadingProgress(10)
      setLoadingMessage("시험 가능 여부 확인 중...")

      // 오늘 이미 시험을 봤는지 확인 (테스트를 위해 임시 비활성화)
      // if (user) {
      //   const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD 형식
      //   const response = await fetch(
      //     `/api/check-daily-exam?userId=${user.id}&date=${today}`
      //   )
      //   const result = await response.json()

      //   if (result.hasTakenToday) {
      //     setShowDailyLimitModal(true)
      //     setIsLoading(false)
      //     return
      //   }
      // }

      setLoadingProgress(20)
      setLoadingMessage("한자 데이터 분석 중...")

      // 현재 급수에 맞는 한자 데이터 필터링
      const gradeHanzi = hanziList.filter((hanzi: any) => hanzi.grade === grade)

      if (gradeHanzi.length === 0) {
        throw new Error("해당 급수의 한자 데이터가 없습니다.")
      }

      setLoadingProgress(20)
      setLoadingMessage("문제 생성 중...")

      // 클라이언트 사이드에서 문제 생성 (간단한 랜덤 선택)
      const questions = await generateSimpleExamQuestions()

      console.log(`🎯 생성된 문제 수 확인:`, {
        요청문제수: currentGradeInfo.questionCount,
        실제생성수: questions.length,
        문제들: questions.map((q) => ({ id: q.id, type: q.type })),
      })

      if (questions.length === 0) {
        throw new Error("문제 생성에 실패했습니다. 다시 시도해주세요.")
      }

      const session: ExamSession = {
        id: `exam_${Date.now()}`,
        userId: user!.id,
        grade,
        questions: questions,
        answers: {},
        startTime: new Date(),
      }

      setLoadingProgress(70)
      setLoadingMessage("시험 환경 설정 중...")
      setExamSession(session)

      const initialTime = currentGradeInfo.timeLimit * 60
      setTimeLeft(initialTime) // 분을 초로 변환

      // 시험 시작 시 시간 추적 시작
      if (user) {
        startSession()
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "시험 문제를 불러올 수 없습니다."
      )
      setLoadingProgress(100)
      setLoadingMessage("시험 준비 완료!")
    } finally {
      setIsLoading(false)
    }
  }, [user, grade, currentGradeInfo, hanziList])

  const handleAnswer = useCallback(
    (questionId: string, answer: string | number) => {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: answer,
      }))

      // 정답 확인 로그
      const questionIndex = parseInt(questionId.replace("q_", ""))
      const correctAnswer = correctAnswersArray[questionIndex]
      if (correctAnswer) {
      }
    },
    [correctAnswersArray]
  )

  const handleSubmitExam = useCallback(async () => {
    if (!examSession) return

    try {
      setIsSubmitting(true)

      // 시험 종료 시 시간 추적 종료
      if (user) {
        endSession()
      }

      // 점수 계산
      let correctCount = 0
      let answeredCount = 0
      let unansweredCount = 0

      examSession.questions.forEach((question, index) => {
        const userAnswer = answers[question.id]

        // question.id에서 인덱스 추출 (q_0, q_1, ...)
        const questionIndex = parseInt(question.id.replace("q_", ""))
        const correctAnswer = correctAnswersArray[questionIndex]

        console.log(`🎯 정답 찾기:`, {
          questionId: question.id,
          questionIndex: questionIndex,
          correctAnswersArrayLength: correctAnswersArray.length,
          correctAnswer: correctAnswer,
        })

        // 답안 제출 여부 확인
        const hasAnswered =
          userAnswer !== undefined && userAnswer !== null && userAnswer !== ""

        if (hasAnswered) {
          answeredCount++
        } else {
          unansweredCount++
        }

        // 사용자가 선택한 옵션의 텍스트 가져오기
        let selectedOptionText = null
        if (hasAnswered && question.options && userAnswer) {
          const optionIndex = parseInt(String(userAnswer)) - 1 // 1-based to 0-based
          selectedOptionText = question.options[optionIndex]
        }

        const isCorrect =
          hasAnswered &&
          correctAnswer &&
          selectedOptionText === correctAnswer.correctAnswer

        console.log(`🎯 정답 비교:`, {
          questionId: question.id,
          questionIndex: questionIndex,
          userAnswer: userAnswer,
          selectedOptionText: selectedOptionText,
          hasAnswered: hasAnswered,
          correctAnswer: correctAnswer?.correctAnswer,
          questionOptions: question.options,
          isCorrect: isCorrect,
        })

        // 답안이 있고 정답인 경우만 정답으로 처리
        if (isCorrect) {
          correctCount++
        }
      })

      console.log(`🎯 답안 제출 현황:`, {
        총문제수: examSession.questions.length,
        답안제출수: answeredCount,
        미제출수: unansweredCount,
        정답수: correctCount,
      })

      // 점수 계산: 문제당 점수 * 정답 문제수
      const pointsPerQuestion = Math.round(100 / examSession.questions.length)
      const score = Math.round(correctCount * pointsPerQuestion)
      const passed = score >= 70 // 70점 이상 통과

      console.log(`🎯 점수 계산:`, {
        총문제수: examSession.questions.length,
        답안제출수: answeredCount,
        미제출수: unansweredCount,
        정답수: correctCount,
        문제당점수: pointsPerQuestion,
        최종점수: score,
        통과여부: passed,
      })

      // 시험 결과 저장
      const examResult = {
        ...examSession,
        answers,
        endTime: new Date(),
        score,
        passed,
        actualDuration: currentDuration, // 실제 소요 시간 (초)
      }

      // API로 결과 저장
      await fetch("/api/save-exam-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(examResult),
      })

      // 오늘 시험 완료 기록 저장 (테스트를 위해 임시 비활성화)
      // if (user) {
      //   try {
      //     await fetch("/api/save-daily-exam-record", {
      //       method: "POST",
      //       headers: { "Content-Type": "application/json" },
      //       body: JSON.stringify({
      //         userId: user.id,
      //         grade: grade,
      //         examDate: new Date().toISOString().split("T")[0],
      //         score: score,
      //         passed: passed,
      //         correctCount: correctCount,
      //         totalQuestions: examSession.questions.length,
      //       }),
      //     })
      //     console.log(`🎯 오늘 시험 완료 기록 저장: ${grade}급`)
      //   } catch (error) {
      //     console.error("시험 완료 기록 저장 실패:", error)
      //   }
      // }

      // 경험치 계산 및 반영 (합격 시 기본 50 + 정답 문제수, 불합격 시 정답 문제수만)
      const isPassed = score >= 70
      const baseExperience = isPassed ? 50 : 0
      const experienceGained = baseExperience + correctCount

      console.log(`🎯 경험치 계산:`, {
        합격여부: isPassed,
        기본경험치: baseExperience,
        정답문제수: correctCount,
        총획득경험치: experienceGained,
      })

      // 사용자 경험치 업데이트
      if (user) {
        try {
          await fetch("/api/update-user-experience", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id,
              experienceGained: experienceGained,
              activityType: "exam",
              activityDetails: {
                grade: grade,
                score: score,
                correctCount: correctCount,
                totalQuestions: examSession.questions.length,
                passed: passed,
              },
            }),
          })
          console.log(`🎯 경험치 업데이트 완료: +${experienceGained}`)
        } catch (error) {
          console.error("경험치 업데이트 실패:", error)
        }
      }

      // 사용자 통계 업데이트
      if (passed) {
        await refreshUserStatistics()
      }

      // 결과 페이지로 이동
      router.push(`/games/exam/${grade}/result?score=${score}&passed=${passed}`)
    } catch (error) {
      console.error("시험 제출 실패:", error)
      setError("시험 제출에 실패했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }, [
    examSession,
    answers,
    correctAnswersArray,
    currentDuration,
    user,
    refreshUserStatistics,
    router,
    grade,
  ])

  const handleNextPattern = useCallback(() => {
    if (currentPattern < gradePatterns.length - 1) {
      setCurrentPattern(currentPattern + 1)
      setCurrentQuestion(0)
    } else {
      handleSubmitExam()
    }
  }, [currentPattern, gradePatterns.length, handleSubmitExam])

  const handlePreviousPattern = useCallback(() => {
    if (currentPattern > 0) {
      setCurrentPattern(currentPattern - 1)
      setCurrentQuestion(0)
    }
  }, [currentPattern])

  useEffect(() => {
    if (user && currentGradeInfo && !examSession) {
      console.log("🔄 시험 문제 로드 시작")
      loadExamQuestions()
    }
  }, [user, grade, currentGradeInfo, examSession, loadExamQuestions])

  // 타이머 일시적으로 비활성화
  // useEffect(() => {
  //   console.log("⏰ 타이머 useEffect 실행:", {
  //     timeLeft,
  //     examSession: !!examSession,
  //   })

  //   if (timeLeft > 0 && examSession) {
  //     console.log("⏰ 타이머 실행 중:", timeLeft, "초 남음")
  //     const timer = setTimeout(() => {
  //       console.log("⏰ 타이머 업데이트:", timeLeft, "→", timeLeft - 1)
  //       setTimeLeft((prev) => {
  //         const newTime = prev - 1
  //         console.log("⏰ 함수형 업데이트:", prev, "→", newTime)
  //         return newTime
  //       })
  //     }, 1000)
  //     return () => {
  //       console.log("⏰ 타이머 정리")
  //       clearTimeout(timer)
  //     }
  //   } else if (timeLeft === 0 && examSession) {
  //     console.log("⏰ 시간 종료 - 시험 자동 제출")
  //     handleSubmitExam()
  //   } else {
  //     console.log("⏰ 타이머 조건 불만족:", {
  //       timeLeft,
  //       examSession: !!examSession,
  //     })
  //   }
  // }, [timeLeft, examSession, handleSubmitExam])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  // 로딩 중
  if (authLoading || initialLoading || isLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center'>
        <div className='text-center max-w-2xl mx-auto px-6'>
          {/* 메인 로딩 스피너 */}
          <div className='relative mb-8'>
            <div className='animate-spin rounded-full h-20 w-20 border-4 border-blue-200 mx-auto'></div>
            <div className='animate-spin rounded-full h-20 w-20 border-4 border-blue-600 border-t-transparent mx-auto absolute top-0 left-1/2 transform -translate-x-1/2'></div>
            <div className='absolute inset-0 flex items-center justify-center'>
              <div className='w-8 h-8 bg-blue-600 rounded-full animate-pulse'></div>
            </div>
          </div>

          {/* 메인 제목 */}
          <h2 className='text-3xl font-bold text-gray-800 mb-4'>
            🎯 시험 문제를 준비하고 있습니다
          </h2>

          {/* 동적 로딩 메시지 */}
          <div className='bg-white rounded-2xl shadow-xl border border-gray-200 p-6 mb-6'>
            <div className='flex justify-between text-sm text-gray-600 mb-2'>
              <span>{loadingMessage}</span>
              <span>{loadingProgress}%</span>
            </div>
            <div className='w-full bg-gray-200 rounded-full h-3'>
              <div
                className='bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out'
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
          </div>

          {/* 하단 메시지 */}
          <div className='mt-6 space-y-2'>
            <p className='text-gray-600 font-medium'>
              잠시만 기다려주세요. (약 30초 소요)
            </p>
            <p className='text-sm text-gray-500'>
              자연스러운 문장을 생성하고 있어요 ✨
            </p>
          </div>
        </div>
      </div>
    )
  }

  // 인증 체크
  if (!user) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-gray-900 mb-4'>
            로그인이 필요합니다
          </h1>
          <Link href='/login' className='text-blue-600 hover:text-blue-700'>
            로그인하기
          </Link>
        </div>
      </div>
    )
  }

  // 오류 상태
  if (error) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <div className='text-center'>
          <X className='w-16 h-16 text-red-500 mx-auto mb-4' />
          <h1 className='text-2xl font-bold text-gray-900 mb-4'>
            오류가 발생했습니다
          </h1>
          <p className='text-gray-600 mb-4'>{error}</p>
          <button
            onClick={loadExamQuestions}
            className='text-blue-600 hover:text-blue-700'
          >
            다시 시도하기
          </button>
        </div>
      </div>
    )
  }

  if (!examSession) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='시험을 준비하는 중...' />
      </div>
    )
  }

  // 현재 패턴의 문제들 필터링 (새로운 배열 구조 사용)
  const currentPatternType = gradePatterns[currentPattern].type
  const currentPatternQuestions = finalQuestionsArray.filter(
    (q) => q.type === currentPatternType
  )
  const currentQuestionData = currentPatternQuestions[currentQuestion]

  // 디버깅 로그 제거 (반복 출력 방지)

  // 새로운 배열 구조에 맞게 questionId 생성
  const currentQuestionId = currentQuestionData
    ? `q_${finalQuestionsArray.findIndex((q) => q === currentQuestionData)}`
    : null

  // 문제 텍스트와 옵션 생성 함수
  const generateQuestionContent = (questionData: any) => {
    if (!questionData) return { question: "", options: [] }

    // 이미 생성된 options가 있으면 사용, 없으면 새로 생성
    const getOptions = (correctAnswer: string, field: string) => {
      // 이미 생성된 options가 있으면 사용
      if (questionData.options && questionData.options.length > 0) {
        return questionData.options
      }

      // 무한 루프 방지를 위해 hanziList 사용하고 안전장치 추가
      if (!correctAnswer || !hanziList || hanziList.length === 0) {
        return ["선택지1", "선택지2", "선택지3", "선택지4"]
      }

      // 한 번만 생성하고 결과를 저장
      const newOptions = generateUniqueOptions(correctAnswer, hanziList, field)
      questionData.options = newOptions // 결과를 저장하여 다음 호출 시 재사용
      return newOptions
    }

    switch (questionData.type) {
      case "sound":
        return {
          question: `[${questionData.character}] 한자의 음(소리)으로 알맞은 것을 선택하세요.`,
          options: getOptions(questionData.sound, "sound"),
        }
      case "meaning":
        return {
          question: `[${questionData.meaning}] 뜻에 맞는 한자를 선택하세요.`,
          options: getOptions(questionData.character, "character"),
        }
      case "word_reading":
        return {
          question: `[${
            questionData.relatedWords?.hanzi || questionData.character
          }] 한자어를 바르게 읽은 것을 선택하세요.`,
          options: getOptions(
            questionData.relatedWords?.korean || questionData.sound,
            "relatedWords"
          ),
        }
      case "word_meaning":
        return {
          question: `[${convertMeaningToNatural(
            questionData.meaning
          )}] 뜻을 가진 한자를 선택하세요.`,
          options: [],
        }
      case "blank_hanzi":
        return {
          question: `O에 들어갈 알맞은 한자를 보기에서 선택하세요.`,
          options: getOptions(questionData.character, "character"),
        }
      case "word_meaning_select":
        return {
          question: `[${
            questionData.textBookWord?.hanzi ||
            questionData.relatedWords?.hanzi ||
            questionData.character
          }] 한자어의 뜻을 선택하세요.`,
          options:
            questionData.allOptions && questionData.allOptions.length === 4
              ? questionData.allOptions
              : [
                  questionData.textBookWord?.korean ||
                    questionData.relatedWords?.korean ||
                    questionData.meaning,
                  "의미1",
                  "의미2",
                  "의미3",
                ],
        }
      case "hanzi_write":
        return {
          options: [],
        }
      case "word_reading_write":
        return {
          // question: `한자어의 독음(소리)을 <보기>와 같이 한글로 쓰세요.`,
          options: [],
        }
      case "sentence_reading":
        return {
          options: getOptions(
            questionData.textBookWord?.korean ||
              questionData.relatedWords?.korean ||
              questionData.sound,
            "relatedWords"
          ),
        }
      default:
        return { question: "", options: [] }
    }
  }

  const questionContent = generateQuestionContent(currentQuestionData)

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      {/* 헤더 */}
      <div className='bg-white shadow-sm border-b'>
        <div className='max-w-4xl mx-auto px-4 py-4'>
          {/* 상단: 제목과 타이머 */}
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center space-x-4'>
              <Link
                href='/games/exam'
                className='text-gray-600 hover:text-gray-800'
              >
                <ArrowLeft className='w-6 h-6' />
              </Link>
              <div>
                <h1 className='text-xl font-bold text-gray-900'>
                  {currentGradeInfo.name} 시험
                </h1>
                <p className='text-sm text-black'>
                  패턴 {currentPattern + 1}/{gradePatterns.length}:{" "}
                  {gradePatterns[currentPattern].name}
                </p>
              </div>
            </div>

            <div className='flex items-center space-x-4'>
              <div className='flex items-center text-red-600'>
                <Clock className='w-5 h-5 mr-2' />
                <span className='font-mono text-lg font-bold'>
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>
          </div>

          {/* 하단: 진행 상황과 패턴 네비게이션 */}
          <div className='flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0'>
            <div className='text-sm text-black'>
              전체 진행: {Object.keys(answers).length}/
              {examSession.questions.length} 완료
            </div>

            {/* 패턴 네비게이션 */}
            <div className='flex items-center space-x-2'>
              {currentPattern > 0 && (
                <button
                  onClick={handlePreviousPattern}
                  className='px-3 py-1 text-sm border border-gray-300 rounded text-gray-600 hover:bg-gray-50'
                >
                  ← 이전 패턴
                </button>
              )}
              {currentPattern < gradePatterns.length - 1 && (
                <button
                  onClick={handleNextPattern}
                  className='px-3 py-1 text-sm border border-gray-300 rounded text-gray-600 hover:bg-gray-50'
                >
                  다음 패턴 →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className='max-w-4xl mx-auto px-4 py-8'>
        {/* 패턴 설명 */}
        <div className='bg-white rounded-lg shadow-sm p-6 mb-6'>
          <h2 className='text-xl font-bold text-black mb-2'>
            {gradePatterns[currentPattern].name}
          </h2>
          <p className='text-black mb-4'>
            {gradePatterns[currentPattern].description}
          </p>
          <div className='space-y-4'>
            {/* 답안 완료 상태 */}
            <div className='flex items-center justify-between'>
              <div className='text-sm text-gray-600'>
                답안 완료:{" "}
                {
                  Object.keys(answers).filter((key) =>
                    currentPatternQuestions.some((q) => q.id === key)
                  ).length
                }
                /{currentPatternQuestions.length}
              </div>
            </div>

            {/* 문제 번호 네비게이션 */}
            <div className='flex flex-wrap gap-1 justify-center'>
              {currentPatternQuestions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestion(index)}
                  className={`w-8 h-8 text-xs rounded border ${
                    index === currentQuestion
                      ? "bg-blue-500 text-white border-blue-500"
                      : answers[currentPatternQuestions[index].id]
                      ? "bg-green-100 text-green-700 border-green-300"
                      : "bg-gray-100 text-gray-600 border-gray-300"
                  } hover:bg-blue-100`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 문제 */}
        {currentQuestionData && (
          <div className='bg-white rounded-xl shadow-xl border border-gray-100 p-6 sm:p-8'>
            {/* 패턴 4, 5, 9가 아닌 경우에만 기본 문제 텍스트 표시 */}
            {currentQuestionData.type !== "word_meaning" &&
              currentQuestionData.type !== "blank_hanzi" &&
              currentQuestionData.type !== "sentence_reading" && (
                <div className='mb-8'>
                  <h3 className='text-xl font-bold text-gray-800 mb-6 break-words leading-relaxed'>
                    {questionContent.question}
                  </h3>
                </div>
              )}

            {/* 패턴 4 특별 UI - 보기 카드가 위로 */}
            {currentQuestionData &&
              currentQuestionData.type === "word_meaning" &&
              currentPattern4Options.length > 0 && (
                <div className='space-y-6'>
                  {/* 보기 카드 */}
                  <div className='bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200 shadow-lg'>
                    <h4 className='text-xl font-bold text-blue-800 mb-6 text-center'>
                      보기
                    </h4>
                    <div className='grid grid-cols-4 gap-3'>
                      {currentPattern4Options
                        .filter(
                          (option) =>
                            currentQuestionId &&
                            option !== answers[currentQuestionId]
                        )
                        .map((option, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              currentQuestionId &&
                                handleAnswer(currentQuestionId, option)
                            }}
                            className='p-3 text-base bg-white border-2 border-gray-300 rounded-xl hover:bg-blue-100 hover:border-blue-400 hover:shadow-md transition-all duration-200 text-black font-bold transform hover:scale-105'
                          >
                            <span className='break-words'>{option}</span>
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* AI 생성 문장 - 선택된 한자가 ( ) 안에 표시 */}
                  {currentQuestionData.aiGeneratedContent && (
                    <div className='bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200 shadow-lg'>
                      <div className='text-xl font-bold text-gray-800 leading-relaxed'>
                        {(() => {
                          const selectedAnswer = currentQuestionId
                            ? answers[currentQuestionId]
                            : null
                          return currentQuestionData.aiGeneratedContent.replace(
                            /\(       \)/g,
                            selectedAnswer ? `(${selectedAnswer})` : "(       )"
                          )
                        })()}
                        {currentQuestionId && answers[currentQuestionId] && (
                          <button
                            onClick={() => {
                              const newAnswers = { ...answers }
                              currentQuestionId &&
                                delete newAnswers[currentQuestionId]
                              setAnswers(newAnswers)
                            }}
                            className='ml-2 inline-flex items-center justify-center w-6 h-6 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors duration-200'
                            title='선택 취소'
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

            {/* 패턴 5번 특별 UI - AI 생성 문장과 보기 선택 */}
            {currentQuestionData &&
              currentQuestionData.type === "blank_hanzi" && (
                <div className='space-y-6'>
                  {/* AI 생성 문장 */}
                  <div className='bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200 shadow-lg'>
                    <div className='text-xl font-bold text-gray-800 leading-relaxed'>
                      {(() => {
                        const content =
                          currentQuestionData.aiGeneratedContent ||
                          currentQuestionData.question ||
                          ""
                        if (!content) return ""

                        // 사용자가 선택한 정답이 있으면 ○를 선택한 한자로 대체
                        const selectedAnswer = currentQuestionId
                          ? answers[currentQuestionId]
                          : null

                        const displayContent = selectedAnswer
                          ? content.replace(/○/g, selectedAnswer)
                          : content

                        // ○를 큰 빨간색으로 변경 (정답이 선택되지 않은 경우만)
                        return displayContent
                          .split("")
                          .map((char: string, index: number) => {
                            if (char === "○") {
                              return (
                                <span
                                  key={index}
                                  className='text-3xl font-bold text-red-600 inline-block mx-1'
                                  style={{
                                    color: "#dc2626",
                                    fontSize: "2rem",
                                    fontWeight: "bold",
                                  }}
                                >
                                  ○
                                </span>
                              )
                            }
                            return char
                          })
                      })()}
                    </div>
                  </div>

                  {/* 보기 선택 */}
                  {questionContent.options &&
                    questionContent.options.length > 0 && (
                      <div className='space-y-4'>
                        {questionContent.options.map(
                          (option: string, index: number) => (
                            <button
                              key={index}
                              onClick={() =>
                                currentQuestionId &&
                                handleAnswer(currentQuestionId, option)
                              }
                              className={`w-full p-4 text-left rounded-xl border-2 transition-all duration-200 transform hover:scale-[1.02] ${
                                currentQuestionId &&
                                answers[currentQuestionId] === option
                                  ? "border-blue-500 bg-blue-100 text-black shadow-lg"
                                  : "border-gray-200 hover:border-blue-300 bg-white text-black hover:bg-blue-50 hover:shadow-md"
                              }`}
                            >
                              <span className='font-bold mr-4 text-lg'>
                                {index + 1}.
                              </span>
                              <span className='break-words text-lg font-medium'>
                                {option}
                              </span>
                            </button>
                          )
                        )}
                      </div>
                    )}
                </div>
              )}

            {/* 일반 객관식 문제 */}
            {questionContent.options &&
              currentQuestionData.type !== "word_meaning" &&
              currentQuestionData.type !== "blank_hanzi" &&
              currentQuestionData.type !== "sentence_reading" && (
                <div className='space-y-4'>
                  {questionContent.options.map(
                    (option: string, index: number) => (
                      <button
                        key={index}
                        onClick={() =>
                          currentQuestionId &&
                          handleAnswer(currentQuestionId, index + 1)
                        }
                        className={`w-full p-4 text-left rounded-xl border-2 transition-all duration-200 transform hover:scale-[1.02] ${
                          currentQuestionId &&
                          answers[currentQuestionId] === index + 1
                            ? "border-blue-500 bg-blue-100 text-black shadow-lg"
                            : "border-gray-200 hover:border-blue-300 bg-white text-black hover:bg-blue-50 hover:shadow-md"
                        }`}
                      >
                        <span className='font-bold mr-4 text-lg'>
                          {index + 1}.
                        </span>
                        <span className='break-words text-lg font-medium'>
                          {option}
                        </span>
                      </button>
                    )
                  )}
                </div>
              )}

            {/* 패턴 7: 한자 쓰기 */}
            {currentQuestionData.type === "hanzi_write" && (
              <div className='space-y-4'>
                <div className='bg-white p-6 rounded-xl shadow-sm border border-gray-200'>
                  <div className='text-center mb-6'>
                    <div className='text-6xl font-bold text-gray-800 mb-2'>
                      {currentQuestionData?.character}
                    </div>
                  </div>
                </div>

                <div className='bg-white p-6 rounded-xl shadow-sm border border-gray-200'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    {/* 훈(뜻) 입력 */}
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>
                        훈(뜻)
                      </label>
                      <input
                        type='text'
                        value={
                          currentQuestionId
                            ? typeof answers[currentQuestionId] === "string"
                              ? answers[currentQuestionId].split(" ")[0] || ""
                              : ""
                            : ""
                        }
                        onChange={(e) => {
                          if (!currentQuestionId) return
                          const currentAnswer = answers[currentQuestionId]
                          const sound =
                            typeof currentAnswer === "string"
                              ? currentAnswer.split(" ")[1] || ""
                              : ""
                          handleAnswer(
                            currentQuestionId,
                            `${e.target.value} ${sound}`.trim()
                          )
                        }}
                        placeholder='뜻을 입력하세요 (예: 착할)'
                        className='w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg font-medium bg-white shadow-inner text-black'
                      />
                    </div>

                    {/* 음(소리) 입력 */}
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>
                        음(소리)
                      </label>
                      <input
                        type='text'
                        value={
                          currentQuestionId
                            ? typeof answers[currentQuestionId] === "string"
                              ? answers[currentQuestionId].split(" ")[1] || ""
                              : ""
                            : ""
                        }
                        onChange={(e) => {
                          if (!currentQuestionId) return
                          const currentAnswer = answers[currentQuestionId]
                          const meaning =
                            typeof currentAnswer === "string"
                              ? currentAnswer.split(" ")[0] || ""
                              : ""
                          handleAnswer(
                            currentQuestionId,
                            `${meaning} ${e.target.value}`.trim()
                          )
                        }}
                        placeholder='소리를 입력하세요 (예: 선)'
                        className='w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg font-medium bg-white shadow-inner text-black'
                      />
                    </div>
                  </div>

                  {/* 현재 입력된 값 표시 */}
                  {currentQuestionId && answers[currentQuestionId] && (
                    <div className='mt-4 p-3 bg-gray-50 rounded-lg'>
                      <p className='text-sm text-gray-600'>
                        입력된 값:{" "}
                        <span className='font-medium'>
                          {answers[currentQuestionId]}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 패턴 8: 한자어 독음 쓰기 */}
            {currentQuestionData.type === "word_reading_write" && (
              <div className='space-y-6'>
                {/* 보기 카드 - 고정 */}
                <div className='bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200 shadow-lg'>
                  <h4 className='text-xl font-bold text-blue-800 mb-4 text-center'>
                    보기
                  </h4>
                  <div className='text-center'>
                    <div className='inline-block bg-white rounded-lg p-4 border-2 border-gray-300 shadow-md'>
                      <span className='text-2xl font-bold text-black'>
                        一日
                      </span>
                      <span className='text-lg text-gray-600 mx-2'> ( </span>
                      <span className='text-lg font-bold text-black'>일일</span>
                      <span className='text-lg text-gray-600'> ) </span>
                    </div>
                  </div>
                </div>

                {/* 실제 문제 */}
                <div className='bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200 shadow-lg'>
                  <div className='text-center'>
                    <div className='text-4xl font-bold text-gray-800 mb-2'>
                      {currentQuestionData.textBookWord?.hanzi ||
                        currentQuestionData.character}
                    </div>
                    <p className='text-sm text-gray-600'>
                      위 한자어의 독음을 입력하세요
                    </p>
                  </div>
                </div>

                {/* 독음 입력 */}
                <div className='bg-white p-6 rounded-xl shadow-sm border border-gray-200'>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    독음(소리)을 한글로 입력하세요
                  </label>
                  <input
                    type='text'
                    value={
                      currentQuestionId
                        ? typeof answers[currentQuestionId] === "string"
                          ? answers[currentQuestionId]
                          : ""
                        : ""
                    }
                    onChange={(e) => {
                      if (!currentQuestionId) return
                      handleAnswer(currentQuestionId, e.target.value)
                    }}
                    placeholder='독음을 입력하세요 (예: 질문)'
                    className='w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg font-medium bg-white shadow-inner text-black'
                  />

                  {/* 현재 입력된 값 표시 */}
                  {currentQuestionId && answers[currentQuestionId] && (
                    <div className='mt-4 p-3 bg-gray-50 rounded-lg'>
                      <p className='text-sm text-gray-600'>
                        입력된 값:{" "}
                        <span className='font-medium'>
                          {answers[currentQuestionId]}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 패턴 9: 문장 읽기 */}
            {currentQuestionData.type === "sentence_reading" && (
              <div className='space-y-6'>
                {/* AI 생성 문장 */}
                <div className='bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200 shadow-lg'>
                  <div className='text-xl font-bold text-gray-800 leading-relaxed'>
                    {currentQuestionData.aiGeneratedContent ||
                      "문장을 생성하는 중..."}
                  </div>
                </div>

                {/* 보기 선택 */}
                {currentQuestionData.aiGeneratedContent &&
                  questionContent.options &&
                  questionContent.options.length > 0 && (
                    <div className='space-y-4'>
                      {questionContent.options.map(
                        (option: string, index: number) => (
                          <button
                            key={index}
                            onClick={() =>
                              currentQuestionId &&
                              handleAnswer(currentQuestionId, index + 1)
                            }
                            className={`w-full p-4 text-left rounded-xl border-2 transition-all duration-200 transform hover:scale-[1.02] ${
                              currentQuestionId &&
                              answers[currentQuestionId] === index + 1
                                ? "border-blue-500 bg-blue-100 text-black shadow-lg"
                                : "border-gray-200 hover:border-blue-300 bg-white text-black hover:bg-blue-50 hover:shadow-md"
                            }`}
                          >
                            <span className='font-bold mr-4 text-lg'>
                              {index + 1}.
                            </span>
                            <span className='break-words text-lg font-medium'>
                              {option}
                            </span>
                          </button>
                        )
                      )}
                    </div>
                  )}
              </div>
            )}

            {/* 다른 주관식 문제 */}
            {currentQuestionData.type === "subjective" && (
              <div className='space-y-6'>
                <div className='bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200 shadow-lg'>
                  <textarea
                    value={
                      currentQuestionId ? answers[currentQuestionId] || "" : ""
                    }
                    onChange={(e) =>
                      currentQuestionId &&
                      handleAnswer(currentQuestionId, e.target.value)
                    }
                    placeholder='한자의 훈과 음을 입력하세요 (예: 착할 선)'
                    className='w-full p-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg font-medium bg-white shadow-inner'
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* 네비게이션 */}
            <div className='flex justify-between items-center mt-6 sm:mt-8 pt-4 sm:pt-6 border-t'>
              {/* 이전 문제 버튼 */}
              <div className='flex-1'>
                {currentQuestion > 0 && (
                  <button
                    onClick={() => setCurrentQuestion(currentQuestion - 1)}
                    className='px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-black hover:bg-gray-50 text-xs sm:text-sm'
                  >
                    ← 이전 문제
                  </button>
                )}
              </div>

              {/* 다음 문제/패턴 버튼 */}
              <div className='flex-1 flex justify-end'>
                {currentQuestion < currentPatternQuestions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestion(currentQuestion + 1)}
                    className='px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-black hover:bg-gray-50 text-xs sm:text-sm'
                  >
                    다음 문제 →
                  </button>
                ) : (
                  <button
                    onClick={handleNextPattern}
                    disabled={isSubmitting}
                    className='px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-xs sm:text-sm'
                  >
                    {currentPattern < gradePatterns.length - 1
                      ? "다음 패턴 →"
                      : `시험 완료 (${Object.keys(answers).length}/${
                          examSession.questions.length
                        } 완료)`}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 일일 시험 제한 모달 */}
        {showDailyLimitModal && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
            <div className='bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md mx-4'>
              {/* 아이콘 */}
              <div className='mb-6'>
                <div className='w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto'>
                  <Clock className='w-8 h-8 text-orange-600' />
                </div>
              </div>

              <h3 className='text-2xl font-bold text-gray-800 mb-4'>
                오늘 시험 완료
              </h3>
              <p className='text-gray-600 mb-6 leading-relaxed'>
                오늘은 이미{" "}
                <span className='font-bold text-blue-600'>{grade}급</span>{" "}
                시험을 완료했습니다.
                <br />
                내일 다시 시도해주세요.
              </p>

              <div className='space-y-3'>
                <button
                  onClick={() => {
                    setShowDailyLimitModal(false)
                    router.push("/")
                  }}
                  className='w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium'
                >
                  메인 페이지로 돌아가기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 제출 중 */}
        {isSubmitting && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
            <div className='bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md mx-4'>
              {/* 로딩 스피너 */}
              <div className='relative mb-6'>
                <div className='animate-spin rounded-full h-16 w-16 border-4 border-blue-200 mx-auto'></div>
                <div className='animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto absolute top-0 left-1/2 transform -translate-x-1/2'></div>
                <div className='absolute inset-0 flex items-center justify-center'>
                  <div className='w-6 h-6 bg-blue-600 rounded-full animate-pulse'></div>
                </div>
              </div>

              <h3 className='text-xl font-bold text-gray-800 mb-2'>
                시험 결과 처리 중
              </h3>
              <p className='text-gray-600 mb-4'>
                점수를 계산하고 결과를 저장하고 있습니다...
              </p>
              <div className='flex justify-center space-x-1'>
                <div className='w-2 h-2 bg-blue-600 rounded-full animate-bounce'></div>
                <div
                  className='w-2 h-2 bg-blue-600 rounded-full animate-bounce'
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className='w-2 h-2 bg-blue-600 rounded-full animate-bounce'
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
