"use client"

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react"
import { ApiClient } from "@/lib/apiClient"
import { Hanzi, UserStatistics, LearningSession } from "@/types"
import { useAuth } from "./AuthContext"

interface DataContextType {
  // 한자 데이터
  hanziList: Hanzi[]
  selectedGrade: number
  setSelectedGrade: (grade: number) => void

  // 사용자 통계
  userStatistics: UserStatistics | null

  // 학습 세션
  learningSessions: LearningSession[]

  // 로딩 상태
  isLoading: boolean

  // 데이터 새로고침
  refreshHanziData: () => Promise<void>
  refreshUserStatistics: () => Promise<void>
  refreshLearningSessions: () => Promise<void>

  // 사용자 통계 업데이트
  updateUserStatistics: (session: LearningSession) => Promise<void>

  // 실시간 통계 업데이트 (새로고침 없이)
  updateStatisticsRealTime: (
    gameType: string,
    stats: {
      experience?: number
      totalPlayed?: number
      correctAnswers?: number
      wrongAnswers?: number
    }
  ) => Promise<void>
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [hanziList, setHanziList] = useState<Hanzi[]>([])
  const [selectedGrade, setSelectedGrade] = useState<number>(0) // 기본값을 0으로 변경 (자동 로드 방지)
  const [userStatistics, setUserStatistics] = useState<UserStatistics | null>(
    null
  )
  const [learningSessions, setLearningSessions] = useState<LearningSession[]>(
    []
  )
  const [isLoading, setIsLoading] = useState(false)

  const refreshHanziData = useCallback(async () => {
    if (!selectedGrade || selectedGrade === 0) return // 0인 경우 로드하지 않음

    setIsLoading(true)
    try {
      const hanziData = await ApiClient.getHanziByGrade(selectedGrade)
      setHanziList(hanziData)
    } catch (error) {
      console.error("한자 데이터 로드 에러:", error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedGrade])

  const refreshUserStatistics = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const stats = await ApiClient.getUserStatistics(user.id)
      setUserStatistics(stats)
    } catch (error) {
      console.error("사용자 통계 로드 에러:", error)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const refreshLearningSessions = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const sessions = await ApiClient.getUserData<LearningSession>(
        "learningSessions",
        user.id
      )
      setLearningSessions(sessions)
    } catch (error) {
      console.error("학습 세션 로드 에러:", error)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const updateUserStatistics = useCallback(
    async (session: LearningSession) => {
      if (!user) return

      try {
        // 새로운 세션 추가
        const updatedSessions = [session, ...learningSessions]
        setLearningSessions(updatedSessions)

        // 통계 업데이트
        const updatedStats = await ApiClient.getUserStatistics(user.id)
        setUserStatistics(updatedStats)
      } catch (error) {
        console.error("사용자 통계 업데이트 에러:", error)
      }
    },
    [user, learningSessions]
  )

  // 실시간 통계 업데이트 (새로고침 없이)
  const updateStatisticsRealTime = useCallback(
    async (
      gameType: string,
      stats: {
        experience?: number
        totalPlayed?: number
        correctAnswers?: number
        wrongAnswers?: number
      }
    ) => {
      if (!user) return

      try {
        // 로컬 상태 즉시 업데이트 (간단한 방식)
        if (userStatistics) {
          const updatedStats = { ...userStatistics }
          updatedStats.totalExperience += stats.experience || 0
          updatedStats.totalSessions += stats.totalPlayed || 0
          setUserStatistics(updatedStats)
        }
      } catch (error) {
        console.error("실시간 통계 업데이트 에러:", error)
      }
    },
    [user, userStatistics]
  )

  // 등급 변경 시 한자 데이터 새로고침 (수동 호출시에만)
  // useEffect는 제거하고 수동으로만 refreshHanziData 호출

  // 사용자 로그인 시 데이터 로드
  useEffect(() => {
    if (user) {
      refreshUserStatistics()
      refreshLearningSessions()
    }
  }, [user, refreshUserStatistics, refreshLearningSessions])

  // 한자 데이터가 없을 때 기본 데이터 제공
  useEffect(() => {
    if (hanziList.length === 0 && !isLoading) {
      // 기본 한자 데이터 (8급)
      const defaultHanzi = [
        {
          id: "default_1",
          character: "人",
          pinyin: "rén",
          sound: "인",
          meaning: "사람",
          grade: 8,
          gradeNumber: 1,
          strokes: 2,
          radicals: ["人"],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "default_2",
          character: "大",
          pinyin: "dà",
          sound: "대",
          meaning: "크다",
          grade: 8,
          gradeNumber: 2,
          strokes: 3,
          radicals: ["大"],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "default_3",
          character: "小",
          pinyin: "xiǎo",
          sound: "소",
          meaning: "작다",
          grade: 8,
          gradeNumber: 3,
          strokes: 3,
          radicals: ["小"],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]
      setHanziList(defaultHanzi)
    }
  }, [hanziList.length, isLoading])

  const value = {
    hanziList,
    selectedGrade,
    setSelectedGrade,
    userStatistics,
    learningSessions,
    isLoading,
    refreshHanziData,
    refreshUserStatistics,
    refreshLearningSessions,
    updateUserStatistics,
    updateStatisticsRealTime,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider")
  }
  return context
}
