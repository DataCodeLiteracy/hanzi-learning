"use client"
import { createContext, useContext, useMemo, useState, useEffect, useCallback } from "react"

type SelectedPayload = {
  grade: number
  textBookIds: string[]
  normalIds: string[]
  counts: {
    totalQuestions: number
    textBookNeeded: number
    normalNeeded: number
  }
  at: number
}

type SelectedByGrade = Record<number, SelectedPayload>

type SelectedHanziContextType = {
  byGrade: SelectedByGrade
  setSelected: (
    grade: number,
    payload: Omit<SelectedPayload, "grade" | "at">
  ) => void
  getSelected: (grade: number) => SelectedPayload | undefined
  clearSelected: (grade: number) => void
}

const SelectedHanziContext = createContext<SelectedHanziContextType | null>(
  null
)

const STORAGE_KEY = "hanzi_learning_selected_hanzi"

export function SelectedHanziProvider({
  children,
}: {
  children: React.ReactNode
}) {
  // localStorage에서 초기 상태 복원
  const [byGrade, setByGrade] = useState<SelectedByGrade>(() => {
    if (typeof window === "undefined") return {}
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as SelectedByGrade
        return parsed
      }
    } catch (error) {
      console.error("❌ SelectedHanziContext: localStorage 복원 실패:", error)
    }
    return {}
  })

  // localStorage에 동기화 (상태 변경 시마다 저장)
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(byGrade))
    } catch (error) {
      console.error("❌ SelectedHanziContext: localStorage 저장 실패:", error)
    }
  }, [byGrade])

  const setSelected = (
    grade: number,
    payload: Omit<SelectedPayload, "grade" | "at">
  ) => {
    setByGrade((prev) => {
      const next = {
        ...prev,
        [grade]: { grade, ...payload, at: Date.now() },
      }
      // localStorage에 즉시 저장 (useEffect보다 먼저 실행)
      if (typeof window !== "undefined") {
        try {
          const storageValue = JSON.stringify(next)
          localStorage.setItem(STORAGE_KEY, storageValue)
        } catch (error) {
          console.error("❌ SelectedHanziContext: localStorage 즉시 저장 실패:", error)
        }
      }
      return next
    })
  }

  const getSelected = useCallback((grade: number) => {
    const result = byGrade[grade]
    // 로그는 generateSimpleExamQuestions에서만 출력
    // console.log("🔍 SelectedHanziContext.getSelected 호출:", {
    //   grade,
    //   exists: !!result,
    //   allGrades: Object.keys(byGrade),
    //   result,
    // })
    return result
  }, [byGrade])

  const clearSelected = (grade: number) => {
    setByGrade((prev) => {
      const next = { ...prev }
      delete next[grade]
      // localStorage에서도 삭제
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        } catch (error) {
          console.error("❌ SelectedHanziContext: localStorage 삭제 실패:", error)
        }
      }
      return next
    })
  }

  const value = useMemo<SelectedHanziContextType>(
    () => ({ byGrade, setSelected, getSelected, clearSelected }),
    [byGrade, getSelected]
  )

  return (
    <SelectedHanziContext.Provider value={value}>
      {children}
    </SelectedHanziContext.Provider>
  )
}

export function useSelectedHanzi() {
  const ctx = useContext(SelectedHanziContext)
  if (!ctx)
    throw new Error(
      "useSelectedHanzi must be used within SelectedHanziProvider"
    )
  return ctx
}
