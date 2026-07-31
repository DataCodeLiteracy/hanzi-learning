"use client"

import { useState, useCallback } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import { ApiClient } from "@/lib/apiClient"
import { WritingFormSkeleton } from "@/components/Skeleton"
import { ArrowLeft, Upload, Camera, X, CheckCircle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface FinalResult {
  finalCount: number
  score: number
  experience: number
  feedback: string
}

export default function GradingPage() {
  const { user, loading: authLoading, initialLoading } = useAuth()
  const { refreshUserStatistics } = useData()
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
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
          "image/jpg",
          "image/png",
          "image/heic",
          "image/heif",
        ]
        if (!allowedTypes.includes(file.type)) {
          setError("지원하지 않는 파일 형식입니다. (JPG, PNG, HEIC만 가능)")
          return
        }

        setSelectedImage(file)
        setPreviewUrl(URL.createObjectURL(file))
        setError(null)
        setFinalResult(null)
        setUserCorrectedCount(null)
      }
    },
    []
  )

  // 이미지 제거
  const handleRemoveImage = () => {
    setSelectedImage(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setFinalResult(null)
    setUserCorrectedCount(null)
    setError(null)
  }

  // 수동 채점 시작
  const handleStartGrading = () => {
    if (!selectedImage || !user) return
    setUserCorrectedCount(0) // 기본값 0으로 시작
    setError(null)
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

      const totalExp = Math.round(userCorrectedCount * baseExpPerCell)

      // 피드백 생성
      let feedback = ""
      if (score >= 85) {
        feedback = "🎉 훌륭합니다! 거의 완벽하게 썼네요!"
      } else if (score >= 65) {
        feedback = "👍 잘했습니다! 조금 더 연습하면 완벽해질 거예요!"
      } else if (score >= 40) {
        feedback = "💪 괜찮습니다! 계속 연습해보세요!"
      } else {
        feedback = "📝 다시 한번 연습해보세요. 천천히 정확하게 써보세요!"
      }

      const result: FinalResult = {
        finalCount: userCorrectedCount,
        score: Math.round(score),
        experience: totalExp,
        feedback,
      }

      setFinalResult(result)

      // 경험치 업데이트 (추가) + 오늘 경험치/마일리지 반영
      await ApiClient.addUserExperience(user.id, totalExp)
      await ApiClient.updateTodayExperience(user.id, totalExp)
      await refreshUserStatistics()
    } catch (err) {
      console.error("Experience update error:", err)
      setError("경험치 업데이트 중 오류가 발생했습니다.")
    } finally {
      setIsConfirming(false)
    }
  }

  // 로딩 중
  if (authLoading || initialLoading) {
    return <WritingFormSkeleton />
  }

  // 인증 체크
  if (!user) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-gray-900 mb-4'>
            로그인이 필요합니다
          </h1>
          <Link href='/login' className='text-blue-600 hover:text-blue-700'>
            로그인하기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
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
                한자 쓰기 채점
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

                {/* 수동 채점 시스템 설명 */}
                <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 text-left'>
                  <h3 className='text-lg font-semibold text-blue-900 mb-3'>
                    📝 수동 채점 시스템 안내
                  </h3>
                  <div className='space-y-2 text-sm text-blue-800'>
                    <div className='flex items-start'>
                      <span className='font-medium mr-2'>📊 채점 방식:</span>
                      <span>직접 완성된 한자 개수를 입력하여 채점</span>
                    </div>
                    <div className='flex items-start'>
                      <span className='font-medium mr-2'>🎯 정확도:</span>
                      <span>정직하게 자신의 실력을 평가해보세요</span>
                    </div>
                    <div className='flex items-start'>
                      <span className='font-medium mr-2'>💡 팁:</span>
                      <span>
                        7x8 격자(56칸)에서 완성된 한자 개수를 세어보세요
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className='space-y-4'>
                <label className='cursor-pointer'>
                  <input
                    type='file'
                    accept='image/jpeg,image/jpg,image/png,image/heic,image/heif'
                    onChange={handleImageSelect}
                    className='hidden'
                  />
                  <div className='inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'>
                    <Camera className='w-5 h-5 mr-2' />
                    사진 촬영 또는 파일 선택
                  </div>
                </label>

                <p className='text-sm text-gray-500'>
                  JPG, PNG, HEIC 형식 지원
                </p>
              </div>
            </div>
          </div>
        ) : !finalResult ? (
          /* 채점 단계 */
          <div className='space-y-6'>
            {/* 이미지 미리보기 */}
            <div className='bg-white rounded-lg shadow-sm border p-6'>
              <div className='flex items-center justify-between mb-4'>
                <h2 className='text-xl font-semibold text-gray-900'>
                  업로드된 이미지
                </h2>
                <button
                  onClick={handleRemoveImage}
                  className='text-gray-400 hover:text-gray-600'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>
              <div className='text-center'>
                <Image
                  src={previewUrl!}
                  alt='Uploaded'
                  width={800}
                  height={600}
                  className='max-w-full max-h-96 mx-auto rounded-lg shadow-sm object-contain'
                  unoptimized
                />
              </div>
            </div>

            {/* 수동 채점 입력 */}
            <div className='bg-white rounded-lg shadow-sm border p-6'>
              <h2 className='text-xl font-semibold text-gray-900 mb-4'>
                📝 수동 채점
              </h2>
              <p className='text-gray-600 mb-6'>
                7x8 격자(56칸)에서 완성된 한자 개수를 직접 입력해주세요.
              </p>

              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    완성된 한자 개수 (0-56)
                  </label>
                  <input
                    type='number'
                    min='0'
                    max='56'
                    value={userCorrectedCount || ""}
                    onChange={(e) =>
                      setUserCorrectedCount(parseInt(e.target.value) || 0)
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    placeholder='완성된 한자 개수를 입력하세요'
                  />
                </div>

                {error && (
                  <div className='text-red-600 text-sm bg-red-50 p-3 rounded-lg'>
                    {error}
                  </div>
                )}

                <div className='flex space-x-4'>
                  <button
                    onClick={handleStartGrading}
                    className='flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors'
                  >
                    채점 시작
                  </button>
                  <button
                    onClick={handleConfirmCount}
                    disabled={userCorrectedCount === null || isConfirming}
                    className='flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed'
                  >
                    {isConfirming ? "처리 중..." : "채점 완료"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* 결과 화면 */
          <div className='bg-white rounded-lg shadow-sm border p-8'>
            <div className='text-center'>
              <div className='w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6'>
                <CheckCircle className='w-8 h-8 text-green-600' />
              </div>

              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                채점 완료!
              </h2>

              <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
                <div className='bg-blue-50 rounded-lg p-4'>
                  <div className='text-2xl font-bold text-blue-600'>
                    {finalResult.finalCount}개
                  </div>
                  <div className='text-sm text-blue-800'>완성된 한자</div>
                </div>
                <div className='bg-green-50 rounded-lg p-4'>
                  <div className='text-2xl font-bold text-green-600'>
                    {finalResult.score}점
                  </div>
                  <div className='text-sm text-green-800'>점수</div>
                </div>
                <div className='bg-purple-50 rounded-lg p-4'>
                  <div className='text-2xl font-bold text-purple-600'>
                    +{finalResult.experience}EXP
                  </div>
                  <div className='text-sm text-purple-800'>경험치</div>
                </div>
              </div>

              <div className='bg-gray-50 rounded-lg p-4 mb-6'>
                <p className='text-lg text-gray-800'>{finalResult.feedback}</p>
              </div>

              <div className='flex space-x-4'>
                <button
                  onClick={handleRemoveImage}
                  className='flex-1 bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors'
                >
                  다시 채점하기
                </button>
                <Link
                  href='/games/writing'
                  className='flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors text-center'
                >
                  쓰기 연습으로 돌아가기
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
