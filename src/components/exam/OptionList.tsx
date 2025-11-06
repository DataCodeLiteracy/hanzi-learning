"use client"

interface OptionListProps {
  options: string[]
  selectedIndex?: number | null
  onSelect: (index: number) => void
}

export default function OptionList({
  options,
  selectedIndex = null,
  onSelect,
}: OptionListProps) {
  if (!options || options.length === 0) return null
  return (
    <div className='space-y-4'>
      {options.map((option: string, index: number) => (
        <button
          key={index}
          onClick={() => onSelect(index + 1)}
          className={`w-full p-4 text-left rounded-xl border-2 transition-all duration-200 transform hover:scale-[1.02] ${
            selectedIndex === index + 1
              ? "border-blue-500 bg-blue-100 text-black shadow-lg"
              : "border-gray-200 hover:border-blue-300 bg-white text-black hover:bg-blue-50 hover:shadow-md"
          }`}
        >
          <span className='font-bold mr-4 text-lg'>{index + 1}.</span>
          <span className='break-words text-lg font-medium'>{option}</span>
        </button>
      ))}
    </div>
  )
}
