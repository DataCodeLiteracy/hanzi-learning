"use client"
import React from "react"
import OptionList from "@/components/exam/OptionList"

interface Props {
  content: string
  options: string[]
  selectedIndex: number | null
  onSelect: (index: number) => void
}

export default function BlankHanziQuestion({
  content,
  options,
  selectedIndex,
  onSelect,
}: Props) {
  return (
    <div className='space-y-6'>
      {/* AI 생성 문장 */}
      <div className='bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200 shadow-lg'>
        <div className='text-xl font-bold text-gray-800 leading-relaxed'>
          {(() => {
            // ○ 하나를 처리
            let displayContent = content
            if (selectedIndex) {
              const selectedCharacter = options[selectedIndex - 1] ?? "○"
              // ○ 하나만 선택된 한자로 교체
              displayContent = displayContent.replace(/○/g, selectedCharacter)
            }
            
            // 화면 표시용: ○를 빨간색으로 강조
            const parts: React.ReactElement[] = []
            let currentIndex = 0
            
            while (currentIndex < displayContent.length) {
              if (displayContent[currentIndex] === "○") {
                parts.push(
                  <span
                    key={currentIndex}
                    className='text-3xl font-bold text-red-600 inline-block mx-1'
                    style={{
                      color: "#dc2626",
                      fontSize: "2rem",
                      fontWeight: "bold",
                    }}
                  >
                    ○
                  </span>
                )
                currentIndex += 1
              } else {
                parts.push(
                  <span key={currentIndex}>{displayContent[currentIndex]}</span>
                )
                currentIndex += 1
              }
            }
            
            return parts
          })()}
        </div>
      </div>

      {/* 보기 선택 */}
      {options && options.length > 0 && (
        <OptionList
          options={options}
          selectedIndex={selectedIndex}
          onSelect={onSelect}
        />
      )}
    </div>
  )
}
