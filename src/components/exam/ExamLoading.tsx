"use client"

export default function ExamLoading({
  message,
  progress,
}: {
  message: string
  progress: number
}) {
  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center'>
      <div className='text-center max-w-2xl mx-auto px-6'>
        <div className='relative mb-8'>
          <div className='animate-spin rounded-full h-20 w-20 border-4 border-blue-200 mx-auto'></div>
          <div className='animate-spin rounded-full h-20 w-20 border-4 border-blue-600 border-t-transparent mx-auto absolute top-0 left-1/2 transform -translate-x-1/2'></div>
          <div className='absolute inset-0 flex items-center justify-center'>
            <div className='w-8 h-8 bg-blue-600 rounded-full animate-pulse'></div>
          </div>
        </div>

        <h2 className='text-3xl font-bold text-gray-800 mb-4'>
          🎯 시험 문제를 준비하고 있습니다
        </h2>

        <div className='bg-white rounded-2xl shadow-xl border border-gray-200 p-6 mb-6'>
          <div className='flex justify-between text-sm text-gray-600 mb-2'>
            <span>{message}</span>
            <span>{progress}%</span>
          </div>
          <div className='w-full bg-gray-200 rounded-full h-3'>
            <div
              className='bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out'
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div className='mt-6 space-y-2'>
          <p className='text-gray-600 font-medium'>
            잠시만 기다려주세요. (약 30초 소요)
          </p>
          <p className='text-sm text-gray-500'>
            자연스러운 문장을 생성하고 있어요 ✨
          </p>
        </div>
      </div>
    </div>
  )
}
