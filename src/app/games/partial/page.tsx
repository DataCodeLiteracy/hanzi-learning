"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import LoadingSpinner from "@/components/LoadingSpinner"
import Link from "next/link"
import { ApiClient } from "@/lib/apiClient"
import { useTimeTracking } from "@/hooks/useTimeTracking"
import NextGradeModal from "@/components/NextGradeModal"
import { useGameLogic, GameQuestion } from "@/hooks/useGameLogic"
import GameSettings from "@/components/game/GameSettings"
import GameHeader from "@/components/game/GameHeader"
import GameCompletionCard from "@/components/game/GameCompletionCard"
import AnswerModal from "@/components/game/AnswerModal"
import ExitModal from "@/components/game/ExitModal"
import { CheckCircle, XCircle } from "lucide-react"

interface PartialQuestion extends GameQuestion {
  hiddenPart: "top-left" | "top-right" | "bottom-left" | "bottom-right"
}

export default function PartialGame() {
  const { user, initialLoading, isAuthenticated } = useAuth()

  // 게임 설정
  const [selectedGrade, setSelectedGrade] = useState<number>(
    user?.preferredGrade || 8
  )
  const [questionCount, setQuestionCount] = useState<number>(10)
  const [showSettings, setShowSettings] = useState<boolean>(true)
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
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isLoadingGrade, setIsLoadingGrade] = useState<boolean>(false)
  const [showExitModal, setShowExitModal] = useState<boolean>(false)
  const [showNextGradeModal, setShowNextGradeModal] = useState<boolean>(false)

  // 게임 로직 훅
  const gameLogic = useGameLogic({
    selectedGrade,
    questionCount,
    gameType: "partial",
  })

  // 게임 생성 완료 후 상태 강제 업데이트
  useEffect(() => {
    console.log(
      `🔄 useEffect 트리거 (부분맞추기): questions.length=${gameLogic.questions.length}, isGenerating=${isGenerating}`
    )
    if (gameLogic.questions.length > 0 && isGenerating) {
      console.log(`🔄 게임 생성 완료 감지, 상태 강제 업데이트 (부분맞추기)`)
      setShowSettings(false)
      setIsGenerating(false)
    }
  }, [gameLogic.questions.length, isGenerating])

  // setQuestions 호출 후 강제 리렌더링
  useEffect(() => {
    if (gameLogic.questions.length > 0) {
      console.log(
        `🎮 questions 상태 업데이트 감지 (부분맞추기): ${gameLogic.questions.length}개`
      )
      setForceUpdate((prev) => prev + 1)
    }
  }, [gameLogic.questions.length])

  // 강제 리렌더링을 위한 useEffect
  useEffect(() => {
    console.log(
      `🔄 컴포넌트 리렌더링 (부분맞추기): showSettings=${showSettings}, isGenerating=${isGenerating}, questions=${gameLogic.questions.length}`
    )
  }, [showSettings, isGenerating, gameLogic.questions.length])

  // 강제 리렌더링을 위한 상태
  const [forceUpdate, setForceUpdate] = useState(0)

  // 시간 추적 훅
  const { startSession, endSession, currentDuration } = useTimeTracking({
    userId: user?.id || "",
    type: "game",
    activity: "partial",
    autoStart: false,
    autoEnd: true,
  })

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

  // 뒤로가기 감지 및 모달 표시
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (
        gameLogic.questionsAnsweredRef.current > 0 &&
        !gameLogic.gameEnded &&
        !gameLogic.hasUpdatedStats &&
        !gameLogic.userConfirmedExit
      ) {
        e.preventDefault()
        setShowExitModal(true)
        window.history.pushState(null, "", window.location.pathname)
      }
    }

    window.addEventListener("popstate", handlePopState)
    window.history.pushState(null, "", window.location.pathname)

    return () => {
      window.removeEventListener("popstate", handlePopState)
    }
  }, [
    gameLogic.gameEnded,
    gameLogic.hasUpdatedStats,
    gameLogic.userConfirmedExit,
  ])

  // 사용자 정보 로드 후 선호 급수 반영
  useEffect(() => {
    if (user?.preferredGrade && user.preferredGrade !== selectedGrade) {
      setSelectedGrade(user.preferredGrade)
      handleGradeChange(user.preferredGrade)
    }
  }, [user])

  // 게임 종료 시 세션 완료 통계 업데이트
  useEffect(() => {
    gameLogic.handleGameEnd()
  }, [gameLogic.gameEnded])

  // 뒤로가기 확인 처리
  const handleExitConfirm = async () => {
    if (
      gameLogic.questionsAnsweredRef.current > 0 &&
      !gameLogic.gameEnded &&
      user
    ) {
      gameLogic.setUserConfirmedExit(true)
      const sessionDuration = endSession()
      console.log(
        `🚪 부분맞추기 게임 중단: ${sessionDuration}초 학습 시간 저장됨`
      )
      gameLogic.setGameEnded(true)
    } else {
      gameLogic.setUserConfirmedExit(true)
      const sessionDuration = endSession()
      console.log(
        `🚪 부분맞추기 게임 중단 (문제 미풀이): ${sessionDuration}초 학습 시간 저장됨`
      )
      gameLogic.setGameEnded(true)
    }
    setShowExitModal(false)
    window.location.href = "/"
  }

  const handleExitCancel = () => {
    setShowExitModal(false)
  }

  // 급수 변경 시 데이터 업데이트
  const handleGradeChange = async (grade: number) => {
    if (grade === selectedGrade) return

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

  // 게임 초기화 함수
  const initializeGame = async () => {
    console.log(`🚀 initializeGame 호출됨 (부분맞추기)`)
    console.log(
      `📊 현재 상태: gradeHanzi.length=${gradeHanzi.length}, questionCount=${questionCount}, user=${user?.id}`
    )

    if (gradeHanzi.length === 0) {
      console.log(`❌ 급수 데이터 없음`)
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

    if (gradeHanzi.length < questionCount) {
      console.log(`❌ 한자 개수 부족: ${gradeHanzi.length} < ${questionCount}`)
      setNoDataMessage(
        `선택한 급수에 ${questionCount}개보다 적은 한자가 있습니다. (${gradeHanzi.length}개)`
      )
      setShowNoDataModal(true)
      return
    }

    console.log(`✅ 게임 생성 조건 만족, isGenerating=true 설정`)
    setIsGenerating(true)
    console.log(
      `🎮 부분맞추기 게임 생성 시작 - 사용자: ${user?.id}, 급수: ${selectedGrade}, 문제수: ${questionCount}`
    )

    try {
      console.log(`🔄 API 호출 시작: getPrioritizedHanzi (부분맞추기)`)
      console.log(
        `📤 요청 파라미터: userId=${
          user!.id
        }, grade=${selectedGrade}, count=${questionCount}`
      )

      const selectedHanzi = await ApiClient.getPrioritizedHanzi(
        user!.id,
        selectedGrade,
        questionCount
      )
      console.log(`📝 API 응답 받음: ${selectedHanzi.length}개`, selectedHanzi)

      console.log(
        `🔧 문제 생성 시작: ${selectedHanzi.length}개 한자로 문제 만들기 (부분맞추기)`
      )
      const generatedQuestions: PartialQuestion[] = selectedHanzi.map(
        (hanzi, index) => {
          console.log(`📝 문제 ${index + 1} 생성 중: ${hanzi.character}`)
          const hiddenParts: Array<
            "top-left" | "top-right" | "bottom-left" | "bottom-right"
          > = ["top-left", "top-right", "bottom-left", "bottom-right"]
          const hiddenPart =
            hiddenParts[Math.floor(Math.random() * hiddenParts.length)]
          console.log(`🎯 가려진 부분: ${hiddenPart}`)

          const otherHanzi = gradeHanzi.filter((h) => h.id !== hanzi.id)
          const correctAnswer = `${hanzi.meaning} ${
            hanzi.sound || hanzi.pinyin || ""
          }`

          const wrongAnswers = otherHanzi
            .sort(() => Math.random() - 0.5)
            .map((h) => `${h.meaning} ${h.sound || h.pinyin || ""}`)
            .filter((answer) => answer !== correctAnswer)
            .filter((answer, index, arr) => arr.indexOf(answer) === index)
            .slice(0, 3)

          const allOptions = [correctAnswer, ...wrongAnswers]
            .filter(
              (option) =>
                option !== undefined && option !== null && option.trim() !== ""
            )
            .filter((option, index, arr) => arr.indexOf(option) === index)
            .sort(() => Math.random() - 0.5) as string[]

          if (allOptions.length < 4) {
            const additionalWrongAnswers = otherHanzi
              .map((h) => `${h.meaning} ${h.sound || h.pinyin || ""}`)
              .filter((answer) => !allOptions.includes(answer))
              .filter((answer, index, arr) => arr.indexOf(answer) === index)
              .slice(0, 4 - allOptions.length)

            allOptions.push(...additionalWrongAnswers)
          }

          allOptions.push("모르겠음")

          return {
            id: hanzi.id,
            hanzi: hanzi.character,
            meaning: hanzi.meaning,
            sound: hanzi.sound || hanzi.pinyin || "",
            options: allOptions,
            correctAnswer,
            hiddenPart,
            hanziId: hanzi.id,
            relatedWords: hanzi.relatedWords,
          }
        }
      )

      // 게임 초기화
      console.log(
        `✅ 부분맞추기 문제 생성 완료: ${generatedQuestions.length}개`
      )
      console.log(`🎮 게임 로직에 문제 설정 중...`)
      gameLogic.setQuestions(generatedQuestions)
      console.log(`🎮 setQuestions 호출 완료`)

      // setQuestions 호출 후 상태 확인
      setTimeout(() => {
        if (gameLogic.questions.length > 0) {
          setShowSettings(false)
          setIsGenerating(false)
        }
      }, 100)

      console.log(`🎮 게임 초기화 중...`)
      gameLogic.initializeGame()
      console.log(`✅ 게임 초기화 완료!`)

      // 상태 강제 업데이트
      console.log(`🔄 상태 강제 업데이트 시작 (부분맞추기)`)

      // 즉시 상태 업데이트
      setShowSettings(false)
      setIsGenerating(false)
      setForceUpdate((prev) => prev + 1)

      // 추가 강제 업데이트
      setTimeout(() => {
        console.log(`🔄 추가 상태 업데이트 (부분맞추기)`)
        setShowSettings(false)
        setIsGenerating(false)
        setForceUpdate((prev) => prev + 1)
      }, 0)

      console.log(`✅ 상태 업데이트 완료`)

      if (user) {
        console.log(`⏰ 시간 추적 시작...`)
        startSession().catch((error: any) => {
          console.error("시간 추적 시작 실패:", error)
        })
      }
    } catch (error) {
      console.error("게임 초기화 실패:", error)
      setIsGenerating(false)
      setNoDataMessage("게임 초기화 중 오류가 발생했습니다.")
      setShowNoDataModal(true)
    }
  }

  // 다음 급수 권장 모달 체크
  const checkNextGradeModal = async () => {
    if (user) {
      try {
        const completionStatus = await ApiClient.checkGradeCompletionStatus(
          user.id,
          selectedGrade
        )
        if (completionStatus.isFullyCompleted) {
          console.log(`🎯 모든 한자 100번 이상 완료! 다음 급수 권장 모달 표시`)
          setShowNextGradeModal(true)
        }
      } catch (error) {
        console.error("다음 급수 체크 실패:", error)
      }
    }
  }

  // 게임 종료 시 다음 급수 권장 모달 체크
  useEffect(() => {
    if (gameLogic.gameEnded) {
      checkNextGradeModal()
    }
  }, [gameLogic.gameEnded])

  const getHiddenPartStyle = (part: string) => {
    switch (part) {
      case "top-left":
        return { clipPath: "polygon(0% 0%, 70% 0%, 50% 50%, 0% 70%)" }
      case "top-right":
        return { clipPath: "polygon(30% 0%, 100% 0%, 100% 70%, 50% 50%)" }
      case "bottom-left":
        return { clipPath: "polygon(0% 30%, 50% 50%, 0% 100%, 0% 100%)" }
      case "bottom-right":
        return { clipPath: "polygon(50% 50%, 100% 30%, 100% 100%, 70% 100%)" }
      default:
        return {}
    }
  }

  // 로딩 상태 처리
  if (initialLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='인증 상태를 확인하는 중...' />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='한자 데이터를 불러오는 중...' />
      </div>
    )
  }

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

  // 게임 생성 중
  if (isGenerating) {
    console.log(`⏳ 로딩 스피너 표시 중...`)
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='게임을 생성하는 중...' />
      </div>
    )
  }

  // 설정 화면
  if (showSettings) {
    console.log(
      `🎮 설정 화면 렌더링 (부분맞추기): isGenerating=${isGenerating}`
    )
    return (
      <GameSettings
        gameType='partial'
        selectedGrade={selectedGrade}
        questionCount={questionCount}
        gradeHanzi={gradeHanzi}
        isLoadingGrade={isLoadingGrade}
        isGenerating={isGenerating}
        showNoDataModal={showNoDataModal}
        noDataMessage={noDataMessage}
        onGradeChange={handleGradeChange}
        onQuestionCountChange={setQuestionCount}
        onStartGame={initializeGame}
        onCloseNoDataModal={() => setShowNoDataModal(false)}
      />
    )
  }

  if (gameLogic.questions.length === 0) {
    return <LoadingSpinner message='게임을 준비하는 중...' />
  }

  const currentQuestion = gameLogic.questions[
    gameLogic.currentQuestionIndex
  ] as PartialQuestion

  console.log(
    `🎮 게임 화면 렌더링 (부분맞추기): showSettings=${showSettings}, isGenerating=${isGenerating}, gameEnded=${gameLogic.gameEnded}`
  )
  console.log(
    `🎮 현재 문제: ${currentQuestion?.hanzi || "없음"}, 인덱스: ${
      gameLogic.currentQuestionIndex
    }`
  )

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      {/* 헤더 */}
      <GameHeader
        gameType='partial'
        correctAnswers={gameLogic.gameStats.correctAnswers}
        currentQuestionIndex={gameLogic.currentQuestionIndex}
        questionCount={questionCount}
        currentDuration={currentDuration}
        onBackClick={() => {
          if (
            !gameLogic.gameEnded &&
            !gameLogic.hasUpdatedStats &&
            gameLogic.questions.length > 0
          ) {
            setShowExitModal(true)
          } else {
            window.location.href = "/"
          }
        }}
      />

      {/* 메인 컨텐츠 */}
      <main className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16'>
        {gameLogic.gameEnded ? (
          <GameCompletionCard
            gameType='partial'
            questionCount={questionCount}
            gameStats={gameLogic.gameStats}
            userExperience={user?.experience || 0}
            onRestart={() => {
              setShowSettings(true)
              gameLogic.initializeGame()
            }}
            onGoHome={() => (window.location.href = "/")}
          />
        ) : (
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
                    onClick={() => gameLogic.handleAnswerSelect(option)}
                    disabled={gameLogic.selectedAnswer !== null}
                    className={`
                      p-3 rounded-lg border-2 transition-all duration-200 text-left
                      ${
                        gameLogic.selectedAnswer === null
                          ? "border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                          : gameLogic.selectedAnswer === option
                          ? option === currentQuestion.correctAnswer
                            ? "border-green-500 bg-green-100"
                            : "border-red-500 bg-red-100"
                          : option === currentQuestion.correctAnswer
                          ? "border-green-500 bg-green-100"
                          : "border-gray-300 bg-gray-50"
                      }
                      ${
                        gameLogic.selectedAnswer !== null
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
                      {gameLogic.selectedAnswer !== null && (
                        <div className='ml-auto'>
                          {option === currentQuestion.correctAnswer ? (
                            <CheckCircle className='h-5 w-5 text-green-600' />
                          ) : gameLogic.selectedAnswer === option ? (
                            <XCircle className='h-5 w-5 text-red-600' />
                          ) : null}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* 정답 표시 */}
              {gameLogic.selectedAnswer !== null && (
                <div className='mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200'>
                  <div className='flex items-center justify-center space-x-2'>
                    {gameLogic.isCorrect ? (
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
        )}
      </main>

      {/* 뒤로가기 확인 모달 */}
      <ExitModal
        isOpen={showExitModal}
        questionsAnswered={gameLogic.questionsAnsweredRef.current}
        onConfirm={handleExitConfirm}
        onCancel={handleExitCancel}
      />

      {/* 정답 모달 */}
      <AnswerModal
        isOpen={
          gameLogic.selectedAnswer !== null && gameLogic.isCorrect === true
        }
        question={currentQuestion}
        selectedAnswer={gameLogic.selectedAnswer}
        isCorrect={gameLogic.isCorrect}
      />

      {/* 틀렸을 때 정답 모달 */}
      <AnswerModal
        isOpen={
          gameLogic.selectedAnswer !== null && gameLogic.isCorrect === false
        }
        question={currentQuestion}
        selectedAnswer={gameLogic.selectedAnswer}
        isCorrect={gameLogic.isCorrect}
      />

      {/* 모르겠음 선택 시 모달 */}
      <AnswerModal
        isOpen={
          gameLogic.selectedAnswer !== null && gameLogic.isCorrect === null
        }
        question={currentQuestion}
        selectedAnswer={gameLogic.selectedAnswer}
        isCorrect={gameLogic.isCorrect}
      />

      {/* 다음 급수 권장 모달 */}
      <NextGradeModal
        isOpen={showNextGradeModal}
        onClose={() => setShowNextGradeModal(false)}
        currentGrade={selectedGrade}
        nextGrade={selectedGrade - 1}
        onProceedToNext={() => {
          setSelectedGrade(selectedGrade - 1)
          setShowNextGradeModal(false)
          initializeGame()
        }}
      />
    </div>
  )
}
