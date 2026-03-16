import { useState, useCallback, useRef, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useBonusModal } from "@/contexts/BonusModalContext"
import { ApiClient } from "@/lib/apiClient"
import {
  playCorrectSound,
  playWrongSound,
  playDontKnowSound,
} from "@/utils/soundEffects"

export interface GameStats {
  correctAnswers: number
  dontKnowCount: number
  wrongAnswers: number
  earnedExperience: number
  // 콤보 관련 상태
  comboStreak: number // 현재 연속 정답 수 (모르겠음 허용 범위 내)
  dontKnowComboUsed: number // 콤보를 깨지 않고 사용한 '모르겠음' 횟수
  bonusExperience: number
  bonusType?: "perfect" | "no_wrong" // 기존 보너스 타입 (현재는 사용하지 않음)
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
  const bonusModal = useBonusModal()

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
    wrongAnswers: 0,
    earnedExperience: 0,
    comboStreak: 0,
    dontKnowComboUsed: 0,
    bonusExperience: 0,
    bonusType: undefined,
  })

  // 문제 풀기 카운팅
  const questionsAnsweredRef = useRef<number>(0)
  // 콤보 보너스 1회 적용 여부
  const comboBonusAppliedRef = useRef<boolean>(false)

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

      // 효과음 재생
      if (isDontKnow) {
        playDontKnowSound()
      } else if (correct) {
        playCorrectSound()
      } else {
        playWrongSound()
      }

      // 경험치 및 콤보 계산 로직
      let experienceToAdd = 0
      let nextComboStreak = gameStats.comboStreak ?? 0
      let nextDontKnowComboUsed = gameStats.dontKnowComboUsed ?? 0

      if (isDontKnow) {
        // 모르겠음: 경험치 없음, 콤보는 3번까지 유지 (콤보 시작 후에만 기회 차감)
        experienceToAdd = 0

        if (nextComboStreak > 0) {
          // 콤보가 이미 시작된 상태에서만 보호 기회 차감
          nextDontKnowComboUsed = nextDontKnowComboUsed + 1

          // 3번까지는 콤보 유지, 4번째부터는 콤보 끊김
          if (nextDontKnowComboUsed > 3) {
            nextComboStreak = 0
          }
        }

        setGameStats((prev) => ({
          ...prev,
          dontKnowCount: prev.dontKnowCount + 1,
        }))
      } else if (correct) {
        // 정답: 콤보 1 증가, 기본 점수 1점 (콤보 보너스는 게임 종료 시 일괄 적용)
        nextComboStreak = nextComboStreak + 1
        experienceToAdd = 1

        setGameStats((prev) => ({
          ...prev,
          correctAnswers: prev.correctAnswers + 1,
        }))
      } else {
        // 오답: 경험치 차감 없음, 콤보 초기화
        experienceToAdd = 0
        nextComboStreak = 0

        setGameStats((prev) => ({
          ...prev,
          wrongAnswers: prev.wrongAnswers + 1,
        }))
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
          // 오늘 경험치도 함께 업데이트 (경험치가 양수일 때만, 연속 달성 보너스 콜백 전달)
          if (experienceToAdd > 0) {
            await ApiClient.updateTodayExperience(
              user.id,
              experienceToAdd,
              bonusModal?.showBonus
            )
          }
        } catch (error) {
          console.error("경험치 업데이트 실패:", error)
        }
      }

      // 경험치 및 콤보 상태 업데이트
      setGameStats((prev) => ({
        ...prev,
        earnedExperience: prev.earnedExperience + experienceToAdd,
        comboStreak: nextComboStreak,
        dontKnowComboUsed: nextDontKnowComboUsed,
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
      wrongAnswers: 0,
      earnedExperience: 0,
      comboStreak: 0,
      dontKnowComboUsed: 0,
      bonusExperience: 0,
      bonusType: undefined,
    })
  }, [])

  // 게임 종료 시 세션 완료 통계 및 콤보 보너스 적용 (내부 effect로 한 번만 실행)
  useEffect(() => {
    if (!gameEnded || comboBonusAppliedRef.current) return

    // 이 effect 사이클에서만 콤보 보너스를 처리하도록 플래그 설정
    comboBonusAppliedRef.current = true

    const finalizeGame = async () => {
      // 세션 완료 통계
      if (
        user &&
        !hasUpdatedStats &&
        questionsAnsweredRef.current === questions.length
      ) {
        try {
          await ApiClient.updateGameStatisticsNew(user.id, config.gameType, {
            completedSessions: 1, // 세션 1회 완료
          })
          setHasUpdatedStats(true)
        } catch (error) {
          console.error("세션 완료 통계 업데이트 실패:", error)
        }
      } else if (questionsAnsweredRef.current !== questions.length) {
        setHasUpdatedStats(true) // 중도 포기 시에도 플래그 설정하여 중복 방지
      }

      // 콤보 보너스는 한 번만 적용
      if (user && gameStats.comboStreak > 0 && gameStats.bonusExperience === 0) {
        const questionCount = questions.length
        const finalCombo = gameStats.comboStreak

        let rawComboBonus = finalCombo

        // 5/10/15/20문제 세트에서는 콤보 보너스를 콤보/2 (올림)으로 조정
        if ([5, 10, 15, 20].includes(questionCount)) {
          rawComboBonus = Math.ceil(finalCombo / 2)
        }

        // 한 세션에서 받을 수 있는 콤보 보너스는 문제 수를 넘지 않도록 제한
        const comboBonus = Math.min(rawComboBonus, questionCount)

        try {
          await updateUserExperience(comboBonus)
          await ApiClient.updateTodayExperience(user.id, comboBonus)
        } catch (error) {
          console.error("콤보 보너스 경험치 업데이트 실패:", error)
        }

        setGameStats((prev) => ({
          ...prev,
          bonusExperience: comboBonus,
          earnedExperience: prev.earnedExperience + comboBonus,
        }))
      }
    }

    void finalizeGame()
  }, [
    gameEnded,
    user,
    hasUpdatedStats,
    questions.length,
    config.gameType,
    gameStats.comboStreak,
    gameStats.bonusExperience,
    updateUserExperience,
  ])

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
  }
}
