import { Loader2 } from "lucide-react"
import { GameStats } from "@/hooks/useGameLogic"

interface GameCompletionCardProps {
  gameType: "partial" | "quiz"
  questionCount: number
  gameStats: GameStats
  userExperience: number
  onRestart: () => void
  onGoHome: () => void
  /** 세션 정산(콤보 보너스 등) 완료 전 true — 홈/다시 풀기 비활성화 */
  actionsDisabled?: boolean
}

export default function GameCompletionCard({
  gameType,
  questionCount,
  gameStats,
  userExperience,
  onRestart,
  onGoHome,
  actionsDisabled = false,
}: GameCompletionCardProps) {
  const {
    correctAnswers,
    dontKnowCount,
    maxComboStreak,
    bonusExperience,
  } = gameStats
  const bestCombo = maxComboStreak ?? 0
  const wrongAnswers = questionCount - correctAnswers - dontKnowCount
  const isPerfectGame = dontKnowCount === 0 && correctAnswers === questionCount

  // 기본 경험치(정답 개수)와 콤보 보너스 분리
  const baseExperience = correctAnswers
  const comboBonusExperience = Math.max(0, bonusExperience)
  const totalExperience = baseExperience + comboBonusExperience
  const accuracyRate =
    questionCount > 0 ? Math.round((correctAnswers / questionCount) * 100) : 0

  return (
    <div className='w-[90vw] max-w-[550px] bg-white rounded-2xl shadow-xl p-4 sm:p-5 max-h-[78vh] sm:max-h-[calc(100vh-7.5rem)] overflow-y-auto'>
      {/* 헤더 영역 */}
      <div className='flex flex-col items-center text-center mb-4'>
        <div className='mb-2'>
          <div className='inline-flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md'>
            <span className='text-2xl'>{isPerfectGame ? "🎉" : "✅"}</span>
          </div>
        </div>
        <h2 className='text-2xl sm:text-[1.65rem] font-extrabold text-gray-900 mb-1.5'>
          {isPerfectGame
            ? "완벽한 플레이였어요!"
            : gameType === "partial"
            ? "부분 맞추기 완료 🎯"
            : "퀴즈 완료 🎯"}
        </h2>
      </div>

      {/* 상단 요약 카드 (4개 정보를 한 카드 안에서 색으로 구분) */}
      <div className='bg-slate-50 rounded-xl p-3.5 mb-3.5 border border-slate-100'>
        <div className='grid grid-cols-2 gap-3 text-center text-xs sm:text-sm'>
          <div>
            <div className='text-[11px] sm:text-xs font-medium text-slate-500 mb-0.5'>
              전체 문제
            </div>
            <div className='text-base sm:text-lg font-bold text-slate-800'>
              {questionCount}문제
            </div>
          </div>
          <div>
            <div className='text-[11px] sm:text-xs font-medium text-green-600 mb-0.5'>
              정답
            </div>
            <div className='text-base sm:text-lg font-bold text-green-600'>
              {correctAnswers}개
            </div>
          </div>
          <div>
            <div className='text-[11px] sm:text-xs font-medium text-red-500 mb-0.5'>
              오답
            </div>
            <div className='text-base sm:text-lg font-bold text-red-500'>
              {wrongAnswers}개
            </div>
          </div>
          <div>
            <div className='text-[11px] sm:text-xs font-medium text-purple-600 mb-0.5'>
              최고 콤보
            </div>
            <div className='text-base sm:text-lg font-bold text-purple-600'>
              {bestCombo}콤보
            </div>
          </div>
        </div>
      </div>

      {/* 정답률 & 진행 바 */}
      <div className='mb-4'>
        <div className='flex items-center justify-between mb-2'>
          <span className='text-sm font-semibold text-gray-700'>정답률</span>
          <span className='text-sm font-bold text-gray-900'>
            {accuracyRate}%
          </span>
        </div>
        <div className='w-full h-3 rounded-full bg-gray-200 overflow-hidden'>
          <div
            className='h-3 rounded-full bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 transition-all'
            style={{ width: `${Math.min(accuracyRate, 100)}%` }}
          />
        </div>
      </div>

      {/* 경험치 상세 카드 */}
      <div className='bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-100'>
        <h3 className='text-base font-bold text-gray-900 mb-3 flex items-center justify-between gap-3'>
          <span>이번 게임에서 얻은 경험치</span>
          <span className='text-lg font-extrabold text-green-600 shrink-0'>
            +{totalExperience} EXP
          </span>
        </h3>
        <div className='space-y-2 text-sm'>
          <div className='flex items-center justify-between'>
            <span className='text-gray-700'>
              정답 보상{" "}
              <span className='text-xs text-gray-500'>
                ({correctAnswers}문제 × 1 EXP)
              </span>
            </span>
            <span className='font-semibold text-green-600'>
              +{baseExperience} EXP
            </span>
          </div>
          {comboBonusExperience > 0 && (
            <div className='flex items-center justify-between pt-2 border-t border-purple-200'>
              <span className='text-purple-700 font-medium'>
                콤보 보너스{" "}
                <span className='text-xs text-purple-500'>
                  (최고 {bestCombo}콤보)
                </span>
              </span>
              <span className='font-semibold text-purple-600'>
                +{comboBonusExperience} EXP
              </span>
            </div>
          )}
          <div className='mt-3 pt-3 border-t border-gray-200 space-y-1'>
            <div className='flex items-center justify-between text-xs sm:text-sm'>
              <span className='text-gray-600'>이전 경험치</span>
              <span className='font-semibold text-gray-700'>
                {userExperience - totalExperience} EXP
              </span>
            </div>
            <div className='flex items-center justify-between text-xs sm:text-sm'>
              <span className='text-gray-900 font-semibold'>현재 경험치</span>
              <span className='font-bold text-blue-600'>
                {userExperience} EXP
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 다음 액션 안내 */}
      {actionsDisabled && (
        <p className='mb-3 flex items-center justify-center gap-2 text-center text-sm font-medium text-gray-700'>
          <Loader2
            className='h-4 w-4 shrink-0 animate-spin text-blue-600'
            aria-hidden
          />
          콤보 보너스 계산 중입니다…
        </p>
      )}
      <div className='flex flex-row gap-3 mt-3'>
        <button
          type='button'
          disabled={actionsDisabled}
          onClick={onRestart}
          className='flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm sm:text-base font-semibold shadow-md hover:from-blue-700 hover:to-indigo-700 transition-colors disabled:opacity-50 disabled:pointer-events-none'
        >
          다시 풀기
        </button>
        <button
          type='button'
          disabled={actionsDisabled}
          onClick={onGoHome}
          className='flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm sm:text-base font-semibold shadow-sm hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:pointer-events-none'
        >
          홈으로
        </button>
      </div>
    </div>
  )
}
