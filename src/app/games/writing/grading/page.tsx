"use client"

import { useState, useCallback } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import { ApiClient } from "@/lib/apiClient"
import LoadingSpinner from "@/components/LoadingSpinner"
import { ArrowLeft, Upload, Camera, X, CheckCircle, Edit3 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface AIAnalysis {
  aiDetectedCount: number
  confidence: number
  reasoning: string
  message: string
  gridAnalysis?: any
  summary?: any
  extractedHanzi?: string[]
  alreadyPracticedToday?: string[]
  newCharactersToday?: string[]
}

interface FinalResult {
  finalCount: number
  score: number
  experience: number
  feedback: string
}

export default function GradingPage() {
  const { user, loading: authLoading } = useAuth()
  const { refreshUserStatistics } = useData()
  const router = useRouter()
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null)
  const [finalResult, setFinalResult] = useState<FinalResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [userCorrectedCount, setUserCorrectedCount] = useState<number | null>(
    null
  )
  const [isConfirming, setIsConfirming] = useState(false)

  // 이미지 선택 핸들러
  const handleImageSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        // HEIC/HEIF 파일도 허용
        const allowedTypes = [
          "image/jpeg",
          "image/png",
          "image/heic",
          "image/heif",
        ]
        const isHeic =
          file.name.toLowerCase().endsWith(".heic") ||
          file.name.toLowerCase().endsWith(".heif")

        if (allowedTypes.includes(file.type) || isHeic) {
          setSelectedImage(file)
          setPreviewUrl(URL.createObjectURL(file))
          setError(null)
          setAiAnalysis(null)
          setFinalResult(null)
          setUserCorrectedCount(null)
        } else {
          setError(
            "지원하지 않는 파일 형식입니다. JPG, PNG, HEIC 파일을 선택해주세요."
          )
        }
      }
    },
    []
  )

  // AI 분석 시작
  const handleStartAnalysis = async () => {
    if (!selectedImage || !user) return

    setIsAnalyzing(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", selectedImage)
      formData.append("userId", user.uid)

      const response = await fetch("/api/ai-grading", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "분석 중 오류가 발생했습니다.")
      }

      setAiAnalysis(data)
      setUserCorrectedCount(data.aiDetectedCount) // 기본값으로 AI 결과 설정
    } catch (err) {
      console.error("Analysis error:", err)
      setError(
        err instanceof Error ? err.message : "분석 중 오류가 발생했습니다."
      )
    } finally {
      setIsAnalyzing(false)
    }
  }

  // 사용자 수정된 개수로 최종 확인
  const handleConfirmCount = async () => {
    if (!user || userCorrectedCount === null) return

    setIsConfirming(true)
    setError(null)

    try {
      // 중복 체크: 0개면 중복으로 간주
      if (userCorrectedCount === 0) {
        setError("완성된 한자가 없습니다. 다시 연습해보세요.")
        setIsConfirming(false)
        return
      }

      // 경험치 계산
      const score = Math.min(100, Math.max(0, (userCorrectedCount / 56) * 100))
      let baseExpPerCell = 0.2
      if (score >= 85) baseExpPerCell = 2.0
      else if (score >= 65) baseExpPerCell = 1.0
      else if (score >= 40) baseExpPerCell = 0.5

      let completionBonus = 0
      if (score >= 100) completionBonus = 20
      else if (score >= 80) completionBonus = 10

      const totalExperience =
        Math.round(
          (baseExpPerCell * userCorrectedCount + completionBonus) * 100
        ) / 100

      // 사용자 경험치 업데이트
      if (totalExperience > 0) {
        await ApiClient.addUserExperience(user.uid, totalExperience)
        await refreshUserStatistics()
      }

      setFinalResult({
        finalCount: userCorrectedCount,
        score: Math.round(score),
        experience: totalExperience,
        feedback: getFeedback(score, userCorrectedCount),
      })
    } catch (err) {
      console.error("Confirmation error:", err)
      setError(
        err instanceof Error ? err.message : "확인 중 오류가 발생했습니다."
      )
    } finally {
      setIsConfirming(false)
    }
  }

  // 피드백 생성
  const getFeedback = (score: number, count: number) => {
    if (count === 0) return "한자 쓰기 연습을 시작해보세요!"
    if (count < 10)
      return "조금씩 연습해보세요. 꾸준히 하면 실력이 늘어날 거예요!"
    if (count < 30) return "좋은 시작이에요! 더 많은 한자를 연습해보세요."
    if (count < 50) return "열심히 연습하고 있네요! 거의 다 왔어요!"
    if (count === 56) return "완벽해요! 모든 한자를 연습하셨습니다!"
    return "훌륭한 연습이에요! 계속 이렇게 꾸준히 해보세요!"
  }

  // 다시 시작
  const handleRestart = () => {
    setSelectedImage(null)
    setPreviewUrl(null)
    setAiAnalysis(null)
    setFinalResult(null)
    setUserCorrectedCount(null)
    setError(null)
  }

  if (authLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <LoadingSpinner />
      </div>
    )
  }

  if (!user) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold mb-4'>로그인이 필요합니다</h1>
          <Link href='/login' className='text-blue-500 hover:underline'>
            로그인하기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50 relative'>
      {/* AI 분석 중 전체 페이지 오버레이 로딩 */}
      {isAnalyzing && (
        <div className='fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50'>
          <div className='bg-white rounded-xl p-10 max-w-lg mx-4 text-center shadow-2xl border relative overflow-hidden'>
            {/* 배경 애니메이션 */}
            <div className='absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-50'></div>
            <div className='absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse'></div>

            <div className='relative z-10'>
              <div className='mb-6'>
                <div className='w-20 h-20 mx-auto mb-6 relative'>
                  {/* AI 브레인 아이콘 */}
                  <div className='absolute inset-0 flex items-center justify-center'>
                    <div className='w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin'></div>
                  </div>
                  {/* 중앙 펄스 효과 */}
                  <div className='absolute inset-0 flex items-center justify-center'>
                    <div className='w-8 h-8 bg-blue-600 rounded-full animate-ping opacity-75'></div>
                  </div>
                  {/* 작은 점들 */}
                  <div className='absolute top-2 right-2 w-2 h-2 bg-yellow-400 rounded-full animate-bounce'></div>
                  <div className='absolute bottom-2 left-2 w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse'></div>
                </div>
              </div>

              <h3 className='text-2xl font-bold text-gray-900 mb-3 animate-pulse'>
                🤖 AI 분석 중...
              </h3>

              <div className='space-y-3 text-gray-700'>
                <p className='text-base leading-relaxed'>
                  7x8 격자를 분석하고 한자를 추출하고 있습니다.
                </p>

                {/* 진행 단계 표시 */}
                <div className='space-y-2 text-sm'>
                  <div className='flex items-center justify-center space-x-2'>
                    <div className='w-2 h-2 bg-blue-500 rounded-full animate-pulse'></div>
                    <span>이미지 전처리 중...</span>
                  </div>
                  <div className='flex items-center justify-center space-x-2'>
                    <div className='w-2 h-2 bg-green-500 rounded-full animate-pulse'></div>
                    <span>AI 격자 분석 중...</span>
                  </div>
                  <div className='flex items-center justify-center space-x-2'>
                    <div className='w-2 h-2 bg-purple-500 rounded-full animate-pulse'></div>
                    <span>한자 추출 중...</span>
                  </div>
                </div>

                {/* 진행률 바 */}
                <div className='mt-4'>
                  <div className='w-full bg-gray-200 rounded-full h-2 mb-2'>
                    <div
                      className='bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full animate-pulse'
                      style={{ width: "75%" }}
                    ></div>
                  </div>
                  <div className='text-xs text-gray-500 text-center'>
                    분석 진행률: 75%
                  </div>
                </div>

                <div className='text-sm text-gray-500 mt-4 p-3 bg-gray-50 rounded-lg'>
                  ⏱️ 예상 소요 시간: 10-15초
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <div className='bg-white shadow-sm border-b'>
        <div className='max-w-4xl mx-auto px-4 py-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-4'>
              <Link
                href='/games/writing'
                className='text-gray-600 hover:text-gray-800'
              >
                <ArrowLeft className='w-6 h-6' />
              </Link>
              <h1 className='text-xl font-bold text-gray-900'>
                AI 한자 쓰기 채점
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className='max-w-4xl mx-auto px-4 py-8'>
        {!selectedImage ? (
          /* 이미지 선택 단계 */
          <div className='text-center'>
            <div className='bg-white rounded-lg shadow-sm border p-8'>
              <div className='mb-6'>
                <div className='w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                  <Upload className='w-8 h-8 text-blue-600' />
                </div>
                <h2 className='text-2xl font-bold text-gray-900 mb-2'>
                  한자 쓰기 연습지 업로드
                </h2>
                <p className='text-gray-900 font-semibold mb-4'>
                  완성한 한자 쓰기 연습지를 촬영하거나 업로드해주세요
                </p>

                {/* AI 채점 시스템 설명 */}
                <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 text-left'>
                  <h3 className='text-lg font-semibold text-blue-900 mb-3'>
                    🤖 AI 채점 시스템 안내
                  </h3>
                  <div className='space-y-2 text-sm text-blue-800'>
                    <div className='flex items-start'>
                      <span className='font-medium mr-2'>📊 분석 방식:</span>
                      <span>
                        7x8 격자(56칸)에서 각 칸의 채워진 상태를 개별 분석
                      </span>
                    </div>
                    <div className='flex items-start'>
                      <span className='font-medium mr-2'>🎯 정확도:</span>
                      <span>
                        연한 가이드 위에 명확한 어두운 손글씨가 있는 칸만
                        완성으로 판단
                      </span>
                    </div>
                    <div className='flex items-start'>
                      <span className='font-medium mr-2'>⚡ 경험치:</span>
                      <span>
                        완성도에 따라 차등 지급 (완벽: 2exp, 보통: 1exp, 부족:
                        0.5exp, 미완성: 0.2exp)
                      </span>
                    </div>
                    <div className='flex items-start'>
                      <span className='font-medium mr-2'>🔄 중복 방지:</span>
                      <span>
                        같은 날 같은 한자 연습 시 경험치 중복 지급 방지
                      </span>
                    </div>
                    <div className='flex items-start'>
                      <span className='font-medium mr-2'>📅 제한:</span>
                      <span>하루 최대 5회까지 AI 채점 가능</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className='space-y-4'>
                <label className='block'>
                  <input
                    type='file'
                    accept='image/*,.heic,.heif'
                    onChange={handleImageSelect}
                    className='hidden'
                  />
                  <div className='w-full py-4 px-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 cursor-pointer transition-colors'>
                    <Camera className='w-8 h-8 text-gray-600 mx-auto mb-2' />
                    <p className='text-gray-800 font-medium'>
                      클릭하여 이미지 선택
                    </p>
                    <p className='text-sm text-gray-700 mt-1'>
                      JPG, PNG, HEIC 파일 지원
                    </p>
                  </div>
                </label>
              </div>

              {error && (
                <div className='mt-4 p-4 bg-red-50 border border-red-200 rounded-lg'>
                  <p className='text-red-600'>{error}</p>
                </div>
              )}
            </div>
          </div>
        ) : !aiAnalysis ? (
          /* 이미지 미리보기 및 분석 시작 */
          <div className='space-y-6'>
            <div className='bg-white rounded-lg shadow-sm border p-6'>
              <div className='flex items-center justify-between mb-4'>
                <h2 className='text-xl font-bold text-gray-900'>
                  업로드된 이미지
                </h2>
                <button
                  onClick={() => {
                    setSelectedImage(null)
                    setPreviewUrl(null)
                    setError(null)
                  }}
                  className='text-gray-500 hover:text-gray-700'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>

              {previewUrl && (
                <div className='mb-6'>
                  <img
                    src={previewUrl}
                    alt='업로드된 이미지'
                    className='w-full max-w-md mx-auto rounded-lg shadow-sm'
                  />
                </div>
              )}

              <div className='text-center'>
                <button
                  onClick={handleStartAnalysis}
                  disabled={isAnalyzing}
                  className='bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center mx-auto'
                >
                  <CheckCircle className='w-5 h-5 mr-2' />
                  AI 분석 시작
                </button>
              </div>

              {error && (
                <div className='mt-4 p-4 bg-red-50 border border-red-200 rounded-lg'>
                  <p className='text-red-600'>{error}</p>
                </div>
              )}
            </div>
          </div>
        ) : !finalResult ? (
          /* AI 분석 결과 및 사용자 확인 */
          <div className='space-y-6'>
            <div className='bg-white rounded-lg shadow-sm border p-6'>
              <h2 className='text-xl font-bold mb-4 text-black'>
                AI 분석 결과
              </h2>

              <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6'>
                <div className='flex items-center mb-2'>
                  <CheckCircle className='w-5 h-5 text-blue-600 mr-2' />
                  <span className='font-bold text-gray-900'>
                    AI가 {aiAnalysis.aiDetectedCount}개로 분석했습니다
                  </span>
                </div>
                <p className='text-sm text-gray-900 font-semibold'>
                  신뢰도: {aiAnalysis.confidence}% | {aiAnalysis.reasoning}
                </p>
              </div>

              {/* 추출된 한자 정보 */}
              {aiAnalysis.extractedHanzi &&
                aiAnalysis.extractedHanzi.length > 0 && (
                  <div className='bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6'>
                    <h3 className='text-lg font-bold text-gray-900 mb-3'>
                      🔤 추출된 한자
                    </h3>
                    <div className='flex flex-wrap gap-2 mb-3'>
                      {aiAnalysis.extractedHanzi.map((hanzi, index) => (
                        <span
                          key={index}
                          className='px-3 py-1 bg-white border border-gray-300 rounded-full text-sm font-bold text-gray-900'
                        >
                          {hanzi}
                        </span>
                      ))}
                    </div>

                    {/* 중복 정보 */}
                    {aiAnalysis.alreadyPracticedToday &&
                      aiAnalysis.alreadyPracticedToday.length > 0 && (
                        <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3'>
                          <p className='text-sm font-medium text-yellow-800 mb-2'>
                            ⚠️ 오늘 이미 연습한 한자 (경험치 중복 지급 안됨):
                          </p>
                          <div className='flex flex-wrap gap-2'>
                            {aiAnalysis.alreadyPracticedToday.map(
                              (hanzi, index) => (
                                <span
                                  key={index}
                                  className='px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-sm'
                                >
                                  {hanzi}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {aiAnalysis.newCharactersToday &&
                      aiAnalysis.newCharactersToday.length > 0 && (
                        <div className='bg-green-50 border border-green-200 rounded-lg p-3'>
                          <p className='text-sm font-medium text-green-800 mb-2'>
                            ✅ 오늘 새로 연습한 한자 (경험치 지급됨):
                          </p>
                          <div className='flex flex-wrap gap-2'>
                            {aiAnalysis.newCharactersToday.map(
                              (hanzi, index) => (
                                <span
                                  key={index}
                                  className='px-2 py-1 bg-green-200 text-green-800 rounded text-sm'
                                >
                                  {hanzi}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                )}

              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-bold text-gray-900 mb-2'>
                    실제로 완성한 칸의 개수를 입력해주세요
                  </label>
                  <div className='flex items-center space-x-4'>
                    <input
                      type='number'
                      min='0'
                      max='56'
                      value={userCorrectedCount || ""}
                      onChange={(e) =>
                        setUserCorrectedCount(parseInt(e.target.value) || 0)
                      }
                      className='w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-semibold'
                    />
                    <span className='text-gray-900 font-bold'>/ 56개</span>
                  </div>
                </div>

                <div className='flex space-x-3'>
                  <button
                    onClick={handleConfirmCount}
                    disabled={isConfirming || userCorrectedCount === null}
                    className='bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center'
                  >
                    {isConfirming ? (
                      <>
                        <LoadingSpinner />
                        <span className='ml-2'>확인 중...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className='w-4 h-4 mr-2' />
                        확인
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleRestart}
                    className='bg-gray-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-600'
                  >
                    다시 시작
                  </button>
                </div>
              </div>

              {error && (
                <div className='mt-4 p-4 bg-red-50 border border-red-200 rounded-lg'>
                  <p className='text-red-600'>{error}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* 최종 결과 */
          <div className='space-y-6'>
            <div className='bg-white rounded-lg shadow-sm border p-6'>
              <div className='text-center mb-6'>
                <div className='w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                  <CheckCircle className='w-8 h-8 text-green-600' />
                </div>
                <h2 className='text-2xl font-bold mb-2'>채점 완료!</h2>
                <p className='text-gray-800 font-medium'>
                  한자 쓰기 연습이 완료되었습니다
                </p>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'>
                <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 text-center'>
                  <div className='text-2xl font-bold text-blue-600'>
                    {finalResult.finalCount}
                  </div>
                  <div className='text-sm text-blue-700'>완성된 칸</div>
                </div>
                <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center'>
                  <div className='text-2xl font-bold text-yellow-600'>
                    {finalResult.score}점
                  </div>
                  <div className='text-sm text-yellow-700'>총점</div>
                </div>
                <div className='bg-green-50 border border-green-200 rounded-lg p-4 text-center'>
                  <div className='text-2xl font-bold text-green-600'>
                    +{finalResult.experience}
                  </div>
                  <div className='text-sm text-green-700'>획득 경험치</div>
                </div>
              </div>

              <div className='bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6'>
                <h3 className='font-semibold text-gray-900 mb-2'>AI 피드백</h3>
                <p className='text-gray-800 font-medium'>
                  {finalResult.feedback}
                </p>
              </div>

              <div className='flex space-x-3'>
                <button
                  onClick={handleRestart}
                  className='bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center'
                >
                  <Edit3 className='w-4 h-4 mr-2' />
                  다시 채점하기
                </button>

                <Link
                  href='/games/writing'
                  className='bg-gray-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-600 flex items-center'
                >
                  <ArrowLeft className='w-4 h-4 mr-2' />
                  쓰기 게임으로
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
