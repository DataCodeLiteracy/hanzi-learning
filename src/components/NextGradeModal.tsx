"use client"

import React from "react"
import { X, ArrowRight, Star } from "lucide-react"

interface NextGradeModalProps {
  isOpen: boolean
  onClose: () => void
  currentGrade: number
  nextGrade: number
  onProceedToNext: () => void
}

export default function NextGradeModal({
  isOpen,
  onClose,
  currentGrade,
  nextGrade,
  onProceedToNext,
}: NextGradeModalProps) {
  if (!isOpen) return null

  const getGradeName = (grade: number) => {
    if (grade === 5.5) return "준5급"
    if (grade === 4.5) return "준4급"
    if (grade === 3.5) return "준3급"
    return `${grade}급`
  }

  return (
    <div className='fixed inset-0 bg-black/70 flex items-center justify-center z-50'>
      <div className='bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl'>
        <div className='flex justify-between items-center mb-4'>
          <div className='flex items-center space-x-2'>
            <Star className='h-6 w-6 text-yellow-500' />
            <h2 className='text-xl font-bold text-gray-900'>급수 완료!</h2>
          </div>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600 transition-colors'
          >
            <X className='h-6 w-6' />
          </button>
        </div>

        <div className='text-center mb-6'>
          <div className='text-3xl font-bold text-green-600 mb-2'>
            🎉 축하합니다!
          </div>
          <p className='text-gray-700 mb-4'>
            <span className='font-semibold'>{getGradeName(currentGrade)}</span>
            의 모든 한자를
            <br />
            <span className='font-semibold text-blue-600'>100번 이상</span>{" "}
            정답으로 맞추셨습니다!
          </p>
          <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4'>
            <p className='text-sm text-blue-800'>
              이제{" "}
              <span className='font-semibold'>{getGradeName(nextGrade)}</span>로
              도전해보세요!
              <br />더 높은 급수에서 새로운 한자들을 만나보실 수 있습니다.
            </p>
          </div>
        </div>

        <div className='flex space-x-3'>
          <button
            onClick={onClose}
            className='flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors'
          >
            나중에 하기
          </button>
          <button
            onClick={onProceedToNext}
            className='flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2'
          >
            <span>{getGradeName(nextGrade)} 시작하기</span>
            <ArrowRight className='h-4 w-4' />
          </button>
        </div>
      </div>
    </div>
  )
}
