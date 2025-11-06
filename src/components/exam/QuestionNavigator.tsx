"use client"

interface Props {
  total: number
  currentIndex: number
  isAnswered: (index: number) => boolean
  onSelect: (index: number) => void
}

export default function QuestionNavigator({
  total,
  currentIndex,
  isAnswered,
  onSelect,
}: Props) {
  return (
    <div className='flex flex-wrap gap-1 justify-center'>
      {Array.from({ length: total }, (_, index) => (
        <button
          key={index}
          onClick={() => onSelect(index)}
          className={`w-8 h-8 text-xs rounded border ${
            index === currentIndex
              ? "bg-blue-500 text-white border-blue-500"
              : isAnswered(index)
              ? "bg-green-100 text-green-700 border-green-300"
              : "bg-gray-100 text-gray-600 border-gray-300"
          } hover:bg-blue-100`}
        >
          {index + 1}
        </button>
      ))}
    </div>
  )
}
