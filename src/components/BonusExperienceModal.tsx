import React from "react"

interface BonusExperienceModalProps {
  isOpen: boolean
  onClose: () => void
  consecutiveDays: number
  bonusExperience: number
  dailyGoal: number // 평균 목표 (표시용)
  milestone?: number // 10, 20, 30, 100, 200, 365
  isOneYearReset?: boolean
}

const MILESTONE_LABELS: Record<number, string> = {
  10: "10일 연속 목표 달성! 🎯",
  20: "20일 연속 목표 달성! 🎊",
  30: "30일 연속 목표 달성! 🎉",
  100: "100일 연속 목표 달성! 🌟",
  200: "200일 연속 목표 달성! 💎",
  365: "1년 연속 목표 달성! 🏆",
}

const MILESTONE_PCT: Record<number, number> = {
  10: 50,
  20: 55,
  30: 60,
  100: 60,
  200: 70,
  365: 90,
}

export default function BonusExperienceModal({
  isOpen,
  onClose,
  consecutiveDays,
  bonusExperience,
  dailyGoal,
  milestone = 10,
  isOneYearReset = false,
}: BonusExperienceModalProps) {
  if (!isOpen) return null

  const title = MILESTONE_LABELS[milestone] ?? `${milestone}일 연속 목표 달성!`
  const pct = MILESTONE_PCT[milestone] ?? 50
  const description = `연속 ${milestone}일 달성 보너스 (평균 목표의 ${pct}%)`

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-center">
        <div className="mb-6">
          <div className="text-6xl mb-4">🎁</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            보너스 경험치 획득!
          </h2>
          <p className="text-lg text-blue-600 font-semibold">{title}</p>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6">
          <div className="text-sm text-gray-600 mb-2">{description}</div>
          <div className="text-2xl font-bold text-green-600 mb-2">
            +{bonusExperience} EXP
          </div>
          <div className="text-sm text-gray-500">
            평균 목표 {dailyGoal} EXP × {pct}%
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 mb-6">
          <div className="text-lg font-semibold text-green-800 mb-2">
            연속 달성 기록
          </div>
          <div className="text-3xl font-bold text-green-600 mb-1">
            {consecutiveDays}일
          </div>
          <div className="text-sm text-green-700">
            꾸준한 학습으로 얻은 성과입니다!
          </div>
        </div>

        {isOneYearReset && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-amber-800 font-medium mb-1">
              🎉 1년을 채우셨습니다. 정말 수고 많으셨어요!
            </p>
            <p className="text-sm text-amber-700">
              연속 달성일이 리셋됩니다. 다시 1일부터 쌓아가실 수 있어요.
            </p>
          </div>
        )}

        <div className="text-sm text-gray-600 mb-6">
          {milestone < 365 && (
            <div>
              다음 보너스까지 {milestone === 10 ? "20" : milestone === 20 ? "30" : milestone === 30 ? "100" : milestone === 100 ? "200" : "365"}일 달성이 목표예요!
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          확인
        </button>
      </div>
    </div>
  )
}
