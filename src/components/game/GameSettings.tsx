import React from "react"
import { ArrowLeft, Play } from "lucide-react"

interface GameSettingsProps {
  gameType: "partial" | "quiz"
  selectedGrade: number
  questionCount: number
  gradeHanzi: Array<{
    id: string
    character: string
    meaning: string
    sound: string
    pinyin?: string
    grade: number
  }>
  isLoadingGrade: boolean
  isGenerating: boolean
  showNoDataModal: boolean
  noDataMessage: string
  onGradeChange: (grade: number) => void
  onQuestionCountChange: (count: number) => void
  onStartGame: () => void
  onCloseNoDataModal: () => void
}

export default function GameSettings({
  gameType,
  selectedGrade,
  questionCount,
  gradeHanzi,
  isLoadingGrade,
  isGenerating,
  showNoDataModal,
  noDataMessage,
  onGradeChange,
  onQuestionCountChange,
  onStartGame,
  onCloseNoDataModal,
}: GameSettingsProps) {
  const gameTitle = gameType === "partial" ? "부분 맞추기" : "퀴즈"
  const startButtonText = gameType === "partial" ? "게임 시작" : "퀴즈 시작"

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      {/* 헤더 */}
      <header className='fixed top-0 left-0 right-0 bg-white shadow-sm z-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-4'>
            <div className='flex items-center space-x-4'>
              <button
                onClick={() => (window.location.href = "/")}
                className='text-blue-600 hover:text-blue-700'
              >
                <ArrowLeft className='h-5 w-5' />
              </button>
              <h1 className='text-xl font-bold text-gray-900'>{gameTitle}</h1>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20'>
        <div className='bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto'>
          <h2 className='text-3xl font-bold text-gray-900 mb-6 text-center'>
            {gameTitle} 설정
          </h2>

          {/* 급수 선택 */}
          <div className='mb-6'>
            <label className='block text-base font-semibold text-gray-700 mb-2'>
              급수 선택
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => onGradeChange(Number(e.target.value))}
              disabled={isLoadingGrade}
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium disabled:opacity-50'
            >
              {[8, 7, 6, 5.5, 5, 4.5, 4, 3.5, 3].map((grade) => (
                <option key={grade} value={grade} className='font-medium'>
                  {grade === 5.5
                    ? "준5급"
                    : grade === 4.5
                    ? "준4급"
                    : grade === 3.5
                    ? "준3급"
                    : `${grade}급`}
                </option>
              ))}
            </select>

            {isLoadingGrade && (
              <div className='mt-2 flex items-center space-x-2'>
                <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500'></div>
                <span className='text-base text-gray-600'>
                  급수 데이터를 불러오는 중...
                </span>
              </div>
            )}

            {gradeHanzi.length > 0 ? (
              <p className='mt-2 text-base text-gray-600'>
                해당 급수에 {gradeHanzi.length}개의 한자가 있습니다.
              </p>
            ) : (
              !isLoadingGrade && (
                <p className='mt-2 text-base text-red-600 font-medium'>
                  해당 급수에 데이터가 없습니다.
                </p>
              )
            )}
          </div>

          {/* 문제 수 선택 */}
          <div className='mb-6'>
            <label className='block text-base font-semibold text-gray-700 mb-2'>
              문제 수 선택
            </label>
            <select
              value={questionCount}
              onChange={(e) => onQuestionCountChange(Number(e.target.value))}
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium'
            >
              {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((count) => (
                <option key={count} value={count} className='font-medium'>
                  {count}문제
                </option>
              ))}
            </select>
          </div>

          {/* 게임 시작 버튼 */}
          <button
            onClick={onStartGame}
            disabled={isGenerating || gradeHanzi.length === 0}
            className='w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {gradeHanzi.length === 0 ? (
              <>
                <span>데이터 없음</span>
              </>
            ) : (
              <>
                <Play className='h-5 w-5' />
                <span>{startButtonText}</span>
              </>
            )}
          </button>
        </div>

        {/* 데이터 없음 모달 */}
        {showNoDataModal && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
            <div className='bg-white rounded-lg p-6 max-w-md mx-4'>
              <div className='text-center'>
                <div className='text-red-500 text-4xl mb-4'>⚠️</div>
                <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                  데이터 부족
                </h3>
                <p className='text-gray-700 mb-6 font-medium'>
                  {noDataMessage}
                </p>
                <button
                  onClick={onCloseNoDataModal}
                  className='px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
