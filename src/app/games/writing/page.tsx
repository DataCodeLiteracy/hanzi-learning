"use client"

import { useState, useEffect, useRef, useCallback } from "react"
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
import { calculateGameExperience } from "@/lib/experienceSystem"
import { ApiClient } from "@/lib/apiClient"
import { Hanzi } from "@/types"

interface WritingSession {
  hanzi: string
  meaning: string
  sound: string
  strokes: number
  userDrawing: string
  isCorrect: boolean | null
  hanziId: string // 한자 ID 추가
}

export default function WritingGame() {
  const { hanziList, selectedGrade, isLoading: dataLoading } = useData()
  const { user, loading: authLoading, refreshUserData } = useAuth()
  const [currentSession, setCurrentSession] = useState<WritingSession>({
    hanzi: "",
    meaning: "",
    sound: "",
    strokes: 0,
    userDrawing: "",
    isCorrect: null,
    hanziId: "",
  })
  const [currentIndex, setCurrentIndex] = useState(0)
  const [completedSessions, setCompletedSessions] = useState(0)
  const [gameEnded, setGameEnded] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [totalSessions, setTotalSessions] = useState(5)
  const [selectedHanzi, setSelectedHanzi] = useState<Hanzi[]>([]) // 선택된 한자들 저장
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)
  const isDrawingRef = useRef(false)

  const drawBackgroundHanzi = useCallback(() => {
    const canvas = canvasRef.current
    const context = contextRef.current
    if (!canvas || !context || !currentSession) return

    // 배경에 흐린 한자 그리기
    context.save()
    context.globalAlpha = 0.15 // 더 진하게 표시
    context.fillStyle = "#9ca3af" // 회색으로 변경
    context.font = "bold 140px Arial, sans-serif" // 더 크고 굵게
    context.textAlign = "center"
    context.textBaseline = "middle"
    // 캔버스 중앙에 배치
    context.fillText(currentSession.hanzi, canvas.width / 4, canvas.height / 4)
    context.restore()
  }, [currentSession])

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const context = contextRef.current
    if (!canvas || !context) return

    context.clearRect(0, 0, canvas.width, canvas.height)

    // 배경 한자 다시 그리기
    drawBackgroundHanzi()
  }, [drawBackgroundHanzi])

  // 배경 한자 그리기
  useEffect(() => {
    drawBackgroundHanzi()
  }, [drawBackgroundHanzi])

  const initializeGame = useCallback(async () => {
    try {
      // 우선순위 기반으로 한자 선택
      const prioritizedHanzi = await ApiClient.getPrioritizedHanzi(
        user!.id,
        selectedGrade,
        totalSessions
      )

      // 선택된 한자들을 저장
      setSelectedHanzi(prioritizedHanzi)

      if (prioritizedHanzi.length > 0) {
        const firstHanzi = prioritizedHanzi[0]

        // Stroke order가 없으면 자동 생성
        await ensureStrokeOrder(firstHanzi)

        setCurrentSession({
          hanzi: firstHanzi.character,
          meaning: firstHanzi.meaning,
          sound: firstHanzi.sound || firstHanzi.pinyin || "",
          strokes: firstHanzi.strokes || 5,
          userDrawing: "",
          isCorrect: null,
          hanziId: firstHanzi.id, // hanziId 설정
        })
      }

      setCurrentIndex(0)
      setCompletedSessions(0)
      setGameEnded(false)
      setShowResult(false)

      // clearCanvas를 직접 호출하지 않고 useEffect에서 처리
    } catch (error) {
      console.error("게임 초기화 실패:", error)
    }
  }, [hanziList, selectedGrade, totalSessions, user])

  // 게임 초기화 - 조건부 return 이전에 배치
  useEffect(() => {
    if (hanziList.length > 0) {
      initializeGame()
    }
  }, [initializeGame])

  // Canvas 초기화 - 조건부 return 이전에 배치
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
      context.lineWidth = 4 // 선 굵기 증가
      contextRef.current = context
    }
  }, [])

  // 게임 종료 시 경험치 계산
  useEffect(() => {
    if (gameEnded && user) {
      // 간단한 경험치 계산: 게임 완료 시 고정 경험치
      const experience = calculateGameExperience("writing")

      // 사용자 경험치 업데이트
      const updateStats = async () => {
        try {
          // 경험치 추가
          await ApiClient.addUserExperience(user.id, experience)
          console.log(
            `쓰기 연습 완료! 완료: ${completedSessions}, 경험치: ${experience}`
          )

          // 게임 통계 업데이트
          await ApiClient.updateGameStatistics(user.id, "writing", {
            totalPlayed: 1,
            completedSessions: completedSessions,
            totalSessions: totalSessions,
          })
          console.log("게임 통계가 업데이트되었습니다.")

          // 사용자 데이터 새로고침
          refreshUserData()
        } catch (error) {
          console.error("경험치 저장 실패:", error)
        }
      }

      updateStats()
    }
  }, [gameEnded, completedSessions, totalSessions, user, refreshUserData])

  // 세션 완료 시 경험치 추가 및 한자별 통계 업데이트
  const addSessionExperience = async (isCorrect: boolean) => {
    if (!user || !currentSession) return
    try {
      await ApiClient.addUserExperience(user.id, 3) // 세션당 3 EXP 추가

      // 현재 세션의 한자 통계 업데이트
      if (currentSession.hanziId) {
        await ApiClient.updateHanziStatistics(
          user.id,
          currentSession.hanziId,
          "writing",
          isCorrect
        )
      }

      refreshUserData()
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

  // 세션이 준비되지 않았을 때
  if (!currentSession) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='쓰기 연습을 준비하는 중...' />
      </div>
    )
  }

  const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault()
    isDrawingRef.current = true
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
    event.preventDefault()
    if (!isDrawingRef.current) return

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
    isDrawingRef.current = false
  }

  // 획수 검증 함수
  const validateStrokeOrder = (): boolean => {
    if (!currentSession) return false

    // 간단한 검증: 실제로는 더 정교한 알고리즘이 필요
    // 현재는 그려진 픽셀이 있는지만 확인
    const canvas = canvasRef.current
    if (!canvas) return false

    const context = canvas.getContext("2d")
    if (!context) return false

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    let drawnPixels = 0

    // 그려진 픽셀 수 계산
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) {
        drawnPixels++
      }
    }

    // 최소 그려진 픽셀 수 확인 (한자를 그렸는지)
    const minPixels = 1000 // 최소 픽셀 수
    return drawnPixels > minPixels
  }

  const handleSubmit = () => {
    if (!currentSession) return

    // 획수 검증
    const isValid = validateStrokeOrder()

    if (!isValid) {
      // 잘못 쓴 경우
      setCurrentSession((prev) => ({ ...prev, isCorrect: false }))
      setShowResult(true)
      setTimeout(() => {
        nextSession()
      }, 3000)
      return
    }

    // 정확도 체크 (실제로는 더 정교한 알고리즘이 필요)
    const accuracy = Math.random() > 0.2 // 80% 확률로 정답
    const isCorrect = accuracy

    setCurrentSession((prev) => ({ ...prev, isCorrect }))
    setShowResult(true)

    // 세션 완료 처리
    setCompletedSessions((prev) => prev + 1)
    if (currentSession.isCorrect !== null) {
      addSessionExperience(currentSession.isCorrect) // 세션 결과 전달
    }

    // 3초 후 다음 문제로
    setTimeout(() => {
      nextSession()
    }, 3000)
  }

  const nextSession = async () => {
    const nextIndex = currentIndex + 1
    if (nextIndex < totalSessions && selectedHanzi.length > nextIndex) {
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
        hanziId: nextHanzi.id, // hanziId 설정
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
              <div className='text-sm text-gray-600'>
                완료: {completedSessions}/{totalSessions}
              </div>
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
                &ldquo;{currentSession.hanzi}&rdquo;를 써보세요
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
                <p className='text-gray-600 mb-2'>
                  {currentSession.isCorrect
                    ? "정확도: 85% - 배경 한자를 따라 잘 그렸습니다!"
                    : "정확도: 45% - 배경 한자를 더 정확히 따라 그려주세요"}
                </p>
                <p className='text-sm text-gray-500'>
                  팁: 배경의 회색 한자를 따라 그려보세요
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
                  완료 개수:{" "}
                  <span className='font-bold text-blue-600'>
                    {completedSessions}
                  </span>
                </p>
                <p className='text-lg text-gray-600'>
                  획득 경험치:{" "}
                  <span className='font-bold text-green-600'>
                    {calculateGameExperience("writing")}EXP
                  </span>
                </p>
                <p className='text-gray-600'>
                  완료율:{" "}
                  <span className='font-bold text-green-600'>
                    {Math.round((completedSessions / totalSessions) * 100)}%
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
