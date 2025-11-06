"use client"

import { X, XCircle, BookOpen } from "lucide-react"

interface WrongAnswer {
  questionNumber: number
  questionId: string
  questionIndex: number
  userAnswer: string
  userSelectedNumber?: number
  correctAnswer: string
  pattern: string
  character?: string
  questionText?: string
  options?: string[]
}

interface WrongAnswersModalProps {
  isOpen: boolean
  onClose: () => void
  wrongAnswers: WrongAnswer[]
  grade: number
  score: number
  passed: boolean
  date?: string
}

export default function WrongAnswersModal({
  isOpen,
  onClose,
  wrongAnswers,
  grade,
  score,
  passed,
  date,
}: WrongAnswersModalProps) {
  if (!isOpen) return null

  const getPatternName = (pattern: string) => {
    const patternNames: Record<string, string> = {
      sound: "음 읽기",
      meaning: "뜻 찾기",
      word_meaning: "단어 뜻",
      word_reading: "단어 읽기",
      blank_hanzi: "빈칸 채우기",
      word_meaning_select: "단어 뜻 선택",
      hanzi_write: "한자 쓰기",
      word_reading_write: "단어 읽기 쓰기",
      sentence_reading: "문장 읽기",
    }
    return patternNames[pattern] || pattern
  }

  const getCorrectAnswerText = (wrong: WrongAnswer) => {
    if (wrong.pattern === "word_meaning_select") {
      const correctAnswerNum =
        typeof wrong.correctAnswer === "number"
          ? wrong.correctAnswer
          : parseInt(String(wrong.correctAnswer))

      if (!correctAnswerNum || isNaN(correctAnswerNum)) {
        return "1번"
      }

      return `${correctAnswerNum}번`
    }

    if (wrong.pattern === "blank_hanzi") {
      return wrong.character || wrong.correctAnswer || ""
    }

    if (wrong.pattern === "word_meaning") {
      return wrong.character || wrong.correctAnswer || ""
    }

    return wrong.correctAnswer || ""
  }

  const getUserAnswerText = (wrong: WrongAnswer) => {
    if (wrong.pattern === "word_meaning_select") {
      const userAnswerNum =
        wrong.userSelectedNumber ||
        (typeof wrong.userAnswer === "number"
          ? wrong.userAnswer
          : parseInt(String(wrong.userAnswer)))

      if (!userAnswerNum || isNaN(userAnswerNum)) {
        return "미답변"
      }

      return `${userAnswerNum}번`
    }

    if (wrong.pattern === "blank_hanzi") {
      if (typeof wrong.userAnswer === "number") {
        const userIndex = wrong.userAnswer - 1
        return wrong.options?.[userIndex] || wrong.character || "미답변"
      }
      return wrong.userAnswer || wrong.character || "미답변"
    }

    if (wrong.pattern === "word_meaning") {
      if (typeof wrong.userAnswer === "number") {
        const userIndex = wrong.userAnswer - 1
        return wrong.options?.[userIndex] || wrong.character || "미답변"
      }
      return wrong.userAnswer || wrong.character || "미답변"
    }

    return wrong.userAnswer || "미답변"
  }

  // 패턴별로 틀린 문제 그룹화
  const groupedWrongAnswers = wrongAnswers.reduce((acc, wrong) => {
    if (!acc[wrong.pattern]) {
      acc[wrong.pattern] = []
    }
    acc[wrong.pattern].push(wrong)
    return acc
  }, {} as Record<string, WrongAnswer[]>)

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      {/* 배경 오버레이 */}
      <div
        className='absolute inset-0'
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
        onClick={onClose}
      />

      {/* 모달 */}
      <div className='relative bg-white rounded-lg shadow-xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col' style={{ maxWidth: '800px' }}>
        {/* 헤더 */}
        <div className='relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-6 border-b bg-white'>
          {/* X 버튼 - 상단 우측 */}
          <button
            onClick={onClose}
            className='absolute top-4 right-4 sm:top-6 sm:right-6 text-gray-400 hover:text-gray-600 transition-colors z-10'
          >
            <X className='h-5 w-5' />
          </button>
          
          <div className='flex items-center space-x-3 sm:space-x-4 flex-1 pr-10 sm:pr-0'>
            <XCircle className='w-5 h-5 sm:w-6 sm:h-6 text-red-600 flex-shrink-0' />
            <div className='min-w-0 flex-1'>
              <h2 className='text-lg sm:text-xl font-bold text-gray-900'>틀린 문제 분석</h2>
              <div className='text-xs sm:text-sm text-gray-500 truncate'>
                {grade}급 시험 {date && `• ${date}`}
              </div>
            </div>
          </div>
          <div className='flex items-center justify-around sm:justify-around space-x-3 sm:space-x-4 flex-shrink-0'>
            <div className='text-center'>
              <div className='text-lg sm:text-xl font-bold text-blue-600'>{score}점</div>
              <div className='text-xs text-gray-500'>최종 점수</div>
            </div>
            <div className='text-center'>
              <div className='text-lg sm:text-xl font-bold text-red-600'>
                {wrongAnswers.length}개
              </div>
              <div className='text-xs text-gray-500'>틀린 문제</div>
            </div>
          </div>
        </div>

        {/* 모달 내용 (스크롤 가능) */}
        <div className='overflow-y-auto flex-1 p-6'>
          {/* 패턴별 틀린 문제 분석 */}
          <div className='space-y-6'>
            {Object.entries(groupedWrongAnswers).map(([pattern, wrongs]) => (
              <div key={pattern} className='bg-gray-50 rounded-lg p-6'>
                <div className='flex items-center justify-between mb-4'>
                  <h3 className='text-lg font-semibold text-gray-900'>
                    {getPatternName(pattern)} 패턴
                  </h3>
                  <div className='bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium'>
                    {wrongs.length}개 틀림
                  </div>
                </div>

                <div className='space-y-4'>
                  {wrongs.map((wrong, index) => (
                    <div
                      key={index}
                      className='bg-white rounded-lg p-4 border-l-4 border-red-500'
                    >
                      <div className='flex items-center justify-between mb-3'>
                        <div className='flex items-center space-x-3'>
                          <div className='bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-medium'>
                            {wrong.questionNumber}번
                          </div>
                          {wrong.character && (
                            <div className='text-lg font-bold text-gray-800'>
                              {wrong.character}
                            </div>
                          )}
                        </div>
                      </div>

                      {wrong.questionText && (
                        <div className='mb-3 p-3 bg-gray-50 rounded border'>
                          <div className='text-sm text-gray-600 mb-1'>문제</div>
                          <div className='text-gray-800'>{wrong.questionText}</div>
                        </div>
                      )}

                      <div className='grid grid-cols-1 md:grid-cols-2 gap-3 mb-3'>
                        <div className='p-3 bg-red-50 rounded-lg'>
                          <div className='text-sm text-red-600 mb-1'>내 답</div>
                          <div className='text-red-800 font-medium'>
                            {getUserAnswerText(wrong)}
                          </div>
                        </div>

                        <div className='p-3 bg-green-50 rounded-lg'>
                          <div className='text-sm text-green-600 mb-1'>정답</div>
                          <div className='text-green-800 font-medium'>
                            {getCorrectAnswerText(wrong)}
                          </div>
                        </div>
                      </div>

                      {wrong.options && wrong.options.length > 0 && (
                        <div className='p-3 bg-blue-50 rounded-lg'>
                          <div className='text-sm text-blue-600 mb-2'>선택지</div>
                          <div className='flex flex-wrap gap-2'>
                            {wrong.options.map((option, optionIndex) => {
                              const isCorrectAnswer =
                                wrong.pattern === "word_meaning_select"
                                  ? optionIndex ===
                                    parseInt(wrong.correctAnswer as any) - 1
                                  : option === wrong.correctAnswer
                              const isUserAnswer =
                                wrong.pattern === "word_meaning_select"
                                  ? optionIndex ===
                                    (wrong.userSelectedNumber as number) - 1
                                  : option === wrong.userAnswer

                              return (
                                <span
                                  key={optionIndex}
                                  className={`px-2 py-1 rounded text-sm ${
                                    isCorrectAnswer
                                      ? "bg-green-200 text-green-800 font-medium"
                                      : isUserAnswer
                                      ? "bg-red-200 text-red-800 font-medium"
                                      : "bg-gray-200 text-gray-700"
                                  }`}
                                >
                                  {optionIndex + 1}. {option}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

