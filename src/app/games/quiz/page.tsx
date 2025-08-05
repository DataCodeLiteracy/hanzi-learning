"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import LoadingSpinner from "@/components/LoadingSpinner"
import { ArrowLeft, CheckCircle, XCircle, Play } from "lucide-react"
import Link from "next/link"
import { calculateGameExperience } from "@/lib/experienceSystem"
import { ApiClient } from "@/lib/apiClient"

interface Question {
  id: string
  hanzi: string
  meaning: string
  sound: string
  options: string[]
  correctAnswer: string
  questionType: "meaning" | "sound"
}

export default function QuizGame() {
  const {
    hanziList,
    selectedGrade: dataSelectedGrade,
    isLoading: dataLoading,
  } = useData()
  const { user, loading: authLoading, refreshUserData } = useAuth()
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0)
  const [correctAnswers, setCorrectAnswers] = useState<number>(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [gameEnded, setGameEnded] = useState<boolean>(false)
  const [showSettings, setShowSettings] = useState<boolean>(true)
  const [selectedGrade, setSelectedGrade] = useState<number>(8)
  const [questionCount, setQuestionCount] = useState<number>(10)
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [showNoDataModal, setShowNoDataModal] = useState<boolean>(false)
  const [noDataMessage, setNoDataMessage] = useState<string>("")
  const [gradeHanzi, setGradeHanzi] = useState<any[]>([])
  const [hasUpdatedStats, setHasUpdatedStats] = useState<boolean>(false)

  // 8급 데이터 기본 로딩
  useEffect(() => {
    if (hanziList.length > 0) {
      const grade8Hanzi = hanziList.filter((h) => h.grade === 8)
      setGradeHanzi(grade8Hanzi)
    }
  }, [hanziList])

  // 급수 변경 시 데이터 업데이트
  const handleGradeChange = (grade: number) => {
    setSelectedGrade(grade)
    const newGradeHanzi = hanziList.filter((h) => h.grade === grade)
    setGradeHanzi(newGradeHanzi)

    // 데이터가 없으면 즉시 알림
    if (newGradeHanzi.length === 0) {
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
    }
  }

  // 게임 초기화 함수 정의
  const initializeGame = () => {
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

    // 선택된 등급의 한자들 중에서 문제 수만큼 랜덤하게 선택
    const selectedHanzi = gradeHanzi
      .sort(() => Math.random() - 0.5)
      .slice(0, questionCount)

    // 문제 생성
    const generatedQuestions = selectedHanzi.map((hanzi) => {
      const questionType = Math.random() > 0.5 ? "meaning" : "sound"
      const correctAnswer =
        questionType === "meaning" ? hanzi.meaning : hanzi.sound

      // 다른 한자들에서 오답 생성 (같은 급수 내에서)
      const otherHanzi = gradeHanzi.filter((h) => h.id !== hanzi.id)
      const wrongAnswers = otherHanzi
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((h) => (questionType === "meaning" ? h.meaning : h.sound))

      // 정답과 오답을 섞어서 4지선다 생성
      const allOptions = [correctAnswer, ...wrongAnswers]
        .sort(() => Math.random() - 0.5)
        .filter((option) => option !== undefined) as string[]

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
      }
    })

    setTimeout(() => {
      setQuestions(generatedQuestions)
      setCurrentQuestionIndex(0)
      setCorrectAnswers(0)
      setSelectedAnswer(null)
      setIsCorrect(null)
      setGameEnded(false)
      setShowSettings(false)
      setIsGenerating(false)
      setHasUpdatedStats(false) // 통계 업데이트 플래그 리셋
    }, 1000)
  }

  const handleAnswerSelect = (answer: string) => {
    if (selectedAnswer !== null) return // 이미 답을 선택했으면 무시

    setSelectedAnswer(answer)
    const currentQuestion = questions[currentQuestionIndex]
    const correct = answer === currentQuestion.correctAnswer

    setIsCorrect(correct)
    if (correct) {
      setCorrectAnswers((prev) => prev + 1)
      // 문제별로 경험치 추가
      addQuestionExperience()
    }

    // 2초 후 다음 문제로
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1)
        setSelectedAnswer(null)
        setIsCorrect(null)
      } else {
        setGameEnded(true)
      }
    }, 2000)
  }

  // 문제별 경험치 추가
  const addQuestionExperience = async () => {
    if (user) {
      try {
        await ApiClient.addUserExperience(user.id, 1) // 문제당 1EXP
        console.log("문제 경험치 추가: 1EXP")
      } catch (error) {
        console.error("경험치 저장 실패:", error)
      }
    }
  }

  // 게임 종료 시 최종 통계 업데이트
  useEffect(() => {
    if (gameEnded && user && !hasUpdatedStats) {
      const updateFinalStats = async () => {
        try {
          // 게임 완료 통계 업데이트
          await ApiClient.updateGameStatistics(user.id, "quiz", {
            totalPlayed: 1,
            correctAnswers: correctAnswers, // 실제 정답 개수
            wrongAnswers: questionCount - correctAnswers,
          })
          console.log(`퀴즈 완료! 정답: ${correctAnswers}/${questionCount}`)
          // refreshUserData를 한 번만 호출
          refreshUserData()
          setHasUpdatedStats(true)
        } catch (error) {
          console.error("게임 통계 업데이트 실패:", error)
        }
      }

      updateFinalStats()
    }
  }, [gameEnded, user, correctAnswers, questionCount, hasUpdatedStats]) // refreshUserData만 제거

  const getQuestionText = (question: Question) => {
    return question.questionType === "meaning"
      ? `"${question.hanzi}"의 뜻은 무엇일까요?`
      : `"${question.hanzi}"의 음은 무엇일까요?`
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

  if (hanziList.length === 0) {
    return <LoadingSpinner message='한자 데이터를 불러오는 중...' />
  }

  // 설정 화면
  if (showSettings) {
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
                <h1 className='text-2xl font-bold text-gray-900'>퀴즈</h1>
              </div>
            </div>
          </div>
        </header>

        {/* 메인 컨텐츠 */}
        <main className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          <div className='bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto'>
            <h2 className='text-3xl font-bold text-gray-900 mb-6 text-center'>
              퀴즈 설정
            </h2>

            {/* 급수 선택 */}
            <div className='mb-6'>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                급수 선택
              </label>
              <select
                value={selectedGrade}
                onChange={(e) => handleGradeChange(Number(e.target.value))}
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium'
              >
                {[8, 7, 6, 5.5, 5, 4.5, 4, 3.5, 3].map((grade) => {
                  const gradeData = hanziList.filter((h) => h.grade === grade)
                  return (
                    <option key={grade} value={grade} className='font-medium'>
                      {grade === 5.5
                        ? "준5급"
                        : grade === 4.5
                        ? "준4급"
                        : grade === 3.5
                        ? "준3급"
                        : `${grade}급`}{" "}
                      {gradeData.length === 0 ? "(데이터 없음)" : ""}
                    </option>
                  )
                })}
              </select>
              {gradeHanzi.length > 0 ? (
                <p className='mt-2 text-sm text-gray-600'>
                  해당 급수에 {gradeHanzi.length}개의 한자가 있습니다.
                </p>
              ) : (
                <p className='mt-2 text-sm text-red-600 font-medium'>
                  해당 급수에 데이터가 없습니다.
                </p>
              )}
            </div>

            {/* 문제 수 선택 */}
            <div className='mb-6'>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
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

            {/* 퀴즈 생성 버튼 */}
            <button
              onClick={initializeGame}
              disabled={isGenerating || gradeHanzi.length === 0}
              className='w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {isGenerating ? (
                <>
                  <LoadingSpinner message='' />
                  <span>퀴즈 생성 중...</span>
                </>
              ) : gradeHanzi.length === 0 ? (
                <>
                  <span>데이터 없음</span>
                </>
              ) : (
                <>
                  <Play className='h-5 w-5' />
                  <span>퀴즈 시작</span>
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

  // 퀴즈 생성 중
  if (isGenerating) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='퀴즈를 생성하는 중...' />
      </div>
    )
  }

  if (questions.length === 0) {
    return <LoadingSpinner message='퀴즈를 준비하는 중...' />
  }

  const currentQuestion = questions[currentQuestionIndex]

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
              <h1 className='text-2xl font-bold text-gray-900'>퀴즈</h1>
            </div>
            <div className='flex items-center space-x-4'>
              <div className='text-sm text-gray-700 font-medium'>
                정답: {correctAnswers}
              </div>
              <div className='text-sm text-gray-700 font-medium'>
                문제: {currentQuestionIndex + 1}/{questionCount}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {!gameEnded ? (
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
                <div className='text-sm text-gray-700 font-semibold'>
                  {currentQuestion.questionType === "meaning"
                    ? "뜻을 선택하세요"
                    : "음을 선택하세요"}
                </div>
              </div>

              {/* 보기 */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(option)}
                    disabled={selectedAnswer !== null}
                    className={`
                      p-4 rounded-lg border-2 transition-all duration-200 text-left
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
                    `}
                  >
                    <div className='flex items-center space-x-3'>
                      <div className='w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold'>
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className='text-lg font-semibold text-gray-900'>
                        {option}
                      </span>
                      {selectedAnswer !== null && (
                        <div className='ml-auto'>
                          {option === currentQuestion.correctAnswer ? (
                            <CheckCircle className='h-6 w-6 text-green-600' />
                          ) : selectedAnswer === option ? (
                            <XCircle className='h-6 w-6 text-red-600' />
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
                  <div className='text-sm text-gray-900 mt-2 font-semibold'>
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
                퀴즈 완료!
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
                    {correctAnswers}EXP
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
                    setHasUpdatedStats(false) // 통계 업데이트 플래그 리셋
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
    </div>
  )
}
