"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import LoadingSpinner from "@/components/LoadingSpinner"
import Link from "next/link"
import { ApiClient } from "@/lib/apiClient"
import { useTimeTracking } from "@/hooks/useTimeTracking"
import NextGradeModal from "@/components/NextGradeModal"
import { useGameLogic, GameQuestion } from "@/hooks/useGameLogic"
import GameHeader from "@/components/game/GameHeader"
import GameCompletionCard from "@/components/game/GameCompletionCard"
import AnswerModal from "@/components/game/AnswerModal"
import ExitModal from "@/components/game/ExitModal"
import { CheckCircle, XCircle } from "lucide-react"

interface QuizQuestion extends GameQuestion {
  questionType: "meaning" | "sound"
}

export default function QuizGame() {
  const { user, loading, isAuthenticated } = useAuth()
  const { hanziList, isLoading: isDataLoading } = useData()

  // 간단한 데이터 로드 확인 로그 (개발용)
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.debug("📚 Quiz hanziList loaded:", {
        count: hanziList.length,
        grade: user?.preferredGrade,
      })
    }
  }, [hanziList, user?.preferredGrade])

  // 게임 설정
  const [questionCount, setQuestionCount] = useState<number>(10)
  const [showSettings, setShowSettings] = useState<boolean>(true)
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [showNoDataModal, setShowNoDataModal] = useState<boolean>(false)
  const [noDataMessage, setNoDataMessage] = useState<string>("")
  const [showExitModal, setShowExitModal] = useState<boolean>(false)
  const [showNextGradeModal, setShowNextGradeModal] = useState<boolean>(false)

  // 통합된 로딩 상태
  const isLoading = loading || isDataLoading || hanziList.length === 0

  // 현재 선택된 급수는 user.preferredGrade를 사용
  const selectedGrade = user?.preferredGrade || 8

  // 게임 로직 훅
  const gameLogic = useGameLogic({
    selectedGrade,
    questionCount,
    gameType: "quiz",
  })

  // 게임 생성 완료 후 상태 강제 업데이트
  useEffect(() => {
    if (gameLogic.questions.length > 0 && isGenerating) {
      setShowSettings(false)
      setIsGenerating(false)
    }
  }, [gameLogic.questions.length, isGenerating])

  // setQuestions 호출 후 강제 리렌더링
  useEffect(() => {
    if (gameLogic.questions.length > 0) {
      setForceUpdate((prev) => prev + 1)
    }
  }, [gameLogic.questions.length])

  // 강제 리렌더링을 위한 상태
  const [forceUpdate, setForceUpdate] = useState(0)

  // 강제 리렌더링을 위한 useEffect
  useEffect(() => {}, [showSettings, isGenerating, gameLogic.questions.length])

  // 시간 추적 훅
  const { startSession, endSession, currentDuration } = useTimeTracking({
    userId: user?.id || "",
    type: "game",
    activity: "quiz",
    autoStart: false,
    autoEnd: true,
  })

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
      endSession()
      gameLogic.setGameEnded(true)
    } else {
      gameLogic.setUserConfirmedExit(true)
      endSession()
      gameLogic.setGameEnded(true)
    }
    setShowExitModal(false)
    window.location.href = "/"
  }

  const handleExitCancel = () => {
    setShowExitModal(false)
  }

  // 게임 종료 시 다음 급수 권장 모달 체크
  useEffect(() => {
    if (gameLogic.gameEnded) {
      checkNextGradeModal()
    }
  }, [gameLogic.gameEnded])

  // 다음 급수 권장 모달 체크
  const checkNextGradeModal = async () => {
    if (user) {
      try {
        const completionStatus = await ApiClient.checkGradeCompletionStatus(
          user.id,
          selectedGrade
        )
        if (completionStatus.isFullyCompleted) {
          setShowNextGradeModal(true)
        }
      } catch (error) {
        console.error("게임 초기화 실패:", error)
      }
    }
  }

  // 게임 초기화 함수
  const initializeGame = async () => {
    if (hanziList.length === 0) {
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

    if (hanziList.length < questionCount) {
      setNoDataMessage(
        `선택한 급수에 ${questionCount}개보다 적은 한자가 있습니다. (${hanziList.length}개)`
      )
      setShowNoDataModal(true)
      return
    }

    setIsGenerating(true)

    try {
      // hanziList에서 직접 문제 생성 (IndexedDB 데이터 사용)
      const selectedHanzi = hanziList
        .sort(() => Math.random() - 0.5)
        .slice(0, questionCount)

      const generatedQuestions: QuizQuestion[] = selectedHanzi.map((hanzi) => {
        const questionType = Math.random() > 0.5 ? "meaning" : "sound"
        const correctAnswer =
          questionType === "meaning" ? hanzi.meaning : hanzi.sound

        const otherHanzi = hanziList.filter((h) => h.id !== hanzi.id)
        const wrongAnswers = otherHanzi
          .sort(() => Math.random() - 0.5)
          .map((h) => (questionType === "meaning" ? h.meaning : h.sound))
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
            .map((h) => (questionType === "meaning" ? h.meaning : h.sound))
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
          correctAnswer:
            correctAnswer ||
            (questionType === "meaning" ? hanzi.meaning : hanzi.sound),
          questionType: questionType as "meaning" | "sound",
          hanziId: hanzi.id,
          relatedWords: hanzi.relatedWords,
        }
      })

      // 게임 초기화
      gameLogic.setQuestions(generatedQuestions)

      // setQuestions 호출 후 상태 확인
      setTimeout(() => {
        if (gameLogic.questions.length > 0) {
          setShowSettings(false)
          setIsGenerating(false)
        }
      }, 100)

      gameLogic.initializeGame()

      // 상태 업데이트
      setShowSettings(false)
      setIsGenerating(false)
      setForceUpdate((prev) => prev + 1)

      // 추가 상태 업데이트
      setTimeout(() => {
        setShowSettings(false)
        setIsGenerating(false)
        setForceUpdate((prev) => prev + 1)
      }, 0)

      if (user) {
        startSession().catch((error: any) => {
          console.error("세션 시작 실패:", error)
        })
      }
    } catch (error) {
      console.error("게임 초기화 중 오류:", error)
      setIsGenerating(false)
      setNoDataMessage("게임 초기화 중 오류가 발생했습니다.")
      setShowNoDataModal(true)
    }
  }

  const getQuestionText = (question: QuizQuestion) => {
    return question.questionType === "meaning"
      ? `"${question.hanzi}"의 뜻은 무엇일까요?`
      : `"${question.hanzi}"의 음은 무엇일까요?`
  }

  // 로딩 상태 처리
  if (isLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='데이터를 불러오는 중...' />
      </div>
    )
  }

  // 인증 체크는 로딩이 완료된 후에만
  if (!isAuthenticated || !user) {
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

  // 게임 생성 중
  if (isGenerating) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='퀴즈를 생성하는 중...' />
      </div>
    )
  }

  // 설정 화면
  if (showSettings) {
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
            퀴즈 설정
          </h2>

          {/* 현재 학습 급수 표시 */}
          <div className='mb-6'>
            <div className='flex items-center justify-between mb-2'>
              <label className='block text-base font-semibold text-gray-700'>
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
                {selectedGrade === 5.5
                  ? "준5급"
                  : selectedGrade === 4.5
                  ? "준4급"
                  : selectedGrade === 3.5
                  ? "준3급"
                  : `${selectedGrade}급`}
                {hanziList.length > 0 && (
                  <span className='ml-2 text-sm text-blue-600 font-semibold'>
                    ({hanziList.length}개)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 문제 수 설정 */}
          <div className='mb-6'>
            <label className='block text-base font-semibold text-gray-700 mb-2'>
              문제 수
            </label>
            <div className='relative'>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className='block w-full px-4 py-3 text-base font-medium text-gray-900 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl shadow-inner appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              >
                <option value={5}>5문제</option>
                <option value={10}>10문제</option>
                <option value={15}>15문제</option>
                <option value={20}>20문제</option>
              </select>
              <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center px-4'>
                <svg
                  className='h-5 w-5 text-gray-500'
                  viewBox='0 0 20 20'
                  fill='currentColor'
                >
                  <path
                    fillRule='evenodd'
                    d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z'
                    clipRule='evenodd'
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* 시작 버튼 */}
          <button
            onClick={initializeGame}
            disabled={isGenerating}
            className='w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-bold py-4 px-6 rounded-xl shadow-lg hover:from-blue-700 hover:to-indigo-700 transform hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'
          >
            {isGenerating ? (
              <div className='flex items-center justify-center space-x-2'>
                <svg
                  className='animate-spin h-5 w-5 text-white'
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'
                >
                  <circle
                    className='opacity-25'
                    cx='12'
                    cy='12'
                    r='10'
                    stroke='currentColor'
                    strokeWidth='4'
                  ></circle>
                  <path
                    className='opacity-75'
                    fill='currentColor'
                    d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                  ></path>
                </svg>
                <span>퀴즈 생성 중...</span>
              </div>
            ) : (
              "시작하기"
            )}
          </button>
        </div>

        {/* 에러 모달 */}
        {showNoDataModal && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4'>
            <div className='bg-white rounded-lg p-6 max-w-sm w-full'>
              <h3 className='text-lg font-semibold mb-4'>알림</h3>
              <p className='text-gray-600 mb-4'>{noDataMessage}</p>
              <button
                onClick={() => setShowNoDataModal(false)}
                className='w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700'
              >
                확인
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (gameLogic.questions.length === 0) {
    return <LoadingSpinner message='퀴즈를 준비하는 중...' />
  }

  const currentQuestion = gameLogic.questions[
    gameLogic.currentQuestionIndex
  ] as QuizQuestion

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      {/* 헤더 */}
      <GameHeader
        gameType='quiz'
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
            gameType='quiz'
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
                  {getQuestionText(currentQuestion)}
                </h2>
                <div className='text-8xl font-bold text-blue-600 mb-4'>
                  {currentQuestion.hanzi}
                </div>
                <div className='text-base text-gray-700 font-semibold'>
                  {currentQuestion.questionType === "meaning"
                    ? "뜻을 선택하세요"
                    : "음을 선택하세요"}
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
                    {gameLogic.isCorrect === true ? (
                      <>
                        <CheckCircle className='h-5 w-5 text-green-600' />
                        <span className='text-green-600 font-semibold'>
                          정답입니다!
                        </span>
                      </>
                    ) : gameLogic.isCorrect === null ? (
                      <>
                        <CheckCircle className='h-5 w-5 text-blue-600' />
                        <span className='text-blue-600 font-semibold'>
                          정답을 확인해보세요
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
      </main>

      {/* 뒤로가기 확인 모달 */}
      <ExitModal
        isOpen={showExitModal}
        questionsAnswered={gameLogic.questionsAnsweredRef.current}
        onConfirm={handleExitConfirm}
        onCancel={handleExitCancel}
      />

      {/* 다음 급수 권장 모달 */}
      <NextGradeModal
        isOpen={showNextGradeModal}
        onClose={() => setShowNextGradeModal(false)}
        currentGrade={selectedGrade}
        nextGrade={selectedGrade - 1}
        onProceedToNext={() => {
          // 다음 급수로 이동은 마이페이지에서만 가능하도록 변경
          setShowNextGradeModal(false)
          window.location.href = "/profile"
        }}
      />
    </div>
  )
}
