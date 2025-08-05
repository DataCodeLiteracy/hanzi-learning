"use client"

import { useState, useEffect } from "react"
import { useData } from "@/contexts/DataContext"
import { useAuth } from "@/contexts/AuthContext"
import LoadingSpinner from "@/components/LoadingSpinner"
import { ArrowLeft, RotateCcw, Eye, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"

interface PartialQuestion {
  id: string
  hanzi: string
  meaning: string
  pronunciation: string
  options: string[]
  correctAnswer: string
  hiddenPart: "top-left" | "top-right" | "bottom-left" | "bottom-right"
}

export default function PartialGame() {
  const { hanziList, selectedGrade, isLoading: dataLoading } = useData()
  const { user, loading: authLoading } = useAuth()
  const [questions, setQuestions] = useState<PartialQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0)
  const [score, setScore] = useState<number>(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [gameEnded, setGameEnded] = useState<boolean>(false)
  const [totalQuestions] = useState<number>(10)

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

  // 게임 초기화
  useEffect(() => {
    if (hanziList.length > 0) {
      initializeGame()
    }
  }, [hanziList, selectedGrade])

  const initializeGame = () => {
    // 선택된 등급의 한자들 중에서 문제 수만큼 랜덤하게 선택
    const gradeHanzi = hanziList.filter((h) => h.grade === selectedGrade)
    const selectedHanzi = gradeHanzi
      .sort(() => Math.random() - 0.5)
      .slice(0, totalQuestions)

    // 문제 생성
    const generatedQuestions = selectedHanzi.map((hanzi, index) => {
      const hiddenParts: Array<
        "top-left" | "top-right" | "bottom-left" | "bottom-right"
      > = ["top-left", "top-right", "bottom-left", "bottom-right"]
      const hiddenPart =
        hiddenParts[Math.floor(Math.random() * hiddenParts.length)]

      // 다른 한자들에서 오답 생성
      const otherHanzi = gradeHanzi.filter((h) => h.id !== hanzi.id)
      const wrongAnswers = otherHanzi
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((h) => h.character)

      // 정답과 오답을 섞어서 4지선다 생성
      const allOptions = [hanzi.character, ...wrongAnswers].sort(
        () => Math.random() - 0.5
      )

      return {
        id: hanzi.id,
        hanzi: hanzi.character,
        meaning: hanzi.meaning,
        pronunciation: hanzi.sound || hanzi.pinyin || "",
        options: allOptions,
        correctAnswer: hanzi.character,
        hiddenPart,
      }
    })

    setQuestions(generatedQuestions)
    setCurrentQuestionIndex(0)
    setScore(0)
    setSelectedAnswer(null)
    setIsCorrect(null)
    setGameEnded(false)
  }

  const handleAnswerSelect = (answer: string) => {
    if (selectedAnswer !== null) return // 이미 답을 선택했으면 무시

    setSelectedAnswer(answer)
    const currentQuestion = questions[currentQuestionIndex]
    const correct = answer === currentQuestion.correctAnswer

    setIsCorrect(correct)
    if (correct) {
      setScore((prev) => prev + 10)
    }

    // 3초 후 다음 문제로
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1)
        setSelectedAnswer(null)
        setIsCorrect(null)
      } else {
        setGameEnded(true)
      }
    }, 3000)
  }

  const getHiddenPartStyle = (part: string) => {
    switch (part) {
      case "top-left":
        return { clipPath: "polygon(0% 0%, 50% 0%, 50% 50%, 0% 50%)" }
      case "top-right":
        return { clipPath: "polygon(50% 0%, 100% 0%, 100% 50%, 50% 50%)" }
      case "bottom-left":
        return { clipPath: "polygon(0% 50%, 50% 50%, 50% 100%, 0% 100%)" }
      case "bottom-right":
        return { clipPath: "polygon(50% 50%, 100% 50%, 100% 100%, 50% 100%)" }
      default:
        return {}
    }
  }

  if (hanziList.length === 0) {
    return <LoadingSpinner message='한자 데이터를 불러오는 중...' />
  }

  if (questions.length === 0) {
    return <LoadingSpinner message='부분 맞추기를 준비하는 중...' />
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
              <h1 className='text-2xl font-bold text-gray-900'>부분 맞추기</h1>
            </div>
            <div className='flex items-center space-x-4'>
              <div className='text-sm text-gray-600'>점수: {score}</div>
              <div className='text-sm text-gray-600'>
                문제: {currentQuestionIndex + 1}/{totalQuestions}
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
                    className='text-8xl font-bold text-gray-300 bg-gray-100 rounded-lg p-8 relative'
                    style={{
                      width: "200px",
                      height: "200px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span className='text-gray-400'>?</span>
                  </div>
                  <div
                    className='absolute inset-0 text-8xl font-bold text-blue-600 flex items-center justify-center'
                    style={{
                      width: "200px",
                      height: "200px",
                      ...getHiddenPartStyle(currentQuestion.hiddenPart),
                    }}
                  >
                    {currentQuestion.hanzi}
                  </div>
                </div>
              </div>

              {/* 힌트 */}
              <div className='mb-6 p-4 bg-blue-50 rounded-lg'>
                <div className='flex items-center justify-center space-x-2 mb-2'>
                  <Eye className='h-5 w-5 text-blue-600' />
                  <span className='text-blue-600 font-semibold'>힌트</span>
                </div>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600'>
                  <div>
                    <span className='font-semibold'>뜻:</span>{" "}
                    {currentQuestion.meaning}
                  </div>
                  <div>
                    <span className='font-semibold'>음:</span>{" "}
                    {currentQuestion.pronunciation}
                  </div>
                </div>
              </div>

              {/* 보기 */}
              <div className='grid grid-cols-2 gap-4'>
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(option)}
                    disabled={selectedAnswer !== null}
                    className={`
                      p-6 rounded-lg border-2 transition-all duration-200 text-center
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
                    <div className='text-4xl font-bold mb-2'>{option}</div>
                    <div className='text-sm text-gray-500'>
                      {String.fromCharCode(65 + index)}
                    </div>
                    {selectedAnswer !== null && (
                      <div className='mt-2'>
                        {option === currentQuestion.correctAnswer ? (
                          <CheckCircle className='h-6 w-6 text-green-600 mx-auto' />
                        ) : selectedAnswer === option ? (
                          <XCircle className='h-6 w-6 text-red-600 mx-auto' />
                        ) : null}
                      </div>
                    )}
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
                  <div className='text-sm text-gray-600 mt-2'>
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
                <p className='text-lg text-gray-600'>
                  최종 점수:{" "}
                  <span className='font-bold text-blue-600'>{score}</span>
                </p>
                <p className='text-gray-600'>
                  정답률:{" "}
                  <span className='font-bold text-green-600'>
                    {Math.round((score / (totalQuestions * 10)) * 100)}%
                  </span>
                </p>
                <p className='text-gray-600'>문제 수: {totalQuestions}개</p>
              </div>
              <div className='flex space-x-4'>
                <button
                  onClick={initializeGame}
                  className='flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
                >
                  <RotateCcw className='h-4 w-4' />
                  <span>다시 하기</span>
                </button>
                <Link
                  href='/'
                  className='px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors'
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
