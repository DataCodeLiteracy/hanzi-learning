"use client"

import { Skeleton } from "@/components/Skeleton"

export default function ExamLoading({
  message,
  progress,
}: {
  message: string
  progress: number
}) {
  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center'>
      <div className='text-center max-w-2xl mx-auto px-6 w-full'>
        <Skeleton className='h-20 w-20 rounded-full mx-auto mb-8' />

        <Skeleton className='h-8 w-64 mx-auto mb-6' />

        <div className='bg-white rounded-2xl shadow-xl border border-gray-200 p-6 mb-6 space-y-3'>
          <div className='flex justify-between text-sm'>
            <span className='text-gray-600'>{message}</span>
            <span className='text-gray-600'>{progress}%</span>
          </div>
          <div className='w-full bg-gray-200 rounded-full h-3 overflow-hidden'>
            <div
              className='bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out'
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className='space-y-2'>
          <Skeleton className='h-4 w-48 mx-auto' />
          <Skeleton className='h-3 w-56 mx-auto' />
        </div>
      </div>
    </div>
  )
}
