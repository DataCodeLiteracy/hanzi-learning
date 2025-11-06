"use client"

import LoadingSpinner from "@/components/LoadingSpinner"
import BlankHanziQuestion from "@/components/exam/BlankHanziQuestion"
import DailyLimitModal from "@/components/exam/DailyLimitModal"
import ExamError from "@/components/exam/ExamError"
import ExamFooter from "@/components/exam/ExamFooter"
import ExamHeader from "@/components/exam/ExamHeader"
import ExamLoading from "@/components/exam/ExamLoading"
import HanziWriteQuestion from "@/components/exam/HanziWriteQuestion"
import OptionList from "@/components/exam/OptionList"
import PatternNavigator from "@/components/exam/PatternNavigator"
import PatternSummary from "@/components/exam/PatternSummary"
import QuestionNavigator from "@/components/exam/QuestionNavigator"
import SentenceReadingQuestion from "@/components/exam/SentenceReadingQuestion"
import SubmittingModal from "@/components/exam/SubmittingModal"
import WordMeaningQuestion from "@/components/exam/WordMeaningQuestion"
import WordReadingWriteQuestion from "@/components/exam/WordReadingWriteQuestion"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import { ApiClient } from "@/lib/apiClient"
import { useExamActions } from "@/hooks/useExamActions"
import { useTimeTracking } from "@/hooks/useTimeTracking"
import { PASS_SCORE } from "@/lib/examConstants"
import { EXAM_MSG } from "@/lib/examMessages"
import { gradeInfo } from "@/lib/gradeInfo"
import { getGradePatterns } from "@/lib/gradePatterns"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react"
// debugExam 제거: 콘솔 직출력 사용
import { useSelectedHanzi } from "@/contexts/SelectedHanziContext"
import { useExamEngine } from "@/hooks/useExamEngine"
import { useExamTimer } from "@/hooks/useExamTimer"
import { buildQuestionContent } from "@/lib/examGeneration/buildQuestionContent"
import { processAIQuestions as processAIQuestionsService } from "@/lib/examGeneration/examAiService"
import { generateCorrectAnswers as buildCorrectAnswers } from "@/lib/examGeneration/generateCorrectAnswers"
import { generateQuestionsByPattern as generateByPattern } from "@/lib/examGeneration/generateQuestionsByPattern"
import { selectHanziForPatterns } from "@/lib/examGeneration/selectHanzi"
import { getSelectedOptionText, isCorrectAnswer } from "@/lib/optionUtils"
import {
  CorrectAnswersArraySchema,
  FinalQuestionsArraySchema,
} from "@/lib/schemas/exam"
import type {
  CorrectAnswerItem,
  ExamQuestionDetail,
  ExamSession,
} from "@/types/exam"

export default function ExamGradePage({
  params,
}: {
  params: Promise<{ grade: string }>
}) {
  // 브라우저 전역 객체에도 표시
  if (typeof window !== "undefined") {
    const win = window as any
    win.__EXAM_PAGE_LOADED__ = true
    win.__EXAM_PAGE_LOADED_TIME__ = Date.now()
  }

  const { user, loading: authLoading, initialLoading } = useAuth()
  const { refreshUserStatistics, hanziList, isLoading: dataLoading } = useData()
  const router = useRouter()
  const { getSelected, clearSelected } = useSelectedHanzi()

  const resolvedParams = use(params)
  const grade = parseInt(resolvedParams.grade)
  const currentGradeInfo = gradeInfo[grade]

  // Context 확인 (한 번만 로그)
  const ctx = getSelected(grade)

  // 컴포넌트 렌더링 및 마운트 처리
  useEffect(() => {
    // 페이지 마운트 시 기본 처리
  }, [])

  useEffect(() => {
    // 페이지 마운트 시 Context 확인
  }, [grade, getSelected])

  // 시간 추적 훅
  const { startSession, endSession, currentDuration } = useTimeTracking({
    userId: user?.id || "",
    type: "game",
    activity: "exam",
    autoStart: false,
    autoEnd: false, // 시험 중에는 자동 종료하지 않음 (시험 종료 시 수동 종료)
  })

  const [examSession, setExamSession] = useState<ExamSession | null>(null)
  const {
    currentPattern,
    setCurrentPattern,
    currentQuestion,
    setCurrentQuestion,
    answers,
    setAnswers,
    handleAnswer,
    handleNextPattern,
    handlePreviousPattern,
  } = useExamEngine({
    totalPatterns: getGradePatterns(grade).length,
    onSubmit: () => {},
  })
  // 타이머 훅은 아래에서 핸들러 선언 후에 초기화합니다.
  const [isLoading, setIsLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState(EXAM_MSG.loadingAnalyze)
  const [error, setError] = useState<string | null>(null)
  const {
    isSubmitting,
    setIsSubmitting,
    computeScore,
    submitWithState,
    submitExam,
  } = useExamActions()
  const [showDailyLimitModal, setShowDailyLimitModal] = useState(false)
  const [autoEndTimer, setAutoEndTimer] = useState<NodeJS.Timeout | null>(null)
  const [isExamStarted, setIsExamStarted] = useState(false)
  const [examStartTime, setExamStartTime] = useState<Date | null>(null)
  const isLoadingRef = useRef(false)

  // 패턴 4 관련 상태
  const [pattern4Options, setPattern4Options] = useState<string[]>([])
  const [currentPattern4Options, setCurrentPattern4Options] = useState<
    string[]
  >([])

  // 최종 50개 문제 배열 상태
  const [finalQuestionsArray, setFinalQuestionsArray] = useState<
    ExamQuestionDetail[]
  >([])
  const [correctAnswersArray, setCorrectAnswersArray] = useState<
    CorrectAnswerItem[]
  >([])

  // 급수별 패턴 정보를 동적으로 가져오기
  const gradePatterns = getGradePatterns(grade)

  // 파생 훅은 모든 early-return보다 위에서 선언해 훅 순서를 고정
  const currentPatternType = gradePatterns[currentPattern]?.type
  const currentPatternQuestions = useMemo(
    () => finalQuestionsArray.filter((q) => q.type === currentPatternType),
    [finalQuestionsArray, currentPatternType]
  )
  const currentQuestionData = useMemo(
    () => currentPatternQuestions[currentQuestion],
    [currentPatternQuestions, currentQuestion]
  )
  const questionContent = useMemo(
    () =>
      currentQuestionData
        ? buildQuestionContent(currentQuestionData as any, hanziList)
        : { question: "", options: [] },
    [currentQuestionData, hanziList]
  )

  // 1단계: 한자 분류 및 선택 (모듈화)
  const classifyAndSelectHanzi = useCallback(() => {
    const res = selectHanziForPatterns(hanziList, gradePatterns)

    return {
      selectedTextBookHanzi: res.selectedTextBookHanzi,
      selectedNormalHanzi: res.selectedNormalHanzi,
      totalQuestions: res.totalQuestions,
    }
  }, [hanziList, gradePatterns])

  // 2단계: 패턴별 문제 생성 (모듈 사용)
  const generateQuestionsByPattern = useCallback(
    (selectedTextBookHanzi: any[], selectedNormalHanzi: any[]) => {
      const structuredQuestions = generateByPattern(
        gradePatterns,
        selectedTextBookHanzi,
        selectedNormalHanzi
      )
      return structuredQuestions
    },
    [gradePatterns]
  )

  // 개별 문제 생성은 모듈 사용(createQuestionByPattern)

  // findTextBookWord는 모듈 사용

  // 4단계: 정답 배열 생성 (문제 순서대로)
  const generateCorrectAnswers = useCallback((structuredQuestions: any[]) => {
    const answers = buildCorrectAnswers(structuredQuestions)
    return answers
  }, [])

  // 5단계: AI 처리
  const processAIQuestions = useCallback(
    async (structuredQuestions: any[]) => {
      const result = await processAIQuestionsService(
        structuredQuestions,
        (p, m) => {
          // 진행률 업데이트를 안전하게 처리 (무한 루프 방지)
          setLoadingProgress((prev) => {
            // 진행률이 감소하지 않도록 보장하고, 같은 값이면 업데이트하지 않음
            if (p > prev) {
              return p
            }
            // 같은 값이면 업데이트하지 않음 (무한 루프 방지)
            return prev
          })
          if (m) {
            setLoadingMessage((prevMessage) => {
              // 메시지가 같으면 업데이트하지 않음
              if (prevMessage !== m) {
                return m
              }
              return prevMessage
            })
          }
        },
        hanziList
      )
      return result
    },
    [hanziList]
  )

  // 메인 함수: 모든 단계를 통합
  const generateSimpleExamQuestions = useCallback(async () => {
    // 현재 grade에 맞는 한자만 필터링
    let gradeHanziList = hanziList.filter((h: any) => h.grade === grade)

    // grade에 맞는 한자가 없으면 API로 로드
    if (gradeHanziList.length === 0) {
      try {
        setLoadingProgress(15)
        setLoadingMessage("급수별 한자 데이터 로드 중...")
        const gradeHanziData = await ApiClient.getHanziByGrade(grade)
        gradeHanziList = gradeHanziData
      } catch (error) {
        console.error("❌ API로 grade별 한자 로드 실패:", error)
        throw error
      }
    }

    // 1단계: 한자 분류 및 선택 (사전 선발이 있으면 우선 사용)
    setLoadingProgress(10)
    let selectedTextBookHanzi: any[] = []
    let selectedNormalHanzi: any[] = []

    try {
      if (typeof window !== "undefined") {
        // Context에서 가져오기
        const ctx = getSelected(grade)

        if (ctx) {
          // grade에 맞는 한자만 사용하여 ID 매칭
          const idToHanzi = new Map(gradeHanziList.map((h: any) => [h.id, h]))

          // textBookIds 매칭
          const textBookMatches = (ctx.textBookIds || []).map((id: string) => {
            const hanzi = idToHanzi.get(id)
            return { id, found: !!hanzi, character: hanzi?.character }
          })
          const textBookMatched = textBookMatches.filter((m: any) => m.found)
          selectedTextBookHanzi = textBookMatched.map((m: any) =>
            idToHanzi.get(m.id)
          )

          // normalIds 매칭
          const normalMatches = (ctx.normalIds || []).map((id: string) => {
            const hanzi = idToHanzi.get(id)
            return { id, found: !!hanzi, character: hanzi?.character }
          })
          const normalMatched = normalMatches.filter((m: any) => m.found)
          selectedNormalHanzi = normalMatched.map((m: any) =>
            idToHanzi.get(m.id)
          )
        }
      }
    } catch (e) {
      console.error("❌ ID 배열 가져오기 실패:", e)
    }

    if (
      selectedTextBookHanzi.length === 0 &&
      selectedNormalHanzi.length === 0
    ) {
      // grade에 맞는 한자만 사용하여 분류
      const classified = selectHanziForPatterns(gradeHanziList, gradePatterns)
      selectedTextBookHanzi = classified.selectedTextBookHanzi
      selectedNormalHanzi = classified.selectedNormalHanzi
    }
    setLoadingProgress(20)

    // 2단계: 패턴별 문제 생성
    setLoadingProgress(30)
    const structuredQuestions = generateQuestionsByPattern(
      selectedTextBookHanzi,
      selectedNormalHanzi
    )
    setLoadingProgress(40)

    // 3단계: AI 처리 (word_meaning_select의 correctAnswerIndex 설정을 위해 먼저 실행)
    // 진행률은 processAIQuestions 내부에서 관리하므로 여기서는 설정하지 않음
    const aiQuestionsCount = structuredQuestions.filter((q) => q.aiText).length

    let finalQuestions: any[] = []

    // AI 처리 대상이 없으면 바로 통과
    if (aiQuestionsCount === 0) {
      finalQuestions = structuredQuestions
    } else {
      try {
        // 타임아웃 설정 (40초)
        // processAIQuestions는 래퍼 함수이므로 인수 1개만 받습니다
        const aiProcessPromise = processAIQuestions(structuredQuestions)
          .then((result) => {
            return result
          })
          .catch((error) => {
            throw error
          })

        const timeoutPromise = new Promise<any>((_, reject) =>
          setTimeout(() => {
            reject(new Error("AI 처리 타임아웃 (40초 초과)"))
          }, 40000)
        )

        try {
          const raceResult = await Promise.race([
            aiProcessPromise,
            timeoutPromise,
          ])
          finalQuestions = raceResult

          // processAIQuestions 반환 직후 확인
          const wmSelectAfterAI = finalQuestions.filter(
            (q: any) => q.type === "word_meaning_select"
          )
          console.log(
            "🔍 processAIQuestions 반환 직후 finalQuestions 확인:",
            wmSelectAfterAI.length > 0
              ? wmSelectAfterAI.map((q: any) => ({
                  id: q.id,
                  character: q.character,
                  correctAnswerIndex: q.correctAnswerIndex,
                  correctAnswer: q.correctAnswer,
                  fullQuestion: q, // 전체 객체 확인
                }))
              : "word_meaning_select 문제 없음"
          )
        } catch (raceError) {
          // Promise.race에서 발생한 에러 처리
          throw raceError
        }
      } catch (error) {
        // AI 처리 실패 시 원본 문제 배열 사용
        finalQuestions = structuredQuestions
      }
    }

    // Zod 검증 전 word_meaning_select 패턴 확인
    const wmSelectBeforeZod = finalQuestions.filter(
      (q: any) => q.type === "word_meaning_select"
    )
    console.log(
      "🔍 Zod 검증 전 word_meaning_select 문제 (finalQuestions):",
      wmSelectBeforeZod.length > 0
        ? wmSelectBeforeZod.map((q: any) => ({
            id: q.id,
            character: q.character,
            correctAnswerIndex: q.correctAnswerIndex,
            correctAnswer: q.correctAnswer,
          }))
        : "word_meaning_select 문제 없음"
    )

    // zod 런타임 검증 (문제 배열)
    // 주의: Zod 검증은 passthrough()를 사용하므로 원본 객체를 유지합니다
    // 하지만 검증 후에도 원본 배열을 사용해야 correctAnswerIndex가 유지됩니다
    try {
      FinalQuestionsArraySchema.parse(finalQuestions)
      // 검증 후에도 원본 배열 사용 (correctAnswerIndex 유지)
    } catch (error) {
      throw error
    }

    // AI 결과 검증 로그
    const wmSelect = finalQuestions.filter(
      (q: any) => q.type === "word_meaning_select"
    )
    if (wmSelect.length > 0) {
      console.log(
        "🔍 AI 처리 후 word_meaning_select 문제 (finalQuestions - 최종):",
        wmSelect.map((q: any) => ({
          id: q.id,
          character: q.character,
          correctAnswerIndex: q.correctAnswerIndex,
          correctAnswer: q.correctAnswer,
          options: q.options?.slice(0, 2),
          fullQuestion: q, // 전체 객체 확인
        }))
      )
    }
    const blankHanzi = finalQuestions.filter(
      (q: any) => q.type === "blank_hanzi"
    )
    // 진행률은 processAIQuestions에서 이미 90%로 설정되었으므로 여기서는 설정하지 않음

    // 4단계: 정답 배열 생성 (문제 순서대로, AI 처리 이후에 correctAnswerIndex 사용 가능)
    // 진행률은 processAIQuestions에서 이미 90%로 설정되었으므로 여기서는 설정하지 않음
    // setLoadingProgress(80) 제거

    // generateCorrectAnswers 호출 직전 확인
    const wmSelectBeforeGenerate = finalQuestions.filter(
      (q: any) => q.type === "word_meaning_select"
    )
    console.log(
      "🔍 generateCorrectAnswers 호출 직전 word_meaning_select 문제:",
      wmSelectBeforeGenerate.length > 0
        ? wmSelectBeforeGenerate.map((q: any) => ({
            id: q.id,
            character: q.character,
            correctAnswerIndex: q.correctAnswerIndex,
            correctAnswer: q.correctAnswer,
            fullQuestion: q, // 전체 객체 확인
          }))
        : "word_meaning_select 문제 없음"
    )

    let correctAnswers: any[] = []
    try {
      // generateCorrectAnswers에 전달하기 전 최종 확인
      console.log(
        "🔍 generateCorrectAnswers 호출 직전 finalQuestions 전체 확인:",
        finalQuestions
          .filter((q: any) => q.type === "word_meaning_select")
          .map((q: any) => ({
            id: q.id,
            character: q.character,
            correctAnswerIndex: q.correctAnswerIndex,
            hasCorrectAnswerIndex: q.correctAnswerIndex !== undefined,
          }))
      )

      correctAnswers = generateCorrectAnswers(finalQuestions)
    } catch (error) {
      throw error
    }

    // zod 런타임 검증 (정답 배열)
    try {
      CorrectAnswersArraySchema.parse(correctAnswers)
    } catch (error) {
      throw error
    }

    // 정답 배열 업데이트 확인 (word_meaning_select 패턴)
    const wmSelectCorrectAnswers = correctAnswers.filter(
      (ca) => ca.type === "word_meaning_select"
    )
    if (wmSelectCorrectAnswers.length > 0) {
      console.log(
        `📋 정답 배열 업데이트 확인 - word_meaning_select:`,
        wmSelectCorrectAnswers
      )
    }

    setLoadingProgress(90)

    setFinalQuestionsArray(finalQuestions)
    setCorrectAnswersArray(correctAnswers)

    // === 정답 배열 생성 로그 ===
    console.log("")
    console.log("=".repeat(60))
    console.log("📋 === 정답 배열 생성 로그 ===")
    console.log("=".repeat(60))
    console.log("")

    // 2. 생성된 문제 배열 확인
    console.log("📝 문제 배열:")
    console.log("문제 배열:", finalQuestions)
    console.log(`총 ${finalQuestions.length}개 문제`)

    // 3. 정답 배열 확인
    console.log("")
    console.log("📋 정답 배열:")
    console.log("정답 배열:", correctAnswers)
    console.log(`총 ${correctAnswers.length}개 정답`)

    console.log("")
    console.log("=".repeat(60))
    console.log("")

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

    setLoadingProgress(100)
    return finalQuestions
  }, [
    classifyAndSelectHanzi,
    generateQuestionsByPattern,
    generateCorrectAnswers,
    processAIQuestions,
    gradePatterns,
    hanziList,
  ])

  // buildUniqueOptions 직접 사용 (로컬 래퍼 제거)

  // 패턴별 문제 분류는 외부 파일에서 가져온 patterns 사용

  const loadExamQuestions = useCallback(async () => {
    // 일일 제한 모달이 표시되면 시험 로드하지 않음
    if (showDailyLimitModal) {
      return
    }

    // user가 없으면 기다림
    if (!user) {
      return
    }

    // hanziList가 아직 로드되지 않았으면 기다림
    if (!hanziList || hanziList.length === 0) {
      return
    }

    // 이미 시험이 시작되었거나 로딩 중이면 중복 호출 방지
    if (examSession || isLoadingRef.current) {
      return
    }

    // 무한 루프 방지: 이미 로딩 중인지 다시 확인
    if (isLoadingRef.current) {
      console.warn("⚠️ loadExamQuestions 중복 호출 방지")
      return
    }

    try {
      isLoadingRef.current = true
      setIsLoading(true)
      setError(null)
      setLoadingProgress(10)
      setLoadingMessage(EXAM_MSG.loadingCheck)

      // 오늘 이미 시험을 봤는지 확인
      if (user) {
        try {
          console.log("🔍 하루 1회 제한 확인 중...")
          const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD 형식

          // 타임아웃 설정 (5초)
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 5000)

          const response = await fetch(
            `/api/check-daily-exam?userId=${user.id}&date=${today}`,
            { signal: controller.signal }
          )

          clearTimeout(timeoutId)

          if (!response.ok) {
            console.error("하루 1회 제한 확인 API 오류:", response.status)
            throw new Error(`API 오류: ${response.status}`)
          }

          const result = await response.json()
          console.log("🔍 하루 1회 제한 확인 결과:", result)

          if (result.hasTakenToday) {
            console.log("🚫 오늘 이미 시험을 봤습니다. 모달 표시")
            isLoadingRef.current = false
            setIsLoading(false)
            setLoadingProgress(0)
            setShowDailyLimitModal(true)
            return
          }

          console.log("✅ 하루 1회 제한 확인 완료, 시험 진행 가능")
        } catch (error) {
          console.error("하루 1회 제한 확인 실패:", error)

          // 타임아웃이거나 네트워크 오류인 경우 시험 진행 허용
          if (error instanceof Error && error.name === "AbortError") {
            console.warn("⚠️ 하루 1회 제한 확인 타임아웃, 시험 진행 허용")
            // 타임아웃 시에는 시험 진행 허용
          } else {
            // API 오류 시 시험 진행 중단
            setError(
              "시험 상태 확인에 실패했습니다. 잠시 후 다시 시도해주세요."
            )
            isLoadingRef.current = false
            setIsLoading(false)
            return
          }
        }
      }

      setLoadingProgress(20)
      setLoadingMessage(EXAM_MSG.loadingAnalyze)

      // 현재 급수에 맞는 한자 데이터 필터링
      const gradeHanzi = hanziList.filter((hanzi: any) => hanzi.grade === grade)

      // hanziList가 비어있으면 기다림
      // dataLoading 체크 제거: 문제 생성에는 hanziList만 필요하고,
      // 다른 비동기 작업들(통계, 세션)은 문제 생성에 필수적이지 않음
      if (hanziList.length === 0) {
        isLoadingRef.current = false
        setIsLoading(false)
        return
      }

      // gradeHanzi가 비어있어도 문제 생성은 계속 진행
      // (generateSimpleExamQuestions는 sessionStorage의 사전 선발 데이터를 사용)

      // 진행률은 generateSimpleExamQuestions 내부에서 관리
      setLoadingProgress(40)
      setLoadingMessage(EXAM_MSG.loadingGenerate)

      // 클라이언트 사이드에서 문제 생성 (사전 선발 기반)
      let questions: any[] = []
      try {
        console.log("📝 generateSimpleExamQuestions 시작...")
        questions = await generateSimpleExamQuestions()
        console.log(
          "✅ generateSimpleExamQuestions 완료:",
          questions.length,
          "문제 생성됨"
        )
      } catch (error) {
        console.error("❌ generateSimpleExamQuestions 실패:", error)
        throw error
      }

      if (questions.length === 0) {
        throw new Error("문제 생성에 실패했습니다. 다시 시도해주세요.")
      }

      console.log("📋 문제 생성 완료, 시험 세션 생성 시작...")

      // 진행률은 generateSimpleExamQuestions에서 이미 100%로 설정되었으므로 여기서는 설정하지 않음
      setLoadingMessage(EXAM_MSG.loadingSession)

      if (!user) {
        throw new Error(
          "사용자 정보를 찾을 수 없습니다. 로그인 후 다시 시도해주세요."
        )
      }

      const session: ExamSession = {
        id: `exam_${Date.now()}`,
        userId: user.id,
        grade,
        questions: questions,
        answers: {},
        startTime: new Date(),
      }

      // 진행률은 generateSimpleExamQuestions에서 이미 100%로 설정되었으므로 여기서는 설정하지 않음
      setLoadingMessage(EXAM_MSG.loadingEnv)

      setExamSession(session)
      console.log("✅ 시험 세션 생성 완료, 시험 시작 준비...")

      const initialTime = currentGradeInfo.timeLimit * 60

      setLoadingProgress(100)
      setLoadingMessage(EXAM_MSG.loadingReady)

      // 시험 자동 시작 (모든 문제 생성 후)
      // 타이머 시작
      setIsExamStarted(true)
      const startTime = new Date()
      setExamStartTime(startTime)

      if (user) {
        try {
          console.log("🕐 학습 세션 시작...")
          await startSession()
          console.log("✅ 학습 세션 시작 완료")
        } catch (error) {
          console.error("⚠️ 학습 세션 시작 실패:", error)
          // 에러 무시
        }
      }

      // 1시간 자동 종료 타이머 설정
      // session 변수를 직접 사용 (클로저 문제 방지)
      const timer = setTimeout(() => {
        // 시험 자동 완료 처리 (나중에 handleSubmitExam 호출)
        // 여기서는 session이 이미 생성되어 있으므로 안전
      }, 60 * 60 * 1000) // 1시간 = 60분 * 60초 * 1000ms

      setAutoEndTimer(timer)

      console.log("✅ 시험 준비 완료, 화면 전환 준비...")

      // examSession 설정 후에 isLoading을 false로 설정
      // 이렇게 하면 examSession이 설정되기 전에 isLoading이 false가 되는 것을 방지
      isLoadingRef.current = false
      setIsLoading(false)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "시험 문제를 불러올 수 없습니다."
      )
      setLoadingProgress(100)
      setLoadingMessage(EXAM_MSG.loadingReady)
      isLoadingRef.current = false
      setIsLoading(false)
    }
  }, [
    user?.id,
    grade,
    currentGradeInfo?.timeLimit,
    hanziList?.length,
    generateSimpleExamQuestions,
    examSession?.id,
    dataLoading,
    showDailyLimitModal,
  ])

  // handleStartExam 함수 제거 (이제 자동으로 시작됨)

  // handleAnswer는 useExamEngine에서 제공

  const handleSubmitExam = useCallback(async () => {
    if (!examSession) return
    if (user) endSession()
    setIsExamStarted(false)
    const examDuration = examStartTime
      ? Math.floor((Date.now() - examStartTime.getTime()) / 1000)
      : 0
    if (autoEndTimer) {
      clearTimeout(autoEndTimer)
      setAutoEndTimer(null)
    }

    await submitWithState(() =>
      submitExam({
        user,
        grade,
        examSession,
        answers,
        correctAnswersArray,
        finalQuestionsArray,
        currentPattern4Options,
        examDurationSeconds: examDuration,
        passScore: PASS_SCORE,
        refreshUserStatistics,
        routerPush: (path: string) => router.push(path),
      })
    )

    // 시험 완료 후 localStorage에서 해당 grade의 선택된 ID 삭제
    clearSelected(grade)
  }, [
    examSession,
    answers,
    correctAnswersArray,
    finalQuestionsArray,
    currentPattern4Options,
    user,
    endSession,
    examStartTime,
    PASS_SCORE,
    refreshUserStatistics,
    router,
    submitWithState,
    submitExam,
    grade,
    autoEndTimer,
    clearSelected,
  ])

  // useExamEngine의 onSubmit 훅 연동
  useEffect(() => {
    // onSubmit은 훅 초기화 시점에만 필요하므로 현재 구현에서는 noop을 유지하고,
    // 실제 제출은 페이지의 handleNextPattern 호출 시 handleSubmitExam을 사용
  }, [handleSubmitExam])

  // 타이머: 시험 시작 이후 경과 기반 남은 시간 계산
  const { timeLeft, formatTime } = useExamTimer(
    examStartTime,
    isExamStarted,
    !!examSession,
    handleSubmitExam
  )

  const handleNextPatternLocal = useCallback(() => {
    if (currentPattern < gradePatterns.length - 1) {
      setCurrentPattern(currentPattern + 1)
      setCurrentQuestion(0)
    } else {
      handleSubmitExam()
    }
  }, [
    currentPattern,
    gradePatterns.length,
    handleSubmitExam,
    setCurrentPattern,
    setCurrentQuestion,
  ])

  // 이전 패턴 이동은 useExamEngine에서 제공

  // 컴포넌트 언마운트 시 자동 종료 타이머 정리
  useEffect(() => {
    return () => {
      if (autoEndTimer) {
        clearTimeout(autoEndTimer)
      }
    }
  }, [autoEndTimer])

  // 시험 로드: 무한 루프 방지를 위한 단일 useEffect
  // useRef를 사용하여 마지막 호출 시간 추적
  const lastLoadRef = useRef<number>(0)

  useEffect(() => {
    // 일일 제한 모달이 표시되면 시험 로드하지 않음
    if (showDailyLimitModal) {
      return
    }

    // 이미 시험이 시작되었거나 로딩 중이면 실행하지 않음
    if (examSession || isLoadingRef.current) {
      return
    }

    // 필수 조건 확인
    if (
      !user ||
      !currentGradeInfo ||
      !hanziList ||
      hanziList.length === 0 ||
      dataLoading
    ) {
      return
    }

    // 무한 루프 방지: 최근 1초 이내에 호출되었다면 스킵
    const now = Date.now()
    if (now - lastLoadRef.current < 1000) {
      console.warn("⚠️ loadExamQuestions 중복 호출 방지 (1초 이내)")
      return
    }
    lastLoadRef.current = now

    // 로딩 시작
    console.log("🔄 loadExamQuestions 호출")
    loadExamQuestions()
  }, [
    user?.id,
    grade,
    currentGradeInfo?.timeLimit,
    examSession?.id,
    hanziList?.length,
    dataLoading,
    showDailyLimitModal,
  ])

  // 디버그 패널 제거로 관련 useEffect 삭제

  // 타이머 로직은 useExamTimer 훅으로 이동

  // 로딩 상태 체크
  useEffect(() => {
    // 로딩 및 상태 체크는 UI에서 처리됨
  }, [
    authLoading,
    initialLoading,
    isLoading,
    showDailyLimitModal,
    user,
    error,
    examSession,
  ])

  // 로딩 중 (일일 제한 모달이 표시되지 않을 때만)
  if ((authLoading || initialLoading || isLoading) && !showDailyLimitModal) {
    return <ExamLoading message={loadingMessage} progress={loadingProgress} />
  }

  // 인증 체크
  if (!user) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-gray-900 mb-4'>
            {EXAM_MSG.needLogin}
          </h1>
          <Link href='/login' className='text-blue-600 hover:text-blue-700'>
            {EXAM_MSG.login}
          </Link>
        </div>
      </div>
    )
  }

  // 오류 상태
  if (error) {
    return <ExamError message={error} onRetryAction={loadExamQuestions} />
  }

  // examSession이 없고 isLoading도 false인 경우에만 LoadingSpinner 표시
  // isLoading이 true인 경우에는 위의 ExamLoading이 표시되므로 여기서는 표시하지 않음
  if (!examSession && !isLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='시험을 준비하는 중...' />
      </div>
    )
  }

  // examSession이 없고 isLoading이 true인 경우는 아무것도 렌더링하지 않음
  // (위의 ExamLoading이 이미 표시되고 있음)
  if (!examSession) {
    return null
  }

  // 새로운 배열 구조에 맞게 questionId 생성
  const currentQuestionId = currentQuestionData
    ? `q_${finalQuestionsArray.findIndex((q) => q === currentQuestionData)}`
    : null

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      <ExamHeader
        backHref='/games/exam'
        title={`${currentGradeInfo.name} 시험`}
        patternIndex={currentPattern}
        totalPatterns={gradePatterns.length}
        patternName={gradePatterns[currentPattern].name}
        timeLeftText={formatTime(timeLeft)}
      />

      <div className='max-w-4xl mx-auto px-4 py-8'>
        <PatternNavigator
          canPrev={currentPattern > 0}
          canNext={currentPattern < gradePatterns.length - 1}
          onPrev={handlePreviousPattern}
          onNext={handleNextPatternLocal}
          progressText={`전체 진행: ${Object.keys(answers).length}/${
            examSession.questions.length
          } 완료`}
        />
        <div className='mb-4' />

        {/* 패턴 설명 */}
        <PatternSummary
          name={gradePatterns[currentPattern].name}
          description={gradePatterns[currentPattern].description}
          completedCount={
            Object.keys(answers).filter((key) =>
              currentPatternQuestions.some(
                (q: ExamQuestionDetail) => q.id === key
              )
            ).length
          }
          totalCount={currentPatternQuestions.length}
        >
          <QuestionNavigator
            total={currentPatternQuestions.length}
            currentIndex={currentQuestion}
            isAnswered={(idx) => !!answers[currentPatternQuestions[idx].id]}
            onSelect={(idx) => setCurrentQuestion(idx)}
          />
        </PatternSummary>

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
                <WordMeaningQuestion
                  options={currentPattern4Options}
                  selectedIndex={
                    currentQuestionId
                      ? (answers[currentQuestionId] as number)
                      : null
                  }
                  aiContent={currentQuestionData.aiGeneratedContent}
                  onSelect={(choice) =>
                    currentQuestionId && handleAnswer(currentQuestionId, choice)
                  }
                  onClear={() => {
                    const newAnswers = { ...answers }
                    if (currentQuestionId) delete newAnswers[currentQuestionId]
                    setAnswers(newAnswers)
                  }}
                />
              )}

            {/* 패턴 5번 특별 UI - AI 생성 문장과 보기 선택 */}
            {currentQuestionData &&
              currentQuestionData.type === "blank_hanzi" && (
                <BlankHanziQuestion
                  content={
                    currentQuestionData.aiGeneratedContent ||
                    currentQuestionData.question ||
                    ""
                  }
                  options={questionContent.options || []}
                  selectedIndex={
                    currentQuestionId
                      ? (answers[currentQuestionId] as number)
                      : null
                  }
                  onSelect={(choice) =>
                    currentQuestionId && handleAnswer(currentQuestionId, choice)
                  }
                />
              )}

            {/* 일반 객관식 문제 */}
            {questionContent.options &&
              currentQuestionData.type !== "word_meaning" &&
              currentQuestionData.type !== "blank_hanzi" &&
              currentQuestionData.type !== "sentence_reading" && (
                <OptionList
                  options={questionContent.options}
                  selectedIndex={
                    currentQuestionId
                      ? (answers[currentQuestionId] as number)
                      : null
                  }
                  onSelect={(choice) =>
                    currentQuestionId && handleAnswer(currentQuestionId, choice)
                  }
                />
              )}

            {/* 패턴 7: 한자 쓰기 */}
            {currentQuestionData.type === "hanzi_write" && (
              <HanziWriteQuestion
                character={currentQuestionData.character}
                value={
                  currentQuestionId
                    ? (answers[currentQuestionId] as string) || ""
                    : ""
                }
                onChange={(newValue) =>
                  currentQuestionId && handleAnswer(currentQuestionId, newValue)
                }
              />
            )}

            {/* 패턴 8: 한자어 독음 쓰기 */}
            {currentQuestionData.type === "word_reading_write" && (
              <WordReadingWriteQuestion
                promptHanzi={
                  currentQuestionData.textBookWord?.hanzi ||
                  currentQuestionData.character
                }
                value={
                  currentQuestionId
                    ? typeof answers[currentQuestionId] === "string"
                      ? (answers[currentQuestionId] as string)
                      : ""
                    : ""
                }
                onChange={(v) =>
                  currentQuestionId && handleAnswer(currentQuestionId, v)
                }
              />
            )}

            {/* 패턴 9: 문장 읽기 */}
            {currentQuestionData.type === "sentence_reading" && (
              <SentenceReadingQuestion
                aiContent={currentQuestionData.aiGeneratedContent}
                options={questionContent.options}
                selectedIndex={
                  currentQuestionId
                    ? (answers[currentQuestionId] as number)
                    : null
                }
                onSelect={(choice) =>
                  currentQuestionId && handleAnswer(currentQuestionId, choice)
                }
              />
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

            <ExamFooter
              canPrev={currentQuestion > 0}
              canNextQuestion={
                currentQuestion < currentPatternQuestions.length - 1
              }
              isSubmitting={isSubmitting}
              onPrevQuestion={() => setCurrentQuestion(currentQuestion - 1)}
              onNextQuestion={() => setCurrentQuestion(currentQuestion + 1)}
              onNextPatternOrSubmit={handleNextPatternLocal}
              showSubmitText={
                currentPattern < gradePatterns.length - 1
                  ? "다음 패턴 →"
                  : `시험 완료 (${Object.keys(answers).length}/${
                      examSession.questions.length
                    } 완료)`
              }
            />
          </div>
        )}

        {/* 일일 시험 제한 모달 */}
        <DailyLimitModal
          show={showDailyLimitModal}
          grade={grade}
          onClose={() => {
            setShowDailyLimitModal(false)
            router.push("/games/exam")
          }}
        />

        {/* 제출 중 */}
        <SubmittingModal show={isSubmitting} />
      </div>
    </div>
  )
}
