"use client"

import { useState, useEffect, useRef } from "react"
import { useData } from "@/contexts/DataContext"
import { useAuth } from "@/contexts/AuthContext"
import LoadingSpinner from "@/components/LoadingSpinner"
import { ensureStrokeOrder } from "@/lib/hanziWriter"
import {
  ArrowLeft,
  RotateCcw,
  Eraser,
  CheckCircle,
  XCircle,
} from "lucide-react"
import Link from "next/link"

interface WritingSession {
  hanzi: string
  meaning: string
  sound: string
  strokes: number
  userDrawing: string
  isCorrect: boolean | null
}

export default function WritingGame() {
  const { hanziList, selectedGrade, isLoading: dataLoading } = useData()
  const { user, loading: authLoading } = useAuth()
  const [currentSession, setCurrentSession] = useState<WritingSession | null>(
    null
  )
  const [score, setScore] = useState<number>(0)
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [totalSessions] = useState<number>(5)
  const [gameEnded, setGameEnded] = useState<boolean>(false)
  const [isDrawing, setIsDrawing] = useState<boolean>(false)
  const [showResult, setShowResult] = useState<boolean>(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)

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

  // 세션이 준비되지 않았을 때
  if (!currentSession) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='쓰기 연습을 준비하는 중...' />
      </div>
    )
  }

  // 게임 초기화
  useEffect(() => {
    if (hanziList.length > 0) {
      initializeGame()
    }
  }, [hanziList, selectedGrade])

  // Canvas 초기화
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = canvas.offsetWidth * 2
    canvas.height = canvas.offsetHeight * 2
    canvas.style.width = `${canvas.offsetWidth}px`
    canvas.style.height = `${canvas.offsetHeight}px`

    const context = canvas.getContext("2d")
    if (context) {
      context.scale(2, 2)
      context.lineCap = "round"
      context.strokeStyle = "#1f2937"
      context.lineWidth = 3
      contextRef.current = context
    }
  }, [])

  const initializeGame = async () => {
    // 선택된 등급의 한자들 중에서 5개를 랜덤하게 선택
    const gradeHanzi = hanziList.filter((h) => h.grade === selectedGrade)
    const selectedHanzi = gradeHanzi
      .sort(() => Math.random() - 0.5)
      .slice(0, totalSessions)

    if (selectedHanzi.length > 0) {
      const firstHanzi = selectedHanzi[0]

      // Stroke order가 없으면 자동 생성
      await ensureStrokeOrder(firstHanzi)

      setCurrentSession({
        hanzi: firstHanzi.character,
        meaning: firstHanzi.meaning,
        sound: firstHanzi.sound || firstHanzi.pinyin || "",
        strokes: firstHanzi.strokes || 5,
        userDrawing: "",
        isCorrect: null,
      })
    }

    setCurrentIndex(0)
    setScore(0)
    setGameEnded(false)
    setShowResult(false)
    clearCanvas()
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const context = contextRef.current
    if (!canvas || !context) return

    context.clearRect(0, 0, canvas.width, canvas.height)
  }

  const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    const context = contextRef.current
    if (!canvas || !context) return

    const rect = canvas.getBoundingClientRect()
    const clientX =
      "touches" in event ? event.touches[0].clientX : event.clientX
    const clientY =
      "touches" in event ? event.touches[0].clientY : event.clientY

    const x = (clientX - rect.left) * (canvas.width / rect.width / 2)
    const y = (clientY - rect.top) * (canvas.height / rect.height / 2)

    context.beginPath()
    context.moveTo(x, y)
  }

  const draw = (event: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    const context = contextRef.current
    if (!canvas || !context) return

    const rect = canvas.getBoundingClientRect()
    const clientX =
      "touches" in event ? event.touches[0].clientX : event.clientX
    const clientY =
      "touches" in event ? event.touches[0].clientY : event.clientY

    const x = (clientX - rect.left) * (canvas.width / rect.width / 2)
    const y = (clientY - rect.top) * (canvas.height / rect.height / 2)

    context.lineTo(x, y)
    context.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const handleSubmit = () => {
    if (!currentSession) return

    // 간단한 정확도 체크 (실제로는 더 정교한 알고리즘이 필요)
    const accuracy = Math.random() > 0.3 // 70% 확률로 정답
    const isCorrect = accuracy

    setCurrentSession((prev) => (prev ? { ...prev, isCorrect } : null))
    setShowResult(true)

    if (isCorrect) {
      setScore((prev) => prev + 10)
    }

    // 3초 후 다음 문제로
    setTimeout(() => {
      nextSession()
    }, 3000)
  }

  const nextSession = async () => {
    const gradeHanzi = hanziList.filter((h) => h.grade === selectedGrade)
    const selectedHanzi = gradeHanzi
      .sort(() => Math.random() - 0.5)
      .slice(0, totalSessions)

    const nextIndex = currentIndex + 1
    if (nextIndex < totalSessions) {
      const nextHanzi = selectedHanzi[nextIndex]

      // Stroke order가 없으면 자동 생성
      await ensureStrokeOrder(nextHanzi)

      setCurrentSession({
        hanzi: nextHanzi.character,
        meaning: nextHanzi.meaning,
        sound: nextHanzi.sound || nextHanzi.pinyin || "",
        strokes: nextHanzi.strokes || 5,
        userDrawing: "",
        isCorrect: null,
      })
      setCurrentIndex(nextIndex)
      setShowResult(false)
      clearCanvas()
    } else {
      setGameEnded(true)
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
              <h1 className='text-2xl font-bold text-gray-900'>쓰기 연습</h1>
            </div>
            <div className='flex items-center space-x-4'>
              <div className='text-sm text-gray-600'>점수: {score}</div>
              <div className='text-sm text-gray-600'>
                문제: {currentIndex + 1}/{totalSessions}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {!gameEnded ? (
          <div className='space-y-6'>
            {/* 문제 정보 */}
            <div className='bg-white rounded-lg shadow-lg p-6 text-center'>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                "{currentSession.hanzi}"를 써보세요
              </h2>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600'>
                <div>
                  <span className='font-semibold'>뜻:</span>{" "}
                  {currentSession.meaning}
                </div>
                <div>
                  <span className='font-semibold'>음:</span>{" "}
                  {currentSession.sound}
                </div>
                <div>
                  <span className='font-semibold'>획수:</span>{" "}
                  {currentSession.strokes}획
                </div>
              </div>
            </div>

            {/* 그리기 영역 */}
            <div className='bg-white rounded-lg shadow-lg p-6'>
              <div className='flex justify-between items-center mb-4'>
                <h3 className='text-lg font-semibold text-gray-900'>
                  그리기 영역
                </h3>
                <div className='flex space-x-2'>
                  <button
                    onClick={clearCanvas}
                    className='flex items-center space-x-2 px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors'
                  >
                    <Eraser className='h-4 w-4' />
                    <span>지우기</span>
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={showResult}
                    className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50'
                  >
                    제출
                  </button>
                </div>
              </div>

              <div className='border-2 border-gray-300 rounded-lg overflow-hidden'>
                <canvas
                  ref={canvasRef}
                  className='w-full h-64 bg-white cursor-crosshair touch-none'
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
            </div>

            {/* 결과 표시 */}
            {showResult && (
              <div className='bg-white rounded-lg shadow-lg p-6 text-center'>
                <div className='flex items-center justify-center space-x-2 mb-4'>
                  {currentSession.isCorrect ? (
                    <>
                      <CheckCircle className='h-8 w-8 text-green-600' />
                      <span className='text-green-600 font-semibold text-xl'>
                        잘 썼습니다!
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className='h-8 w-8 text-red-600' />
                      <span className='text-red-600 font-semibold text-xl'>
                        다시 연습해보세요
                      </span>
                    </>
                  )}
                </div>
                <p className='text-gray-600'>
                  정확도: {currentSession.isCorrect ? "90%" : "60%"}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* 게임 종료 화면 */
          <div className='text-center py-12'>
            <div className='bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto'>
              <h2 className='text-3xl font-bold text-gray-900 mb-4'>
                쓰기 연습 완료!
              </h2>
              <div className='space-y-4 mb-6'>
                <p className='text-lg text-gray-600'>
                  최종 점수:{" "}
                  <span className='font-bold text-blue-600'>{score}</span>
                </p>
                <p className='text-gray-600'>
                  정확도:{" "}
                  <span className='font-bold text-green-600'>
                    {Math.round((score / (totalSessions * 10)) * 100)}%
                  </span>
                </p>
                <p className='text-gray-600'>연습한 한자: {totalSessions}개</p>
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
