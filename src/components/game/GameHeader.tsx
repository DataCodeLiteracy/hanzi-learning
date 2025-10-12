import { ArrowLeft } from "lucide-react"

interface GameHeaderProps {
  gameType: "partial" | "quiz"
  correctAnswers: number
  currentQuestionIndex: number
  questionCount: number
  currentDuration: number
  onBackClick: () => void
}

export default function GameHeader({
  gameType,
  correctAnswers,
  currentQuestionIndex,
  questionCount,
  currentDuration,
  onBackClick
}: GameHeaderProps) {
  const gameTitle = gameType === "partial" ? "부분 맞추기" : "퀴즈"

  return (
    <header className='fixed top-0 left-0 right-0 bg-white shadow-sm z-50'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between items-center py-3'>
          <div className='flex items-center space-x-4'>
            <button
              onClick={onBackClick}
              className='text-blue-600 hover:text-blue-700'
            >
              <ArrowLeft className='h-5 w-5' />
            </button>
            <h1 className='text-xl font-bold text-gray-900'>{gameTitle}</h1>
          </div>
          <div className='flex items-center space-x-6'>
            <div className='text-center'>
              <div className='text-sm text-gray-600'>정답</div>
              <div className='text-lg font-bold text-green-600'>
                {correctAnswers}
              </div>
            </div>
            <div className='text-center'>
              <div className='text-sm text-gray-600'>문제</div>
              <div className='text-lg font-bold text-blue-600'>
                {currentQuestionIndex + 1}/{questionCount}
              </div>
            </div>
            <div className='text-center'>
              <div className='text-sm text-gray-600'>시간</div>
              <div className='text-lg font-bold text-purple-600'>
                {Math.floor(currentDuration / 60)
                  .toString()
                  .padStart(2, "0")}
                :{(currentDuration % 60).toString().padStart(2, "0")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
