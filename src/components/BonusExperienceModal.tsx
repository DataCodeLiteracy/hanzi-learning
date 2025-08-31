import React from 'react'

interface BonusExperienceModalProps {
  isOpen: boolean
  onClose: () => void
  consecutiveDays: number
  bonusExperience: number
  dailyGoal: number
}

export default function BonusExperienceModal({
  isOpen,
  onClose,
  consecutiveDays,
  bonusExperience,
  dailyGoal,
}: BonusExperienceModalProps) {
  if (!isOpen) return null

  const getConsecutiveMessage = () => {
    if (consecutiveDays >= 30) {
      return '30일 연속 목표 달성! 🎉'
    } else if (consecutiveDays >= 20) {
      return '20일 연속 목표 달성! 🎊'
    } else if (consecutiveDays >= 10) {
      return '10일 연속 목표 달성! 🎯'
    }
    return ''
  }

  const getBonusDescription = () => {
    if (consecutiveDays >= 30) {
      return '30일 연속 달성으로 기본 500 EXP 보너스!'
    } else if (consecutiveDays >= 20) {
      return '20일 연속 달성으로 기본 200 EXP 보너스!'
    } else if (consecutiveDays >= 10) {
      return '10일 연속 달성으로 기본 50 EXP 보너스!'
    }
    return ''
  }

  const getDifficultyMultiplier = () => {
    const multiplier = Math.min(Math.max(dailyGoal / 100, 1.0), 3.0)
    return multiplier.toFixed(1)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-center">
        {/* 헤더 */}
        <div className="mb-6">
          <div className="text-6xl mb-4">🎁</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            보너스 경험치 획득!
          </h2>
          <p className="text-lg text-blue-600 font-semibold">
            {getConsecutiveMessage()}
          </p>
        </div>

        {/* 보너스 정보 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6">
          <div className="text-sm text-gray-600 mb-2">
            {getBonusDescription()}
          </div>
          <div className="text-2xl font-bold text-green-600 mb-2">
            +{bonusExperience} EXP
          </div>
          <div className="text-sm text-gray-500">
            목표 {dailyGoal} EXP × {getDifficultyMultiplier()}배 = {bonusExperience} EXP
          </div>
        </div>

        {/* 연속 달성 정보 */}
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

        {/* 다음 목표 */}
        <div className="text-sm text-gray-600 mb-6">
          {consecutiveDays < 30 && (
            <div>
              다음 보너스까지{' '}
              {consecutiveDays < 10 
                ? `${10 - consecutiveDays}일` 
                : consecutiveDays < 20 
                ? `${20 - consecutiveDays}일` 
                : `${30 - consecutiveDays}일`
              } 남았습니다!
            </div>
          )}
          {consecutiveDays >= 30 && (
            <div className="text-green-600 font-medium">
              🏆 최고 기록 달성! 계속 유지하세요!
            </div>
          )}
        </div>

        {/* 닫기 버튼 */}
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
