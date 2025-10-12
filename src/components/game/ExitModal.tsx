interface ExitModalProps {
  isOpen: boolean
  questionsAnswered: number
  onConfirm: () => void
  onCancel: () => void
}

export default function ExitModal({
  isOpen,
  questionsAnswered,
  onConfirm,
  onCancel
}: ExitModalProps) {
  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50'>
      <div className='bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4 text-center'>
        <div className='mb-6'>
          <div className='text-yellow-500 text-4xl mb-4'>⚠️</div>
          <h3 className='text-2xl font-bold text-gray-900 mb-4'>
            게임을 중단하시겠습니까?
          </h3>
          <div className='space-y-3 text-gray-700'>
            <p className='font-medium'>
              현재까지 {questionsAnswered}문제를 풀었습니다.
            </p>
            <p className='text-base'>
              게임을 중단하면 진행 상황이 저장되지 않습니다.
            </p>
            <p className='text-base font-semibold text-red-600'>
              정말 나가시겠습니까?
            </p>
          </div>
        </div>

        <div className='flex justify-center space-x-4'>
          <button
            onClick={onCancel}
            className='px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium'
          >
            계속하기
          </button>
          <button
            onClick={onConfirm}
            className='px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium'
          >
            나가기
          </button>
        </div>
      </div>
    </div>
  )
}
