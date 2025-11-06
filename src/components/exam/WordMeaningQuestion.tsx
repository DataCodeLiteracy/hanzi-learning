"use client"

interface Props {
  options: string[]
  selectedIndex: number | null
  aiContent?: string
  onSelect: (index: number) => void
  onClear: () => void
}

export default function WordMeaningQuestion({
  options,
  selectedIndex,
  aiContent,
  onSelect,
  onClear,
}: Props) {
  return (
    <div className='space-y-6'>
      {/* 보기 카드 */}
      <div className='bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200 shadow-lg'>
        <h4 className='text-xl font-bold text-blue-800 mb-6 text-center'>
          보기
        </h4>
        <div className='grid grid-cols-4 gap-3'>
          {options
            .filter((_, idx) => selectedIndex !== idx + 1)
            .map((option, index) => (
              <button
                key={index}
                onClick={() => onSelect(index + 1)}
                className='p-3 text-base bg-white border-2 border-gray-300 rounded-xl hover:bg-blue-100 hover:border-blue-400 hover:shadow-md transition-all duration-200 text-black font-bold transform hover:scale-105'
              >
                <span className='break-words'>{option}</span>
              </button>
            ))}
        </div>
      </div>

      {/* AI 생성 문장 - 선택된 한자가 ( ) 안에 표시 */}
      {aiContent && (
        <div className='bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200 shadow-lg'>
          <div className='text-xl font-bold text-gray-800 leading-relaxed'>
            {(() => {
              const selectedAnswer = selectedIndex
                ? options[selectedIndex - 1]
                : null
              return aiContent.replace(
                /\(       \)/g,
                selectedAnswer ? `(${selectedAnswer})` : "(       )"
              )
            })()}
            {selectedIndex && (
              <button
                onClick={onClear}
                className='ml-2 inline-flex items-center justify-center w-6 h-6 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors duration-200'
                title='선택 취소'
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
