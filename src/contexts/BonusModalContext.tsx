"use client"

import React, { createContext, useContext, useState, useCallback } from "react"
import BonusExperienceModal from "@/components/BonusExperienceModal"

interface BonusInfo {
  consecutiveDays: number
  bonusExperience: number
  averageGoal: number
  milestone: number
  isOneYearReset: boolean
}

interface BonusModalContextValue {
  showBonus: (
    consecutiveDays: number,
    bonusExperience: number,
    averageGoal: number,
    milestone: number,
    isOneYearReset: boolean
  ) => void
}

const BonusModalContext = createContext<BonusModalContextValue | null>(null)

export function BonusModalProvider({ children }: { children: React.ReactNode }) {
  const [showBonusModal, setShowBonusModal] = useState(false)
  const [bonusInfo, setBonusInfo] = useState<BonusInfo>({
    consecutiveDays: 0,
    bonusExperience: 0,
    averageGoal: 100,
    milestone: 10,
    isOneYearReset: false,
  })

  const showBonus = useCallback(
    (
      consecutiveDays: number,
      bonusExperience: number,
      averageGoal: number,
      milestone: number,
      isOneYearReset: boolean
    ) => {
      setBonusInfo({
        consecutiveDays,
        bonusExperience,
        averageGoal,
        milestone,
        isOneYearReset,
      })
      setShowBonusModal(true)
    },
    []
  )

  return (
    <BonusModalContext.Provider value={{ showBonus }}>
      {children}
      <BonusExperienceModal
        isOpen={showBonusModal}
        onClose={() => setShowBonusModal(false)}
        consecutiveDays={bonusInfo.consecutiveDays}
        bonusExperience={bonusInfo.bonusExperience}
        dailyGoal={bonusInfo.averageGoal}
        milestone={bonusInfo.milestone}
        isOneYearReset={bonusInfo.isOneYearReset}
      />
    </BonusModalContext.Provider>
  )
}

export function useBonusModal(): BonusModalContextValue | null {
  return useContext(BonusModalContext)
}
