"use client"

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react"
import { ApiClient } from "@/lib/apiClient"
import { Hanzi, UserStatistics, LearningSession } from "@/types"
import { useAuth } from "./AuthContext"
import { HanziStorage, HanziWithKnownStatus } from "@/lib/hanziStorage"

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

  // IndexedDB 클리어
  clearIndexedDB: () => Promise<void>

  // 사용자 통계 업데이트
  updateUserStatistics: (session: LearningSession) => Promise<void>

  // 실시간 통계 업데이트 (새로고침 없이)
  updateStatisticsRealTime: (
    _gameType: string,
    _stats: {
      experience?: number
      totalPlayed?: number
      correctAnswers?: number
      wrongAnswers?: number
    }
  ) => Promise<void>
}

const DataContext = createContext<DataContextType | undefined>(undefined)

/**
 * isKnown 상태 주간 동기화 (매주 월요일 00:00 KST 기준)
 * - 캐시가 없거나 이번주 월요일 이전에 동기화되었으면 Firebase에서 새로 가져옴
 * - 그렇지 않으면 기존 캐시 사용
 */
async function syncKnownStatusIfNeeded(
  storage: HanziStorage | null,
  userId: string,
  targetGrade: number,
  hanziList: Hanzi[]
): Promise<void> {
  if (!storage || !userId || !targetGrade || hanziList.length === 0) return

  try {
    const cache = await storage.getKnownStatusCache(targetGrade)
    
    // 캐시가 있고 같은 급수이며 주간 동기화가 필요 없으면 스킵
    if (cache && cache.grade === targetGrade && !storage.needsWeeklySync(cache)) {
      console.debug("✅ isKnown 캐시 유효 - 동기화 스킵")
      return
    }

    // Firebase에서 isKnown 상태 가져오기
    console.debug("🔄 isKnown 상태 Firebase 동기화 시작...")
    const stats = await ApiClient.getHanziStatisticsByGrade(userId, targetGrade)
    
    // 한자 목록과 통계를 합쳐서 known / unknown 분리
    const knownStatusData: HanziWithKnownStatus[] = hanziList.map((hanzi) => {
      const stat = stats.find((s) => s.hanziId === hanzi.id)
      return {
        hanziId: hanzi.id,
        character: hanzi.character,
        meaning: hanzi.meaning,
        sound: hanzi.sound,
        isKnown: stat?.isKnown || false,
      }
    })

    const known = knownStatusData.filter((h) => h.isKnown)
    const unknown = knownStatusData.filter((h) => !h.isKnown)

    await storage.saveKnownStatusCache({
      grade: targetGrade,
      lastSyncedAt: new Date().toISOString(),
      known,
      unknown: Array.isArray(unknown) ? unknown : [],
    })

    console.debug(
      `✅ isKnown 캐시 동기화 완료 (아는: ${known.length} / 모르는: ${unknown.length})`
    )
  } catch (e) {
    console.error("isKnown 동기화 실패:", e)
  }
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [hanziList, setHanziList] = useState<Hanzi[]>([])
  const [selectedGrade, setSelectedGrade] = useState<number>(0)
  const [userStatistics, setUserStatistics] = useState<UserStatistics | null>(
    null
  )
  const [learningSessions, setLearningSessions] = useState<LearningSession[]>(
    []
  )
  const [isLoading, setIsLoading] = useState(false)

  // HanziStorage 인스턴스 생성 (브라우저 환경에서만, 유저별로 구분)
  const storage = useMemo(() => {
    if (typeof window !== "undefined" && user?.id) {
      const storageInstance = new HanziStorage(user.id)
      return storageInstance
    }
    return null
  }, [user?.id])

  const refreshHanziData = useCallback(async () => {
    console.log("🔄 refreshHanziData 함수 호출됨!", {
      userId: user?.id,
      preferredGrade: user?.preferredGrade,
      hasUser: !!user,
    })

    const targetGrade = user?.preferredGrade
    console.log("🔍 targetGrade 확인:", targetGrade)

    if (!targetGrade || targetGrade === 0) {
      console.log("❌ No preferred grade set, skipping data load")
      return
    }

    console.log("✅ Starting data load for grade:", targetGrade)

    setIsLoading(true)
    try {
      // IndexedDB 사용 가능 여부 확인
      console.log("🔍 refreshHanziData - storage 확인:", {
        storageExists: !!storage,
        targetGrade,
      })

      if (storage) {
        try {
          console.log(`🔍 Checking IndexedDB for grade ${targetGrade}...`)
          const isValid = await storage.isDataValid(targetGrade)
          console.log(`🔍 IndexedDB 유효성 확인 결과:`, {
            isValid,
            targetGrade,
          })

          if (isValid) {
            console.log(`✅ Found valid cached data for grade ${targetGrade}`)
            const cached = await storage.getCurrentStorageState()
            console.log(`🔍 IndexedDB에서 가져온 cached 데이터:`, {
              hasCached: !!cached,
              grade: cached?.grade,
              dataLength: cached?.data?.length,
              lastUpdated: cached?.lastUpdated,
              sampleData: cached?.data?.slice(0, 3).map((h) => ({
                character: h.character,
                meaning: h.meaning,
                sound: h.sound,
              })),
            })

            if (cached) {
              console.log(`📦 Using cached data:`, {
                grade: cached.grade,
                characters: cached.data.length,
                lastUpdated: cached.lastUpdated,
              })
              console.log(
                `🎯 setHanziList 호출 - 데이터 개수:`,
                cached.data.length
              )
              setHanziList(cached.data)
              setIsLoading(false)
              console.log(`✅ IndexedDB 데이터로 hanziList 업데이트 완료!`)
              // isKnown 캐시 주간 동기화 (백그라운드)
              syncKnownStatusIfNeeded(storage, user!.id, targetGrade, cached.data).catch(() => {})
              return
            }
          }
        } catch (error) {
          console.error("Error accessing IndexedDB:", error)
        }
      } else {
        console.log("⚠️ IndexedDB not available, fetching from Firebase")
      }

      // 캐시가 없거나 유효하지 않으면 서버에서 가져오기
      console.warn(`⚠️ IndexedDB 캐시 없음 - Firebase API 호출 시작!`)
      console.warn(`🔥 Firebase hanzi 컬렉션 읽기 발생: ${targetGrade}급`)
      console.debug(`🔄 Fetching data from Firebase for grade ${targetGrade}`)
      const hanziData = await ApiClient.getHanziByGrade(targetGrade)
      console.warn(`✅ Firebase API 호출 완료: ${hanziData.length}개 문서 읽기`)

      // IndexedDB가 사용 가능한 경우에만 저장 시도
      if (storage) {
        try {
          console.debug(`📥 Saving new data to IndexedDB:`, {
            grade: targetGrade,
            characters: hanziData.length,
          })
          await storage.saveData({
            grade: targetGrade,
            lastUpdated: new Date().toISOString(),
            data: hanziData,
          })
        } catch (error) {
          console.error("Error saving to IndexedDB:", error)
        }
      }

      console.debug("🎯 IndexedDB 데이터를 hanziList에 설정:", {
        dataSource: "IndexedDB",
        charactersCount: hanziData.length,
        sampleCharacters: hanziData.slice(0, 3).map((h) => ({
          character: h.character,
          meaning: h.meaning,
          sound: h.sound,
        })),
      })

      // 🔍 실제로 hanziList가 업데이트되는지 확인
      console.log("🔄 hanziList 상태 업데이트:", {
        beforeUpdate: hanziList.length,
        afterUpdate: hanziData.length,
        isUsingIndexedDB: true,
      })

      setHanziList(hanziData)

      // isKnown 캐시 동기화
      await syncKnownStatusIfNeeded(storage, user!.id, targetGrade, hanziData)

      // 🔍 업데이트 후 확인
      setTimeout(() => {
        console.log("✅ hanziList 업데이트 완료:", {
          currentLength: hanziList.length,
          expectedLength: hanziData.length,
          isIndexedDBData: true,
        })
      }, 100)
    } catch (error) {
      console.error("Failed to refresh hanzi data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, user?.preferredGrade, storage])

  const refreshUserStatistics = useCallback(async () => {
    if (!user?.id) return

    setIsLoading(true)
    try {
      let stats = await ApiClient.getUserStatistics(user.id)

      // userStatistics가 없으면 초기화
      if (!stats) {
        await ApiClient.initializeUserStatistics(user.id)
        stats = await ApiClient.getUserStatistics(user.id)
      }

      setUserStatistics(stats)
    } catch (error) {
      console.error("사용자 통계 로드 실패:", error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  const refreshLearningSessions = useCallback(async () => {
    if (!user?.id) return

    setIsLoading(true)
    try {
      const sessions = await ApiClient.getUserData<LearningSession>(
        "learningSessions",
        user.id
      )
      setLearningSessions(sessions)
    } catch (error) {
      console.error("학습 세션 로드 실패:", error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

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
        console.error("사용자 통계 업데이트 실패:", error)
      }
    },
    [user, learningSessions]
  )

  // 실시간 통계 업데이트 (새로고침 없이)
  const updateStatisticsRealTime = useCallback(
    async (
      _gameType: string,
      _stats: {
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
          // totalSessions는 이제 API에서 직접 업데이트되므로 여기서는 제거
          // updatedStats.totalSessions += stats.totalPlayed || 0
          setUserStatistics(updatedStats)
        }
      } catch (error) {
        console.error("실시간 통계 업데이트 실패:", error)
      }
    },
    [user, userStatistics]
  )

  // IndexedDB 클리어 함수 (해당 사용자 캐시 전부 삭제 — 메인 접근 시 다시 불러옴)
  const clearIndexedDB = useCallback(async () => {
    if (storage) {
      try {
        console.debug("🧹 Clearing all IndexedDB cache for user...")
        await storage.clearAllCacheForUser()
        console.debug("✅ IndexedDB cache cleared successfully")

        // 한자 리스트도 초기화
        setHanziList([])
        console.debug("✅ Hanzi list cleared")
      } catch (error) {
        console.error("❌ Error clearing IndexedDB:", error)
        setHanziList([])
      }
    } else {
      console.debug("⚠️ Storage not available, clearing hanzi list only")
      setHanziList([])
    }
  }, [storage])

  // 등급 변경 시 한자 데이터 새로고침 (수동 호출시에만)
  // useEffect는 제거하고 수동으로만 refreshHanziData 호출

  // 한자 데이터 로드 함수
  const loadHanziData = useCallback(async () => {
    console.debug("🚀 loadHanziData function started")

    if (!user) {
      console.debug("❌ No user, skipping loadHanziData")
      return
    }
    try {
      console.debug("🔄 refreshHanziData called", {
        userId: user.id,
        preferredGrade: user.preferredGrade,
        hasUser: !!user,
      })

      const targetGrade = user.preferredGrade
      if (!targetGrade || targetGrade === 0) {
        console.debug("❌ No preferred grade set, skipping data load")
        return
      }

      console.debug("✅ Starting data load for grade:", targetGrade)
      setIsLoading(true)

      // IndexedDB 사용 가능 여부 확인
      if (storage) {
        try {
          console.debug(`Checking IndexedDB for grade ${targetGrade}...`)
          const isValid = await storage.isDataValid(targetGrade)
          if (isValid) {
            console.debug(`✅ Found valid cached data for grade ${targetGrade}`)
            const cached = await storage.getCurrentStorageState()
            if (cached) {
              console.debug(`📦 Using cached data:`, {
                grade: cached.grade,
                characters: cached.data.length,
                lastUpdated: cached.lastUpdated,
              })
              setHanziList(cached.data)
              setIsLoading(false)
              // isKnown 캐시 주간 동기화 (백그라운드)
              syncKnownStatusIfNeeded(storage, user!.id, targetGrade, cached.data).catch(() => {})
              return
            }
          }
        } catch (error) {
          console.error("Error accessing IndexedDB:", error)
        }
      } else {
        console.debug("IndexedDB not available, fetching from Firebase")
      }

      // 캐시가 없거나 유효하지 않으면 서버에서 가져오기
      console.debug(`🔄 Fetching data from Firebase for grade ${targetGrade}`)

      // IndexedDB에서 데이터 가져오기 시도
      console.debug("🔄 IndexedDB에서 데이터 가져오기 시도...")
      let hanziData: Hanzi[] = []

      if (storage) {
        try {
          const cached = await storage.getCurrentStorageState()
          if (cached && cached.data && cached.data.length > 0) {
            console.debug("✅ IndexedDB에서 데이터 사용:", {
              grade: cached.grade,
              characters: cached.data.length,
              lastUpdated: cached.lastUpdated,
            })
            hanziData = cached.data
          } else {
            console.debug(
              "⚠️ IndexedDB 데이터가 비어있음, Firebase에서 가져오기"
            )
            hanziData = await ApiClient.getHanziByGrade(targetGrade)
          }
        } catch (error) {
          console.error("IndexedDB 데이터 가져오기 실패:", error)
          hanziData = await ApiClient.getHanziByGrade(targetGrade)
        }
      } else {
        console.debug("⚠️ Storage가 없음, Firebase에서 가져오기")
        hanziData = await ApiClient.getHanziByGrade(targetGrade)
      }

      // IndexedDB가 사용 가능한 경우에만 저장 시도
      if (storage) {
        try {
          console.debug(`📥 Saving new data to IndexedDB:`, {
            grade: targetGrade,
            characters: hanziData.length,
          })
          await storage.saveData({
            grade: targetGrade,
            lastUpdated: new Date().toISOString(),
            data: hanziData,
          })
        } catch (error) {
          console.error("Error saving to IndexedDB:", error)
        }
      }

      console.debug("🎯 IndexedDB 데이터를 hanziList에 설정:", {
        dataSource: "IndexedDB",
        charactersCount: hanziData.length,
        sampleCharacters: hanziData.slice(0, 3).map((h) => ({
          character: h.character,
          meaning: h.meaning,
          sound: h.sound,
        })),
      })

      // 🔍 실제로 hanziList가 업데이트되는지 확인
      console.log("🔄 hanziList 상태 업데이트:", {
        beforeUpdate: hanziList.length,
        afterUpdate: hanziData.length,
        isUsingIndexedDB: true,
      })

      setHanziList(hanziData)

      // 🔍 업데이트 후 확인
      setTimeout(() => {
        console.log("✅ hanziList 업데이트 완료:", {
          currentLength: hanziList.length,
          expectedLength: hanziData.length,
          isIndexedDBData: true,
        })
      }, 100)
    } catch (error) {
      console.error("Failed to refresh hanzi data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, user?.preferredGrade, storage])

  // 사용자 로그인 시 데이터 로드 (한 번만)
  useEffect(() => {
    if (!user?.id) return

    const loadInitialData = async () => {
      console.group("=== Data Loading Process ===")
      console.debug("👤 User info:", {
        userId: user.id,
        preferredGrade: user.preferredGrade,
        displayName: user.displayName,
      })

      try {
        console.group("📚 한자 데이터 로드")
        console.time("Loading hanzi data")
        await loadHanziData()
        console.timeEnd("Loading hanzi data")
        console.groupEnd()

        console.group("📊 사용자 통계 로드")
        console.time("Loading user statistics")
        await refreshUserStatistics()
        console.timeEnd("Loading user statistics")
        console.groupEnd()

        console.group("🎮 학습 세션 로드")
        console.time("Loading learning sessions")
        await refreshLearningSessions()
        console.timeEnd("Loading learning sessions")
        console.groupEnd()
      } catch (error) {
        console.error("데이터 로딩 실패:", error)
      } finally {
        console.groupEnd()
      }
    }

    loadInitialData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // 캐시 삭제 후 한자 목록이 비었을 때 다시 불러오기 (메인 등 접근 시)
  useEffect(() => {
    if (!user?.id || isLoading || hanziList.length > 0) return
    refreshHanziData()
  }, [user?.id, isLoading, hanziList.length, refreshHanziData])

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
    clearIndexedDB,
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
