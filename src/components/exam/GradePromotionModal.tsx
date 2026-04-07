"use client"

import React from "react"
import { X, ArrowRight, Trophy, TrendingUp } from "lucide-react"
import { getGradeName, getNextGrade } from "@/lib/gradeUtils"

interface GradePromotionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  currentGrade: number
  passCount: number
  type: "exam-page" | "main-page" // 모달 타입
  daysSinceLastExam?: number // 메인 페이지용: 마지막 시험 이후 경과 일수
}

export default function GradePromotionModal({
  isOpen,
  onClose,
  onConfirm,
  currentGrade,
  passCount,
  type,
  daysSinceLastExam,
}: GradePromotionModalProps) {
  if (!isOpen) return null

  const nextGrade = getNextGrade(currentGrade)
  const currentGradeName = getGradeName(currentGrade)
  const nextGradeName = nextGrade ? getGradeName(nextGrade) : null

  // 마지막 급수인 경우
  if (!nextGrade || !nextGradeName) {
    return null
  }

  return (
    <div className='fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-lg shadow-xl max-w-md w-full mx-4 sm:mx-auto'>
        {/* 헤더 */}
        <div className='flex justify-between items-center p-4 sm:p-6 border-b border-gray-200'>
          <div className='flex items-center space-x-2 sm:space-x-3'>
            {type === "exam-page" ? (
              <Trophy className='h-5 w-5 sm:h-6 sm:w-6 text-yellow-500' />
            ) : (
              <TrendingUp className='h-5 w-5 sm:h-6 sm:w-6 text-blue-500' />
            )}
            <h2 className='text-lg sm:text-xl font-bold text-gray-900'>
              {type === "exam-page" ? "🎉 축하합니다!" : "📚 다음 단계로 나아가세요!"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600 transition-colors p-1'
            aria-label='닫기'
          >
            <X className='h-5 w-5 sm:h-6 sm:w-6' />
          </button>
        </div>

        {/* 내용 */}
        <div className='p-4 sm:p-6'>
          {type === "exam-page" ? (
            // 급수 시험 페이지 모달
            <div className='text-center space-y-4'>
              <div className='text-2xl sm:text-3xl font-bold text-green-600 mb-2'>
                🎉 축하합니다!
              </div>
              <p className='text-sm sm:text-base text-gray-700 leading-relaxed'>
                현재 <span className='font-semibold text-blue-600'>{currentGradeName}</span>에서{" "}
                <span className='font-semibold text-green-600'>70점 이상 합격을 {passCount}번</span>{" "}
                달성하셨습니다.
                <br className='hidden sm:block' />
                이미 충분한 실력을 갖추셨으니, 다음 급수로 도전하여 더 많은 한자를 배워보시는 것은 어떨까요?
              </p>
              <div className='bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 sm:p-4 mt-4'>
                <p className='text-xs sm:text-sm text-blue-800 font-medium'>
                  다음 급수: <span className='font-bold text-lg sm:text-xl'>{nextGradeName}</span>
                </p>
              </div>
            </div>
          ) : (
            // 메인 페이지 모달
            <div className='text-center space-y-4'>
              <div className='text-xl sm:text-2xl font-bold text-blue-600 mb-2'>
                📚 다음 단계로 나아가세요!
              </div>
              <p className='text-sm sm:text-base text-gray-700 leading-relaxed'>
                현재 <span className='font-semibold text-blue-600'>{currentGradeName}</span>에서 이미{" "}
                <span className='font-semibold text-green-600'>{passCount}번 이상</span> 합격하셨고,
                {daysSinceLastExam !== undefined && (
                  <>
                    <br className='hidden sm:block' />
                    마지막 시험 이후 <span className='font-semibold'>{daysSinceLastExam}일</span>이 지났습니다.
                  </>
                )}
                <br className='hidden sm:block' />
                <br />
                같은 급수에 머물러 계시면 학습 성장이 느려질 수 있습니다.
                <br className='hidden sm:block' />
                다음 급수로 진급하여 새로운 한자들을 배우며 더 높은 수준의 실력을 쌓아보세요!
              </p>
              <div className='bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-3 sm:p-4 mt-4'>
                <p className='text-xs sm:text-sm text-gray-800 font-medium'>
                  다음 급수: <span className='font-bold text-lg sm:text-xl text-blue-600'>{nextGradeName}</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 버튼 */}
        <div className='flex flex-col sm:flex-row gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-200'>
          <button
            onClick={onClose}
            className='flex-1 px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg text-sm sm:text-base text-gray-700 hover:bg-gray-50 transition-colors font-medium'
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className='flex-1 px-4 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 font-medium text-sm sm:text-base'
          >
            <span>{nextGradeName}로 진급하기</span>
            <ArrowRight className='h-4 w-4 sm:h-5 sm:w-5' />
          </button>
        </div>
      </div>
    </div>
  )
}

