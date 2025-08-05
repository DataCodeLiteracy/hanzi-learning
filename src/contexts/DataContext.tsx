"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
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
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [hanziList, setHanziList] = useState<Hanzi[]>([])
  const [selectedGrade, setSelectedGrade] = useState<number>(8) // 기본 8급
  const [userStatistics, setUserStatistics] = useState<UserStatistics | null>(
    null
  )
  const [learningSessions, setLearningSessions] = useState<LearningSession[]>(
    []
  )
  const [isLoading, setIsLoading] = useState(false)

  // 한자 데이터 로드
  const refreshHanziData = async () => {
    if (!selectedGrade) return

    setIsLoading(true)
    try {
      const hanziData = await ApiClient.getHanziByGrade(selectedGrade)
      setHanziList(hanziData)
    } catch (error) {
      console.error("한자 데이터 로드 에러:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // 사용자 통계 로드
  const refreshUserStatistics = async () => {
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
  }

  // 학습 세션 로드
  const refreshLearningSessions = async () => {
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
  }

  // 사용자 통계 업데이트
  const updateUserStatistics = async (session: LearningSession) => {
    if (!user) return

    try {
      const currentStats = userStatistics || {
        userId: user.id,
        totalExperience: 0,
        totalSessions: 0,
        averageScore: 0,
        favoriteGame: "quiz" as const,
        weakCharacters: [],
        strongCharacters: [],
        lastPlayedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const updatedStats: UserStatistics = {
        ...currentStats,
        totalExperience: currentStats.totalExperience + session.experience,
        totalSessions: currentStats.totalSessions + 1,
        averageScore:
          (currentStats.averageScore * currentStats.totalSessions +
            session.score) /
          (currentStats.totalSessions + 1),
        lastPlayedAt: session.createdAt,
        updatedAt: new Date().toISOString(),
      }

      if (userStatistics?.id) {
        await ApiClient.updateDocument(
          "userStatistics",
          userStatistics.id,
          updatedStats
        )
      } else {
        await ApiClient.createDocument("userStatistics", updatedStats)
      }

      setUserStatistics(updatedStats)
    } catch (error) {
      console.error("사용자 통계 업데이트 에러:", error)
    }
  }

  // 등급 변경 시 한자 데이터 새로고침
  useEffect(() => {
    refreshHanziData()
  }, [selectedGrade])

  // 사용자 로그인 시 데이터 로드
  useEffect(() => {
    if (user) {
      refreshUserStatistics()
      refreshLearningSessions()
    }
  }, [user])

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
