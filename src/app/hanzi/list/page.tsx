"use client"

import { useAuth } from "@/contexts/AuthContext"
import LoadingSpinner from "@/components/LoadingSpinner"
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  Search,
  Info,
  AlertTriangle,
  Trash2,
  X,
  Pencil,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import {
  ApiClient,
  type HanziListServerCursor,
  type HanziListServerReportFilter,
  type HanziListServerSort,
} from "@/lib/apiClient"
import { Hanzi, RelatedWord } from "@/types"
import { useTimeTracking } from "@/hooks/useTimeTracking"
import { HanziStorage } from "@/lib/hanziStorage"
import {
  checkGradeQueryLimit,
  incrementGradeQueryCount,
  type PageType,
} from "@/lib/gradeQueryLimit"
import { CustomSelect } from "@/components/ui/CustomSelect"

const PAGE_TYPE: PageType = "hanzi-list"
const HANZI_LIST_PAGE_SIZE = 20

type HanziListSortMode =
  | "soundAsc"
  | "gradeNumber"
  | "completedFirst"
  | "incompleteFirst"
  | "reportedFirst"

type ReportFilterMode = "all" | "reported_only" | "not_reported"
type LearningFilterMode = "all" | "completed" | "incomplete"

export default function HanziListPage() {
  const { user, loading: authLoading, initialLoading } = useAuth()
  const [selectedGrade, setSelectedGrade] = useState<number>(
    user?.preferredGrade || 8
  )
  const [hanziList, setHanziList] = useState<Hanzi[]>([])
  const [isLoading, setIsLoading] = useState(true) // 통합 로딩 상태
  const [isSyncing, setIsSyncing] = useState<boolean>(false) // 동기화 로딩 상태
  const [noDataMessage, setNoDataMessage] = useState<string>("")
  const [showNoDataModal, setShowNoDataModal] = useState<boolean>(false)
  const [showLimitModal, setShowLimitModal] = useState<boolean>(false) // 조회 제한 모달
  const [isInitialLoad, setIsInitialLoad] = useState(true) // 초기 로드 여부
  const [reportFilter, setReportFilter] = useState<ReportFilterMode>("all")
  const [learningFilter, setLearningFilter] =
    useState<LearningFilterMode>("all")
  const [listSort, setListSort] = useState<HanziListSortMode>("soundAsc")
  const [hanziSearchQuery, setHanziSearchQuery] = useState("")
  const [hanziListPage, setHanziListPage] = useState(1)
  const [reportedHanziModal, setReportedHanziModal] = useState<Hanzi | null>(
    null
  ) // 신고된 한자 클릭 시 관련 단어 수정 모달
  const [editingWordIndex, setEditingWordIndex] = useState<number | null>(null)
  const [editDraftHanzi, setEditDraftHanzi] = useState("")
  const [editDraftKorean, setEditDraftKorean] = useState("")
  const [newWordHanzi, setNewWordHanzi] = useState("")
  const [newWordKorean, setNewWordKorean] = useState("")
  const [isSavingRelatedWords, setIsSavingRelatedWords] = useState(false)
  const [reportMeaningDraft, setReportMeaningDraft] = useState("")
  const [reportSoundDraft, setReportSoundDraft] = useState("")
  const [showHanziEditSuccess, setShowHanziEditSuccess] = useState(false)

  // 시간 추적 훅 (페이지 접속 시간 체크)
  const { endSession, isActive } = useTimeTracking({
    userId: user?.id || "",
    type: "page",
    activity: "hanzi-list",
    autoStart: true, // 페이지 접속 시 자동 시작
    autoEnd: true,
  })

  // 페이지를 떠날 때 시간 추적 종료
  useEffect(() => {
    return () => {
      if (isActive) {
        endSession()
      }
    }
  }, [isActive, endSession])
  const [knownHanzi, setKnownHanzi] = useState<Set<string>>(new Set()) // 알고 있는 한자 ID들
  const gradeDataCache = useRef<Map<number, Hanzi[]>>(new Map()) // 급수별 데이터 캐시
  // userStatsCache는 현재 사용되지 않지만 setUserStatsCache로 캐시 업데이트 (향후 사용 예정)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [userStatsCache, setUserStatsCache] = useState<
    {
      hanziId: string
      character: string
      meaning: string
      sound: string
      gradeNumber: number
      totalStudied: number
      correctAnswers: number
      wrongAnswers: number
      accuracy: number
      lastStudied: string | null
      isKnown?: boolean
      totalWrited?: number
      lastWrited?: string
    }[]
  >([]) // 사용자 통계 캐시
  const [learningStats, setLearningStats] = useState<{
    total: number
    completed: number
    percentage: number
  }>({ total: 0, completed: 0, percentage: 0 })
  const [showSyncSuccess, setShowSyncSuccess] = useState<boolean>(false)
  const [syncResult, setSyncResult] = useState<{
    count: number
    grades: number[]
  }>({ count: 0, grades: [] })

  /** Firestore 페이지 단위 목록 (클라이언트 전체 로드가 아닐 때) */
  const [serverListRows, setServerListRows] = useState<Hanzi[]>([])
  const [serverPageIndex, setServerPageIndex] = useState(0)
  const [serverHasMore, setServerHasMore] = useState(false)
  const [serverTotalCount, setServerTotalCount] = useState<number | null>(null)
  const [serverPageCache, setServerPageCache] = useState<Map<number, Hanzi[]>>(
    () => new Map()
  )
  const serverPageCacheRef = useRef<Map<number, Hanzi[]>>(new Map())
  const serverPageStartCursorsRef = useRef<(HanziListServerCursor | null)[]>([
    null,
  ])

  useEffect(() => {
    serverPageCacheRef.current = serverPageCache
  }, [serverPageCache])

  // 학습완료 통계 계산 - 수정: 현재 선택된 급수의 한자만 카운트
  const calculateLearningStats = useCallback(
    (hanziList: Hanzi[], knownHanzi: Set<string>) => {
      const total = hanziList.length
      // 현재 hanziList에 있는 한자들 중에서만 학습완료된 것 카운트
      const completed = hanziList.filter((hanzi) =>
        knownHanzi.has(hanzi.id)
      ).length
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

      setLearningStats({ total, completed, percentage })
    },
    []
  )

  const clearServerPagingState = useCallback(() => {
    setServerListRows([])
    setServerTotalCount(null)
    setServerHasMore(false)
    setServerPageIndex(0)
    setServerPageCache(new Map())
    serverPageStartCursorsRef.current = [null]
  }, [])

  const applyUserStatsForClientList = useCallback(
    async (data: Hanzi[], grade: number) => {
      if (!user) {
        calculateLearningStats(data, new Set())
        return
      }
      try {
        const gradeStats = await ApiClient.getHanziStatisticsByGrade(
          user.id,
          grade
        )
        const knownIds = new Set<string>()
        data.forEach((hanzi) => {
          const stat = gradeStats.find((s) => s.hanziId === hanzi.id)
          if (stat?.isKnown) knownIds.add(hanzi.id)
        })
        setKnownHanzi(knownIds)
        calculateLearningStats(data, knownIds)
        try {
          const storage = new HanziStorage(user.id)
          const cache = await storage.getKnownStatusCache(grade)
          if (!cache && data.length > 0) {
            await storage.buildAndSaveKnownStatusFromList(
              grade,
              data,
              knownIds
            )
          }
        } catch (e) {
          console.error("IndexedDB known/unknown 캐시 생성 실패:", e)
        }
      } catch (error) {
        console.error("한자 통계 로드 실패:", error)
        setKnownHanzi(new Set())
        calculateLearningStats(data, new Set())
      }
    },
    [user, calculateLearningStats]
  )

  /** 검색·학습 필터·완료순 정렬일 때만 급 전체를 클라이언트로 로드 (그 외는 Firestore 페이지) */
  const needClientBulkForList = useMemo(
    () =>
      learningFilter !== "all" ||
      listSort === "completedFirst" ||
      listSort === "incompleteFirst" ||
      hanziSearchQuery.trim() !== "",
    [learningFilter, listSort, hanziSearchQuery]
  )

  const refreshListData = useCallback(
    async (grade: number) => {
      if (!user) return
      setIsLoading(true)
      try {
        if (needClientBulkForList) {
          clearServerPagingState()
          let data: Hanzi[]
          if (gradeDataCache.current.has(grade)) {
            data = gradeDataCache.current.get(grade)!
          } else {
            const { canQuery } = checkGradeQueryLimit(
              grade,
              user.preferredGrade,
              PAGE_TYPE
            )
            if (!canQuery) {
              setShowLimitModal(true)
              return
            }
            data = await ApiClient.getHanziByGrade(grade)
            gradeDataCache.current.set(grade, data)
            incrementGradeQueryCount(grade, user.preferredGrade, PAGE_TYPE)
          }
          setHanziList(data)
          if (data.length === 0) {
            const gradeName =
              grade === 5.5
                ? "준5급"
                : grade === 4.5
                ? "준4급"
                : grade === 3.5
                ? "준3급"
                : `${grade}급`
            setNoDataMessage(`${gradeName}에 등록된 한자가 없습니다.`)
            setShowNoDataModal(true)
          } else {
            setNoDataMessage("")
            setShowNoDataModal(false)
          }
          await applyUserStatsForClientList(data, grade)
          return
        }

        // Firestore 페이지 모드 (급당 약 20+α 문서 읽기/페이지)
        setHanziList([])
        const { canQuery } = checkGradeQueryLimit(
          grade,
          user.preferredGrade,
          PAGE_TYPE
        )
        if (!canQuery) {
          setShowLimitModal(true)
          return
        }
        incrementGradeQueryCount(grade, user.preferredGrade, PAGE_TYPE)

        const sortFS: HanziListServerSort =
          listSort === "gradeNumber"
            ? "gradeNumber"
            : listSort === "reportedFirst"
            ? "reportedFirst"
            : "soundAsc"
        const rf = reportFilter as HanziListServerReportFilter

        const [total, page] = await Promise.all([
          ApiClient.countHanziForList(grade, rf),
          ApiClient.getHanziListPage({
            grade,
            pageSize: HANZI_LIST_PAGE_SIZE,
            startAfterValues: null,
            sort: sortFS,
            reportFilter: rf,
          }),
        ])

        setServerTotalCount(total)
        setServerListRows(page.items)
        setServerHasMore(page.hasMore)
        serverPageStartCursorsRef.current = [null]
        if (page.nextStartAfter) {
          serverPageStartCursorsRef.current[1] = page.nextStartAfter
        }
        setServerPageIndex(0)
        setServerPageCache(new Map([[0, page.items]]))

        if (total === 0) {
          const gradeName =
            grade === 5.5
              ? "준5급"
              : grade === 4.5
              ? "준4급"
              : grade === 3.5
              ? "준3급"
              : `${grade}급`
          setNoDataMessage(`${gradeName}에 등록된 한자가 없습니다.`)
          setShowNoDataModal(true)
        } else {
          setNoDataMessage("")
          setShowNoDataModal(false)
        }

        const storage = new HanziStorage(user.id)
        const cache = await storage.getKnownStatusCache(grade)
        const idMap = await ApiClient.getIsKnownMapForHanziIds(
          user.id,
          page.items.map((h) => h.id)
        )
        if (cache) {
          const ids = new Set(cache.known.map((k) => k.hanziId))
          idMap.forEach((known, hid) => {
            if (known) ids.add(hid)
            else ids.delete(hid)
          })
          setKnownHanzi(ids)
          setLearningStats({
            total,
            completed: cache.known.length,
            percentage:
              total > 0
                ? Math.round((cache.known.length / total) * 100)
                : 0,
          })
        } else {
          const s = new Set<string>()
          idMap.forEach((v, k) => {
            if (v) s.add(k)
          })
          setKnownHanzi(s)
          setLearningStats({
            total,
            completed: s.size,
            percentage: total > 0 ? Math.round((s.size / total) * 100) : 0,
          })
        }
      } catch (error) {
        console.error("한자 데이터 로드 실패:", error)
      } finally {
        setIsLoading(false)
      }
    },
    [
      user,
      needClientBulkForList,
      reportFilter,
      listSort,
      applyUserStatsForClientList,
      clearServerPagingState,
    ]
  )

  useEffect(() => {
    if (user && !authLoading && isInitialLoad) {
      const initialGrade = user.preferredGrade || 8
      setSelectedGrade(initialGrade)
      setIsInitialLoad(false)
    }
  }, [user, authLoading, isInitialLoad])

  useEffect(() => {
    if (!user || authLoading || isInitialLoad) return
    void refreshListData(selectedGrade)
  }, [
    user,
    authLoading,
    isInitialLoad,
    selectedGrade,
    reportFilter,
    listSort,
    learningFilter,
    hanziSearchQuery,
    user?.preferredGrade,
    refreshListData,
  ])

  const useServerSidePaging = !needClientBulkForList

  // 초기 데이터 로드 후 통계 (클라이언트 전체 목록일 때만 — 서버 페이징은 refreshListData에서 설정)
  useEffect(() => {
    if (useServerSidePaging) return
    if (hanziList.length > 0 && knownHanzi.size >= 0) {
      calculateLearningStats(hanziList, knownHanzi)
    }
  }, [
    hanziList,
    knownHanzi,
    calculateLearningStats,
    useServerSidePaging,
  ])

  const filteredSortedHanziList = useMemo(() => {
    let list = [...hanziList]

    if (reportFilter === "reported_only") {
      list = list.filter((h) => h.hasDataIssue)
    } else if (reportFilter === "not_reported") {
      list = list.filter((h) => !h.hasDataIssue)
    }

    const effLearning: LearningFilterMode = user ? learningFilter : "all"
    if (effLearning === "completed") {
      list = list.filter((h) => knownHanzi.has(h.id))
    } else if (effLearning === "incomplete") {
      list = list.filter((h) => !knownHanzi.has(h.id))
    }

    const q = hanziSearchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (h) =>
          h.character.includes(q) ||
          h.meaning.toLowerCase().includes(q) ||
          (h.sound || "").toLowerCase().includes(q)
      )
    }

    const compareSoundThenGrade = (a: Hanzi, b: Hanzi) => {
      const s = (a.sound || "").localeCompare(b.sound || "", "ko", {
        sensitivity: "base",
      })
      if (s !== 0) return s
      return (a.gradeNumber ?? 0) - (b.gradeNumber ?? 0)
    }

    list.sort((a, b) => {
      switch (listSort) {
        case "gradeNumber":
          return (a.gradeNumber ?? 0) - (b.gradeNumber ?? 0)
        case "completedFirst": {
          const ak = user ? knownHanzi.has(a.id) : false
          const bk = user ? knownHanzi.has(b.id) : false
          if (ak !== bk) return ak ? -1 : 1
          return compareSoundThenGrade(a, b)
        }
        case "incompleteFirst": {
          const ak = user ? knownHanzi.has(a.id) : false
          const bk = user ? knownHanzi.has(b.id) : false
          if (ak !== bk) return ak ? 1 : -1
          return compareSoundThenGrade(a, b)
        }
        case "reportedFirst": {
          const ar = a.hasDataIssue ? 1 : 0
          const br = b.hasDataIssue ? 1 : 0
          if (br !== ar) return br - ar
          return compareSoundThenGrade(a, b)
        }
        case "soundAsc":
        default:
          return compareSoundThenGrade(a, b)
      }
    })

    return list
  }, [
    hanziList,
    reportFilter,
    learningFilter,
    hanziSearchQuery,
    listSort,
    knownHanzi,
    user,
  ])

  useEffect(() => {
    setHanziListPage(1)
  }, [
    selectedGrade,
    reportFilter,
    learningFilter,
    listSort,
    hanziSearchQuery,
  ])

  const gradeSelectOptions = useMemo(
    () =>
      [8, 7, 6, 5.5, 5, 4.5, 4, 3.5, 3].map((grade) => ({
        value: String(grade),
        label:
          grade === 5.5
            ? "준5급"
            : grade === 4.5
            ? "준4급"
            : grade === 3.5
            ? "준3급"
            : `${grade}급`,
      })),
    []
  )

  const reportFilterOptions = useMemo(
    () => [
      { value: "all", label: "신고: 전체" },
      { value: "reported_only", label: "신고된 항목만" },
      { value: "not_reported", label: "신고 없음만" },
    ],
    []
  )

  const learningFilterOptions = useMemo(
    () => [
      { value: "all", label: "학습완료: 전체" },
      { value: "completed", label: "학습완료만" },
      { value: "incomplete", label: "미완료만" },
    ],
    []
  )

  const listSortOptions = useMemo(
    () => [
      { value: "soundAsc", label: "음순 (가나다, 기본)" },
      { value: "gradeNumber", label: "급 내 번호순" },
      { value: "completedFirst", label: "학습완료 먼저" },
      { value: "incompleteFirst", label: "미완료 먼저" },
      { value: "reportedFirst", label: "신고 항목 먼저" },
    ],
    []
  )

  const openHanziEditModal = useCallback((h: Hanzi) => {
    setReportedHanziModal(h)
    setEditingWordIndex(null)
    setNewWordHanzi("")
    setNewWordKorean("")
  }, [])

  // 급수 변경 시 selectedGrade만 바꾸면 refreshListData effect가 로드
  const handleGradeChange = (grade: number) => {
    if (grade === selectedGrade) return
    setSelectedGrade(grade)
    setHanziListPage(1)
    setLearningStats({ total: 0, completed: 0, percentage: 0 })
  }

  const fetchServerPage = useCallback(
    async (pageIdx: number) => {
      if (!user || !useServerSidePaging) return
      const cached = serverPageCacheRef.current.get(pageIdx)
      if (cached) {
        setServerListRows(cached)
        setServerPageIndex(pageIdx)
        const totalPages = Math.max(
          1,
          Math.ceil((serverTotalCount ?? 0) / HANZI_LIST_PAGE_SIZE)
        )
        setServerHasMore(pageIdx < totalPages - 1)
        const idMap = await ApiClient.getIsKnownMapForHanziIds(
          user.id,
          cached.map((h) => h.id)
        )
        setKnownHanzi((prev) => {
          const n = new Set(prev)
          idMap.forEach((known, hid) => {
            if (known) n.add(hid)
            else n.delete(hid)
          })
          return n
        })
        return
      }

      setIsLoading(true)
      try {
        const sortFS: HanziListServerSort =
          listSort === "gradeNumber"
            ? "gradeNumber"
            : listSort === "reportedFirst"
            ? "reportedFirst"
            : "soundAsc"
        const rf = reportFilter as HanziListServerReportFilter
        const startVals =
          pageIdx === 0
            ? null
            : serverPageStartCursorsRef.current[pageIdx]?.values ?? null

        const page = await ApiClient.getHanziListPage({
          grade: selectedGrade,
          pageSize: HANZI_LIST_PAGE_SIZE,
          startAfterValues: startVals,
          sort: sortFS,
          reportFilter: rf,
        })

        setServerPageCache((prev) => new Map(prev).set(pageIdx, page.items))
        setServerListRows(page.items)
        setServerPageIndex(pageIdx)
        setServerHasMore(page.hasMore)
        if (page.nextStartAfter) {
          serverPageStartCursorsRef.current[pageIdx + 1] = page.nextStartAfter
        }

        const idMap = await ApiClient.getIsKnownMapForHanziIds(
          user.id,
          page.items.map((h) => h.id)
        )
        setKnownHanzi((prev) => {
          const n = new Set(prev)
          idMap.forEach((known, hid) => {
            if (known) n.add(hid)
            else n.delete(hid)
          })
          return n
        })
      } catch (e) {
        console.error("서버 페이지 로드 실패:", e)
      } finally {
        setIsLoading(false)
      }
    },
    [user, useServerSidePaging, selectedGrade, listSort, reportFilter, serverTotalCount]
  )

  // 신고된 한자: 뜻·음·관련 단어 저장 후 Firestore 반영·신고 해제
  const saveHanziDataFix = async (
    hanziId: string,
    newRelatedWords: RelatedWord[],
    opts?: { finishSession?: boolean }
  ): Promise<boolean> => {
    const meaningTrim = reportMeaningDraft.trim()
    const soundTrim = reportSoundDraft.trim()
    if (!meaningTrim || !soundTrim) {
      alert("뜻과 음을 모두 입력해주세요.")
      return false
    }
    if (!user) return false
    try {
      setIsSavingRelatedWords(true)
      await ApiClient.updateHanziMeaningSoundRelatedAndClearIssue(hanziId, {
        meaning: meaningTrim,
        sound: soundTrim,
        relatedWords: newRelatedWords,
      })

      const gradeForCache =
        reportedHanziModal?.id === hanziId
          ? reportedHanziModal.grade
          : hanziList.find((h) => h.id === hanziId)?.grade ??
            serverListRows.find((h) => h.id === hanziId)?.grade ??
            user?.preferredGrade ??
            8

      const patched = {
        meaning: meaningTrim,
        sound: soundTrim,
        relatedWords: newRelatedWords,
        hasDataIssue: false,
        reportedRelatedWord: undefined as string | undefined,
      }

      try {
        const storage = new HanziStorage(user.id)
        await storage.patchHanziInStoredCaches(hanziId, gradeForCache, patched)
      } catch (e) {
        console.warn("IndexedDB 한자 캐시 패치 실패 (표시는 로컬 상태로 반영됨):", e)
      }

      setHanziList((prev) =>
        prev.map((h) => (h.id === hanziId ? { ...h, ...patched } : h))
      )
      setServerListRows((prev) =>
        prev.map((h) => (h.id === hanziId ? { ...h, ...patched } : h))
      )
      setServerPageCache((prev) => {
        const m = new Map(prev)
        for (const [k, rows] of m) {
          m.set(
            k,
            rows.map((h) => (h.id === hanziId ? { ...h, ...patched } : h))
          )
        }
        return m
      })

      if (opts?.finishSession) {
        setReportedHanziModal(null)
        setShowHanziEditSuccess(true)
      } else {
        setReportedHanziModal((prev) =>
          prev?.id === hanziId
            ? {
                ...prev,
                meaning: meaningTrim,
                sound: soundTrim,
                relatedWords: newRelatedWords,
                hasDataIssue: false,
                reportedRelatedWord: undefined,
              }
            : prev
        )
      }
      return true
    } catch (error) {
      console.error("한자 데이터 저장 실패:", error)
      alert("저장에 실패했습니다. 다시 시도해주세요.")
      return false
    } finally {
      setIsSavingRelatedWords(false)
    }
  }

  const removeReportedRelatedWord = async (
    hanziId: string,
    indexToRemove: number
  ) => {
    const hanzi =
      hanziList.find((h) => h.id === hanziId) ??
      serverListRows.find((h) => h.id === hanziId)
    if (!hanzi?.relatedWords?.length) return
    const newRelatedWords = hanzi.relatedWords.filter(
      (_, i) => i !== indexToRemove
    )
    await saveHanziDataFix(hanziId, newRelatedWords)
  }

  const addReportedRelatedWord = async () => {
    if (!reportedHanziModal) return
    const hanziTrim = newWordHanzi.trim()
    const koreanTrim = newWordKorean.trim()
    if (!hanziTrim || !koreanTrim) {
      alert("한자와 독음(한글)을 모두 입력해주세요.")
      return
    }
    const current = reportedHanziModal.relatedWords || []
    const newRelatedWords: RelatedWord[] = [
      ...current,
      { hanzi: hanziTrim, korean: koreanTrim },
    ]
    await saveHanziDataFix(reportedHanziModal.id, newRelatedWords)
    setNewWordHanzi("")
    setNewWordKorean("")
  }

  const startEditWord = (index: number) => {
    const word = reportedHanziModal?.relatedWords?.[index]
    if (!word) return
    setEditingWordIndex(index)
    setEditDraftHanzi(word.hanzi)
    setEditDraftKorean(word.korean)
  }

  const cancelEditWord = () => {
    setEditingWordIndex(null)
    setEditDraftHanzi("")
    setEditDraftKorean("")
  }

  const saveEditWord = async () => {
    if (!reportedHanziModal || editingWordIndex == null) return
    const hanziTrim = editDraftHanzi.trim()
    const koreanTrim = editDraftKorean.trim()
    if (!hanziTrim || !koreanTrim) {
      alert("한자와 독음(한글)을 모두 입력해주세요.")
      return
    }
    const current = reportedHanziModal.relatedWords || []
    const newRelatedWords = current.map((w, i) =>
      i === editingWordIndex
        ? { ...w, hanzi: hanziTrim, korean: koreanTrim }
        : w
    )
    await saveHanziDataFix(reportedHanziModal.id, newRelatedWords)
    cancelEditWord()
  }

  const handleSaveReportedHanziAndClear = async () => {
    if (!reportedHanziModal) return
    await saveHanziDataFix(
      reportedHanziModal.id,
      reportedHanziModal.relatedWords || [],
      { finishSession: true }
    )
  }

  useEffect(() => {
    if (!reportedHanziModal) {
      setReportMeaningDraft("")
      setReportSoundDraft("")
      return
    }
    setReportMeaningDraft(reportedHanziModal.meaning)
    setReportSoundDraft(reportedHanziModal.sound)
  }, [reportedHanziModal])

  // 네이버 한자 사전으로 연결
  const openNaverDictionary = (character: string) => {
    const url = `https://hanja.dict.naver.com/search?query=${encodeURIComponent(
      character
    )}`
    window.open(url, "_blank")
  }

  // 알고 있는 한자 체크박스 변경 처리
  const handleKnownToggle = async (hanziId: string, isKnown: boolean) => {
    if (!user) return

    try {
      // 로컬 상태 업데이트
      const newKnownHanzi = new Set(knownHanzi)
      if (isKnown) {
        newKnownHanzi.add(hanziId)
      } else {
        newKnownHanzi.delete(hanziId)
      }
      setKnownHanzi(newKnownHanzi)

      // 현재 한자의 정보 가져오기 (character, meaning, sound 등)
      const currentHanzi =
        hanziList.find((h) => h.id === hanziId) ??
        serverListRows.find((h) => h.id === hanziId)
      if (!currentHanzi) return

      // 모든 급수에서 동일한 한자 찾아서 업데이트
      const allGrades = [8, 7, 6, 5.5, 5, 4.5, 4, 3.5, 3]
      const updatePromises: Promise<void>[] = []

      for (const grade of allGrades) {
        try {
          // 해당 급수의 한자 데이터 가져오기 (캐시 우선)
          let gradeData: Hanzi[]
          if (gradeDataCache.current.has(grade)) {
            gradeData = gradeDataCache.current.get(grade)!
          } else {
            gradeData = await ApiClient.getHanziByGrade(grade)
            gradeDataCache.current.set(grade, gradeData)
          }

          // 동일한 한자 찾기 (character가 같은 것)
          const sameCharacter = gradeData.find(
            (h) => h.character === currentHanzi.character
          )

          if (sameCharacter) {
            // 해당 급수에서도 학습완료 상태 업데이트
            updatePromises.push(
              ApiClient.updateHanziStatisticsWithKnown(
                user.id,
                sameCharacter.id,
                "quiz",
                true, // isCorrect는 의미 없으므로 true로 설정
                isKnown
              )
            )
          }
        } catch (error) {
          // 해당 급수에 데이터가 없거나 오류가 발생하면 무시
          console.log(`${grade}급 데이터 없음 또는 오류:`, error)
        }
      }

      // 모든 업데이트 완료 대기
      await Promise.all(updatePromises)

      // 사용자 통계 캐시 업데이트 (새로운 상태 반영)
      try {
        const updatedStats = await ApiClient.getHanziStatisticsNew(user.id)
        setUserStatsCache(updatedStats)
      } catch (error) {
        console.error("통계 캐시 업데이트 실패:", error)
      }

      // IndexedDB isKnown 캐시 즉시 업데이트 (해당 급수 캐시에 반영)
      try {
        const storage = new HanziStorage(user.id)
        const cache = await storage.getKnownStatusCache(selectedGrade)
        if (!cache) {
          if (hanziList.length > 0) {
            await storage.buildAndSaveKnownStatusFromList(
              selectedGrade,
              hanziList,
              newKnownHanzi
            )
          }
        } else {
          await storage.updateSingleHanziKnownStatus(
            hanziId,
            isKnown,
            selectedGrade
          )
        }
      } catch (error) {
        console.error("IndexedDB isKnown 캐시 업데이트 실패:", error)
      }

      console.log(
        `${
          isKnown ? "학습완료" : "학습미완료"
        } 상태를 모든 급수에서 업데이트했습니다.`
      )

      // 학습완료 통계 다시 계산
      if (
        useServerSidePaging &&
        serverTotalCount != null &&
        serverTotalCount > 0
      ) {
        const wasKnown = knownHanzi.has(hanziId)
        const delta =
          isKnown && !wasKnown ? 1 : !isKnown && wasKnown ? -1 : 0
        setLearningStats((prev) => {
          const completed = Math.min(
            serverTotalCount,
            Math.max(0, prev.completed + delta)
          )
          return {
            total: serverTotalCount,
            completed,
            percentage: Math.round((completed / serverTotalCount) * 100),
          }
        })
      } else {
        calculateLearningStats(hanziList, newKnownHanzi)
      }
    } catch (error) {
      console.error("한자 상태 업데이트 실패:", error)
      // 실패 시 원래 상태로 되돌리기
      setKnownHanzi(knownHanzi)
    }
  }

  // 다른 급수에 학습완료 상태 동기화
  const handleSyncAcrossGrades = async () => {
    if (!user) return

    setIsSyncing(true)
    try {
      // 현재 급수에서 체크된 한자들의 character 추출
      const currentKnownCharacters = new Set<string>()
      const currentKnownDetails: Array<{
        id: string
        character: string
        meaning: string
      }> = []

      if (useServerSidePaging) {
        const storage = new HanziStorage(user.id)
        const cache = await storage.getKnownStatusCache(selectedGrade)
        if (cache && cache.known.length > 0) {
          cache.known.forEach((k) => {
            currentKnownCharacters.add(k.character)
            currentKnownDetails.push({
              id: k.hanziId,
              character: k.character,
              meaning: k.meaning,
            })
          })
        } else {
          knownHanzi.forEach((hid) => {
            const row = serverListRows.find((h) => h.id === hid)
            if (row) {
              currentKnownCharacters.add(row.character)
              currentKnownDetails.push({
                id: row.id,
                character: row.character,
                meaning: row.meaning,
              })
            }
          })
        }
      } else {
        hanziList.forEach((hanzi) => {
          if (knownHanzi.has(hanzi.id)) {
            currentKnownCharacters.add(hanzi.character)
            currentKnownDetails.push({
              id: hanzi.id,
              character: hanzi.character,
              meaning: hanzi.meaning,
            })
          }
        })
      }

      if (currentKnownCharacters.size === 0) {
        console.log("동기화할 학습완료 한자가 없습니다.")
        setIsSyncing(false)
        return
      }

      console.log("=== 동기화 시작 ===")
      console.log(`현재 급수: ${selectedGrade}급`)
      console.log(`동기화할 한자들:`, currentKnownDetails)
      console.log(
        `동기화할 character들: ${Array.from(currentKnownCharacters).join(", ")}`
      )

      const allGrades = [8, 7, 6, 5.5, 5, 4.5, 4, 3.5, 3]
      const updatePromises: Promise<void>[] = []
      const syncedGrades: number[] = []
      const syncDetails: Array<{
        grade: number
        hanziId: string
        character: string
        success: boolean
      }> = []

      for (const grade of allGrades) {
        if (grade === selectedGrade) continue // 현재 급수는 제외

        try {
          console.log(`\n--- ${grade}급 처리 시작 ---`)

          let gradeData: Hanzi[]
          if (gradeDataCache.current.has(grade)) {
            gradeData = gradeDataCache.current.get(grade)!
            console.log(
              `${grade}급 데이터를 캐시에서 가져왔습니다. (${gradeData.length}개)`
            )
          } else {
            gradeData = await ApiClient.getHanziByGrade(grade)
            gradeDataCache.current.set(grade, gradeData)
            console.log(
              `${grade}급 데이터를 새로 로드했습니다. (${gradeData.length}개)`
            )
          }

          // 현재 급수에서 체크된 character와 일치하는 한자들 찾기
          let gradeSyncedCount = 0
          const gradeMatches: Array<{
            hanziId: string
            character: string
            meaning: string
          }> = []

          gradeData.forEach((hanzi) => {
            if (currentKnownCharacters.has(hanzi.character)) {
              gradeMatches.push({
                hanziId: hanzi.id,
                character: hanzi.character,
                meaning: hanzi.meaning,
              })

              console.log(
                `${grade}급에서 매칭된 한자: ${hanzi.character} (${hanzi.meaning}) - ID: ${hanzi.id}`
              )

              const updatePromise = ApiClient.updateHanziStatisticsWithKnown(
                user.id,
                hanzi.id,
                "quiz",
                true, // isCorrect는 의미 없으므로 true로 설정
                true // isKnown = true
              )
                .then(() => {
                  console.log(
                    `✅ ${grade}급 ${hanzi.character} (${hanzi.id}) 동기화 성공`
                  )
                  syncDetails.push({
                    grade,
                    hanziId: hanzi.id,
                    character: hanzi.character,
                    success: true,
                  })
                })
                .catch((error) => {
                  console.error(
                    `❌ ${grade}급 ${hanzi.character} (${hanzi.id}) 동기화 실패:`,
                    error
                  )
                  syncDetails.push({
                    grade,
                    hanziId: hanzi.id,
                    character: hanzi.character,
                    success: false,
                  })
                })

              updatePromises.push(updatePromise)
              gradeSyncedCount++
            }
          })

          if (gradeSyncedCount > 0) {
            syncedGrades.push(grade)
            console.log(
              `${grade}급에서 ${gradeSyncedCount}개 한자 동기화 예정:`,
              gradeMatches
            )
          } else {
            console.log(`${grade}급에는 동기화할 한자가 없습니다.`)
          }
        } catch (error) {
          console.error(`${grade}급 처리 중 오류:`, error)
        }
      }

      if (updatePromises.length > 0) {
        console.log(`\n=== 동기화 실행 ===`)
        console.log(
          `총 ${updatePromises.length}개의 한자 통계를 다른 급수에 동기화합니다...`
        )

        // 모든 업데이트 완료 대기
        await Promise.all(updatePromises)

        console.log(`\n=== 동기화 결과 ===`)
        console.log(
          `동기화 완료된 한자들:`,
          syncDetails.filter((d) => d.success)
        )
        console.log(
          `동기화 실패한 한자들:`,
          syncDetails.filter((d) => !d.success)
        )
        console.log(
          `${updatePromises.length}개의 한자 통계를 ${syncedGrades.join(
            ", "
          )}급에 동기화 완료!`
        )

        // 동기화 결과 저장 및 성공 메시지 표시
        setSyncResult({ count: updatePromises.length, grades: syncedGrades })
        setShowSyncSuccess(true)

        // 3초 후 성공 메시지 자동 숨김
        setTimeout(() => setShowSyncSuccess(false), 3000)

        // 사용자 통계 캐시 완전 새로고침
        try {
          console.log("\n=== 캐시 새로고침 ===")
          console.log("통계 캐시를 새로고침합니다...")
          const updatedStats = await ApiClient.getHanziStatisticsNew(user.id)
          setUserStatsCache(updatedStats)
          console.log("통계 캐시 새로고침 완료")

          // 새로고침된 통계에서 동기화된 한자들 확인
          const syncedStats = updatedStats.filter((stat) =>
            syncDetails.some(
              (detail) => detail.hanziId === stat.hanziId && detail.success
            )
          )
          console.log("동기화된 한자들의 최신 통계:", syncedStats)
        } catch (error) {
          console.error("통계 캐시 업데이트 실패:", error)
        }
      } else {
        console.log("동기화할 한자가 다른 급수에 없습니다.")
      }
    } catch (error) {
      console.error("다른 급수 동기화 실패:", error)
    } finally {
      setIsSyncing(false)
    }
  }

  // 로딩 중일 때는 로딩 스피너 표시 (진짜 초기 로딩만)
  if (initialLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='인증 상태를 확인하는 중...' />
      </div>
    )
  }

  // 인증이 완료되었지만 사용자가 없을 때 (즉시 표시, 로딩 없음)
  if (!user) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-gray-900 mb-4'>
            로그인이 필요합니다
          </h1>
          <Link href='/login' className='text-blue-600 hover:text-blue-800'>
            로그인하기
          </Link>
        </div>
      </div>
    )
  }

  const gradeName =
    selectedGrade === 5.5
      ? "준5급"
      : selectedGrade === 4.5
      ? "준4급"
      : selectedGrade === 3.5
      ? "준3급"
      : `${selectedGrade}급`

  const totalFilteredCount = useServerSidePaging
    ? serverTotalCount ?? 0
    : filteredSortedHanziList.length
  const totalListPages = Math.max(
    1,
    Math.ceil(totalFilteredCount / HANZI_LIST_PAGE_SIZE)
  )
  const safeListPage = Math.min(hanziListPage, totalListPages)
  const displayPageIndex = useServerSidePaging ? serverPageIndex : safeListPage - 1
  const pageStart =
    totalFilteredCount === 0
      ? 0
      : displayPageIndex * HANZI_LIST_PAGE_SIZE + 1
  const pageEnd = Math.min(
    (displayPageIndex + 1) * HANZI_LIST_PAGE_SIZE,
    totalFilteredCount
  )
  const paginatedHanziList = filteredSortedHanziList.slice(
    (safeListPage - 1) * HANZI_LIST_PAGE_SIZE,
    safeListPage * HANZI_LIST_PAGE_SIZE
  )
  const tableHanziList = useServerSidePaging ? serverListRows : paginatedHanziList

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      {/* 로딩 오버레이 - 페이지 중간에 표시 */}
      {isLoading && (
        <div className='fixed inset-0 z-50 flex items-center justify-center'>
          <div
            className='absolute inset-0 bg-white'
            style={{ opacity: 0.95 }}
          />
          <div className='relative z-10'>
            <LoadingSpinner message='한자 데이터를 불러오는 중...' />
          </div>
        </div>
      )}

      {/* 헤더 */}
      <header className='fixed top-0 left-0 right-0 bg-white shadow-sm z-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-4'>
            <div className='flex items-center space-x-4'>
              <Link href='/' className='text-blue-600 hover:text-blue-700'>
                <ArrowLeft className='h-5 w-5' />
              </Link>
              <h1 className='text-2xl font-bold text-gray-900'>한자 목록</h1>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className='max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-5 sm:py-8 pt-20'>
        <div className='space-y-5 sm:space-y-6'>
          {/* 급수 선택 */}
          <div className='bg-white rounded-lg shadow-lg p-4 sm:p-6'>
            <h3 className='text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center space-x-2'>
              <BookOpen className='h-4 w-4 sm:h-5 sm:w-5' />
              <span>급수 선택</span>
            </h3>
            <div className='mb-3 sm:mb-4'>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                급수 선택
              </label>
              <CustomSelect
                value={String(selectedGrade)}
                onChange={(v) => handleGradeChange(Number(v))}
                options={gradeSelectOptions}
                disabled={isLoading}
                className='w-full'
                aria-label='급수 선택'
              />
            </div>
          </div>

          {/* 학습완료 통계 */}
          <div className='bg-white rounded-lg shadow-lg p-4 sm:p-6'>
            <div className='flex items-center justify-between mb-3 sm:mb-4'>
              <h3 className='text-lg sm:text-xl font-semibold text-gray-900 flex items-center space-x-2'>
                <BookOpen className='h-4 w-4 sm:h-5 sm:w-5' />
                <span>학습 진행률</span>
              </h3>
              <button
                onClick={handleSyncAcrossGrades}
                disabled={
                  isSyncing || isLoading || learningStats.completed === 0
                }
                className='px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2'
                title='현재 급수에서 체크된 학습완료 한자들을 다른 모든 급수에 동기화합니다'
              >
                {isSyncing ? (
                  <>
                    <LoadingSpinner message='' />
                    <span>동기화 중...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className='w-4 h-4'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                      />
                    </svg>
                    <span>다른 급수 동기화</span>
                  </>
                )}
              </button>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
              <div className='text-center p-3 bg-blue-50 rounded-lg'>
                <div className='text-2xl font-bold text-blue-600'>
                  {learningStats.total}
                </div>
                <div className='text-sm text-gray-600'>전체 한자</div>
              </div>
              <div className='text-center p-3 bg-green-50 rounded-lg'>
                <div className='text-2xl font-bold text-green-600'>
                  {learningStats.completed}
                </div>
                <div className='text-sm text-gray-600'>학습완료</div>
              </div>
              <div className='text-center p-3 bg-purple-50 rounded-lg'>
                <div className='text-2xl font-bold text-purple-600'>
                  {learningStats.percentage}%
                </div>
                <div className='text-sm text-gray-600'>진행률</div>
              </div>
            </div>
            {/* 진행률 바 */}
            <div className='mt-4'>
              <div className='flex justify-between text-sm text-gray-600 mb-1'>
                <span>진행률</span>
                <span>{learningStats.percentage}%</span>
              </div>
              <div className='w-full bg-gray-200 rounded-full h-3'>
                <div
                  className='bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500'
                  style={{ width: `${learningStats.percentage}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* 동기화 성공 메시지 */}
          {showSyncSuccess && (
            <div className='bg-green-50 border border-green-200 rounded-lg p-4 mb-4'>
              <div className='flex items-center space-x-2'>
                <svg
                  className='w-5 h-5 text-green-600'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M5 13l4 4L19 7'
                  />
                </svg>
                <div className='text-green-800'>
                  <span className='font-semibold'>동기화 완료!</span>
                  <span className='ml-2'>
                    {syncResult.count}개의 한자가{" "}
                    {syncResult.grades
                      .map((g) =>
                        g === 5.5
                          ? "준5급"
                          : g === 4.5
                          ? "준4급"
                          : g === 3.5
                          ? "준3급"
                          : `${g}급`
                      )
                      .join(", ")}
                    에 동기화되었습니다.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 한자 목록 */}
          <div className='bg-white rounded-lg shadow-lg p-4 sm:p-6'>
            <div className='mb-4 sm:mb-5'>
              <h3 className='text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2 mb-3'>
                <BookOpen className='h-5 w-5 text-blue-600 shrink-0' />
                <span>{gradeName} 한자 목록</span>
              </h3>
              <div className='relative mb-3'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none' />
                <input
                  type='search'
                  enterKeyHint='search'
                  placeholder='한자·뜻·음 검색…'
                  value={hanziSearchQuery}
                  onChange={(e) => setHanziSearchQuery(e.target.value)}
                  className='w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  aria-label='한자 목록 검색'
                />
              </div>
              <div className='flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3'>
                <CustomSelect
                  value={reportFilter}
                  onChange={(v) => setReportFilter(v as ReportFilterMode)}
                  options={reportFilterOptions}
                  className='w-full sm:w-[11rem]'
                  aria-label='신고 필터'
                />
                <CustomSelect
                  value={learningFilter}
                  onChange={(v) => setLearningFilter(v as LearningFilterMode)}
                  options={learningFilterOptions}
                  className='w-full sm:w-[11rem]'
                  aria-label='학습완료 필터'
                />
                <CustomSelect
                  value={listSort}
                  onChange={(v) => setListSort(v as HanziListSortMode)}
                  options={listSortOptions}
                  className='w-full sm:min-w-[12rem] sm:flex-1 sm:max-w-md'
                  aria-label='정렬'
                />
                <div className='text-sm text-gray-600 sm:ml-auto'>
                  총 {totalFilteredCount}개
                  {totalFilteredCount > 0 &&
                    ` · ${pageStart}–${pageEnd}번째 표시 (${HANZI_LIST_PAGE_SIZE}개/페이지)`}
                  {reportFilter === "reported_only" &&
                    totalFilteredCount > 0 &&
                    ` · 필터 기준 ${totalFilteredCount}개 중 신고`}
                </div>
              </div>
              {useServerSidePaging && (
                <p className='text-xs text-blue-800 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mt-2'>
                  이 급수는 Firestore에서 페이지당 약 {HANZI_LIST_PAGE_SIZE}개(+다음
                  페이지 확인용 최대 1건)만 읽습니다. 검색·학습완료 필터·「학습완료
                  먼저/미완료 먼저」정렬을 쓰면 전체 목록을 한 번에 불러옵니다.
                </p>
              )}
            </div>

            {!isLoading && (
              <>
                <div className='overflow-x-auto rounded-lg border border-gray-200 -mx-1 sm:mx-0'>
                  <table className='min-w-[640px] w-full divide-y divide-gray-200'>
                    <thead className='bg-slate-100 sticky top-0 z-10 shadow-sm'>
                      <tr>
                        <th className='px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide'>
                          순번
                        </th>
                        <th className='px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide'>
                          한자
                        </th>
                        <th className='px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide min-w-[5rem]'>
                          뜻
                        </th>
                        <th className='px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide min-w-[4rem]'>
                          음
                        </th>
                        <th className='px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide'>
                          획수
                        </th>
                        <th className='px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide'>
                          사전
                        </th>
                        <th className='px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide'>
                          학습완료
                        </th>
                        <th className='px-2 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide w-14'>
                          신고
                        </th>
                        <th className='px-2 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide w-16'>
                          수정
                        </th>
                      </tr>
                    </thead>
                    <tbody className='bg-white divide-y divide-gray-100'>
                      {tableHanziList.map((hanzi, index) => (
                        <tr
                          key={hanzi.id}
                          className={
                            hanzi.hasDataIssue
                              ? "hover:bg-amber-50/80 bg-amber-50/30"
                              : index % 2 === 0
                              ? "hover:bg-slate-50 bg-white"
                              : "hover:bg-slate-50 bg-slate-50/40"
                          }
                        >
                          <td className='px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-800 text-center tabular-nums'>
                            {hanzi.gradeNumber ?? index + 1}
                          </td>
                          <td className='px-3 py-3 whitespace-nowrap text-center'>
                            <span className='text-2xl sm:text-xl lg:text-2xl font-bold text-gray-900'>
                              {hanzi.character}
                            </span>
                          </td>
                          <td className='px-3 py-3 text-sm text-gray-900 text-center max-w-[10rem] truncate'>
                            {hanzi.meaning}
                          </td>
                          <td className='px-3 py-3 whitespace-nowrap text-sm text-gray-900 text-center font-medium'>
                            {hanzi.sound}
                          </td>
                          <td className='px-3 py-3 whitespace-nowrap text-sm text-gray-600 text-center'>
                            {hanzi.strokes}획
                          </td>
                          <td className='px-3 py-3 whitespace-nowrap text-sm font-medium text-center'>
                            <button
                              type='button'
                              onClick={() =>
                                openNaverDictionary(hanzi.character)
                              }
                              className='inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500'
                            >
                              <ExternalLink className='h-3 w-3 mr-1' />
                              사전
                            </button>
                          </td>
                          <td className='px-3 py-3 whitespace-nowrap text-center'>
                            <input
                              type='checkbox'
                              checked={knownHanzi.has(hanzi.id)}
                              onChange={(e) =>
                                handleKnownToggle(hanzi.id, e.target.checked)
                              }
                              className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer'
                              title='학습 완료'
                            />
                          </td>
                          <td className='px-2 py-3 whitespace-nowrap text-center'>
                            {hanzi.hasDataIssue ? (
                              <span
                                className='inline-flex text-amber-600'
                                title='데이터 신고됨'
                              >
                                <AlertTriangle className='h-4 w-4 mx-auto' />
                              </span>
                            ) : (
                              <span className='text-gray-300 text-xs'>—</span>
                            )}
                          </td>
                          <td className='px-2 py-3 whitespace-nowrap text-center'>
                            <button
                              type='button'
                              onClick={() => openHanziEditModal(hanzi)}
                              className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-colors mx-auto ${
                                hanzi.hasDataIssue
                                  ? "border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200"
                                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                              }`}
                              title='뜻·음·관련 단어 수정'
                              aria-label='데이터 수정'
                            >
                              <Pencil className='h-4 w-4' />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalFilteredCount > HANZI_LIST_PAGE_SIZE && (
                  <div className='flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-4 pt-4 border-t border-gray-100'>
                    {useServerSidePaging ? (
                      <>
                        <button
                          type='button'
                          disabled={serverPageIndex <= 0}
                          onClick={() => void fetchServerPage(serverPageIndex - 1)}
                          className='inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed'
                        >
                          <ChevronLeft className='h-4 w-4' />
                          이전
                        </button>
                        <span className='text-sm text-gray-600 tabular-nums px-2'>
                          {serverPageIndex + 1} / {totalListPages} 페이지
                        </span>
                        <button
                          type='button'
                          disabled={
                            !serverHasMore &&
                            serverPageIndex >= totalListPages - 1
                          }
                          onClick={() => void fetchServerPage(serverPageIndex + 1)}
                          className='inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed'
                        >
                          다음
                          <ChevronRight className='h-4 w-4' />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type='button'
                          disabled={safeListPage <= 1}
                          onClick={() =>
                            setHanziListPage((p) => Math.max(1, p - 1))
                          }
                          className='inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed'
                        >
                          <ChevronLeft className='h-4 w-4' />
                          이전
                        </button>
                        <span className='text-sm text-gray-600 tabular-nums px-2'>
                          {safeListPage} / {totalListPages} 페이지
                        </span>
                        <button
                          type='button'
                          disabled={safeListPage >= totalListPages}
                          onClick={() =>
                            setHanziListPage((p) =>
                              Math.min(totalListPages, p + 1)
                            )
                          }
                          className='inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed'
                        >
                          다음
                          <ChevronRight className='h-4 w-4' />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {!isLoading &&
              (useServerSidePaging
                ? (serverTotalCount ?? 0) > 0
                : hanziList.length > 0) &&
              totalFilteredCount === 0 &&
              hanziSearchQuery.trim() !== "" && (
                <div className='text-center py-6 sm:py-8'>
                  <Search className='h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4' />
                  <p className='text-gray-500'>
                    검색 조건에 맞는 한자가 없습니다.
                  </p>
                </div>
              )}

            {!isLoading &&
              (useServerSidePaging
                ? (serverTotalCount ?? 0) > 0
                : hanziList.length > 0) &&
              totalFilteredCount === 0 &&
              hanziSearchQuery.trim() === "" && (
                <div className='text-center py-6 sm:py-8 space-y-2'>
                  {reportFilter === "reported_only" ? (
                    <>
                      <AlertTriangle className='h-10 w-10 sm:h-12 sm:w-12 text-amber-400 mx-auto mb-3 sm:mb-4' />
                      <p className='text-gray-500'>
                        신고된 한자가 없습니다. 퀴즈·부분 맞추기 정답 확인
                        모달에서 「데이터 문제 신고」로 신고할 수 있습니다.
                      </p>
                    </>
                  ) : reportFilter === "not_reported" ? (
                    <>
                      <Info className='h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4' />
                      <p className='text-gray-500'>
                        신고되지 않은 한자가 없습니다. 이 급의 한자는 모두 신고
                        상태이거나 다른 필터와 겹치지 않습니다.
                      </p>
                    </>
                  ) : learningFilter === "completed" ? (
                    <p className='text-gray-500'>
                      학습완료된 한자가 없습니다.
                    </p>
                  ) : learningFilter === "incomplete" ? (
                    <p className='text-gray-500'>
                      미완료 한자가 없습니다. (이 급은 모두 학습완료이거나 필터와
                      맞지 않습니다.)
                    </p>
                  ) : (
                    <p className='text-gray-500'>
                      조건에 맞는 한자가 없습니다.
                    </p>
                  )}
                </div>
              )}

            {!isLoading &&
              ((!useServerSidePaging && hanziList.length === 0) ||
                (useServerSidePaging &&
                  (serverTotalCount ?? 0) === 0 &&
                  serverListRows.length === 0)) && (
                <div className='text-center py-6 sm:py-8'>
                  <Info className='h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4' />
                  <p className='text-gray-500'>등록된 한자가 없습니다.</p>
                </div>
              )}
          </div>
        </div>
      </main>

      {/* 신고된 한자 데이터 수정 모달 (뜻·음·관련 단어) */}
      {reportedHanziModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] flex flex-col'>
            <div className='flex items-center justify-between p-4 border-b'>
              <h3 className='text-lg font-semibold text-gray-900'>
                데이터 수정 · {reportedHanziModal.character}
              </h3>
              <button
                type='button'
                onClick={() => setReportedHanziModal(null)}
                className='p-1 rounded hover:bg-gray-100 text-gray-500'
                aria-label='닫기'
              >
                <X className='h-5 w-5' />
              </button>
            </div>
            <div className='p-4 overflow-y-auto flex-1'>
              <p className='text-xs text-gray-500 mb-3'>
                뜻·음을 바로잡고 관련 단어를 추가·수정·삭제한 뒤 「저장」을
                누르면 반영되며 신고 상태가 해제됩니다.
              </p>
              <h4 className='text-sm font-semibold text-gray-700 mb-2'>
                뜻 · 음
              </h4>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5'>
                <label className='block text-left'>
                  <span className='text-xs font-medium text-gray-600'>
                    뜻 (의미)
                  </span>
                  <input
                    type='text'
                    value={reportMeaningDraft}
                    onChange={(e) => setReportMeaningDraft(e.target.value)}
                    className='mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    placeholder='예: 불'
                  />
                </label>
                <label className='block text-left'>
                  <span className='text-xs font-medium text-gray-600'>
                    음 (한글 독음)
                  </span>
                  <input
                    type='text'
                    value={reportSoundDraft}
                    onChange={(e) => setReportSoundDraft(e.target.value)}
                    className='mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    placeholder='예: 화'
                  />
                </label>
              </div>

              {/* 새 관련 단어 추가 */}
              <h4 className='text-sm font-semibold text-gray-700 mb-2'>
                관련 단어 추가
              </h4>
              <div className='flex flex-wrap gap-2 mb-4'>
                <input
                  type='text'
                  placeholder='한자'
                  value={newWordHanzi}
                  onChange={(e) => setNewWordHanzi(e.target.value)}
                  className='flex-1 min-w-[80px] px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 font-medium placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                />
                <input
                  type='text'
                  placeholder='독음(한글)'
                  value={newWordKorean}
                  onChange={(e) => setNewWordKorean(e.target.value)}
                  className='flex-1 min-w-[80px] px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 font-medium placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                />
                <button
                  type='button'
                  onClick={addReportedRelatedWord}
                  disabled={isSavingRelatedWords}
                  className='px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50'
                >
                  추가
                </button>
              </div>

              <h4 className='text-sm font-semibold text-gray-700 mb-2'>
                관련 단어 목록 (수정·삭제)
              </h4>
              {reportedHanziModal.relatedWords &&
              reportedHanziModal.relatedWords.length > 0 ? (
                <ul className='space-y-2'>
                  {reportedHanziModal.relatedWords.map((word, index) => (
                    <li
                      key={index}
                      className='flex items-center gap-2 p-3 bg-gray-50 rounded-md'
                    >
                      {editingWordIndex === index ? (
                        <>
                          <input
                            type='text'
                            value={editDraftHanzi}
                            onChange={(e) =>
                              setEditDraftHanzi(e.target.value)
                            }
                            placeholder='한자'
                            className='flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 font-medium placeholder:text-gray-500'
                          />
                          <input
                            type='text'
                            value={editDraftKorean}
                            onChange={(e) =>
                              setEditDraftKorean(e.target.value)
                            }
                            placeholder='독음'
                            className='flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 font-medium placeholder:text-gray-500'
                          />
                          <button
                            type='button'
                            onClick={saveEditWord}
                            disabled={isSavingRelatedWords}
                            className='p-1.5 text-green-600 hover:bg-green-50 rounded'
                            title='저장'
                          >
                            <Check className='h-4 w-4' />
                          </button>
                          <button
                            type='button'
                            onClick={cancelEditWord}
                            className='p-1.5 text-gray-500 hover:bg-gray-200 rounded'
                            title='취소'
                          >
                            <X className='h-4 w-4' />
                          </button>
                        </>
                      ) : (
                        <>
                          <div className='flex-1 min-w-0'>
                            <span className='font-medium text-gray-900'>
                              {word.hanzi}
                            </span>
                            <span className='text-gray-600 ml-2'>
                              {word.korean}
                            </span>
                          </div>
                          <button
                            type='button'
                            onClick={() => startEditWord(index)}
                            className='p-1.5 text-gray-600 hover:bg-gray-200 rounded'
                            title='수정'
                          >
                            <Pencil className='h-4 w-4' />
                          </button>
                          <button
                            type='button'
                            onClick={() =>
                              removeReportedRelatedWord(
                                reportedHanziModal.id,
                                index
                              )
                            }
                            disabled={isSavingRelatedWords}
                            className='p-1.5 text-red-600 hover:bg-red-50 rounded'
                            title='삭제'
                          >
                            <Trash2 className='h-4 w-4' />
                          </button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className='text-gray-500 text-sm'>
                  관련 단어가 없습니다. 위에서 추가하거나, 뜻·음만 고친 뒤 하단
                  「저장」을 누르세요.
                </p>
              )}
            </div>
            <div className='p-4 border-t flex flex-wrap justify-end gap-2'>
              <button
                type='button'
                onClick={() => setReportedHanziModal(null)}
                className='px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300'
              >
                닫기
              </button>
              <button
                type='button'
                onClick={handleSaveReportedHanziAndClear}
                disabled={isSavingRelatedWords}
                className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium'
              >
                {isSavingRelatedWords ? "저장 중…" : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showHanziEditSuccess && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4'>
          <div className='bg-white rounded-lg shadow-xl max-w-sm w-full p-6 text-center'>
            <Check className='h-12 w-12 text-green-600 mx-auto mb-3' />
            <h3 className='text-lg font-semibold text-gray-900 mb-2'>
              수정이 완료되었습니다
            </h3>
            <p className='text-sm text-gray-600 mb-5'>
              변경 사항이 저장되었고 신고가 해제되었습니다.
            </p>
            <button
              type='button'
              onClick={() => setShowHanziEditSuccess(false)}
              className='w-full px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium'
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 데이터 없음 모달 */}
      {showNoDataModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg p-6 max-w-md w-full mx-4'>
            <div className='text-center'>
              <Info className='h-12 w-12 text-gray-400 mx-auto mb-4' />
              <h3 className='text-lg font-medium text-gray-900 mb-2'>
                데이터 없음
              </h3>
              <p className='text-gray-600 mb-4'>{noDataMessage}</p>
              <button
                onClick={() => setShowNoDataModal(false)}
                className='w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 조회 제한 모달 */}
      {showLimitModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg p-6 max-w-md w-full mx-4'>
            <div className='text-center'>
              <div className='text-4xl mb-4'>⚠️</div>
              <h3 className='text-lg font-medium text-gray-900 mb-2'>
                조회 제한
              </h3>
              <p className='text-gray-600 mb-4'>
                현재 공부 중인 급수가 아닌 급수는 하루에 2번만 조회할 수
                있습니다.
                <br />
                내일 다시 시도해주세요.
              </p>
              <button
                onClick={() => setShowLimitModal(false)}
                className='w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
