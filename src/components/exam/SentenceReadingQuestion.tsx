"use client"
import OptionList from "@/components/exam/OptionList"

interface Props {
  aiContent?: string
  options?: string[]
  selectedIndex: number | null
  onSelect: (index: number) => void
}

export default function SentenceReadingQuestion({
  aiContent,
  options = [],
  selectedIndex,
  onSelect,
}: Props) {
  return (
    <div className='space-y-6'>
      {/* AI 생성 문장 */}
      <div className='bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200 shadow-lg'>
        <div className='text-xl font-bold text-gray-800 leading-relaxed'>
          {aiContent || "문장을 생성하는 중..."}
        </div>
      </div>

      {/* 보기 선택 */}
      {aiContent && options && options.length > 0 && (
        <OptionList
          options={options}
          selectedIndex={selectedIndex}
          onSelect={onSelect}
        />
      )}
    </div>
  )
}
