"use client"

interface Props {
  canPrev: boolean
  canNext: boolean
  onPrev: () => void
  onNext: () => void
  progressText: string
}

export default function PatternNavigator({
  canPrev,
  canNext,
  onPrev,
  onNext,
  progressText,
}: Props) {
  return (
    <div className='flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0'>
      <div className='text-sm text-black'>{progressText}</div>
      <div className='flex items-center space-x-2'>
        {canPrev && (
          <button
            onClick={onPrev}
            className='px-3 py-1 text-sm border border-gray-300 rounded text-gray-600 hover:bg-gray-50'
          >
            ← 이전 패턴
          </button>
        )}
        {canNext && (
          <button
            onClick={onNext}
            className='px-3 py-1 text-sm border border-gray-300 rounded text-gray-600 hover:bg-gray-50'
          >
            다음 패턴 →
          </button>
        )}
      </div>
    </div>
  )
}
