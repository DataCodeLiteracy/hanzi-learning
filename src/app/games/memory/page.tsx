"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import { ApiClient } from "@/lib/apiClient"
import LoadingSpinner from "@/components/LoadingSpinner"
import { Timer, ArrowLeft } from "lucide-react"
import Link from "next/link"
import {
  calculateGameExperience,
  calculateMemoryGameExperience,
} from "@/lib/experienceSystem"

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
  const { hanziList, isLoading: dataLoading } = useData()
  const { user, loading: authLoading, updateUserExperience } = useAuth()
  const [cards, setCards] = useState<Card[]>([])
  const [flippedCards, setFlippedCards] = useState<number[]>([])
  const [matchedPairs, setMatchedPairs] = useState<number>(0)
  const [gameStarted, setGameStarted] = useState<boolean>(false)
  const [gameEnded, setGameEnded] = useState<boolean>(false)
  const [showPreview, setShowPreview] = useState<boolean>(true)
  const [timeLeft, setTimeLeft] = useState<number>(10)
  const [totalTime, setTotalTime] = useState<number>(0)
  const [currentGrade, setCurrentGrade] = useState<number>(8) // 현재 선택된 급수
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
  const [gradeDataStatus, setGradeDataStatus] = useState<{
    [key: number]: boolean
  }>({}) // 각 급수별 데이터 존재 여부

  // 각 급수별 데이터 존재 여부 확인
  const checkGradeDataStatus = async () => {
    const status: { [key: number]: boolean } = {}
    const grades = [8, 7, 6, 5.5, 5, 4.5, 4, 3.5, 3]

    for (const grade of grades) {
      try {
        const data = await ApiClient.getHanziByGrade(grade)
        status[grade] = data.length > 0
      } catch (error) {
        console.error(`${grade}급 데이터 확인 실패:`, error)
        status[grade] = false
      }
    }

    setGradeDataStatus(status)
  }

  // 컴포넌트 마운트 시 데이터 상태 확인
  useEffect(() => {
    checkGradeDataStatus()
  }, [])

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
  const setDifficultySettings = (
    difficultyLevel: "easy" | "medium" | "hard"
  ) => {
    const totalPairs = (gridSize.cols * gridSize.rows) / 2

    switch (difficultyLevel) {
      case "easy":
        setTimeLimit(0) // 무제한
        setFlipLimit(0) // 무제한
        break
      case "medium":
        // 타일 수에 따라 시간과 횟수 조정
        if (totalPairs <= 8) {
          setTimeLimit(300) // 4x4: 5분
          setFlipLimit(totalPairs * 3)
        } else if (totalPairs <= 12) {
          setTimeLimit(420) // 4x6: 7분
          setFlipLimit(totalPairs * 3)
        } else if (totalPairs <= 14) {
          setTimeLimit(480) // 4x7: 8분
          setFlipLimit(totalPairs * 3)
        } else {
          setTimeLimit(600) // 4x8: 10분
          setFlipLimit(totalPairs * 3)
        }
        break
      case "hard":
        // 타일 수에 따라 시간과 횟수 조정
        if (totalPairs <= 8) {
          setTimeLimit(180) // 4x4: 3분
          setFlipLimit(totalPairs * 2)
        } else if (totalPairs <= 12) {
          setTimeLimit(240) // 4x6: 4분
          setFlipLimit(totalPairs * 2)
        } else if (totalPairs <= 14) {
          setTimeLimit(300) // 4x7: 5분
          setFlipLimit(totalPairs * 2)
        } else {
          setTimeLimit(360) // 4x8: 6분
          setFlipLimit(totalPairs * 2)
        }
        break
    }
  }

  // 게임 초기화 함수 정의
  const initializeGame = async () => {
    setIsGeneratingCards(true)
    setGradeError("")

    // 선택된 등급의 한자들 중에서 필요한 개수만큼 랜덤하게 선택
    const gradeHanzi = hanziList.filter((h) => h.grade === currentGrade)

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
      // 우선순위 기반으로 한자 선택
      const selectedHanzi = await ApiClient.getPrioritizedHanzi(
        user!.id,
        currentGrade,
        totalPairs
      )

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
      console.error("게임 초기화 실패:", error)
      setIsGeneratingCards(false)
      setGradeError("게임 초기화 중 오류가 발생했습니다.")
      setShowErrorModal(true)
    }
  }

  // 게임 초기화
  useEffect(() => {
    if (hanziList.length > 0 && !showGameSettings) {
      initializeGame()
    }
  }, [hanziList, currentGrade, gridSize, showGameSettings])

  // 타일 크기 변경 시 난이도 설정 재적용
  useEffect(() => {
    if (!showGameSettings) {
      setDifficultySettings(difficulty)
    }
  }, [gridSize, difficulty, showGameSettings])

  // 타일 크기나 난이도 변경 시 프리뷰 시간 업데이트
  useEffect(() => {
    if (showGameSettings) {
      setTimeLeft(getPreviewTime())
    }
  }, [gridSize, difficulty, showGameSettings])

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
    if (matchedPairs === (gridSize.cols * gridSize.rows) / 2 && !gameEnded) {
      setGameEnded(true)

      // 간단한 경험치 계산: 게임 완료 시 고정 경험치
      const experience = calculateGameExperience("memory")

      // 사용자 경험치 업데이트
      if (user) {
        const updateStats = async () => {
          try {
            // 경험치 추가
            await updateUserExperience(experience)
            console.log(
              `게임 완료! 매칭: ${matchedPairs}, 경험치: ${experience}`
            )

            // 게임 통계 업데이트
            await ApiClient.updateGameStatisticsNew(user.id, "memory", {
              totalPlayed: 1,
              correctAnswers: matchedPairs, // 매칭된 쌍의 수
              wrongAnswers: 0, // 카드 뒤집기는 오답 개념이 없음
            })
            console.log("게임 통계가 업데이트되었습니다.")
          } catch (error) {
            console.error("경험치 저장 실패:", error)
          }
        }

        updateStats()
      }
    }
  }, [matchedPairs, gameEnded, gridSize, user, updateUserExperience])

  // 게임 시작 처리
  const handleStartGame = () => {
    setShowGameSettings(false)
  }

  // 게임 설정으로 돌아가기
  const handleBackToSettings = () => {
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
  }

  // 급수 변경 처리
  const handleGradeChange = async (grade: number) => {
    setCurrentGrade(grade)
    setGradeError("")

    try {
      // 해당 급수의 한자 데이터 확인
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
        // 데이터가 있으면 오류 메시지 제거
        setGradeError("")
        setShowErrorModal(false)
      }
    } catch (error) {
      console.error("급수 데이터 확인 실패:", error)
      setGradeError("데이터 확인 중 오류가 발생했습니다.")
      setShowErrorModal(true)
    }
  }

  // 프리뷰 시간 계산 함수
  const getPreviewTime = () => {
    const totalPairs = (gridSize.cols * gridSize.rows) / 2

    switch (difficulty) {
      case "easy":
        // 쉬움: 타일 수에 따라 차등
        if (totalPairs <= 8) return 10 // 4x4: 10초
        else if (totalPairs <= 12) return 15 // 4x6: 15초
        else if (totalPairs <= 14) return 20 // 4x7: 20초
        else return 30 // 4x8: 30초 (1분의 절반)
      case "medium":
        // 중간: 쉬움의 70%
        if (totalPairs <= 8) return 7
        else if (totalPairs <= 12) return 10
        else if (totalPairs <= 14) return 14
        else return 21
      case "hard":
        // 어려움: 쉬움의 50%
        if (totalPairs <= 8) return 5
        else if (totalPairs <= 12) return 7
        else if (totalPairs <= 14) return 10
        else return 15
      default:
        return 10
    }
  }

  // 매칭 성공 시 경험치 추가 및 한자별 통계 업데이트
  const addMatchExperience = async (matchedCards: Card[]) => {
    if (!user) return
    try {
      const totalPairs = (gridSize.cols * gridSize.rows) / 2
      const experience = calculateMemoryGameExperience(difficulty, totalPairs)
      await updateUserExperience(experience) // 난이도와 카드 수에 따른 경험치 추가 (새로고침 없이)

      // 매칭된 카드들의 한자 통계 업데이트
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
      console.error("경험치 추가 실패:", error)
    }
  }

  // 로딩 중일 때는 로딩 스피너 표시
  if (authLoading || dataLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='게임을 준비하는 중...' />
      </div>
    )
  }

  // 인증이 완료되었지만 사용자가 없을 때
  if (!user) {
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
        addMatchExperience([firstCard, secondCard]) // 매칭된 카드들 전달

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

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      {/* 헤더 */}
      <header className='bg-white shadow-sm'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-4'>
            <div className='flex items-center space-x-4'>
              <Link href='/' className='text-blue-600 hover:text-blue-700'>
                <ArrowLeft className='h-5 w-5' />
              </Link>
              <h1 className='text-2xl font-bold text-gray-900'>카드 뒤집기</h1>
            </div>
            {!showGameSettings && (
              <div className='flex items-center space-x-4'>
                <div className='text-sm text-gray-600'>
                  매칭: {matchedPairs}/{(gridSize.cols * gridSize.rows) / 2}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* 게임 설정 화면 */}
        {showGameSettings && (
          <div className='text-center py-12'>
            <div className='bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto'>
              <h2 className='text-3xl font-bold text-gray-900 mb-6'>
                게임 설정
              </h2>

              {/* 급수 선택 */}
              <div className='mb-6'>
                <label className='block text-sm font-semibold text-gray-700 mb-2'>
                  급수 선택
                </label>
                <select
                  value={currentGrade}
                  onChange={(e) => handleGradeChange(Number(e.target.value))}
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium'
                >
                  {[8, 7, 6, 5.5, 5, 4.5, 4, 3.5, 3].map((grade) => (
                    <option key={grade} value={grade} className='font-medium'>
                      {grade === 5.5
                        ? "준5급"
                        : grade === 4.5
                        ? "준4급"
                        : grade === 3.5
                        ? "준3급"
                        : `${grade}급`}{" "}
                      {gradeDataStatus[grade] === false ? "(데이터 없음)" : ""}
                    </option>
                  ))}
                </select>
                {gradeError && (
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
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  타일 크기
                </label>
                <div className='grid grid-cols-2 gap-2'>
                  {[
                    { cols: 4, rows: 4, label: "4 x 4 (8쌍)" },
                    { cols: 4, rows: 5, label: "4 x 5 (10쌍)" },
                    { cols: 4, rows: 6, label: "4 x 6 (12쌍)" },
                    { cols: 4, rows: 7, label: "4 x 7 (14쌍)" },
                    { cols: 4, rows: 8, label: "4 x 8 (16쌍)" },
                  ].map((size) => {
                    const totalPairs = (size.cols * size.rows) / 2
                    const mediumTime =
                      totalPairs <= 8
                        ? "5분"
                        : totalPairs <= 12
                        ? "7분"
                        : totalPairs <= 14
                        ? "8분"
                        : "10분"
                    const hardTime =
                      totalPairs <= 8
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
                          gridSize.cols === size.cols &&
                          gridSize.rows === size.rows
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-300 hover:border-blue-300 text-gray-700 hover:text-blue-700"
                        }`}
                      >
                        <div className='text-sm font-semibold'>
                          {size.label}
                        </div>
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
                className='w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium'
              >
                게임 시작
              </button>
            </div>
          </div>
        )}

        {/* 카드 생성 중 로딩 */}
        {isGeneratingCards && (
          <div className='text-center py-12'>
            <LoadingSpinner message='카드를 생성하는 중...' />
          </div>
        )}

        {/* 오류 모달 */}
        {showErrorModal && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
            <div className='bg-white rounded-lg p-6 max-w-md mx-4'>
              <div className='text-center'>
                <div className='text-red-500 text-4xl mb-4'>⚠️</div>
                <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                  데이터 부족
                </h3>
                <p className='text-gray-600 mb-6'>{gradeError}</p>
                <button
                  onClick={() => {
                    setShowErrorModal(false)
                    handleBackToSettings()
                  }}
                  className='px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 프리뷰 화면 */}
        {!showGameSettings &&
          !isGeneratingCards &&
          showPreview &&
          cards.length > 0 && (
            <div className='text-center py-12'>
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
                className={`grid gap-2 sm:gap-3 max-w-6xl mx-auto`}
                style={{
                  gridTemplateColumns: `repeat(${gridSize.cols}, 1fr)`,
                  gridTemplateRows: `repeat(${gridSize.rows}, 1fr)`,
                }}
              >
                {cards.map((card) => (
                  <div
                    key={card.id}
                    className='bg-white rounded-lg shadow-md p-2 sm:p-3 text-center border-2 border-blue-200 aspect-square flex flex-col justify-center card-hover'
                  >
                    <div className='text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1'>
                      {card.hanzi}
                    </div>
                    <div className='text-xs sm:text-sm text-gray-600'>
                      {card.meaning} {card.sound}
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
              </div>

              <div
                className={`grid gap-2 sm:gap-3 max-w-6xl mx-auto`}
                style={{
                  gridTemplateColumns: `repeat(${gridSize.cols}, 1fr)`,
                  gridTemplateRows: `repeat(${gridSize.rows}, 1fr)`,
                }}
              >
                {cards.map((card, index) => (
                  <button
                    key={card.id}
                    onClick={() => handleCardClick(index)}
                    disabled={card.isMatched}
                    className={`
                    aspect-square rounded-lg shadow-md transition-all duration-300 transform
                    card-hover perspective-1000
                    ${
                      card.isMatched
                        ? "bg-green-100 border-2 border-green-500"
                        : card.isFlipped
                        ? "bg-white border-2 border-blue-500"
                        : "bg-blue-500 border-2 border-blue-600 hover:bg-blue-600"
                    }
                    ${card.isMatched ? "cursor-default" : "cursor-pointer"}
                    ${card.isFlipped ? "animate-flip" : ""}
                  `}
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
                        <div className='text-lg sm:text-xl md:text-2xl text-white font-bold'>
                          ?
                        </div>
                      </div>

                      {/* 카드 앞면 (한자 정보) */}
                      <div
                        className={`
                        absolute inset-0 flex flex-col items-center justify-center p-2 sm:p-3
                        ${card.isFlipped ? "opacity-100" : "opacity-0"}
                        transition-opacity duration-300
                      `}
                      >
                        <div className='text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1'>
                          {card.hanzi}
                        </div>
                        <div className='text-xs sm:text-sm text-gray-600 text-center'>
                          {card.meaning} {card.sound}
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
          <div className='text-center py-12'>
            <h2 className='text-3xl font-bold text-gray-900 mb-4'>
              게임 완료!
            </h2>
            <div className='space-y-4'>
              <div className='text-xl'>
                <span className='font-semibold'>매칭 완료:</span> {matchedPairs}
                /{(gridSize.cols * gridSize.rows) / 2}쌍
              </div>
              <div className='text-lg'>
                <span className='font-semibold'>획득 경험치:</span>{" "}
                {calculateGameExperience("memory")}EXP
              </div>
              <div className='text-lg'>
                <span className='font-semibold'>소요 시간:</span>{" "}
                {Math.floor(totalTime / 60)}분 {totalTime % 60}초
              </div>
              {flipLimit > 0 && (
                <div className='text-lg'>
                  <span className='font-semibold'>사용한 횟수:</span>{" "}
                  {flipLimit - remainingFlips}/{flipLimit}
                </div>
              )}
            </div>
            <div className='flex space-x-4 justify-center'>
              <button
                onClick={handleBackToSettings}
                className='px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
              >
                다시 하기
              </button>
              <Link
                href='/'
                className='px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors'
              >
                메인 화면
              </Link>
            </div>
          </div>
        )}

        {/* 한자 모달 */}
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
