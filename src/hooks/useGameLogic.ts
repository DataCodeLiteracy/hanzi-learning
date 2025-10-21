import { useState, useCallback, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { ApiClient } from "@/lib/apiClient"

export interface GameStats {
  correctAnswers: number
  dontKnowCount: number
  earnedExperience: number
  bonusExperience: number
}

export interface GameQuestion {
  id: string
  hanzi: string
  meaning: string
  sound: string
  options: string[]
  correctAnswer: string
  hanziId: string
  relatedWords?: Array<{
    hanzi: string
    korean: string
  }>
}

export interface GameConfig {
  selectedGrade: number
  questionCount: number
  gameType: "partial" | "quiz"
}

export const useGameLogic = (config: GameConfig) => {
  const { user, updateUserExperience } = useAuth()

  // 게임 상태
  const [questions, setQuestions] = useState<GameQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [gameEnded, setGameEnded] = useState<boolean>(false)
  const [hasUpdatedStats, setHasUpdatedStats] = useState<boolean>(false)
  const [userConfirmedExit, setUserConfirmedExit] = useState<boolean>(false)

  // 게임 통계
  const [gameStats, setGameStats] = useState<GameStats>({
    correctAnswers: 0,
    dontKnowCount: 0,
    earnedExperience: 0,
    bonusExperience: 0,
  })

  // 문제 풀기 카운팅
  const questionsAnsweredRef = useRef<number>(0)

  // 완벽한 게임 보너스 계산
  const calculatePerfectGameBonus = useCallback(
    async (
      questionCount: number,
      dontKnowCount: number,
      correctAnswers: number
    ): Promise<number> => {
      // 학습 완료도 체크 (80% 이상 완료 시 보너스 제한)
      if (user) {
        try {
          const completionStatus = await ApiClient.checkGradeCompletionStatus(
            user.id,
            config.selectedGrade
          )
          if (completionStatus.isEligibleForBonus) {
            return 0
          }
        } catch (error) {
          console.error("보너스 경험치 계산 실패:", error)
          // 에러 시에는 보너스 지급 (기존 로직 유지)
        }
      }

      // 모르겠음을 선택한 경우: 완벽한 게임이 아니므로 추가 보상 없음
      if (dontKnowCount > 0) {
        return 0
      }

      // 오답이 있는 경우: 완벽한 게임이 아니므로 추가 보상 없음
      if (correctAnswers < questionCount) {
        return 0
      }

      // 모르겠음 없이 모든 문제를 정답으로 맞춘 경우: 추가 보상만 지급
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
    },
    [user, config.selectedGrade]
  )

  // 답변 선택 처리
  const handleAnswerSelect = useCallback(
    async (answer: string) => {
      if (selectedAnswer !== null) return // 이미 답을 선택했으면 무시

      setSelectedAnswer(answer)
      const currentQuestion = questions[currentQuestionIndex]
      const correct = answer === currentQuestion.correctAnswer
      const isDontKnow = answer === "모르겠음"

      setIsCorrect(correct)
      questionsAnsweredRef.current = questionsAnsweredRef.current + 1

      // 경험치 계산 로직
      let experienceToAdd = 0
      if (isDontKnow) {
        // 모르겠음 선택 시 +1 경험치
        experienceToAdd = 1
        setGameStats((prev) => ({
          ...prev,
          dontKnowCount: prev.dontKnowCount + 1,
        }))
      } else if (correct) {
        // 정답 시 +1 경험치
        experienceToAdd = 1
        setGameStats((prev) => ({
          ...prev,
          correctAnswers: prev.correctAnswers + 1,
        }))
      } else {
        // 틀린 답안 시 -1 경험치 (차감)
        experienceToAdd = -1
      }

      // 즉시 통계 업데이트 (문제 풀 때마다)
      if (user) {
        try {
          await ApiClient.updateGameStatisticsNew(user.id, config.gameType, {
            totalPlayed: 1, // 1문제씩 즉시 추가
            correctAnswers: correct ? 1 : 0,
            wrongAnswers: correct ? 0 : 1,
            completedSessions: 0, // 문제 풀 때마다는 0
          })
        } catch (error) {
          console.error("게임 통계 업데이트 실패:", error)
        }
      }

      // 즉시 경험치 추가
      if (user && experienceToAdd !== 0) {
        try {
          await updateUserExperience(experienceToAdd)
          // 오늘 경험치도 함께 업데이트 (경험치가 양수일 때만)
          if (experienceToAdd > 0) {
            await ApiClient.updateTodayExperience(user.id, experienceToAdd)
          }
        } catch (error) {
          console.error("경험치 업데이트 실패:", error)
        }
      }

      // 경험치 상태 업데이트
      setGameStats((prev) => ({
        ...prev,
        earnedExperience: prev.earnedExperience + experienceToAdd,
      }))

      // 한자별 통계 업데이트
      if (currentQuestion && currentQuestion.hanziId) {
        try {
          await ApiClient.updateHanziStatisticsNew(
            user!.id,
            currentQuestion.hanziId,
            config.gameType,
            isDontKnow ? false : correct // 모르겠음은 false로 처리
          )
        } catch (error) {
          console.error("한자 통계 업데이트 실패:", error)
        }
      }

      // 정답/오답 모달 표시 후 자동으로 다음 문제로 이동
      setTimeout(
        async () => {
          if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex((prev) => prev + 1)
            setSelectedAnswer(null)
            setIsCorrect(null)
          } else {
            // 마지막 문제인 경우 게임 종료
            // 완벽한 게임 보너스 계산 및 적용
            const finalCorrectAnswers =
              gameStats.correctAnswers + (correct ? 1 : 0)
            const finalDontKnowCount =
              gameStats.dontKnowCount + (isDontKnow ? 1 : 0)

            const perfectBonus = await calculatePerfectGameBonus(
              questions.length,
              finalDontKnowCount,
              finalCorrectAnswers
            )

            if (perfectBonus > 0) {
              // 추가 경험치를 사용자에게 적용
              if (user) {
                updateUserExperience(perfectBonus)
                ApiClient.updateTodayExperience(user.id, perfectBonus)
              }
            }

            // 보너스 경험치 저장
            setGameStats((prev) => ({
              ...prev,
              bonusExperience: perfectBonus,
              earnedExperience: prev.earnedExperience + perfectBonus,
            }))

            setSelectedAnswer(null)
            setIsCorrect(null)
            // questionsAnswered 업데이트 후 gameEnded 설정
            setTimeout(() => {
              setGameEnded(true)
            }, 100)
          }
        },
        config.gameType === "partial" ? 3000 : 2500
      ) // 부분 맞추기는 3초, 퀴즈는 2.5초
    },
    [
      questions,
      currentQuestionIndex,
      selectedAnswer,
      setSelectedAnswer,
      setIsCorrect,
      setCurrentQuestionIndex,
      setGameEnded,
      updateUserExperience,
      user,
      config.gameType,
      gameStats,
      calculatePerfectGameBonus,
    ]
  )

  // 게임 초기화
  const initializeGame = useCallback(() => {
    // setQuestions([]) 제거 - 이미 setQuestions로 문제가 설정됨
    setCurrentQuestionIndex(0)
    setSelectedAnswer(null)
    setIsCorrect(null)
    setGameEnded(false)
    setHasUpdatedStats(false)
    setUserConfirmedExit(false)
    questionsAnsweredRef.current = 0
    setGameStats({
      correctAnswers: 0,
      dontKnowCount: 0,
      earnedExperience: 0,
      bonusExperience: 0,
    })
  }, [])

  // 게임 종료 시 세션 완료 통계 업데이트
  const handleGameEnd = useCallback(async () => {
    if (
      gameEnded &&
      user &&
      !hasUpdatedStats &&
      questionsAnsweredRef.current === questions.length
    ) {
      // 세션 완료 통계 업데이트
      ApiClient.updateGameStatisticsNew(user.id, config.gameType, {
        completedSessions: 1, // 세션 1회 완료
      })
        .then(() => {
          setHasUpdatedStats(true)
        })
        .catch((error) => {
          console.error("세션 완료 통계 업데이트 실패:", error)
        })
    } else if (gameEnded && questionsAnsweredRef.current !== questions.length) {
      setHasUpdatedStats(true) // 중도 포기 시에도 플래그 설정하여 중복 방지
    }
  }, [gameEnded, user, hasUpdatedStats, questions.length, config.gameType])

  return {
    // 상태
    questions,
    setQuestions,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    selectedAnswer,
    setSelectedAnswer,
    isCorrect,
    setIsCorrect,
    gameEnded,
    setGameEnded,
    hasUpdatedStats,
    setHasUpdatedStats,
    userConfirmedExit,
    setUserConfirmedExit,
    gameStats,
    setGameStats,
    questionsAnsweredRef,

    // 함수
    handleAnswerSelect,
    initializeGame,
    handleGameEnd,
    calculatePerfectGameBonus,
  }
}
