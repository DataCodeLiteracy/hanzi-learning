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

  // 9개 패턴별 시험 문제 생성 함수
  const generateSimpleExamQuestions = async (
    hanziList: any[],
    questionCount: number
  ): Promise<ExamQuestion[]> => {
    // 1단계: IndexedDB에서 랜덤으로 50개 ID 추출
    const shuffled = [...hanziList].sort(() => Math.random() - 0.5)
    const selectedHanzi = shuffled.slice(0, questionCount)

    console.log(
      `🎯 1단계: 랜덤으로 선택된 ${questionCount}개 한자 ID:`,
      selectedHanzi.map((h) => ({ id: h.id, character: h.character }))
    )

    // 2단계: gradePatterns에 따라 패턴별로 배열 채우기
    const currentPatterns = gradePatterns
    const structuredQuestions: any[] = []
    let hanziIndex = 0

    currentPatterns.forEach((pattern: any) => {
      for (let i = 0; i < pattern.questionCount; i++) {
        if (hanziIndex >= selectedHanzi.length) break

        const hanzi = selectedHanzi[hanziIndex]
        const patternInfo = patterns[pattern.type as keyof typeof patterns]

        // 기본 구조 생성
        const question: any = {
          type: pattern.type,
          character: hanzi.character,
          meaning: hanzi.meaning,
          sound: hanzi.sound,
          relatedWords: hanzi.relatedWords?.[0] || null, // 첫 번째 관련 단어만
          aiText: "",
        }

        // needsAI가 true인 경우 aiText 채우기

        if (
          patternInfo &&
          typeof patternInfo === "object" &&
          "needsAI" in patternInfo &&
          patternInfo.needsAI
        ) {
          if (pattern.type === "word_meaning") {
            question.aiText = aiPrompts.word_meaning.userPrompt(hanzi)
          } else if (pattern.type === "blank_hanzi") {
            // isTextBook: true인 단어가 있는 경우만
            let hasTextBookWord = false
            let textBookWord = null

            if (hanzi.relatedWords) {
              if (Array.isArray(hanzi.relatedWords)) {
                hasTextBookWord = hanzi.relatedWords.some(
                  (word: any) => word.isTextBook
                )
                textBookWord = hanzi.relatedWords.find(
                  (word: any) => word.isTextBook
                )
              } else if (hanzi.relatedWords.isTextBook) {
                hasTextBookWord = true
                textBookWord = hanzi.relatedWords
              }
            }

            if (hasTextBookWord && textBookWord) {
              question.aiText = aiPrompts.blank_hanzi.userPrompt({
                ...hanzi,
                relatedWord: {
                  hanzi: textBookWord.hanzi,
                  meaning: textBookWord.korean, // korean을 meaning으로 매핑
                },
              })
              console.log(`🎯 패턴 5 AI 프롬프트 생성:`, {
                character: hanzi.character,
                relatedWord: textBookWord,
                aiText: question.aiText,
              })
            } else {
              console.log(
                `🎯 패턴 5 건너뛰기 - isTextBook 단어 없음: ${hanzi.character}`,
                {
                  relatedWords: hanzi.relatedWords,
                  hasTextBookWord,
                  textBookWord,
                }
              )
              // isTextBook 단어가 없으면 이 문제는 건너뛰기
              hanziIndex-- // 인덱스를 되돌려서 다음 한자로 넘어가기
              continue
            }
          }
        }

        structuredQuestions.push(question)
        hanziIndex++
      }
    })

    console.log(
      `🎯 2단계: 패턴별로 구성된 ${structuredQuestions.length}개 문제:`,
      structuredQuestions
    )

    // 3단계: 패턴별 정답 배열 생성
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
          correctAnswer = question.meaning
          break
        case "hanzi_write":
          correctAnswer = `${question.meaning},${question.sound}`
          break
        case "word_reading_write":
          correctAnswer = question.relatedWords?.korean || question.sound
          break
        case "sentence_reading":
          correctAnswer = question.relatedWords?.korean || question.sound
          break
      }

      correctAnswers.push({
        questionIndex: index,
        type: question.type,
        character: question.character,
        correctAnswer: correctAnswer,
      })
    })

    // AI 처리 필요한 문제들 필터링
    const aiQuestionsToProcess = structuredQuestions.filter((q) => q.aiText)

    if (aiQuestionsToProcess.length > 0) {
      setLoadingProgress(30)
      setLoadingMessage("AI 문장 생성 중...")

      try {
        // AI API 호출
        const response = await fetch("/api/generate-ai-exam-content", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            questions: aiQuestionsToProcess.map((q) => ({
              id: `q_${structuredQuestions.indexOf(q)}`,
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

        if (!response.ok) {
          throw new Error("AI 처리 실패")
        }

        const aiResult = await response.json()
        console.log(`🎯 AI API 응답:`, aiResult)

        if (aiResult.success && aiResult.questions) {
          // AI 처리된 결과를 structuredQuestions에 적용
          aiResult.questions.forEach((aiProcessed: any) => {
            const questionIndex = parseInt(aiProcessed.id.replace("q_", ""))
            if (structuredQuestions[questionIndex]) {
              let processedContent = aiProcessed.aiGeneratedContent
              console.log(`🎯 AI 처리 중:`, {
                aiProcessedId: aiProcessed.id,
                questionIndex,
                aiGeneratedContent: aiProcessed.aiGeneratedContent,
                structuredQuestionsLength: structuredQuestions.length,
              })

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
                  console.log(`🎯 패턴 5 후처리 시작:`, {
                    originalContent: processedContent,
                    relatedWord: relatedWord,
                    targetCharacter: question.character,
                  })

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

                  console.log(`🎯 패턴 5 후처리 완료:`, {
                    finalContent: processedContent,
                  })
                }
              }

              structuredQuestions[questionIndex].aiGeneratedContent =
                processedContent
            } else {
              console.warn(
                `⚠️ structuredQuestions[${questionIndex}]가 존재하지 않음`
              )
            }
          })
        } else {
          console.warn(`⚠️ AI API 응답이 예상과 다름:`, aiResult)
        }
      } catch (error) {
        console.warn("⚠️ AI 처리 실패했지만 시험 계속 진행:", error)
      }
    }

    // 최종 배열을 상태에 저장
    setFinalQuestionsArray(structuredQuestions)
    setCorrectAnswersArray(correctAnswers)

    // 패턴 4번 보기 생성 (새로운 배열 구조 사용)
    const pattern4Questions = structuredQuestions.filter(
      (q) => q.type === "word_meaning"
    )
    if (pattern4Questions.length > 0) {
      const correctAnswers = pattern4Questions.map((q) => q.character)
      const uniqueAnswers = [...new Set(correctAnswers)]

      // 정답들을 포함한 보기 구성 (정답이 보기에 반드시 포함되도록)
      const allHanziCharacters = hanziList.map((h: any) => h.character)
      const wrongAnswers = allHanziCharacters
        .filter((char: string) => !uniqueAnswers.includes(char))
        .sort(() => Math.random() - 0.5)
        .slice(0, 9 - uniqueAnswers.length)

      // 정답을 먼저 넣고, 나머지 공간에 오답 추가
      const allOptions = [...uniqueAnswers, ...wrongAnswers]
      const shuffledOptions = allOptions.sort(() => Math.random() - 0.5)

      setPattern4Options(shuffledOptions)
      setCurrentPattern4Options(shuffledOptions)
    }

    // 기존 로직 유지 (ExamQuestion[] 반환)
    const questions: ExamQuestion[] = []
    let questionIndex = 0

    // 패턴별로 문제 생성 (기존 로직 유지)
    currentPatterns.forEach((pattern: any, patternIndex: number) => {
      for (let i = 0; i < pattern.questionCount; i++) {
        const hanzi = selectedHanzi[questionIndex % selectedHanzi.length]
        const questionId = `q_${questionIndex}`

        let question: any = {
          id: questionId,
          type: pattern.pattern,
          hanziData: hanzi,
        }

        // 패턴별 문제 생성
        let questionResult: any = null
        switch (pattern.pattern) {
          case "sound":
            question.question = `[${hanzi.character}] 안의 한자의 음(소리)으로 알맞은 것을 선택하세요.`
            question.options = generateUniqueOptions(
              hanzi.sound,
              selectedHanzi,
              "sound"
            )
            question.correctAnswer = question.options.indexOf(hanzi.sound) + 1
            questionResult = question
            break

          case "meaning":
            question.question = `[${hanzi.meaning}] 안의 뜻에 맞는 한자를 선택하세요.`
            question.options = generateUniqueOptions(
              hanzi.character,
              selectedHanzi,
              "character"
            )
            question.correctAnswer =
              question.options.indexOf(hanzi.character) + 1
            questionResult = question
            break

          case "word_reading":
            if (hanzi.relatedWords && hanzi.relatedWords.length > 0) {
              const randomWord =
                hanzi.relatedWords[
                  Math.floor(Math.random() * hanzi.relatedWords.length)
                ]
              question.question = `[${randomWord.hanzi}] 안의 한자어를 바르게 읽은 것을 선택하세요.`
              question.options = generateUniqueOptions(
                randomWord.korean,
                selectedHanzi,
                "relatedWords"
              )
              question.correctAnswer =
                question.options.indexOf(randomWord.korean) + 1
            } else {
              // 관련 단어가 없으면 sound 문제로 대체
              question.question = `[${hanzi.character}] 안의 한자의 음(소리)으로 알맞은 것을 선택하세요.`
              question.options = generateUniqueOptions(
                hanzi.sound,
                selectedHanzi,
                "sound"
              )
              question.correctAnswer = question.options.indexOf(hanzi.sound) + 1
            }
            questionResult = question
            break

          case "word_meaning":
            // AI로 문장 생성 (서버에서 처리)
            question.question = `[${hanzi.meaning}] 안의 뜻을 가진 한자를 선택하세요.`
            question.needsAI = true
            question.aiPrompt = aiPrompts.word_meaning.userPrompt(hanzi)
            question.correctAnswer = hanzi.character
            questionResult = question
            break

          case "blank_hanzi":
            // isTextBook: true인 단어가 있는 한자만 사용 (반드시 있어야 함)
            let hasTextBookWord = false
            let textBookWord = null

            console.log(`🎯 패턴 5 체크: ${hanzi.character}`, {
              relatedWords: hanzi.relatedWords,
              isArray: Array.isArray(hanzi.relatedWords),
            })

            if (hanzi.relatedWords) {
              if (Array.isArray(hanzi.relatedWords)) {
                hasTextBookWord = hanzi.relatedWords.some(
                  (word: any) => word.isTextBook
                )
                textBookWord = hanzi.relatedWords.find(
                  (word: any) => word.isTextBook
                )
              } else if (hanzi.relatedWords.isTextBook) {
                hasTextBookWord = true
                textBookWord = hanzi.relatedWords
              }
            }

            console.log(`🎯 패턴 5 결과: ${hanzi.character}`, {
              hasTextBookWord,
              textBookWord,
            })

            if (hasTextBookWord && textBookWord) {
              // korean 필드가 있는지 확인
              if (!textBookWord.korean) {
                console.warn(
                  `⚠️ 패턴 5 건너뛰기 - korean 필드 없음: ${hanzi.character}, 관련단어: ${textBookWord.hanzi}`
                )
                questionResult = null
                break
              }

              // 정답 글자 선택 (한자어에서 해당 한자가 들어갈 위치)
              const targetCharacter = hanzi.character

              console.log(`🎯 패턴 5 문제 생성:`, {
                한자: hanzi.character,
                뜻: hanzi.meaning,
                음: hanzi.sound,
                관련단어: textBookWord.hanzi,
                한글의미: textBookWord.korean,
                정답한자: targetCharacter,
              })

              question.question = ``
              question.needsAI = true
              // AI에게 한자어로 문장 생성 요청
              question.aiPrompt = aiPrompts.blank_hanzi.userPrompt({
                ...hanzi,
                relatedWord: {
                  hanzi: textBookWord.hanzi,
                  meaning: textBookWord.korean, // korean 필드를 meaning으로 매핑
                },
                targetCharacter: targetCharacter,
              })
              question.options = generateUniqueOptions(
                hanzi.character,
                selectedHanzi,
                "character"
              )
              question.correctAnswer =
                question.options.indexOf(hanzi.character) + 1
              questionResult = question
            } else {
              // isTextBook: true인 단어가 없으면 이 한자는 건너뛰기
              console.warn(
                `⚠️ 패턴 5 건너뛰기 - isTextBook 단어 없음: ${hanzi.character}`
              )
              questionResult = null // 이 한자는 사용하지 않음
            }
            break

          case "word_meaning_select":
            if (hanzi.relatedWords && hanzi.relatedWords.length > 0) {
              const randomWord =
                hanzi.relatedWords[
                  Math.floor(Math.random() * hanzi.relatedWords.length)
                ]
              question.question = `[${randomWord.hanzi}] 안의 한자어의 뜻을 찾아 번호를 쓰세요.`
              question.options = generateUniqueOptions(
                randomWord.korean,
                selectedHanzi,
                "relatedWords"
              )
              question.correctAnswer =
                question.options.indexOf(randomWord.korean) + 1
            } else {
              // 관련 단어가 없으면 meaning 문제로 대체
              question.question = `[${hanzi.meaning}] 안의 뜻에 맞는 한자를 선택하세요.`
              question.options = generateUniqueOptions(
                hanzi.character,
                selectedHanzi,
                "character"
              )
              question.correctAnswer =
                question.options.indexOf(hanzi.character) + 1
            }
            questionResult = question
            break

          case "hanzi_write":
            question.question = `한자의 훈(뜻)과 음(소리)을 <보기>와 같이 한글로 쓰세요.\n\n<보기> 善 ( 착할 선 )\n\n${hanzi.character} (          )`
            question.correctAnswer = `${hanzi.meaning} ${hanzi.sound}`
            questionResult = question
            break

          case "word_reading_write":
            if (hanzi.relatedWords && hanzi.relatedWords.length > 0) {
              const randomWord =
                hanzi.relatedWords[
                  Math.floor(Math.random() * hanzi.relatedWords.length)
                ]
              question.question = `한자어의 독음(소리)을 <보기>와 같이 한글로 쓰세요.\n\n<보기> 善惡 ( 선악 )\n\n${randomWord.hanzi} (          )`
              question.correctAnswer = randomWord.korean
            } else {
              // 관련 단어가 없으면 sound 문제로 대체
              question.question = `한자의 음(소리)을 <보기>와 같이 한글로 쓰세요.\n\n<보기> 善 ( 선 )\n\n${hanzi.character} (          )`
              question.correctAnswer = hanzi.sound
            }
            questionResult = question
            break

          case "sentence_reading":
            question.question = `[${hanzi.character}] 안의 한자어의 독음(소리)을 <보기>에서 선택하세요.`
            question.options = generateUniqueOptions(
              hanzi.sound,
              selectedHanzi,
              "sound"
            )
            question.correctAnswer = question.options.indexOf(hanzi.sound) + 1
            questionResult = question
            break

          case "subjective":
            question.question = `한자의 훈(뜻)과 음(소리)을 <보기>와 같이 한글로 쓰세요.\n\n<보기> 善 ( 착할 선 )\n\n${hanzi.character} (          )`
            question.correctAnswer = `${hanzi.meaning} ${hanzi.sound}`
            questionResult = question
            break
        }

        // questionResult가 null이 아닌 경우만 questions 배열에 추가
        if (questionResult) {
          questions.push(questionResult)
          questionIndex++
        } else {
          // questionResult가 null인 경우 (패턴 5에서 isTextBook 단어가 없는 경우)
          // 다음 한자로 넘어가기 위해 questionIndex는 증가시키지 않음
        }
      }
    })

    // AI 문제들 확인
    const aiQuestions = questions.filter((q) => q.needsAI)

    return questions
  }

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
      setLoadingMessage("한자 데이터 분석 중...")

      // 현재 급수에 맞는 한자 데이터 필터링
      const gradeHanzi = hanziList.filter((hanzi: any) => hanzi.grade === grade)

      if (gradeHanzi.length === 0) {
        throw new Error("해당 급수의 한자 데이터가 없습니다.")
      }

      setLoadingProgress(20)
      setLoadingMessage("문제 생성 중...")

      // 클라이언트 사이드에서 문제 생성 (간단한 랜덤 선택)
      const questions = await generateSimpleExamQuestions(
        gradeHanzi,
        currentGradeInfo.questionCount
      )

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
      examSession.questions.forEach((question, index) => {
        const userAnswer = answers[question.id]
        const correctAnswer = correctAnswersArray[index]

        if (correctAnswer && userAnswer === correctAnswer.correctAnswer) {
          correctCount++
        }
      })

      const score = Math.round(
        (correctCount / examSession.questions.length) * 100
      )
      const passed = score >= 70 // 70점 이상 통과

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
              AI가 자연스러운 문장을 생성하고 있어요 ✨
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
          question: `[${questionData.meaning}] 뜻을 가진 한자를 선택하세요.`,
          options: [],
        }
      case "blank_hanzi":
        return {
          question: `○에 들어갈 알맞은 한자를 보기에서 선택하세요.`,
          options: getOptions(questionData.character, "character"),
        }
      case "word_meaning_select":
        return {
          question: `[${
            questionData.relatedWords?.hanzi || questionData.character
          }] 한자어의 뜻을 찾아 번호를 쓰세요.`,
          options: getOptions(questionData.meaning, "meaning"),
        }
      case "hanzi_write":
        return {
          question: `한자의 훈(뜻)과 음(소리)을 <보기>와 같이 한글로 쓰세요.`,
          options: [],
        }
      case "word_reading_write":
        return {
          question: `한자어의 독음(소리)을 <보기>와 같이 한글로 쓰세요.`,
          options: [],
        }
      case "sentence_reading":
        return {
          question: `[${
            questionData.relatedWords?.hanzi || questionData.character
          }] 한자어의 독음(소리)을 선택하세요.`,
          options: getOptions(
            questionData.relatedWords?.korean || questionData.sound,
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
            {/* 패턴 4, 5가 아닌 경우에만 기본 문제 텍스트 표시 */}
            {currentQuestionData.type !== "word_meaning" &&
              currentQuestionData.type !== "blank_hanzi" && (
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

                        // ○를 큰 빨간색으로 변경
                        return content
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

            {/* 일반 객관식 문제 */}
            {questionContent.options &&
              currentQuestionData.type !== "word_meaning" &&
              currentQuestionData.type !== "blank_hanzi" && (
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

            {/* 주관식 문제 */}
            {(currentQuestionData.type === "subjective" ||
              currentQuestionData.type === "hanzi_write" ||
              currentQuestionData.type === "word_reading_write") && (
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
                      : "시험 완료"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 제출 중 */}
        {isSubmitting && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
            <div className='bg-white rounded-lg p-8 text-center'>
              <LoadingSpinner />
              <p className='text-black'>시험 결과를 처리하는 중...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
