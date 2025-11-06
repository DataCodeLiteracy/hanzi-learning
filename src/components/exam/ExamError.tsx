"use client"
import { X } from "lucide-react"

export default function ExamError({
  message,
  onRetryAction,
}: {
  message: string
  onRetryAction: () => void
}) {
  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
      <div className='text-center'>
        <X className='w-16 h-16 text-red-500 mx-auto mb-4' />
        <h1 className='text-2xl font-bold text-gray-900 mb-4'>
          오류가 발생했습니다
        </h1>
        <p className='text-gray-600 mb-4'>{message}</p>
        <button
          onClick={onRetryAction}
          className='text-blue-600 hover:text-blue-700'
        >
          다시 시도하기
        </button>
      </div>
    </div>
  )
}
