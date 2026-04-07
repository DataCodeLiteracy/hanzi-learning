"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import { ApiClient } from "@/lib/apiClient"
import LoadingSpinner from "@/components/LoadingSpinner"
import { ArrowLeft, Timer } from "lucide-react"
import Link from "next/link"
import { calculateMemoryGameExperience } from "@/lib/experienceSystem"
import { useTimeTracking } from "@/hooks/useTimeTracking"

interface Card {
  id: string
  hanzi: string
  meaning: string
  sound: string
  isFlipped: boolean
  isMatched: boolean
  hanziId: string // 한자 ID 추가
}

export default function MemoryGame() {
  const { user, loading, isAuthenticated, updateUserExperience } = useAuth()
  const { hanziList, isLoading: isDataLoading } = useData()
  const [cards, setCards] = useState<Card[]>([])
  const [flippedCards, setFlippedCards] = useState<number[]>([])
  const [matchedPairs, setMatchedPairs] = useState<number>(0)
  const [gameStarted, setGameStarted] = useState<boolean>(false)
  const [gameEnded, setGameEnded] = useState<boolean>(false)
  const [showPreview, setShowPreview] = useState<boolean>(true)
  const [timeLeft, setTimeLeft] = useState<number>(10)
  const [totalTime, setTotalTime] = useState<number>(0)
  const [currentGrade, setCurrentGrade] = useState<number>(
    user?.preferredGrade || 8
  ) // 현재 선택된 급수

  // 통합된 로딩 상태
  const isLoading = loading || isDataLoading || hanziList.length === 0
  const [gridSize, setGridSize] = useState<{ cols: number; rows: number }>({
    cols: 4,
    rows: 4,
  }) // 타일 크기
  const [showGameSettings, setShowGameSettings] = useState<boolean>(true) // 게임 설정 화면
  const [isGeneratingCards, setIsGeneratingCards] = useState<boolean>(false) // 카드 생성 중
  const [gradeError, setGradeError] = useState<string>("") // 급수 오류 메시지
  const [showErrorModal, setShowErrorModal] = useState<boolean>(false) // 오류 모달 표시
  const [isProcessing, setIsProcessing] = useState<boolean>(false) // 카드 처리 중 상태 추가
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
    "easy"
  ) // 난이도
  const [timeLimit, setTimeLimit] = useState<number>(0) // 시간 제한
  const [remainingTime, setRemainingTime] = useState<number>(0) // 남은 시간
  const [flipLimit, setFlipLimit] = useState<number>(0) // 뒤집기 횟수 제한
  const [remainingFlips, setRemainingFlips] = useState<number>(0) // 남은 뒤집기 횟수
  const [showModal, setShowModal] = useState<boolean>(false) // 모달 표시
  const [modalHanzi, setModalHanzi] = useState<{
    hanzi: string
    meaning: string
    sound: string
  } | null>(null) // 모달에 표시할 한자
  const [isPaused, setIsPaused] = useState<boolean>(false) // 게임 일시정지 상태
  const [isLoadingGrade, setIsLoadingGrade] = useState<boolean>(false) // 급수 로딩 상태
  const [earnedExperience, setEarnedExperience] = useState<number>(0) // 획득한 경험치
  const [hasUpdatedStats, setHasUpdatedStats] = useState<boolean>(false) // 게임 완료 후 통계 업데이트 여부
  const [isLargeScreen, setIsLargeScreen] = useState(false) // 390px 이상 화면 여부

  // 시간 추적 훅
  const { startSession, endSession, isActive, currentDuration, formatTime } =
    useTimeTracking({
      userId: user?.id || "",
      type: "game",
      activity: "memory",
      autoStart: false,
      autoEnd: true,
    })

  // 8급 데이터 기본 로딩 (컴포넌트 마운트 시)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const grade8Data = await ApiClient.getHanziByGrade(8)
        // 8급 데이터가 있는지 확인하고 초기 설정
        if (grade8Data.length === 0) {
          setGradeError("8급에 데이터가 없습니다.")
          setShowErrorModal(true)
        }
      } catch (error) {
        console.error(
          "초기 데이터 로드 실패:",
          error instanceof Error ? error.message : String(error)
        )
      }
    }

    loadInitialData()
  }, [])

  // 화면 크기 감지
  useEffect(() => {
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= 390)
    }

    checkScreenSize()
    window.addEventListener("resize", checkScreenSize)

    return () => window.removeEventListener("resize", checkScreenSize)
  }, [])

  // 급수 변경 핸들러
  const handleGradeChange = useCallback(
    async (grade: number) => {
      if (grade === currentGrade) return // 같은 급수면 불필요한 호출 방지

      setCurrentGrade(grade)
      setIsLoadingGrade(true)

      try {
        const gradeData = await ApiClient.getHanziByGrade(grade)

        if (gradeData.length === 0) {
          setGradeError(
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
          setShowErrorModal(true)
        } else {
          setGradeError("")
          setShowErrorModal(false)
        }
      } catch (error) {
        console.error(
          "급수 데이터 로드 실패:",
          error instanceof Error ? error.message : String(error)
        )
        setGradeError("데이터 로드 중 오류가 발생했습니다.")
        setShowErrorModal(true)
      } finally {
        setIsLoadingGrade(false)
      }
    },
    [currentGrade]
  )

  // 사용자 정보 로드 후 선호 급수 반영
  useEffect(() => {
    if (user?.preferredGrade && user.preferredGrade !== currentGrade) {
      setCurrentGrade(user.preferredGrade)
      handleGradeChange(user.preferredGrade)
    }
  }, [user, currentGrade, handleGradeChange])

  // 프리뷰 시간 계산 함수
  const getPreviewTime = useCallback(() => {
    const totalPairs = Math.floor((gridSize.cols * gridSize.rows) / 2)

    switch (difficulty) {
      case "easy":
        // 쉬움: 타일 수에 따라 차등
        if (totalPairs <= 8) return 10 // 4x4: 10초
        else if (totalPairs <= 12) return 15 // 4x6, 5x5: 15초
        else return 20 // 5x6: 20초
      case "medium":
        // 중간: 쉬움의 70%
        if (totalPairs <= 8) return 7
        else if (totalPairs <= 12) return 10
        else return 14
      case "hard":
        // 어려움: 쉬움의 50%
        if (totalPairs <= 8) return 5
        else if (totalPairs <= 12) return 7
        else return 10
      default:
        return 10
    }
  }, [gridSize, difficulty])

  // 난이도 정보 가져오기 함수
  const getDifficultyInfo = (level: "easy" | "medium" | "hard") => {
    const totalPairs = (gridSize.cols * gridSize.rows) / 2

    switch (level) {
      case "easy":
        return {
          label: "쉬움",
          desc: "무제한 시간 & 횟수",
          color: "text-green-600",
        }
      case "medium":
        let mediumTime = "5분"
        if (totalPairs > 8)
          mediumTime =
            totalPairs <= 12 ? "7분" : totalPairs <= 14 ? "8분" : "10분"
        return {
          label: "중간",
          desc: `${mediumTime} & 적당한 횟수`,
          color: "text-yellow-600",
        }
      case "hard":
        let hardTime = "3분"
        if (totalPairs > 8)
          hardTime = totalPairs <= 12 ? "4분" : totalPairs <= 14 ? "5분" : "6분"
        return {
          label: "어려움",
          desc: `${hardTime} & 제한적 횟수`,
          color: "text-red-600",
        }
    }
  }

  // 난이도 설정 함수
  const setDifficultySettings = useCallback(
    (difficultyLevel: "easy" | "medium" | "hard") => {
      const totalPairs = (gridSize.cols * gridSize.rows) / 2

      switch (difficultyLevel) {
        case "easy":
          setTimeLimit(0) // 무제한
          setFlipLimit(0) // 무제한
          setRemainingTime(0) // 무제한
          setRemainingFlips(0) // 무제한
          break
        case "medium":
          // 타일 수에 따라 시간과 횟수 조정
          if (totalPairs <= 6) {
            setTimeLimit(180) // 3x4: 3분
            setFlipLimit(totalPairs * 3)
            setRemainingTime(180)
            setRemainingFlips(totalPairs * 3)
          } else if (totalPairs <= 8) {
            setTimeLimit(300) // 4x4: 5분
            setFlipLimit(totalPairs * 3)
            setRemainingTime(300)
            setRemainingFlips(totalPairs * 3)
          } else if (totalPairs <= 12) {
            setTimeLimit(420) // 4x6: 7분
            setFlipLimit(totalPairs * 3)
            setRemainingTime(420)
            setRemainingFlips(totalPairs * 3)
          } else if (totalPairs <= 14) {
            setTimeLimit(480) // 4x7: 8분
            setFlipLimit(totalPairs * 3)
            setRemainingTime(480)
            setRemainingFlips(totalPairs * 3)
          } else {
            setTimeLimit(600) // 5x6: 10분
            setFlipLimit(totalPairs * 3)
            setRemainingTime(600)
            setRemainingFlips(totalPairs * 3)
          }
          break
        case "hard":
          // 타일 수에 따라 시간과 횟수 조정
          if (totalPairs <= 6) {
            setTimeLimit(120) // 3x4: 2분
            setFlipLimit(totalPairs * 2)
            setRemainingTime(120)
            setRemainingFlips(totalPairs * 2)
          } else if (totalPairs <= 8) {
            setTimeLimit(180) // 4x4: 3분
            setFlipLimit(totalPairs * 2)
            setRemainingTime(180)
            setRemainingFlips(totalPairs * 2)
          } else if (totalPairs <= 12) {
            setTimeLimit(240) // 4x6: 4분
            setFlipLimit(totalPairs * 2)
            setRemainingTime(240)
            setRemainingFlips(totalPairs * 2)
          } else if (totalPairs <= 14) {
            setTimeLimit(300) // 4x7: 5분
            setFlipLimit(totalPairs * 2)
            setRemainingTime(300)
            setRemainingFlips(totalPairs * 2)
          } else {
            setTimeLimit(360) // 5x6: 6분
            setFlipLimit(totalPairs * 2)
            setRemainingTime(360)
            setRemainingFlips(totalPairs * 2)
          }
          break
      }
    },
    [gridSize]
  )

  // 게임 초기화 함수 정의
  const initializeGame = useCallback(async () => {
    setIsGeneratingCards(true)
    setGradeError("")

    // 선택된 등급의 한자들 중에서 필요한 개수만큼 랜덤하게 선택
    const gradeHanzi = hanziList

    // 해당 급수에 데이터가 없는지 확인
    if (gradeHanzi.length === 0) {
      setGradeError(
        `선택한 급수(${
          currentGrade === 5.5
            ? "준5급"
            : currentGrade === 4.5
            ? "준4급"
            : currentGrade === 3.5
            ? "준3급"
            : `${currentGrade}급`
        })에 데이터가 없습니다.`
      )
      setIsGeneratingCards(false)
      setShowErrorModal(true)
      // 오류 발생 시 게임 상태 초기화
      setCards([])
      setFlippedCards([])
      setMatchedPairs(0)
      setGameStarted(false)
      setGameEnded(false)
      setShowPreview(false)
      setTimeLeft(0)
      setTotalTime(0)
      setIsProcessing(false)
      return
    }

    const totalPairs = (gridSize.cols * gridSize.rows) / 2

    // 필요한 개수보다 적은 경우 경고
    if (gradeHanzi.length < totalPairs) {
      setGradeError(
        `선택한 급수에 ${totalPairs}개보다 적은 한자가 있습니다. (${gradeHanzi.length}개)`
      )
      setIsGeneratingCards(false)
      setShowErrorModal(true)
      // 오류 발생 시 게임 상태 초기화
      setCards([])
      setFlippedCards([])
      setMatchedPairs(0)
      setGameStarted(false)
      setGameEnded(false)
      setShowPreview(false)
      setTimeLeft(0)
      setTotalTime(0)
      setIsProcessing(false)
      return
    }

    try {
      // 카드 뒤집기용 한자 선택 (모든 한자 사용, 학습 완료된 한자도 포함)
      const allGradeHanzi = await ApiClient.getHanziByGrade(currentGrade)

      // 필요한 개수만큼 한자 선택 (랜덤하게 섞기)
      const shuffledHanzi = allGradeHanzi.sort(() => Math.random() - 0.5)
      const selectedHanzi = shuffledHanzi.slice(0, totalPairs)

      // 각 한자를 2개씩 만들어서 카드 배열 생성
      const cardPairs = selectedHanzi.flatMap((hanzi) => [
        {
          id: `${hanzi.id}-1`,
          hanzi: hanzi.character,
          meaning: hanzi.meaning,
          sound: hanzi.sound || hanzi.pinyin || "",
          isFlipped: false,
          isMatched: false,
          hanziId: hanzi.id,
        },
        {
          id: `${hanzi.id}-2`,
          hanzi: hanzi.character,
          meaning: hanzi.meaning,
          sound: hanzi.sound || hanzi.pinyin || "",
          isFlipped: false,
          isMatched: false,
          hanziId: hanzi.id,
        },
      ])

      // 카드를 랜덤하게 섞기
      const shuffledCards = cardPairs.sort(() => Math.random() - 0.5)

      setTimeout(() => {
        setCards(shuffledCards)
        setFlippedCards([])
        setMatchedPairs(0)
        setGameStarted(false)
        setGameEnded(false)
        setShowPreview(true)
        setTimeLeft(getPreviewTime())
        setTotalTime(getPreviewTime())
        setIsGeneratingCards(false)
        setIsProcessing(false)
      }, 1000)
    } catch (error) {
      console.error(
        "게임 초기화 실패:",
        error instanceof Error ? error.message : String(error)
      )
      setIsGeneratingCards(false)
      setGradeError("게임 초기화 중 오류가 발생했습니다.")
      setShowErrorModal(true)
    }
  }, [
    hanziList,
    currentGrade,
    gridSize,
    getPreviewTime,
    setGradeError,
    setShowErrorModal,
    setCards,
    setFlippedCards,
    setMatchedPairs,
    setGameStarted,
    setGameEnded,
    setShowPreview,
    setTimeLeft,
    setTotalTime,
    setIsGeneratingCards,
    setIsProcessing,
  ])

  // 게임 초기화
  useEffect(() => {
    // 게임 완료 후에는 절대 초기화하지 않음
    if (
      currentGrade > 0 &&
      !showGameSettings &&
      !gameEnded &&
      !hasUpdatedStats
    ) {
      initializeGame()
    }
  }, [
    currentGrade,
    gridSize,
    showGameSettings,
    gameEnded,
    hasUpdatedStats,
    initializeGame,
  ])

  // 타일 크기 변경 시 난이도 설정 재적용
  useEffect(() => {
    if (!showGameSettings) {
      setDifficultySettings(difficulty)
    }
  }, [gridSize, difficulty, showGameSettings, setDifficultySettings])

  // 타일 크기나 난이도 변경 시 프리뷰 시간 업데이트
  useEffect(() => {
    if (showGameSettings && getPreviewTime) {
      setTimeLeft(getPreviewTime())
    }
  }, [gridSize, difficulty, showGameSettings, getPreviewTime])

  // 프리뷰 타이머
  useEffect(() => {
    if (showPreview && timeLeft > 0 && !showGameSettings) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0) {
      setShowPreview(false)
      setGameStarted(true)
      // 모든 카드를 뒤집기
      setCards((prev) => prev.map((card) => ({ ...card, isFlipped: false })))
    }
  }, [showPreview, timeLeft, showGameSettings])

  // 게임 타이머
  useEffect(() => {
    if (
      gameStarted &&
      !gameEnded &&
      !isPaused &&
      timeLimit > 0 &&
      remainingTime > 0
    ) {
      const timer = setInterval(() => {
        setTotalTime((prev) => prev + 1)
        setRemainingTime((prev) => {
          if (prev <= 1) {
            setGameEnded(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [gameStarted, gameEnded, isPaused, timeLimit, remainingTime])

  // 횟수 제한 체크
  useEffect(() => {
    if (
      gameStarted &&
      !gameEnded &&
      flipLimit > 0 &&
      remainingFlips <= 0 &&
      remainingFlips !== flipLimit
    ) {
      setGameEnded(true)
    }
  }, [gameStarted, gameEnded, flipLimit, remainingFlips])

  // 게임 종료 처리
  useEffect(() => {
    const totalPairs = (gridSize.cols * gridSize.rows) / 2

    console.log(`🔍 게임 상태 체크:`, {
      gameStarted,
      gameEnded,
      cardsLength: cards.length,
      matchedPairs,
      totalPairs,
      condition: matchedPairs === totalPairs,
    })

    if (
      gameStarted && // 게임이 시작되었고
      !gameEnded && // 아직 끝나지 않았고
      cards.length > 0 && // 카드가 존재하고
      matchedPairs === totalPairs // 모든 쌍을 완성했을 때
    ) {
      console.log(`🎯 게임 완료 조건 충족! 게임 종료 처리 시작`)
      setGameEnded(true)

      // 난이도와 카드 수에 따른 경험치 계산
      const experience = calculateMemoryGameExperience(
        difficulty,
        Math.floor(totalPairs)
      )
      console.log(
        `💰 경험치 계산: 난이도=${difficulty}, 쌍수=${totalPairs}, 경험치=${experience}`
      )
      setEarnedExperience(experience) // 획득한 경험치 상태 업데이트

      // 사용자 경험치 업데이트
      if (user) {
        const updateStats = async () => {
          try {
            console.log(`🎮 카드 뒤집기 완료! 획득 경험치: ${experience}EXP`)

            // 게임 완료 시 난이도와 카드 수에 따른 경험치 지급
            await updateUserExperience(experience)

            // 오늘 경험치 업데이트
            await ApiClient.updateTodayExperience(user.id, experience)
            console.log(`📅 오늘 경험치 업데이트: +${experience}EXP`)

            // 게임 통계 업데이트
            await ApiClient.updateGameStatisticsNew(user.id, "memory", {
              totalPlayed: 1,
              correctAnswers: matchedPairs, // 매칭된 쌍의 수
              wrongAnswers: 0, // 카드 뒤집기는 오답 개념이 없음
              completedSessions: 1, // 세션 1회 완료
            })

            // 게임 완료 시 시간 추적 종료
            endSession()

            console.log("✅ 카드 뒤집기 통계 업데이트 완료")
          } catch (error) {
            console.error(
              "경험치 저장 실패:",
              error instanceof Error ? error.message : String(error)
            )
          }
        }

        updateStats()
        setHasUpdatedStats(true) // 통계 업데이트 후 플래그 설정
      }
    }
  }, [
    matchedPairs,
    gameEnded,
    gameStarted,
    cards.length,
    gridSize,
    user,
    updateUserExperience,
    difficulty,
    hasUpdatedStats,
    endSession,
  ])

  // 게임 시작 처리
  const handleStartGame = () => {
    setShowGameSettings(false)
    // 게임 시작 시 시간 추적 시작
    if (user) {
      startSession().catch((error) => {
        console.error(
          "시간 추적 시작 실패:",
          error instanceof Error ? error.message : String(error)
        )
      })
    }
  }

  // 게임 설정으로 돌아가기
  const handleBackToSettings = () => {
    console.log(`🔄 게임 설정으로 돌아가기 - 모든 상태 리셋`)

    // 게임 중단 시 시간 추적 종료
    if (isActive) {
      const sessionDuration = endSession()
      console.log(
        `🚪 카드 뒤집기 게임 중단: ${sessionDuration}초 학습 시간 저장됨`
      )
      console.log(`📊 현재 활성 세션 상태: ${isActive ? "활성" : "비활성"}`)
    }

    setShowGameSettings(true)
    setCards([])
    setFlippedCards([])
    setMatchedPairs(0)
    setGameStarted(false)
    setGameEnded(false)
    setShowPreview(true)
    setTimeLeft(getPreviewTime())
    setTotalTime(0)
    setGradeError("")
    setShowErrorModal(false)
    setIsProcessing(false) // 처리 중 상태 리셋
    setEarnedExperience(0) // 획득한 경험치 리셋
    setHasUpdatedStats(false) // 통계 업데이트 플래그 리셋
  }

  // 매칭 성공 시 한자별 통계만 업데이트 (경험치는 게임 완료 시에만)
  const updateMatchedHanziStats = async (matchedCards: Card[]) => {
    if (!user) return
    try {
      // 경험치는 게임 완료 시에만 지급하므로 여기서는 제거
      // await updateUserExperience(experience) // 제거됨

      // 매칭된 카드들의 한자 통계만 업데이트
      for (const card of matchedCards) {
        if (card.hanziId) {
          await ApiClient.updateHanziStatisticsNew(
            user.id,
            card.hanziId,
            "memory",
            true // 매칭 성공이므로 true
          )
        }
      }
    } catch (error) {
      console.error(
        "한자 통계 업데이트 실패:",
        error instanceof Error ? error.message : String(error)
      )
    }
  }

  // 카드 크기 계산 함수
  const getCardSize = () => {
    const baseSize = isLargeScreen ? 80 : 70

    if (gridSize.cols === 3) {
      return isLargeScreen ? 90 : 85 // 3x4는 카드가 적으므로 더 크게
    } else if (gridSize.cols === 4) {
      return baseSize
    } else if (gridSize.cols === 5) {
      return isLargeScreen ? 70 : 65 // 390px에서는 70px, 375px에서는 65px
    } else {
      return isLargeScreen ? 65 : 60 // 6x6 등 더 큰 그리드
    }
  }

  // 컨테이너 최대 너비 계산 함수
  const getContainerMaxWidth = () => {
    if (gridSize.cols === 3) {
      return isLargeScreen ? "320px" : "300px" // 3x4는 3열이므로 더 좁게
    } else if (gridSize.cols === 4) {
      return isLargeScreen ? "390px" : "375px"
    } else if (gridSize.cols === 5) {
      return isLargeScreen ? "400px" : "380px" // 5x6는 5열이므로 더 넓게
    } else {
      return isLargeScreen ? "420px" : "400px" // 6x6 등 더 큰 그리드
    }
  }

  // 로딩 중일 때는 로딩 스피너 표시
  if (isLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='데이터를 불러오는 중...' />
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

  // 카드 클릭 처리
  const handleCardClick = (index: number) => {
    if (
      !gameStarted ||
      gameEnded ||
      cards[index].isFlipped ||
      cards[index].isMatched ||
      isProcessing || // 처리 중일 때 클릭 방지
      (flipLimit > 0 && remainingFlips <= 0) // 횟수 제한 체크
    ) {
      return
    }

    setIsProcessing(true) // 처리 시작

    const newCards = [...cards]
    newCards[index].isFlipped = true
    setCards(newCards)

    const newFlippedCards = [...flippedCards, index]
    setFlippedCards(newFlippedCards)

    if (newFlippedCards.length === 2) {
      // 두 번째 카드를 뒤집을 때만 횟수 차감
      if (flipLimit > 0) {
        setRemainingFlips((prev) => prev - 1)
      }

      const [firstIndex, secondIndex] = newFlippedCards
      const firstCard = newCards[firstIndex]
      const secondCard = newCards[secondIndex]

      if (firstCard.hanzi === secondCard.hanzi) {
        // 매칭 성공
        newCards[firstIndex].isMatched = true
        newCards[secondIndex].isMatched = true
        setCards(newCards)
        setMatchedPairs((prev) => prev + 1)
        updateMatchedHanziStats([firstCard, secondCard]) // 매칭된 카드들 전달

        // 매칭 성공 모달 표시
        setIsPaused(true) // 게임 일시정지
        setModalHanzi({
          hanzi: firstCard.hanzi,
          meaning: firstCard.meaning,
          sound: firstCard.sound,
        })
        setShowModal(true)

        // 2초 후 모달 닫기
        setTimeout(() => {
          setShowModal(false)
          setIsPaused(false) // 게임 재개
        }, 2000)

        setFlippedCards([])
        setIsProcessing(false) // 처리 완료
      } else {
        // 매칭 실패 - 카드만 다시 뒤집기
        setTimeout(() => {
          newCards[firstIndex].isFlipped = false
          newCards[secondIndex].isFlipped = false
          setCards(newCards)
          setFlippedCards([])
          setIsProcessing(false) // 처리 완료
        }, 1000)
      }
    } else {
      // 첫 번째 카드만 뒤집힌 경우
      setIsProcessing(false) // 처리 완료
    }
  }

  // 설정 화면 (헤더 없이 독립적으로)
  if (showGameSettings) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 pt-6'>
        {/* 뒤로가기 버튼 */}
        <div className='max-w-md mx-auto mb-4'>
          <Link
            href='/'
            className='inline-flex items-center font-medium transition-all no-underline'
            style={{ color: "#111827", textDecoration: "none" }}
          >
            <svg
              className='w-5 h-5 mr-2'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
              style={{ color: "#111827" }}
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M10 19l-7-7m0 0l7-7m-7 7h18'
              />
            </svg>
            <span style={{ color: "#111827" }}>메인으로 돌아가기</span>
          </Link>
        </div>
        <div className='max-w-md mx-auto bg-white rounded-xl shadow-2xl p-8'>
          <h2 className='text-3xl font-bold text-center mb-8 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent'>
            카드 뒤집기 설정
          </h2>

          {/* 학습 중인 급수 표시 */}
          <div className='mb-6'>
            <div className='flex items-center justify-between mb-2'>
              <label className='block text-sm font-semibold text-gray-700'>
                학습 중인 급수
              </label>
              <Link
                href='/profile#study-goal'
                className='text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors'
              >
                급수 변경 →
              </Link>
            </div>
            <div className='relative'>
              <div className='block w-full px-4 py-3 text-base font-medium text-gray-900 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl shadow-inner'>
                {currentGrade === 5.5
                  ? "준5급"
                  : currentGrade === 4.5
                  ? "준4급"
                  : currentGrade === 3.5
                  ? "준3급"
                  : `${currentGrade}급`}
                {hanziList.length > 0 && (
                  <span className='ml-2 text-sm text-blue-600 font-semibold'>
                    ({hanziList.length}개)
                  </span>
                )}
              </div>
            </div>

            {gradeError && !isLoadingGrade && (
              <p className='mt-2 text-sm text-red-600 font-medium'>
                {gradeError}
              </p>
            )}
          </div>

          {/* 난이도 선택 */}
          <div className='mb-6'>
            <label className='block text-sm font-semibold text-gray-700 mb-2'>
              난이도 선택
            </label>
            <div className='grid grid-cols-3 gap-2'>
              {[
                { value: "easy", level: "easy" as const },
                { value: "medium", level: "medium" as const },
                { value: "hard", level: "hard" as const },
              ].map(({ value, level }) => {
                const info = getDifficultyInfo(level)
                return (
                  <button
                    key={value}
                    onClick={() => setDifficulty(level)}
                    className={`p-3 rounded-lg border-2 transition-colors text-center ${
                      difficulty === level
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-300 hover:border-blue-300 text-gray-700 hover:text-blue-700"
                    }`}
                  >
                    <div className={`text-sm font-semibold ${info.color}`}>
                      {info.label}
                    </div>
                    <div className='text-xs text-gray-500 mt-1'>
                      {info.desc}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 타일 크기 선택 */}
          <div className='mb-6'>
            <label className='text-sm font-medium text-gray-700 mb-2'>
              타일 크기
            </label>
            <div className='grid grid-cols-2 gap-2'>
              {[
                { cols: 3, rows: 4, label: "3 x 4 (6쌍)" },
                { cols: 4, rows: 4, label: "4 x 4 (8쌍)" },
                { cols: 4, rows: 5, label: "4 x 5 (10쌍)" },
                { cols: 4, rows: 6, label: "4 x 6 (12쌍)" },
                { cols: 4, rows: 7, label: "4 x 7 (14쌍)" },
                { cols: 5, rows: 6, label: "5 x 6 (15쌍)" },
              ].map((size) => {
                const totalPairs = Math.floor((size.cols * size.rows) / 2)
                const mediumTime =
                  totalPairs <= 6
                    ? "3분"
                    : totalPairs <= 8
                    ? "5분"
                    : totalPairs <= 12
                    ? "7분"
                    : totalPairs <= 14
                    ? "8분"
                    : "10분"
                const hardTime =
                  totalPairs <= 6
                    ? "2분"
                    : totalPairs <= 8
                    ? "3분"
                    : totalPairs <= 12
                    ? "4분"
                    : totalPairs <= 14
                    ? "5분"
                    : "6분"

                return (
                  <button
                    key={`${size.cols}x${size.rows}`}
                    onClick={() => setGridSize(size)}
                    className={`p-3 rounded-lg border-2 transition-colors font-medium ${
                      gridSize.cols === size.cols && gridSize.rows === size.rows
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-300 hover:border-blue-300 text-gray-700 hover:text-blue-700"
                    }`}
                  >
                    <div className='text-sm font-semibold'>{size.label}</div>
                    <div className='text-xs text-gray-500 mt-1'>
                      중간: {mediumTime} | 어려움: {hardTime}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <button
            onClick={handleStartGame}
            className='w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-bold py-4 px-6 rounded-xl shadow-lg hover:from-blue-700 hover:to-indigo-700 transform hover:scale-[1.02] transition-all duration-200'
          >
            시작하기
          </button>
        </div>

        {/* 오류 모달 */}
        {showErrorModal && (
          <div className='fixed inset-0 bg-black/70 flex items-center justify-center z-50'>
            <div className='bg-white rounded-lg p-6 max-w-md mx-4'>
              <div className='text-center'>
                <div className='text-red-500 text-4xl mb-4'>⚠️</div>
                <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                  데이터 부족
                </h3>
                <p className='text-gray-600 mb-6'>{gradeError}</p>
                <button
                  onClick={() => setShowErrorModal(false)}
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

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      {/* 헤더 */}
      <header className='fixed top-0 left-0 right-0 bg-white shadow-sm z-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-3'>
            <div className='flex items-center space-x-4'>
              <Link href='/' className='text-blue-600 hover:text-blue-700'>
                <ArrowLeft className='h-5 w-5' />
              </Link>
              <h1 className='text-xl font-bold text-gray-900'>카드 뒤집기</h1>
            </div>
            <div className='flex items-center space-x-6'>
              <div className='text-center'>
                <div className='text-sm text-gray-600'>매칭</div>
                <div className='text-lg font-bold text-green-600'>
                  {matchedPairs}/{(gridSize.cols * gridSize.rows) / 2}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className='max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 py-8 pt-16'>
        {/* 카드 생성 중 로딩 */}
        {isGeneratingCards && (
          <div className='text-center py-8'>
            <LoadingSpinner message='카드를 생성하는 중...' />
          </div>
        )}

        {/* 프리뷰 화면 */}
        {!showGameSettings &&
          !isGeneratingCards &&
          showPreview &&
          cards.length > 0 && (
            <div className='text-center py-8'>
              <div className='mb-8'>
                <Timer className='h-16 w-16 text-blue-600 mx-auto mb-4' />
                <h2 className='text-3xl font-bold text-gray-900 mb-4'>
                  카드를 기억하세요!
                </h2>
                <p className='text-xl text-gray-600 mb-4'>
                  {timeLeft}초 후 카드가 뒤집어집니다
                </p>
                <div className='text-sm text-gray-500'>
                  {difficulty === "easy"
                    ? "쉬움"
                    : difficulty === "medium"
                    ? "중간"
                    : "어려움"}{" "}
                  모드 • {gridSize.cols} x {gridSize.rows} 타일
                </div>
              </div>

              {/* 카드 프리뷰 */}
              <div
                className={`flex flex-wrap max-w-6xl mx-auto justify-center`}
                style={{
                  width: "100%",
                  maxWidth: getContainerMaxWidth(),
                  margin: "0 auto",
                  gap: `${
                    gridSize.cols === 3
                      ? "10px"
                      : gridSize.cols === 4
                      ? "8px"
                      : "6px"
                  }`, // 3x4는 10px, 4x4는 8px, 5x6는 6px
                }}
              >
                {cards.map((card) => (
                  <div
                    key={card.id}
                    className='bg-white rounded-lg shadow-md text-center border-2 border-blue-200 flex flex-col justify-center card-hover flex-shrink-0'
                    style={{
                      width: getCardSize(),
                      height: getCardSize(),
                      flex: `0 0 ${getCardSize()}px`,
                    }}
                  >
                    <div className='text-lg font-bold text-gray-900 leading-none'>
                      {card.hanzi}
                    </div>
                    <div className='text-xs text-gray-600 leading-tight mt-1'>
                      {card.meaning}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* 게임 화면 */}
        {!showGameSettings &&
          !isGeneratingCards &&
          !showPreview &&
          !gameEnded &&
          cards.length > 0 && (
            <div className='space-y-6'>
              {/* 타이머와 횟수 표시 */}
              {(timeLimit > 0 || flipLimit > 0) && (
                <div className='bg-white rounded-lg shadow-sm p-4'>
                  <div className='flex flex-wrap items-center justify-center gap-6'>
                    {timeLimit > 0 && (
                      <div className='flex items-center space-x-3'>
                        <div className='text-sm font-semibold text-gray-700'>
                          남은 시간:
                        </div>
                        <div className='w-32 bg-gray-200 rounded-full h-3'>
                          <div
                            className='bg-blue-600 h-3 rounded-full timer-bar transition-all duration-1000'
                            style={{
                              width: `${Math.max(
                                0,
                                (remainingTime / timeLimit) * 100
                              )}%`,
                            }}
                          ></div>
                        </div>
                        <div className='text-lg font-bold text-gray-900'>
                          {Math.floor(remainingTime / 60)}:
                          {(remainingTime % 60).toString().padStart(2, "0")}
                        </div>
                      </div>
                    )}
                    {flipLimit > 0 && (
                      <div className='flex items-center space-x-3'>
                        <div className='text-sm font-semibold text-gray-700'>
                          남은 횟수:
                        </div>
                        <div className='text-lg font-bold text-gray-900'>
                          {remainingFlips}/{flipLimit}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className='text-center'>
                <h2 className='text-2xl font-bold text-gray-900 mb-2'>
                  같은 한자를 찾아보세요!
                </h2>
                <p className='text-gray-600'>
                  매칭된 쌍: {matchedPairs}/
                  {(gridSize.cols * gridSize.rows) / 2}
                </p>
                {isActive && (
                  <p className='text-sm text-blue-600 mt-2'>
                    학습 시간: {formatTime(currentDuration)}
                  </p>
                )}
              </div>

              <div
                className={`flex flex-wrap max-w-6xl mx-auto justify-center`}
                style={{
                  width: "100%",
                  maxWidth: getContainerMaxWidth(),
                  margin: "0 auto",
                  gap: `${
                    gridSize.cols === 3
                      ? "10px"
                      : gridSize.cols === 4
                      ? "8px"
                      : "6px"
                  }`, // 3x4는 10px, 4x4는 8px, 5x6는 6px
                }}
              >
                {cards.map((card, index) => (
                  <button
                    key={card.id}
                    onClick={() => handleCardClick(index)}
                    disabled={card.isMatched}
                    className={`
                    rounded-lg shadow-md transition-all duration-300 transform
                    card-hover perspective-1000 flex-shrink-0
                    ${
                      card.isMatched
                        ? "border-green-500 bg-green-100"
                        : card.isFlipped
                        ? "border-blue-500 bg-white"
                        : "border-blue-600 bg-blue-500 hover:bg-blue-600"
                    }
                    ${card.isMatched ? "cursor-default" : "cursor-pointer"}
                    ${card.isFlipped ? "animate-flip" : ""}
                  `}
                    style={{
                      width: getCardSize(),
                      height: getCardSize(),
                      flex: `0 0 ${getCardSize()}px`,
                    }}
                  >
                    <div className='relative w-full h-full transform-style-preserve-3d'>
                      {/* 카드 뒷면 (물음표) */}
                      <div
                        className={`
                        absolute inset-0 flex items-center justify-center
                        ${card.isFlipped ? "opacity-0" : "opacity-100"}
                        transition-opacity duration-300
                      `}
                      >
                        <div className='text-xl text-white font-bold'>?</div>
                      </div>

                      {/* 카드 앞면 (한자 정보) */}
                      <div
                        className={`
                        absolute inset-0 flex flex-col items-center justify-center
                        ${card.isFlipped ? "opacity-100" : "opacity-0"}
                        transition-opacity duration-300
                      `}
                      >
                        <div className='text-lg font-bold text-gray-900 leading-none'>
                          {card.hanzi}
                        </div>
                        <div className='text-xs text-gray-600 text-center leading-tight mt-1'>
                          {card.meaning}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

        {/* 게임 종료 화면 */}
        {gameEnded && (
          <div className='bg-white rounded-lg shadow-lg p-8'>
            <div className='text-center mb-6'>
              <div className='text-4xl mb-3'>🎉</div>
              <h2 className='text-2xl font-bold text-gray-900 mb-2'>
                카드 뒤집기 완료!
              </h2>
              <p className='text-lg text-green-600 font-medium'>
                모든 쌍을 매칭했습니다! 🎊
              </p>
            </div>

            {/* 게임 결과 요약 */}
            <div className='grid grid-cols-2 gap-4 mb-6'>
              <div className='bg-green-50 rounded-lg p-4 text-center'>
                <div className='text-2xl font-bold text-green-600 mb-1'>
                  {matchedPairs}
                </div>
                <div className='text-sm text-gray-600'>매칭 완료</div>
                <div className='text-xs text-gray-500 mt-1'>
                  /{(gridSize.cols * gridSize.rows) / 2}쌍
                </div>
              </div>
              <div className='bg-purple-50 rounded-lg p-4 text-center'>
                <div className='text-2xl font-bold text-purple-600 mb-1'>
                  +{earnedExperience}
                </div>
                <div className='text-sm text-gray-600'>획득 경험치</div>
              </div>
            </div>

            {/* 경험치 상세 */}
            <div className='bg-gray-50 rounded-lg p-6 mb-6'>
              <h3 className='text-lg font-bold text-gray-900 mb-4'>경험치 상세</h3>
              <div className='space-y-3'>
                <div className='flex justify-between items-center'>
                  <span className='text-gray-700'>매칭 완료 ({matchedPairs}쌍)</span>
                  <span className='text-green-600 font-bold text-lg'>
                    +{earnedExperience} EXP
                  </span>
                </div>
                <div className='flex justify-between items-center pt-3 border-t-2 border-gray-300'>
                  <span className='text-gray-900 font-bold text-base'>
                    획득 경험치
                  </span>
                  <span className='text-green-600 font-bold text-lg'>
                    +{earnedExperience} EXP
                  </span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-gray-700 font-medium'>이전 경험치</span>
                  <span className='text-gray-600 font-bold text-xl'>
                    {(user?.experience || 0) - earnedExperience} EXP
                  </span>
                </div>
                <div className='flex justify-between items-center pt-2'>
                  <span className='text-gray-900 font-medium'>최종 경험치</span>
                  <span className='text-blue-600 font-bold text-xl'>
                    {user?.experience || 0} EXP
                  </span>
                </div>
              </div>
            </div>

            {/* 게임 정보 */}
            <div className='bg-blue-50 rounded-lg p-4 mb-6'>
              <h3 className='text-sm font-semibold text-gray-900 mb-3'>게임 정보</h3>
              <div className='grid grid-cols-2 gap-3 text-sm'>
                <div>
                  <span className='text-gray-600'>난이도:</span>{" "}
                  <span className='font-medium text-gray-900'>
                    {difficulty === "easy"
                      ? "쉬움"
                      : difficulty === "medium"
                      ? "중간"
                      : "어려움"}
                  </span>
                </div>
                <div>
                  <span className='text-gray-600'>타일:</span>{" "}
                  <span className='font-medium text-gray-900'>
                    {gridSize.cols} x {gridSize.rows} ({(gridSize.cols * gridSize.rows) / 2}쌍)
                  </span>
                </div>
                <div>
                  <span className='text-gray-600'>소요 시간:</span>{" "}
                  <span className='font-medium text-gray-900'>
                    {Math.floor(totalTime / 60)}분 {totalTime % 60}초
                  </span>
                </div>
                {flipLimit > 0 && (
                  <div>
                    <span className='text-gray-600'>사용한 횟수:</span>{" "}
                    <span className='font-medium text-gray-900'>
                      {flipLimit - remainingFlips}/{flipLimit}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className='flex gap-4'>
              <button
                onClick={handleBackToSettings}
                className='flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium'
              >
                다시 하기
              </button>
              <Link
                href='/'
                className='flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-center'
              >
                홈으로
              </Link>
            </div>
          </div>
        )}

        {/* 한자 모달 */}
        {showModal && modalHanzi && (
          <div className='fixed inset-0 bg-black/70 flex items-center justify-center z-50'>
            <div
              className={`bg-white rounded-lg p-8 max-w-md mx-4 text-center border-4 border-green-500`}
            >
              <div className={`text-6xl font-bold mb-4 text-green-600`}>
                {modalHanzi.hanzi}
              </div>
              <div className='text-xl text-gray-700 mb-2'>
                {modalHanzi.meaning}
              </div>
              <div className='text-lg text-gray-600 mb-4'>
                {modalHanzi.sound}
              </div>
              <div className={`text-lg font-semibold text-green-600`}>
                🎉 정답입니다!
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

