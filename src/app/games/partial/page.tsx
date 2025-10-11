"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import LoadingSpinner from "@/components/LoadingSpinner"
import { ArrowLeft, CheckCircle, XCircle, Play } from "lucide-react"
import Link from "next/link"
import { ApiClient } from "@/lib/apiClient"
import { useTimeTracking } from "@/hooks/useTimeTracking"
import NextGradeModal from "@/components/NextGradeModal"
import { RelatedWord } from "@/types"

interface PartialQuestion {
  hanzi: string
  meaning: string
  sound: string
  options: string[]
  correctAnswer: string
  hiddenPart: "top-left" | "top-right" | "bottom-left" | "bottom-right"
  hanziId: string // 한자 ID 추가
  relatedWords?: RelatedWord[] // 관련 단어 추가
}

export default function PartialGame() {
  const { user, initialLoading, isAuthenticated, updateUserExperience } =
    useAuth()
  const [questions, setQuestions] = useState<PartialQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0)
  const [correctAnswers, setCorrectAnswers] = useState<number>(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [gameEnded, setGameEnded] = useState<boolean>(false)
  const [showSettings, setShowSettings] = useState<boolean>(true)
  const [selectedGrade, setSelectedGrade] = useState<number>(
    user?.preferredGrade || 8
  )
  const [questionCount, setQuestionCount] = useState<number>(10)
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [showNoDataModal, setShowNoDataModal] = useState<boolean>(false)
  const [noDataMessage, setNoDataMessage] = useState<string>("")
  const [gradeHanzi, setGradeHanzi] = useState<
    {
      id: string
      character: string
      meaning: string
      sound: string
      pinyin?: string
      grade: number
    }[]
  >([])
  const [hasUpdatedStats, setHasUpdatedStats] = useState<boolean>(false)
  const [showModal, setShowModal] = useState<boolean>(false)
  const [modalHanzi, setModalHanzi] = useState<{
    hanzi: string
    meaning: string
    sound: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isLoadingGrade, setIsLoadingGrade] = useState<boolean>(false) // 급수 로딩 상태

  // 시간 추적 훅
  const { startSession, endSession, isActive, currentDuration, formatTime } =
    useTimeTracking({
      userId: user?.id || "",
      type: "game",
      activity: "partial",
      autoStart: false,
      autoEnd: true,
    })

  // useRef로 문제 풀기 카운팅 (리렌더링해도 값 유지)
  const questionsAnsweredRef = useRef<number>(0)

  // 모르겠음 선택 횟수 추적
  const [dontKnowCount, setDontKnowCount] = useState<number>(0)

  // 완벽한 게임 보상 계산 함수
  const calculatePerfectGameBonus = async (
    questionCount: number,
    dontKnowCount: number
  ): Promise<number> => {
    // 학습 완료도 체크 (80% 이상 완료 시 보너스 제한)
    if (user) {
      try {
        const completionStatus = await ApiClient.checkGradeCompletionStatus(
          user.id,
          selectedGrade
        )
        if (completionStatus.isEligibleForBonus) {
          console.log(
            `🚫 학습 완료도 80% 이상으로 추가 보상 제한됨 (${completionStatus.completionRate.toFixed(
              1
            )}%)`
          )
          return 0
        }
      } catch (error) {
        console.error("학습 완료도 체크 실패:", error)
        // 에러 시에는 보너스 지급 (기존 로직 유지)
      }
    }

    // 모르겠음을 선택한 경우: 완벽한 게임이 아니므로 추가 보상 없음
    if (dontKnowCount > 0) {
      return 0
    }

    // 모르겠음 없이 모든 문제를 정답으로 맞춘 경우: 추가 보상만 지급 (기본 경험치는 이미 각 문제마다 지급됨)
    const bonusMap: { [key: number]: number } = {
      5: 1,
      10: 2,
      15: 3,
      20: 5,
      25: 9,
      30: 12,
      35: 15,
      40: 20,
      45: 25,
      50: 30,
    }

    return bonusMap[questionCount] || 0
  }

  // 뒤로가기 확인 모달 상태
  const [showExitModal, setShowExitModal] = useState<boolean>(false)

  // 다음 급수 권장 모달 상태
  const [showNextGradeModal, setShowNextGradeModal] = useState<boolean>(false)

  // 경험치 결과 모달 상태
  const [showExperienceModal, setShowExperienceModal] = useState<boolean>(false)
  const [earnedExperience, setEarnedExperience] = useState<number>(0)

  // 사용자가 나가기로 확인했는지 플래그
  const [userConfirmedExit, setUserConfirmedExit] = useState<boolean>(false)

  // 8급 데이터 기본 로딩
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true)
      try {
        const grade8Data = await ApiClient.getHanziByGrade(8)
        setGradeHanzi(grade8Data)
      } catch (error) {
        console.error("초기 데이터 로드 실패:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialData()
  }, [])

  // 뒤로가기 감지 및 모달 표시 (beforeunload 제거, popstate만 유지)
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (
        questionsAnsweredRef.current > 0 &&
        !gameEnded &&
        !hasUpdatedStats &&
        !userConfirmedExit
      ) {
        e.preventDefault()
        setShowExitModal(true)
        // 브라우저 뒤로가기 방지
        window.history.pushState(null, "", window.location.pathname)
      }
    }

    // 브라우저 뒤로가기 감지만 (beforeunload 제거)
    window.addEventListener("popstate", handlePopState)

    // 초기 히스토리 상태 추가
    window.history.pushState(null, "", window.location.pathname)

    return () => {
      window.removeEventListener("popstate", handlePopState)
    }
  }, [gameEnded, hasUpdatedStats, userConfirmedExit])

  // 사용자 정보 로드 후 선호 급수 반영
  useEffect(() => {
    if (user?.preferredGrade && user.preferredGrade !== selectedGrade) {
      setSelectedGrade(user.preferredGrade)
      handleGradeChange(user.preferredGrade)
    }
  }, [user])

  // 뒤로가기 확인 및 통계 업데이트는 불필요 (이미 각 문제마다 즉시 업데이트됨)
  const handleExitConfirm = async () => {
    if (questionsAnsweredRef.current > 0 && !gameEnded && user) {
      try {
        console.log(`🚪 게임 중단 확인:`)
        console.log(
          `  - questionsAnsweredRef.current: ${questionsAnsweredRef.current}`
        )
        console.log(
          `ℹ️ 각 문제마다 즉시 통계와 경험치가 업데이트되었으므로 추가 업데이트 불필요`
        )

        // 사용자가 나가기로 확인했음을 표시
        setUserConfirmedExit(true)

        // 게임 중단 시 시간 추적 종료 (먼저 호출)
        const sessionDuration = endSession()
        console.log(
          `🚪 부분맞추기 게임 중단: ${sessionDuration}초 학습 시간 저장됨`
        )
        console.log(`📊 현재 활성 세션 상태: ${isActive ? "활성" : "비활성"}`)

        // 게임 중단 시 gameEnded를 true로 설정하여 useEffect 트리거
        setGameEnded(true)

        // 모달 닫고 홈으로 이동
        setShowExitModal(false)
        window.location.href = "/"
      } catch (error) {
        console.error("게임 중단 처리 실패:", error)
        // 에러가 발생해도 홈으로 이동
        setUserConfirmedExit(true)
        setShowExitModal(false)
        window.location.href = "/"
      }
    } else {
      // 통계 업데이트가 필요없으면 바로 홈으로 이동
      setUserConfirmedExit(true)

      // 시간 추적 종료 (먼저 호출)
      const sessionDuration = endSession()
      console.log(
        `🚪 부분맞추기 게임 중단 (문제 미풀이): ${sessionDuration}초 학습 시간 저장됨`
      )
      console.log(`📊 현재 활성 세션 상태: ${isActive ? "활성" : "비활성"}`)

      // 게임 중단 시 gameEnded를 true로 설정하여 useEffect 트리거
      setGameEnded(true)

      setShowExitModal(false)
      window.location.href = "/"
    }
  }

  const handleExitCancel = () => {
    setShowExitModal(false)
  }

  // 급수 변경 시 데이터 업데이트
  const handleGradeChange = async (grade: number) => {
    if (grade === selectedGrade) return // 같은 급수면 불필요한 호출 방지

    setSelectedGrade(grade)
    setIsLoadingGrade(true)

    try {
      const gradeData = await ApiClient.getHanziByGrade(grade)
      setGradeHanzi(gradeData)

      if (gradeData.length === 0) {
        setNoDataMessage(
          `선택한 급수(${
            grade === 5.5
              ? "준5급"
              : grade === 4.5
              ? "준4급"
              : grade === 3.5
              ? "준3급"
              : `${grade}급`
          })에 데이터가 없습니다.`
        )
        setShowNoDataModal(true)
      } else {
        setNoDataMessage("")
        setShowNoDataModal(false)
      }
    } catch (error) {
      console.error("급수 데이터 로드 실패:", error)
      setNoDataMessage("데이터 로드 중 오류가 발생했습니다.")
      setShowNoDataModal(true)
    } finally {
      setIsLoadingGrade(false)
    }
  }

  // 게임 초기화 함수 정의
  const initializeGame = async () => {
    // 선택된 급수의 한자 수 확인
    if (gradeHanzi.length === 0) {
      setNoDataMessage(
        `선택한 급수(${
          selectedGrade === 5.5
            ? "준5급"
            : selectedGrade === 4.5
            ? "준4급"
            : selectedGrade === 3.5
            ? "준3급"
            : `${selectedGrade}급`
        })에 데이터가 없습니다.`
      )
      setShowNoDataModal(true)
      return
    }

    // 문제 수보다 한자가 적은 경우 확인
    if (gradeHanzi.length < questionCount) {
      setNoDataMessage(
        `선택한 급수에 ${questionCount}개보다 적은 한자가 있습니다. (${gradeHanzi.length}개)`
      )
      setShowNoDataModal(true)
      return
    }

    setIsGenerating(true)

    try {
      // 우선순위 기반으로 한자 선택
      const selectedHanzi = await ApiClient.getPrioritizedHanzi(
        user!.id,
        selectedGrade,
        questionCount
      )

      // 문제 생성
      const generatedQuestions = selectedHanzi.map((hanzi) => {
        const hiddenParts: Array<
          "top-left" | "top-right" | "bottom-left" | "bottom-right"
        > = ["top-left", "top-right", "bottom-left", "bottom-right"]
        const hiddenPart =
          hiddenParts[Math.floor(Math.random() * hiddenParts.length)]

        // 다른 한자들에서 오답 생성 (같은 급수 내에서, 중복 제거)
        const otherHanzi = gradeHanzi.filter((h) => h.id !== hanzi.id)
        const correctAnswer = `${hanzi.meaning} ${
          hanzi.sound || hanzi.pinyin || ""
        }`

        const wrongAnswers = otherHanzi
          .sort(() => Math.random() - 0.5)
          .map((h) => `${h.meaning} ${h.sound || h.pinyin || ""}`)
          .filter((answer) => answer !== correctAnswer) // 정답과 다른 답안만 선택
          .filter((answer, index, arr) => arr.indexOf(answer) === index) // 중복 제거
          .slice(0, 3) // 3개만 선택

        // 정답과 오답을 섞어서 4지선다 생성 (중복 없는지 한번 더 확인)
        const allOptions = [correctAnswer, ...wrongAnswers]
          .filter(
            (option) =>
              option !== undefined && option !== null && option.trim() !== ""
          ) // 빈 값 제거
          .filter((option, index, arr) => arr.indexOf(option) === index) // 중복 제거
          .sort(() => Math.random() - 0.5) as string[]

        // 만약 4개가 안 되면 추가 오답 생성
        if (allOptions.length < 4) {
          const additionalWrongAnswers = otherHanzi
            .map((h) => `${h.meaning} ${h.sound || h.pinyin || ""}`)
            .filter((answer) => !allOptions.includes(answer)) // 이미 있는 답안 제외
            .filter((answer, index, arr) => arr.indexOf(answer) === index) // 중복 제거
            .slice(0, 4 - allOptions.length) // 부족한 만큼 추가

          allOptions.push(...additionalWrongAnswers)
        }

        // "모르겠음" 옵션 추가하여 5지선다로 변경
        allOptions.push("모르겠음")

        return {
          id: hanzi.id,
          hanzi: hanzi.character,
          meaning: hanzi.meaning,
          sound: hanzi.sound || hanzi.pinyin || "",
          options: allOptions,
          correctAnswer,
          hiddenPart: hiddenPart,
          hanziId: hanzi.id,
          relatedWords: hanzi.relatedWords,
        }
      })

      setTimeout(() => {
        setQuestions(generatedQuestions)
        setCurrentQuestionIndex(0)
        setCorrectAnswers(0)
        questionsAnsweredRef.current = 0 // 답한 문제 수 리셋
        setSelectedAnswer(null)
        setIsCorrect(null)
        setGameEnded(false)
        setShowSettings(false)
        setIsGenerating(false)
        setHasUpdatedStats(false) // 통계 업데이트 플래그 리셋
        setUserConfirmedExit(false) // 나가기 확인 플래그 리셋

        // 게임 시작 시 시간 추적 시작
        if (user) {
          startSession().catch((error: any) => {
            console.error("시간 추적 시작 실패:", error)
          })
        }
      }, 1000)
    } catch (error) {
      console.error("게임 초기화 실패:", error)
      setIsGenerating(false)
      setNoDataMessage("게임 초기화 중 오류가 발생했습니다.")
      setShowNoDataModal(true)
    }
  }

  // 문제별 경험치 추가 및 한자별 통계 업데이트 (정답시)
  const addQuestionExperience = async () => {
    if (!user) return
    try {
      await updateUserExperience(1) // 1 EXP 추가 (새로고침 없이)

      // 현재 문제의 한자 통계 업데이트
      const currentQuestion = questions[currentQuestionIndex]
      if (currentQuestion && currentQuestion.hanziId) {
        await ApiClient.updateHanziStatisticsNew(
          user.id,
          currentQuestion.hanziId,
          "partial",
          true // 정답이므로 true
        )
      }
    } catch (error) {
      console.error("경험치 추가 실패:", error)
    }
  }

  // 한자별 통계 업데이트 (오답시)
  const updateHanziStats = async (isCorrect: boolean) => {
    if (!user) return
    try {
      const currentQuestion = questions[currentQuestionIndex]
      if (currentQuestion && currentQuestion.hanziId) {
        await ApiClient.updateHanziStatisticsNew(
          user.id,
          currentQuestion.hanziId,
          "partial",
          isCorrect
        )
      }
    } catch (error) {
      console.error("한자 통계 업데이트 실패:", error)
    }
  }

  const handleAnswerSelect = useCallback(
    async (answer: string) => {
      if (selectedAnswer !== null) return // 이미 답을 선택했으면 무시

      setSelectedAnswer(answer)
      const currentQuestion = questions[currentQuestionIndex]
      const correct = answer === currentQuestion.correctAnswer
      const isDontKnow = answer === "모르겠음"

      setIsCorrect(correct)
      questionsAnsweredRef.current = questionsAnsweredRef.current + 1

      // 경험치 계산 로직 변경
      let experienceToAdd = 0
      if (isDontKnow) {
        // 모르겠음 선택 시 +1 경험치
        experienceToAdd = 1
        setDontKnowCount((prev) => prev + 1)
      } else if (correct) {
        // 정답 시 +1 경험치
        experienceToAdd = 1
      } else {
        // 틀린 답안 시 -1 경험치 (차감)
        experienceToAdd = -1
      }
      console.log(
        `🔢 문제 답변: ${currentQuestionIndex + 1}/${
          questions.length
        }, questionsAnswered: ${questionsAnsweredRef.current}`
      )
      console.log(
        `📊 현재 questionsAnsweredRef.current: ${questionsAnsweredRef.current}`
      )
      console.log(
        `🎯 questionsAnsweredRef.current 값 확인: ${questionsAnsweredRef.current}`
      )

      // 즉시 통계 업데이트 (문제 풀 때마다)
      if (user) {
        try {
          console.log(`📊 즉시 통계 업데이트 시작 (Partial):`)
          console.log(`  - totalPlayed: +1`)
          console.log(`  - correctAnswers: ${correct ? "+1" : "+0"}`)
          console.log(`  - wrongAnswers: ${correct ? "+0" : "+1"}`)
          console.log(`  - completedSessions: +0 (문제 풀 때마다는 0)`)

          await ApiClient.updateGameStatisticsNew(user.id, "partial", {
            totalPlayed: 1, // 1문제씩 즉시 추가
            correctAnswers: correct ? 1 : 0,
            wrongAnswers: correct ? 0 : 1,
            completedSessions: 0, // 문제 풀 때마다는 0
          })

          console.log(`✅ 즉시 통계 업데이트 완료 (Partial)!`)
        } catch (error) {
          console.error("즉시 통계 업데이트 실패 (Partial):", error)
        }
      }

      // 즉시 경험치 추가
      if (user && experienceToAdd !== 0) {
        try {
          console.log(
            `💰 경험치 업데이트 시작 (Partial): ${
              isDontKnow ? "모르겠음" : correct ? "정답" : "오답"
            } → ${experienceToAdd >= 0 ? "+" : ""}${experienceToAdd} EXP`
          )
          await updateUserExperience(experienceToAdd)
          // 오늘 경험치도 함께 업데이트 (경험치가 양수일 때만)
          if (experienceToAdd > 0) {
            await ApiClient.updateTodayExperience(user.id, experienceToAdd)
          }
          console.log(
            `⭐ 즉시 경험치 추가 완료 (Partial): ${
              experienceToAdd >= 0 ? "+" : ""
            }${experienceToAdd} EXP (${
              isDontKnow ? "모르겠음" : correct ? "정답" : "오답"
            })`
          )
        } catch (error) {
          console.error("즉시 경험치 추가 실패 (Partial):", error)
        }
      }

      if (correct) {
        setCorrectAnswers((prev) => prev + 1)
        // 문제별로 한자별 통계 업데이트
        addQuestionExperience()

        // 정답인 경우에만 모달 표시
        setModalHanzi({
          hanzi: currentQuestion.hanzi,
          meaning: currentQuestion.meaning,
          sound: currentQuestion.sound,
        })
        setShowModal(true)
      } else {
        // 틀렸을 때 한자별 통계 업데이트 (틀린 답)
        updateHanziStats(false)
      }

      // 정답/오답 모달 3초간 표시 후 자동으로 다음 문제로 이동
      setTimeout(async () => {
        setShowModal(false) // 모달 닫기
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex((prev) => prev + 1)
          setSelectedAnswer(null)
          setIsCorrect(null)
        } else {
          // 마지막 문제인 경우 게임 종료 및 팝업 상태 초기화
          console.log(
            `🎯 마지막 문제 완료! 총 답변: ${questionsAnsweredRef.current}개`
          )
          console.log(`🏁 gameEnded를 true로 설정합니다. (Partial)`)

          // 완벽한 게임 보너스 계산 및 적용
          const perfectBonus = await calculatePerfectGameBonus(
            questions.length,
            dontKnowCount
          )
          if (perfectBonus > 0) {
            console.log(`🎁 완벽한 게임 보너스! +${perfectBonus} EXP`)

            // 추가 경험치를 사용자에게 적용
            if (user) {
              updateUserExperience(perfectBonus)
              ApiClient.updateTodayExperience(user.id, perfectBonus)
            }
          }

          // 경험치 결과 모달 표시
          setEarnedExperience(perfectBonus)
          setShowExperienceModal(true)

          // 다음 급수 권장 모달 체크
          if (user) {
            try {
              const completionStatus =
                await ApiClient.checkGradeCompletionStatus(
                  user.id,
                  selectedGrade
                )
              if (completionStatus.isFullyCompleted) {
                console.log(
                  `🎯 모든 한자 100번 이상 완료! 다음 급수 권장 모달 표시`
                )
                setShowNextGradeModal(true)
              }
            } catch (error) {
              console.error("다음 급수 체크 실패:", error)
            }
          }

          setSelectedAnswer(null)
          setIsCorrect(null)
          // questionsAnswered 업데이트 후 gameEnded 설정
          setTimeout(() => {
            setGameEnded(true)
          }, 100)
        }
      }, 3000) // 3초 후 자동 이동
    },
    [
      questions,
      currentQuestionIndex,
      selectedAnswer,
      setSelectedAnswer,
      setIsCorrect,
      setCurrentQuestionIndex,
      setGameEnded,
      setShowModal,
      setModalHanzi,
      addQuestionExperience,
      updateUserExperience,
      updateHanziStats,
      user,
    ]
  )

  // 게임 종료 시 최종 통계 업데이트는 불필요 (이미 각 문제마다 즉시 업데이트됨)
  useEffect(() => {
    console.log(`🔍 게임 종료 useEffect 트리거됨 (Partial):`)
    console.log(`  - gameEnded: ${gameEnded}`)
    console.log(`  - user: ${user ? "있음" : "없음"}`)
    console.log(`  - hasUpdatedStats: ${hasUpdatedStats}`)
    console.log(
      `  - questionsAnsweredRef.current: ${questionsAnsweredRef.current}`
    )
    console.log(`  - questionCount: ${questionCount}`)
    console.log(
      `  - 조건 확인 (Partial): gameEnded=${gameEnded}, user=${!!user}, hasUpdatedStats=${hasUpdatedStats}, questionsAnswered=${
        questionsAnsweredRef.current
      }, questionCount=${questionCount}`
    )

    // 모든 문제를 풀었을 때만 세션 완료로 인정
    if (
      gameEnded &&
      user &&
      !hasUpdatedStats &&
      questionsAnsweredRef.current === questionCount
    ) {
      console.log(`🎯 게임 완료 (Partial)! 세션 완료 통계 업데이트`)
      console.log(`📊 completedSessions +1 업데이트 시작 (Partial)`)

      // 세션 완료 통계 업데이트
      ApiClient.updateGameStatisticsNew(user.id, "partial", {
        completedSessions: 1, // 세션 1회 완료
      })
        .then(() => {
          console.log(
            `✅ 세션 완료 통계 업데이트 완료 (Partial) - completedSessions +1`
          )
          setHasUpdatedStats(true)

          // 게임 완료 시 시간 추적 종료
          endSession()
        })
        .catch((error) => {
          console.error("세션 완료 통계 업데이트 실패 (Partial):", error)
        })
    } else if (gameEnded && questionsAnsweredRef.current !== questionCount) {
      console.log(
        `🚫 중도 포기 (Partial): 세션 완료 통계 업데이트 안함 (${questionsAnsweredRef.current}/${questionCount})`
      )
      setHasUpdatedStats(true) // 중도 포기 시에도 플래그 설정하여 중복 방지

      // 중도 포기 시 시간 추적은 이미 handleExitConfirm에서 처리됨
      console.log(
        `ℹ️ 중도 포기 시 시간 추적은 이미 handleExitConfirm에서 처리됨`
      )
    } else {
      console.log(
        `❓ 조건 불만족 (Partial): gameEnded=${gameEnded}, user=${!!user}, hasUpdatedStats=${hasUpdatedStats}, questionsAnswered=${
          questionsAnsweredRef.current
        }, questionCount=${questionCount}`
      )
    }
  }, [gameEnded, user, hasUpdatedStats, questionCount])

  const getHiddenPartStyle = (part: string) => {
    switch (part) {
      case "top-left":
        return {
          clipPath: "polygon(0% 0%, 70% 0%, 50% 50%, 0% 70%)",
        }
      case "top-right":
        return {
          clipPath: "polygon(30% 0%, 100% 0%, 100% 70%, 50% 50%)",
        }
      case "bottom-left":
        return {
          clipPath: "polygon(0% 30%, 50% 50%, 0% 100%, 0% 100%)",
        }
      case "bottom-right":
        return {
          clipPath: "polygon(50% 50%, 100% 30%, 100% 100%, 70% 100%)",
        }
      default:
        return {}
    }
  }

  // 로딩 중일 때는 로딩 스피너 표시 (진짜 초기 로딩만)
  if (initialLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='인증 상태를 확인하는 중...' />
      </div>
    )
  }

  // 초기 데이터 로딩 중
  if (isLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='한자 데이터를 불러오는 중...' />
      </div>
    )
  }

  // 인증이 완료되었지만 사용자가 없을 때 (즉시 표시, 로딩 없음)
  if (isAuthenticated && !user) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-gray-900 mb-4'>
            로그인이 필요합니다
          </h1>
          <Link href='/' className='text-blue-600 hover:text-blue-700'>
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  if (gradeHanzi.length === 0) {
    return <LoadingSpinner message='한자 데이터를 불러오는 중...' />
  }

  // 설정 화면
  if (showSettings) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
        {/* 헤더 */}
        <header className='fixed top-0 left-0 right-0 bg-white shadow-sm z-50'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
            <div className='flex justify-between items-center py-4'>
              <div className='flex items-center space-x-4'>
                <button
                  onClick={() => (window.location.href = "/")}
                  className='text-blue-600 hover:text-blue-700'
                >
                  <ArrowLeft className='h-5 w-5' />
                </button>
                <h1 className='text-xl font-bold text-gray-900'>부분 맞추기</h1>
              </div>
            </div>
          </div>
        </header>

        {/* 메인 컨텐츠 */}
        <main className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20'>
          <div className='bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto'>
            <h2 className='text-3xl font-bold text-gray-900 mb-6 text-center'>
              부분 맞추기 설정
            </h2>

            {/* 급수 선택 */}
            <div className='mb-6'>
              <label className='block text-base font-semibold text-gray-700 mb-2'>
                급수 선택
              </label>
              <select
                value={selectedGrade}
                onChange={(e) => handleGradeChange(Number(e.target.value))}
                disabled={isLoadingGrade}
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium disabled:opacity-50'
              >
                {[8, 7, 6, 5.5, 5, 4.5, 4, 3.5, 3].map((grade) => (
                  <option key={grade} value={grade} className='font-medium'>
                    {grade === 5.5
                      ? "준5급"
                      : grade === 4.5
                      ? "준4급"
                      : grade === 3.5
                      ? "준3급"
                      : `${grade}급`}
                  </option>
                ))}
              </select>

              {isLoadingGrade && (
                <div className='mt-2 flex items-center space-x-2'>
                  <LoadingSpinner message='' />
                  <span className='text-base text-gray-600'>
                    급수 데이터를 불러오는 중...
                  </span>
                </div>
              )}

              {gradeHanzi.length > 0 ? (
                <p className='mt-2 text-base text-gray-600'>
                  해당 급수에 {gradeHanzi.length}개의 한자가 있습니다.
                </p>
              ) : (
                !isLoadingGrade && (
                  <p className='mt-2 text-base text-red-600 font-medium'>
                    해당 급수에 데이터가 없습니다.
                  </p>
                )
              )}
            </div>

            {/* 문제 수 선택 */}
            <div className='mb-6'>
              <label className='block text-base font-semibold text-gray-700 mb-2'>
                문제 수 선택
              </label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium'
              >
                {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((count) => (
                  <option key={count} value={count} className='font-medium'>
                    {count}문제
                  </option>
                ))}
              </select>
            </div>

            {/* 게임 시작 버튼 */}
            <button
              onClick={initializeGame}
              disabled={isGenerating || gradeHanzi.length === 0}
              className='w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {isGenerating ? (
                <>
                  <LoadingSpinner message='' />
                  <span>게임 생성 중...</span>
                </>
              ) : gradeHanzi.length === 0 ? (
                <>
                  <span>데이터 없음</span>
                </>
              ) : (
                <>
                  <Play className='h-5 w-5' />
                  <span>게임 시작</span>
                </>
              )}
            </button>
          </div>
        </main>

        {/* 데이터 없음 모달 */}
        {showNoDataModal && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
            <div className='bg-white rounded-lg p-6 max-w-md mx-4'>
              <div className='text-center'>
                <div className='text-red-500 text-4xl mb-4'>⚠️</div>
                <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                  데이터 부족
                </h3>
                <p className='text-gray-700 mb-6 font-medium'>
                  {noDataMessage}
                </p>
                <button
                  onClick={() => setShowNoDataModal(false)}
                  className='px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // 게임 생성 중
  if (isGenerating) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='게임을 생성하는 중...' />
      </div>
    )
  }

  if (questions.length === 0) {
    return <LoadingSpinner message='게임을 준비하는 중...' />
  }

  const currentQuestion = questions[currentQuestionIndex]

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      {/* 헤더 */}
      <header className='fixed top-0 left-0 right-0 bg-white shadow-sm z-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-3'>
            <div className='flex items-center space-x-4'>
              <button
                onClick={() => {
                  if (!gameEnded && !hasUpdatedStats && questions.length > 0) {
                    setShowExitModal(true)
                  } else {
                    window.location.href = "/"
                  }
                }}
                className='text-blue-600 hover:text-blue-700'
              >
                <ArrowLeft className='h-5 w-5' />
              </button>
              <h1 className='text-xl font-bold text-gray-900'>부분 맞추기</h1>
            </div>
            <div className='flex items-center space-x-6'>
              <div className='text-center'>
                <div className='text-sm text-gray-600'>정답</div>
                <div className='text-lg font-bold text-green-600'>
                  {correctAnswers}
                </div>
              </div>
              <div className='text-center'>
                <div className='text-sm text-gray-600'>문제</div>
                <div className='text-lg font-bold text-blue-600'>
                  {currentQuestionIndex + 1}/{questionCount}
                </div>
              </div>
              <div className='text-center'>
                <div className='text-sm text-gray-600'>시간</div>
                <div className='text-lg font-bold text-purple-600'>
                  {Math.floor(currentDuration / 60)
                    .toString()
                    .padStart(2, "0")}
                  :{(currentDuration % 60).toString().padStart(2, "0")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16'>
        {!gameEnded ? (
          <div className='space-y-8'>
            {/* 문제 */}
            <div className='bg-white rounded-lg shadow-lg p-8 text-center'>
              <div className='mb-6'>
                <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                  가려진 부분을 보고 한자를 맞춰보세요!
                </h2>
                <p className='text-gray-600 mb-4'>
                  한자의 3/4 부분만 보입니다. 나머지 1/4 부분을 상상해서
                  맞춰보세요.
                </p>
              </div>

              {/* 한자 표시 영역 */}
              <div className='mb-8'>
                <div className='relative inline-block'>
                  <div
                    className='text-8xl font-bold text-blue-600 bg-gray-100 rounded-lg p-8 relative'
                    style={{
                      width: "200px",
                      height: "200px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {currentQuestion.hanzi}
                  </div>
                  <div
                    className='absolute inset-0 bg-gray-800 rounded-lg'
                    style={{
                      width: "200px",
                      height: "200px",
                      ...getHiddenPartStyle(currentQuestion.hiddenPart),
                    }}
                  ></div>
                </div>
              </div>

              {/* 보기 */}
              <div className='grid grid-cols-1 gap-3'>
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(option)}
                    disabled={selectedAnswer !== null}
                    className={`
                      p-3 rounded-lg border-2 transition-all duration-200 text-left
                      ${
                        selectedAnswer === null
                          ? "border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                          : selectedAnswer === option
                          ? option === currentQuestion.correctAnswer
                            ? "border-green-500 bg-green-100"
                            : "border-red-500 bg-red-100"
                          : option === currentQuestion.correctAnswer
                          ? "border-green-500 bg-green-100"
                          : "border-gray-300 bg-gray-50"
                      }
                      ${
                        selectedAnswer !== null
                          ? "cursor-default"
                          : "cursor-pointer"
                      }
                      ${
                        option === "모르겠음"
                          ? "bg-gray-100 border-gray-400"
                          : ""
                      }
                    `}
                  >
                    <div className='flex items-center space-x-3'>
                      <div className='w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-base font-bold'>
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className='text-base font-semibold text-gray-900'>
                        {option}
                      </span>
                      {selectedAnswer !== null && (
                        <div className='ml-auto'>
                          {option === currentQuestion.correctAnswer ? (
                            <CheckCircle className='h-5 w-5 text-green-600' />
                          ) : selectedAnswer === option ? (
                            <XCircle className='h-5 w-5 text-red-600' />
                          ) : null}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* 정답 표시 */}
              {selectedAnswer !== null && (
                <div className='mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200'>
                  <div className='flex items-center justify-center space-x-2'>
                    {isCorrect ? (
                      <>
                        <CheckCircle className='h-5 w-5 text-green-600' />
                        <span className='text-green-600 font-semibold'>
                          정답입니다!
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className='h-5 w-5 text-red-600' />
                        <span className='text-red-600 font-semibold'>
                          틀렸습니다.
                        </span>
                      </>
                    )}
                  </div>
                  <div className='text-base text-gray-900 mt-2 font-semibold'>
                    정답: {currentQuestion.correctAnswer}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* 게임 종료 화면 */
          <div className='text-center py-12'>
            <div className='bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto'>
              <h2 className='text-3xl font-bold text-gray-900 mb-4'>
                부분 맞추기 완료!
              </h2>
              <div className='space-y-4 mb-6'>
                <p className='text-lg text-gray-700 font-medium'>
                  정답 개수:{" "}
                  <span className='font-bold text-blue-600'>
                    {correctAnswers}
                  </span>
                </p>
                <p className='text-lg text-gray-700 font-medium'>
                  획득 경험치:{" "}
                  <span className='font-bold text-green-600'>
                    {questionsAnsweredRef.current}EXP
                  </span>
                </p>
                <p className='text-gray-700 font-medium'>
                  정답률:{" "}
                  <span className='font-bold text-green-600'>
                    {Math.round((correctAnswers / questionCount) * 100)}%
                  </span>
                </p>
                <p className='text-gray-700 font-medium'>
                  문제 수: {questionCount}개
                </p>
              </div>
              <div className='flex justify-center space-x-4 px-4'>
                <button
                  onClick={() => {
                    setShowSettings(true)
                    questionsAnsweredRef.current = 0 // 답한 문제 수 리셋
                    setHasUpdatedStats(false) // 통계 업데이트 플래그 리셋
                    setUserConfirmedExit(false) // 나가기 확인 플래그 리셋
                  }}
                  className='flex-1 max-w-xs px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium'
                >
                  <span>다시 하기</span>
                </button>
                <Link
                  href='/'
                  className='flex-1 max-w-xs px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-center'
                >
                  홈으로
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 뒤로가기 확인 모달 */}
      {showExitModal && (
        <div className='fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4 text-center'>
            <div className='mb-6'>
              <div className='text-yellow-500 text-4xl mb-4'>⚠️</div>
              <h3 className='text-2xl font-bold text-gray-900 mb-4'>
                게임을 중단하시겠습니까?
              </h3>
              <div className='space-y-3 text-gray-700'>
                <p className='font-medium'>
                  현재까지 {questionsAnsweredRef.current}문제를 풀었습니다.
                </p>
                <p className='text-base'>
                  게임을 중단하면 진행 상황이 저장되지 않습니다.
                </p>
                <p className='text-base font-semibold text-red-600'>
                  정말 나가시겠습니까?
                </p>
              </div>
            </div>

            <div className='flex justify-center space-x-4'>
              <button
                onClick={handleExitCancel}
                className='px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium'
              >
                계속하기
              </button>
              <button
                onClick={handleExitConfirm}
                className='px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium'
              >
                나가기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 정답 모달 팝업 */}
      {showModal && modalHanzi && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div
            className={`bg-white rounded-lg p-8 max-w-md mx-4 text-center border-4 border-green-500`}
          >
            <div className={`text-6xl font-bold mb-4 text-green-600`}>
              {modalHanzi.hanzi}
            </div>
            <div className='text-xl text-gray-700 mb-2'>
              {modalHanzi.meaning}
            </div>
            <div className='text-lg text-gray-600 mb-4'>{modalHanzi.sound}</div>
            <div className={`text-lg font-semibold text-green-600`}>
              🎉 정답입니다!
            </div>
          </div>
        </div>
      )}

      {/* 틀렸을 때 정답 모달 */}
      {selectedAnswer !== null &&
        !isCorrect &&
        selectedAnswer !== "모르겠음" && (
          <div className='fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50'>
            <div className='bg-white rounded-lg shadow-2xl p-6 max-w-lg w-full mx-4 text-center'>
              <div className='mb-4'>
                <XCircle className='h-12 w-12 text-red-500 mx-auto mb-3' />
                <h3 className='text-xl font-bold text-gray-900 mb-2'>
                  틀렸습니다
                </h3>
                <p className='text-gray-600 text-base'>정답을 확인해보세요</p>
              </div>

              <div className='bg-gray-50 rounded-lg p-4 mb-4'>
                <div className='text-5xl font-bold text-blue-600 mb-4'>
                  {questions[currentQuestionIndex].hanzi}
                </div>
                <div className='space-y-2 mb-4'>
                  <div className='text-lg text-gray-700'>
                    <span className='text-gray-500 font-medium'>뜻:</span>
                    <span className='font-bold text-green-600 ml-2'>
                      {questions[currentQuestionIndex].meaning}
                    </span>
                  </div>
                  <div className='text-lg text-gray-700'>
                    <span className='text-gray-500 font-medium'>음:</span>
                    <span className='font-bold text-green-600 ml-2'>
                      {questions[currentQuestionIndex].sound}
                    </span>
                  </div>
                </div>

                {/* 관련 단어 섹션 */}
                {(() => {
                  console.log(
                    "Partial 틀렸을 때 - Related words:",
                    questions[currentQuestionIndex].relatedWords
                  )
                  return (
                    questions[currentQuestionIndex].relatedWords &&
                    questions[currentQuestionIndex].relatedWords.length > 0
                  )
                })() && (
                  <div className='border-t pt-3'>
                    <h4 className='text-base font-semibold text-gray-700 mb-2'>
                      관련 단어
                    </h4>
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                      {questions[currentQuestionIndex].relatedWords
                        ?.slice(0, 4)
                        .map((word, index) => (
                          <div
                            key={index}
                            className='bg-white rounded-md p-2 text-base'
                          >
                            <div className='font-medium text-gray-900'>
                              {word.hanzi}
                            </div>
                            <div className='text-gray-600'>{word.korean}</div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <div className='text-xs text-gray-500'>
                잠시 후 다음 문제로 넘어갑니다...
              </div>
            </div>
          </div>
        )}

      {/* 모르겠음 선택 시 모달 */}
      {selectedAnswer !== null &&
        !isCorrect &&
        selectedAnswer === "모르겠음" && (
          <div className='fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50'>
            <div className='bg-white rounded-lg shadow-2xl p-6 max-w-lg w-full mx-4 text-center'>
              <div className='mb-4'>
                <CheckCircle className='h-12 w-12 text-blue-500 mx-auto mb-3' />
                <h3 className='text-xl font-bold text-gray-900 mb-2'>
                  정답을 확인해보세요
                </h3>
                <p className='text-gray-600 text-base'>
                  이 한자를 기억해두세요
                </p>
              </div>

              <div className='bg-gray-50 rounded-lg p-4 mb-4'>
                <div className='text-5xl font-bold text-blue-600 mb-4'>
                  {questions[currentQuestionIndex].hanzi}
                </div>
                <div className='space-y-2 mb-4'>
                  <div className='text-lg text-gray-700'>
                    <span className='text-gray-500 font-medium'>뜻:</span>
                    <span className='font-bold text-green-600 ml-2'>
                      {questions[currentQuestionIndex].meaning}
                    </span>
                  </div>
                  <div className='text-lg text-gray-700'>
                    <span className='text-gray-500 font-medium'>음:</span>
                    <span className='font-bold text-green-600 ml-2'>
                      {questions[currentQuestionIndex].sound}
                    </span>
                  </div>
                </div>

                {/* 관련 단어 섹션 */}
                {questions[currentQuestionIndex].relatedWords &&
                  questions[currentQuestionIndex].relatedWords.length > 0 && (
                    <div className='border-t pt-3'>
                      <h4 className='text-base font-semibold text-gray-700 mb-2'>
                        관련 단어
                      </h4>
                      <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                        {questions[currentQuestionIndex].relatedWords
                          ?.slice(0, 4)
                          .map((word, index) => (
                            <div
                              key={index}
                              className='bg-white rounded-md p-2 text-base'
                            >
                              <div className='font-medium text-gray-900'>
                                {word.hanzi}
                              </div>
                              <div className='text-gray-600'>{word.korean}</div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
              </div>

              <div className='text-xs text-gray-500'>
                잠시 후 다음 문제로 넘어갑니다...
              </div>
            </div>
          </div>
        )}

      {/* 맞았을 때 성공 모달 */}
      {selectedAnswer !== null && isCorrect && (
        <div className='fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg shadow-2xl p-6 max-w-lg w-full mx-4 text-center'>
            <div className='mb-4'>
              <CheckCircle className='h-12 w-12 text-green-500 mx-auto mb-3' />
              <h3 className='text-xl font-bold text-gray-900 mb-2'>
                정답입니다!
              </h3>
              <p className='text-green-600 text-base'>잘 하셨습니다!</p>
            </div>

            <div className='bg-gray-50 rounded-lg p-4 mb-4'>
              <div className='text-5xl font-bold text-blue-600 mb-4'>
                {questions[currentQuestionIndex].hanzi}
              </div>
              <div className='space-y-2 mb-4'>
                <div className='text-lg text-gray-700'>
                  <span className='text-gray-500 font-medium'>뜻:</span>
                  <span className='font-bold text-green-600 ml-2'>
                    {questions[currentQuestionIndex].meaning}
                  </span>
                </div>
                <div className='text-lg text-gray-700'>
                  <span className='text-gray-500 font-medium'>음:</span>
                  <span className='font-bold text-green-600 ml-2'>
                    {questions[currentQuestionIndex].sound}
                  </span>
                </div>
              </div>

              {/* 관련 단어 섹션 */}
              {questions[currentQuestionIndex].relatedWords &&
                questions[currentQuestionIndex].relatedWords.length > 0 && (
                  <div className='border-t pt-3'>
                    <h4 className='text-base font-semibold text-gray-700 mb-2'>
                      관련 단어
                    </h4>
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                      {questions[currentQuestionIndex].relatedWords
                        .slice(0, 4)
                        .map((word, index) => (
                          <div
                            key={index}
                            className='bg-white rounded-md p-2 text-base'
                          >
                            <div className='font-medium text-gray-900'>
                              {word.hanzi}
                            </div>
                            <div className='text-gray-600'>{word.korean}</div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
            </div>

            <div className='text-xs text-gray-500'>
              잠시 후 다음 문제로 넘어갑니다...
            </div>
          </div>
        </div>
      )}

      {/* 다음 급수 권장 모달 */}
      <NextGradeModal
        isOpen={showNextGradeModal}
        onClose={() => setShowNextGradeModal(false)}
        currentGrade={selectedGrade}
        nextGrade={selectedGrade - 1}
        onProceedToNext={() => {
          setSelectedGrade(selectedGrade - 1)
          setShowNextGradeModal(false)
          // 게임 재시작
          initializeGame()
        }}
      />

      {/* 경험치 결과 모달 */}
      {showExperienceModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl'>
            <div className='text-center mb-6'>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                게임 완료!
              </h2>
              <div className='space-y-4 mb-6'>
                <p className='text-lg text-gray-700 font-medium'>
                  정답 개수:{" "}
                  <span className='font-bold text-blue-600'>
                    {correctAnswers}
                  </span>
                </p>
                <p className='text-lg text-gray-700 font-medium'>
                  획득 경험치:{" "}
                  <span className='font-bold text-green-600'>
                    {earnedExperience}EXP
                  </span>
                </p>
                <p className='text-gray-700 font-medium'>
                  정답률:{" "}
                  <span className='font-bold text-green-600'>
                    {Math.round((correctAnswers / questionCount) * 100)}%
                  </span>
                </p>

                {/* 경험치 상세 정보 */}
                <div className='bg-gray-50 rounded-lg p-4 mt-4'>
                  <h3 className='text-base font-semibold text-gray-700 mb-2'>
                    경험치 상세
                  </h3>
                  <div className='space-y-1 text-base'>
                    <div className='flex justify-between'>
                      <span className='text-gray-600'>
                        정답 ({correctAnswers}개):
                      </span>
                      <span className='text-green-600 font-medium'>
                        +{correctAnswers} EXP
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-600'>
                        오답 ({questionCount - correctAnswers - dontKnowCount}
                        개):
                      </span>
                      <span className='text-red-600 font-medium'>
                        -{questionCount - correctAnswers - dontKnowCount} EXP
                      </span>
                    </div>
                    {dontKnowCount > 0 && (
                      <div className='flex justify-between'>
                        <span className='text-gray-600'>
                          모르겠음 ({dontKnowCount}개):
                        </span>
                        <span className='text-blue-600 font-medium'>
                          +{dontKnowCount} EXP
                        </span>
                      </div>
                    )}
                    {dontKnowCount === 0 &&
                      correctAnswers === questionCount && (
                        <div className='flex justify-between'>
                          <span className='text-gray-600'>
                            완벽한 게임 보너스:
                          </span>
                          <span className='text-purple-600 font-medium'>
                            +
                            {(() => {
                              const bonusMap: { [key: number]: number } = {
                                5: 1,
                                10: 2,
                                15: 3,
                                20: 5,
                                25: 9,
                                30: 12,
                                35: 15,
                                40: 20,
                                45: 25,
                                50: 30,
                              }
                              return bonusMap[questionCount] || 0
                            })()}{" "}
                            EXP
                          </span>
                        </div>
                      )}
                    <div className='border-t pt-1 mt-2'>
                      <div className='flex justify-between font-semibold'>
                        <span className='text-gray-800'>총 경험치:</span>
                        <span className='text-green-600'>
                          +{earnedExperience} EXP
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className='flex justify-center'>
              <button
                onClick={() => {
                  setShowExperienceModal(false)
                  setShowSettings(true)
                  questionsAnsweredRef.current = 0
                  setDontKnowCount(0)
                  setHasUpdatedStats(false)
                  setUserConfirmedExit(false)
                }}
                className='px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium'
              >
                다시 하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
