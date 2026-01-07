import { GameStats } from "@/hooks/useGameLogic"

interface GameCompletionCardProps {
  gameType: "partial" | "quiz"
  questionCount: number
  gameStats: GameStats
  userExperience: number
  onRestart: () => void
  onGoHome: () => void
}

export default function GameCompletionCard({
  gameType,
  questionCount,
  gameStats,
  userExperience,
  onRestart,
  onGoHome,
}: GameCompletionCardProps) {
  const {
    correctAnswers,
    dontKnowCount,
    earnedExperience,
    bonusExperience,
    bonusType,
  } = gameStats
  const wrongAnswers = questionCount - correctAnswers - dontKnowCount
  const isPerfectGame = dontKnowCount === 0 && correctAnswers === questionCount

  return (
    <div className='bg-white rounded-lg shadow-lg p-8'>
      <div className='text-center mb-6'>
        <div className='text-4xl mb-3'>{isPerfectGame ? "🎉" : "✅"}</div>
        <h2 className='text-2xl font-bold text-gray-900 mb-2'>
          {isPerfectGame
            ? "완벽합니다!"
            : gameType === "partial"
            ? "부분 맞추기 완료!"
            : "퀴즈 완료!"}
        </h2>
        {isPerfectGame && (
          <p className='text-lg text-green-600 font-medium'>
            모든 문제를 맞추셨습니다! 🎊
          </p>
        )}
      </div>

      {/* 게임 결과 요약 */}
      <div className='grid grid-cols-3 gap-4 mb-6'>
        <div className='bg-green-50 rounded-lg p-4 text-center'>
          <div className='text-2xl font-bold text-green-600 mb-1'>
            {correctAnswers}
          </div>
          <div className='text-sm text-gray-600'>정답</div>
        </div>
        <div className='bg-red-50 rounded-lg p-4 text-center'>
          <div className='text-2xl font-bold text-red-600 mb-1'>
            {wrongAnswers}
          </div>
          <div className='text-sm text-gray-600'>오답</div>
        </div>
        <div className='bg-blue-50 rounded-lg p-4 text-center'>
          <div className='text-2xl font-bold text-blue-600 mb-1'>
            {dontKnowCount}
          </div>
          <div className='text-sm text-gray-600'>모르겠음</div>
        </div>
      </div>

      {/* 정답률 표시 */}
      <div className='text-center mb-6'>
        <span className='text-lg font-medium text-gray-700'>
          정답률: {Math.round((correctAnswers / questionCount) * 100)}%
        </span>
      </div>

      {/* 경험치 상세 */}
      <div className='bg-gray-50 rounded-lg p-6 mb-6'>
        <h3 className='text-lg font-bold text-gray-900 mb-4'>경험치 상세</h3>
        <div className='space-y-3'>
          <div className='flex justify-between items-center'>
            <span className='text-gray-700'>정답 ({correctAnswers}개)</span>
            <span className='text-green-600 font-bold text-lg'>
              +{correctAnswers} EXP
            </span>
          </div>
          {wrongAnswers > 0 && (
            <div className='flex justify-between items-center'>
              <span className='text-gray-700'>오답 ({wrongAnswers}개)</span>
              <span className='text-red-600 font-bold text-lg'>
                -{wrongAnswers} EXP
              </span>
            </div>
          )}
          {dontKnowCount > 0 && (
            <div className='flex justify-between items-center'>
              <span className='text-gray-700'>
                모르겠음 ({dontKnowCount}개)
              </span>
              <span className='text-blue-600 font-bold text-lg'>
                +{dontKnowCount} EXP
              </span>
            </div>
          )}
          {bonusExperience > 0 && (
            <div className='flex justify-between items-center pt-3 border-t-2 border-purple-200'>
              <span className='text-purple-700 font-medium'>
                {bonusType === "perfect"
                  ? "완벽한 게임 보너스 🎁"
                  : "오답 없음 보너스 🎁"}
              </span>
              <span className='text-purple-600 font-bold text-lg'>
                +{bonusExperience} EXP
              </span>
            </div>
          )}
          <div className='flex justify-between items-center pt-3 border-t-2 border-gray-300'>
            <span className='text-gray-900 font-bold text-base'>
              획득 경험치
            </span>
            <span className='text-green-600 font-bold text-lg'>
              +{earnedExperience} EXP
            </span>
          </div>
          <div className='flex justify-between items-center'>
            <span className='text-gray-700 font-medium'>이전 경험치</span>
            <span className='text-gray-600 font-bold text-xl'>
              {userExperience - earnedExperience} EXP
            </span>
          </div>
          <div className='flex justify-between items-center pt-2'>
            <span className='text-gray-900 font-medium'>최종 경험치</span>
            <span className='text-blue-600 font-bold text-xl'>
              {userExperience} EXP
            </span>
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className='flex gap-4'>
        <button
          onClick={onRestart}
          className='flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium'
        >
          다시 하기
        </button>
        <button
          onClick={onGoHome}
          className='flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium'
        >
          홈으로
        </button>
      </div>
    </div>
  )
}
