"use client"

interface Props {
  canPrev: boolean
  canNextQuestion: boolean
  isSubmitting: boolean
  onPrevQuestion: () => void
  onNextQuestion: () => void
  onNextPatternOrSubmit: () => void
  showSubmitText: string
}

export default function ExamFooter({
  canPrev,
  canNextQuestion,
  isSubmitting,
  onPrevQuestion,
  onNextQuestion,
  onNextPatternOrSubmit,
  showSubmitText,
}: Props) {
  return (
    <div className='flex justify-between items-center mt-6 sm:mt-8 pt-4 sm:pt-6 border-t'>
      <div className='flex-1'>
        {canPrev && (
          <button
            onClick={onPrevQuestion}
            className='px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-black hover:bg-gray-50 text-xs sm:text-sm'
          >
            ← 이전 문제
          </button>
        )}
      </div>

      <div className='flex-1 flex justify-end'>
        {canNextQuestion ? (
          <button
            onClick={onNextQuestion}
            className='px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-black hover:bg-gray-50 text-xs sm:text-sm'
          >
            다음 문제 →
          </button>
        ) : (
          <button
            onClick={onNextPatternOrSubmit}
            disabled={isSubmitting}
            className='px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-xs sm:text-sm'
          >
            {showSubmitText}
          </button>
        )}
      </div>
    </div>
  )
}
