"use client"

import React from "react"
import type { MainStreakModalMilestone } from "@/lib/streakMainModalStorage"
import {
  calculateStreakMilestoneBonus,
  getStreakMilestonePercentage,
} from "@/lib/streakMilestoneBonus"

interface StreakMainCelebrationModalProps {
  isOpen: boolean
  milestone: MainStreakModalMilestone
  /** 평균 목표와 같을 때 보너스 표시용 (매일 목표가 같으면 일일 목표와 동일) */
  averageGoalApprox: number
  onConfirm: () => void
  onDismissForever: () => void
}

const TITLES: Record<MainStreakModalMilestone, string> = {
  10: "10일 연속 목표 달성을 축하해요!",
  20: "20일 연속 목표 달성을 축하해요!",
}

export default function StreakMainCelebrationModal({
  isOpen,
  milestone,
  averageGoalApprox,
  onConfirm,
  onDismissForever,
}: StreakMainCelebrationModalProps) {
  if (!isOpen) return null

  const bonusExp = calculateStreakMilestoneBonus(averageGoalApprox, milestone)
  const pct = Math.round(getStreakMilestonePercentage(milestone) * 100)

  return (
    <div className='fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4'>
      <div className='bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-center'>
        <div className='text-5xl mb-3'>🏅</div>
        <h2 className='text-xl font-bold text-gray-900 mb-2'>
          {TITLES[milestone]}
        </h2>
        <p className='text-sm text-gray-600 mb-4 leading-relaxed'>
          오늘 채운 <span className='font-semibold text-blue-700'>일일 목표</span>
          (예: {averageGoalApprox} EXP)와는 별도로, 연속 달성 마일스톤 보너스가{" "}
          <span className='font-semibold text-green-700'>추가로</span> 주어집니다.
          <br />
          <span className='text-xs text-gray-500'>
            즉 일일 목표 달성 경험치 + 보너스{" "}
            <span className='font-semibold text-green-700'>+{bonusExp} EXP</span>{" "}
            (연속 구간 평균 목표의 약 {pct}%에 해당)
          </span>
        </p>
        <div className='rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 py-3 px-4 mb-6'>
          <div className='text-lg font-bold text-green-800'>
            추가 보너스 +{bonusExp} EXP
          </div>
          <div className='text-xs text-green-700 mt-1'>
            서버에서 이미 지급된 경우 중복 지급되지 않으며, 이 알림만 표시됩니다.
          </div>
        </div>
        <div className='flex flex-col sm:flex-row gap-2 sm:gap-3'>
          <button
            type='button'
            onClick={onDismissForever}
            className='flex-1 py-3 px-4 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors text-sm'
          >
            그만 보기
          </button>
          <button
            type='button'
            onClick={onConfirm}
            className='flex-1 py-3 px-4 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors text-sm'
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
