"use client"

interface Props {
  show: boolean
}

export default function SubmittingModal({ show }: Props) {
  if (!show) return null
  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md mx-4'>
        <div className='relative mb-6'>
          <div className='animate-spin rounded-full h-16 w-16 border-4 border-blue-200 mx-auto'></div>
          <div className='animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto absolute top-0 left-1/2 transform -translate-x-1/2'></div>
          <div className='absolute inset-0 flex items-center justify-center'>
            <div className='w-6 h-6 bg-blue-600 rounded-full animate-pulse'></div>
          </div>
        </div>

        <h3 className='text-xl font-bold text-gray-800 mb-2'>
          시험 결과 처리 중
        </h3>
        <p className='text-gray-600 mb-4'>
          점수를 계산하고 결과를 저장하고 있습니다...
        </p>
        <div className='flex justify-center space-x-1'>
          <div className='w-2 h-2 bg-blue-600 rounded-full animate-bounce'></div>
          <div
            className='w-2 h-2 bg-blue-600 rounded-full animate-bounce'
            style={{ animationDelay: "0.1s" }}
          ></div>
          <div
            className='w-2 h-2 bg-blue-600 rounded-full animate-bounce'
            style={{ animationDelay: "0.2s" }}
          ></div>
        </div>
      </div>
    </div>
  )
}
