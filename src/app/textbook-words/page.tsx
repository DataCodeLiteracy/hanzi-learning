"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import LoadingSpinner from "@/components/LoadingSpinner"
import {
  ApiClient,
  type TextbookWordListItem,
  type TextbookWordsPageCursor,
} from "@/lib/apiClient"
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  Edit,
  Plus,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react"
import Link from "next/link"
import { useTimeTracking } from "@/hooks/useTimeTracking"
import {
  checkGradeQueryLimit,
  incrementGradeQueryCount,
  type PageType,
} from "@/lib/gradeQueryLimit"
import { CustomSelect } from "@/components/ui/CustomSelect"
import type { Hanzi } from "@/types"

const PAGE_TYPE: PageType = "textbook-words"
const TEXTBOOK_PAGE_SIZE = 20

const TEXTBOOK_GRADE_OPTIONS = [8, 7, 6, 5.5, 5, 4.5, 4, 3.5, 3].map(
  (grade) => ({
    value: String(grade),
    label:
      grade === 5.5
        ? "준5급"
        : grade === 4.5
        ? "준4급"
        : grade === 3.5
        ? "준3급"
        : `${grade}급`,
  })
)

interface TextbookWord {
  word: string
  korean: string
  hanzi: string
  meaning?: string
  sourceHanziId: string
  includedHanzi: Array<{
    character: string
    meaning: string
    sound: string
    grade: number
    gradeNumber: number
  }>
}

interface HanziItem {
  character: string
  meaning: string
  sound: string
  grade: number
  gradeNumber: number
}

type PageEntry = {
  items: TextbookWord[]
  nextCursor: TextbookWordsPageCursor | null
  seenKeys: string[]
  hasMoreAfter: boolean
}

function mapApiItemToWord(item: TextbookWordListItem): TextbookWord {
  return {
    word: item.word,
    korean: item.korean,
    hanzi: item.hanzi,
    meaning: item.meaning,
    sourceHanziId: item.sourceHanziId,
    includedHanzi: item.includedHanzi,
  }
}

export default function TextbookWordsPage() {
  const { user, initialLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [selectedGrade, setSelectedGrade] = useState<number>(
    user?.preferredGrade || 8
  )
  const [listPage, setListPage] = useState(1)
  const [currentWords, setCurrentWords] = useState<TextbookWord[]>([])
  const [selectedItem, setSelectedItem] = useState<{
    type: "word" | "hanzi"
    data: TextbookWord | HanziItem
  } | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  const pageCacheRef = useRef<Map<number, PageEntry>>(new Map())
  const nonPreferredIncrementedRef = useRef<Set<number>>(new Set())

  const [showMeaningModal, setShowMeaningModal] = useState(false)
  const [selectedWordForMeaning, setSelectedWordForMeaning] =
    useState<TextbookWord | null>(null)
  const [meaningInput, setMeaningInput] = useState("")
  const [isSubmittingMeaning, setIsSubmittingMeaning] = useState(false)

  const [hanziMetaModal, setHanziMetaModal] = useState<HanziItem | null>(null)

  const { endSession, isActive } = useTimeTracking({
    userId: user?.id || "",
    type: "page",
    activity: "textbook-words",
    autoStart: true,
    autoEnd: true,
  })

  useEffect(() => {
    return () => {
      if (isActive) endSession()
    }
  }, [isActive, endSession])

  const clearPageCache = useCallback(() => {
    pageCacheRef.current.clear()
  }, [])

  const fetchPage = useCallback(
    async (grade: number, pageNum: number): Promise<boolean> => {
      if (!user) return false

      if (pageNum > 1) {
        const prev = pageCacheRef.current.get(pageNum - 1)
        if (!prev) return false
      }

      const { canQuery } = checkGradeQueryLimit(
        grade,
        user.preferredGrade,
        PAGE_TYPE
      )
      if (!canQuery) {
        setShowLimitModal(true)
        return false
      }

      const prevEntry = pageCacheRef.current.get(pageNum - 1)
      const cursor: TextbookWordsPageCursor | null =
        pageNum === 1 ? null : prevEntry?.nextCursor ?? null
      const seenWordKeys: string[] =
        pageNum === 1 ? [] : prevEntry?.seenKeys ?? []

      if (
        grade !== user.preferredGrade &&
        !nonPreferredIncrementedRef.current.has(grade)
      ) {
        incrementGradeQueryCount(grade, user.preferredGrade, PAGE_TYPE)
        nonPreferredIncrementedRef.current.add(grade)
      }

      const res = await ApiClient.getTextbookWordsPage({
        grade,
        pageSize: TEXTBOOK_PAGE_SIZE,
        cursor,
        seenWordKeys,
      })

      const items = res.items.map(mapApiItemToWord)
      const newSeen = [...seenWordKeys, ...items.map((w) => w.word)]

      pageCacheRef.current.set(pageNum, {
        items,
        nextCursor: res.nextCursor,
        seenKeys: newSeen,
        hasMoreAfter: res.hasMore,
      })

      setCurrentWords(items)
      setListPage(pageNum)
      return true
    },
    [user]
  )

  const loadPage = useCallback(
    async (pageNum: number) => {
      if (!user) return
      setIsLoading(true)
      try {
        const cached = pageCacheRef.current.get(pageNum)
        if (cached) {
          setCurrentWords(cached.items)
          setListPage(pageNum)
          return
        }
        await fetchPage(selectedGrade, pageNum)
      } catch (e) {
        console.error("교과서 한자어 페이지 로드 실패:", e)
      } finally {
        setIsLoading(false)
      }
    },
    [user, selectedGrade, fetchPage]
  )

  useEffect(() => {
    if (user && !initialLoading && isInitialLoad) {
      const g = user.preferredGrade || 8
      setSelectedGrade(g)
      setIsInitialLoad(false)
      void (async () => {
        setIsLoading(true)
        try {
          clearPageCache()
          await fetchPage(g, 1)
        } finally {
          setIsLoading(false)
        }
      })()
    }
  }, [user, initialLoading, isInitialLoad, fetchPage, clearPageCache])

  const handleGradeChange = useCallback(
    async (grade: number) => {
      if (grade === selectedGrade) return
      setSelectedGrade(grade)
      setListPage(1)
      setCurrentWords([])
      clearPageCache()
      nonPreferredIncrementedRef.current.clear()
      setIsLoading(true)
      try {
        await fetchPage(grade, 1)
      } finally {
        setIsLoading(false)
      }
    },
    [selectedGrade, fetchPage, clearPageCache]
  )

  const currentEntry = pageCacheRef.current.get(listPage)
  const canGoNext =
    (currentEntry?.hasMoreAfter === true) ||
    pageCacheRef.current.has(listPage + 1)
  const canGoPrev = listPage > 1

  const goNext = useCallback(async () => {
    if (!canGoNext) return
    const next = listPage + 1
    setIsLoading(true)
    try {
      await loadPage(next)
    } finally {
      setIsLoading(false)
    }
  }, [canGoNext, listPage, loadPage])

  const goPrev = useCallback(() => {
    if (!canGoPrev) return
    const p = listPage - 1
    const e = pageCacheRef.current.get(p)
    if (e) {
      setCurrentWords(e.items)
      setListPage(p)
    }
  }, [canGoPrev, listPage])

  const closeModal = () => {
    setShowModal(false)
    setSelectedItem(null)
  }

  const handleWordClick = (word: TextbookWord) => {
    setSelectedItem({ type: "word", data: word })
    setShowModal(true)
  }

  const handleHanziClick = (hanzi: HanziItem) => {
    setSelectedItem({ type: "hanzi", data: hanzi })
    setShowModal(true)
  }

  const handleNaverKoreanSearch = (word: string) => {
    const searchUrl = `https://ko.dict.naver.com/#/search?query=${encodeURIComponent(
      word
    )}`
    window.open(searchUrl, "_blank")
  }

  const openMeaningModal = (word: TextbookWord) => {
    setSelectedWordForMeaning(word)
    setMeaningInput(word.meaning || "")
    setShowMeaningModal(true)
  }

  const closeMeaningModal = () => {
    setShowMeaningModal(false)
    setSelectedWordForMeaning(null)
    setMeaningInput("")
  }

  const submitMeaning = async () => {
    if (!selectedWordForMeaning || !meaningInput.trim() || !user) return

    setIsSubmittingMeaning(true)
    try {
      let targetHanzi: Hanzi | null = null

      if (selectedWordForMeaning.sourceHanziId) {
        targetHanzi = await ApiClient.getDocument<Hanzi>(
          "hanzi",
          selectedWordForMeaning.sourceHanziId
        )
      }

      if (!targetHanzi) {
        const all = await ApiClient.getHanziByGrade(selectedGrade)
        targetHanzi =
          all.find((hanzi) =>
            hanzi.relatedWords?.some(
              (w) =>
                w.hanzi === selectedWordForMeaning.hanzi && w.isTextBook
            )
          ) ?? null
      }

      if (targetHanzi) {
        const relatedWordIndex = targetHanzi.relatedWords?.findIndex(
          (word) =>
            word.hanzi === selectedWordForMeaning.hanzi && word.isTextBook
        )

        if (relatedWordIndex !== undefined && relatedWordIndex >= 0) {
          const updatedRelatedWords = [...(targetHanzi.relatedWords || [])]
          updatedRelatedWords[relatedWordIndex] = {
            ...updatedRelatedWords[relatedWordIndex],
            meaning: meaningInput.trim(),
          }

          await ApiClient.updateDocument("hanzi", targetHanzi.id, {
            relatedWords: updatedRelatedWords,
          })
          await ApiClient.clearHanziDataIssue(targetHanzi.id)

          if (!selectedWordForMeaning.meaning) {
            await ApiClient.addUserExperience(user.id, 10)
            await ApiClient.updateTodayExperience(user.id, 10)
            alert("뜻이 성공적으로 등록되었습니다! +10 경험치를 획득했습니다.")
          } else {
            alert("뜻이 성공적으로 수정되었습니다!")
          }

          clearPageCache()
          setIsLoading(true)
          try {
            await fetchPage(selectedGrade, 1)
          } finally {
            setIsLoading(false)
          }
        }
      }

      closeMeaningModal()
    } catch (error) {
      console.error("뜻 등록/수정 실패:", error)
      alert("뜻 등록/수정에 실패했습니다. 다시 시도해주세요.")
    } finally {
      setIsSubmittingMeaning(false)
    }
  }

  const renderIncludedGrid = (word: TextbookWord) => (
    <div className='grid grid-cols-4 gap-2'>
      {word.includedHanzi.map((hanzi, i) => (
        <div
          key={`${word.word}-${i}`}
          role={hanzi ? "button" : undefined}
          tabIndex={hanzi ? 0 : undefined}
          onClick={hanzi ? () => handleHanziClick(hanzi) : undefined}
          onKeyDown={
            hanzi
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    handleHanziClick(hanzi)
                  }
                }
              : undefined
          }
          className={`relative rounded-lg border px-1.5 py-2 text-center min-h-[4.25rem] flex flex-col justify-center ${
            hanzi
              ? "border-gray-100 bg-slate-50 cursor-pointer hover:bg-slate-100"
              : "border-dashed border-gray-100 bg-gray-50/40 text-gray-300"
          }`}
        >
          {hanzi && hanzi.grade > 0 && (
            <button
              type='button'
              onClick={(e) => {
                e.stopPropagation()
                setHanziMetaModal(hanzi)
              }}
              className='absolute top-0.5 right-0.5 p-0.5 rounded-md text-gray-400 hover:text-orange-600 hover:bg-orange-50 z-[1]'
              title='급수·번호 보기'
              aria-label='급수·번호 보기'
            >
              <Info className='h-3.5 w-3.5' />
            </button>
          )}
          {hanzi ? (
            <>
              <span className='text-base sm:text-lg font-bold text-gray-900 leading-tight pr-4'>
                {hanzi.character}
              </span>
              <span className='text-[10px] sm:text-[11px] text-gray-600 mt-0.5 line-clamp-2'>
                {hanzi.meaning}
              </span>
              <span className='text-xs font-medium text-gray-800'>
                {hanzi.sound}
              </span>
            </>
          ) : (
            <span className='text-sm'>—</span>
          )}
        </div>
      ))}
    </div>
  )

  if (initialLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='인증 상태를 확인하는 중...' />
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

  if (!user) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
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

  const pageStart =
    currentWords.length === 0
      ? 0
      : (listPage - 1) * TEXTBOOK_PAGE_SIZE + 1
  const pageEnd = pageStart + currentWords.length - 1

  return (
    <div className='min-h-screen bg-gray-50'>
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

      <div className='fixed top-0 left-0 right-0 bg-white shadow-sm border-b z-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between h-16'>
            <div className='flex items-center space-x-4'>
              <Link href='/' className='text-gray-600 hover:text-gray-900'>
                <ArrowLeft className='h-6 w-6' />
              </Link>
              <div className='flex items-center space-x-2'>
                <BookOpen className='h-6 w-6 text-orange-600' />
                <h1 className='text-xl font-bold text-gray-900'>
                  교과서 한자어
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className='max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8 pt-20 pb-10'>
        <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6'>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
            <div className='flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0'>
              <span className='text-sm font-semibold text-gray-500 shrink-0'>
                급수
              </span>
              <CustomSelect
                value={String(selectedGrade)}
                onChange={(v) => void handleGradeChange(Number(v))}
                options={TEXTBOOK_GRADE_OPTIONS}
                disabled={isLoading}
                className='w-full sm:w-auto sm:min-w-[10rem]'
                buttonClassName='w-full sm:w-auto px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-300 font-semibold text-base text-gray-900 bg-gray-50/80'
                aria-label='급수 선택'
              />
            </div>
            <div className='text-sm text-gray-600 lg:text-right space-y-1'>
              <div>
                <span className='font-semibold text-gray-900'>{gradeName}</span>
                {currentWords.length > 0 && (
                  <span>
                    {" "}
                    · 이번 페이지 {pageStart}–{pageEnd}번째 (
                    {currentWords.length}개)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {currentWords.length > 0 && (
          <div className='xl:hidden mb-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4'>
              {currentWords.map((word, index) => {
                const globalIndex =
                  (listPage - 1) * TEXTBOOK_PAGE_SIZE + index + 1
                return (
                  <article
                    key={word.word + String(listPage)}
                    className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-orange-200/80 transition-colors'
                  >
                    <div className='flex items-start justify-between gap-2 mb-3'>
                      <span className='text-xs font-mono text-gray-400 tabular-nums shrink-0 pt-1'>
                        {globalIndex}
                      </span>
                      <div className='flex-1 min-w-0 text-center'>
                        <button
                          type='button'
                          onClick={() => handleWordClick(word)}
                          className='w-full group'
                        >
                          <div className='text-2xl sm:text-3xl font-bold text-gray-900 leading-tight'>
                            {word.hanzi}
                          </div>
                          <div className='text-base sm:text-lg font-semibold text-orange-700 mt-0.5'>
                            {word.korean}
                          </div>
                        </button>
                      </div>
                      <div className='flex shrink-0 items-start gap-0.5'>
                        <button
                          type='button'
                          onClick={() => handleNaverKoreanSearch(word.korean)}
                          className='p-2 rounded-lg text-blue-600 hover:bg-blue-50'
                          title='네이버 국어사전'
                          aria-label='네이버 국어사전'
                        >
                          <ExternalLink className='h-4 w-4' />
                        </button>
                        <button
                          type='button'
                          onClick={() => openMeaningModal(word)}
                          className='p-2 rounded-lg text-orange-600 hover:bg-orange-50'
                          title={word.meaning ? "단어 뜻 수정" : "단어 뜻 등록"}
                          aria-label={
                            word.meaning ? "단어 뜻 수정" : "단어 뜻 등록"
                          }
                        >
                          {word.meaning ? (
                            <Edit className='h-4 w-4' />
                          ) : (
                            <Plus className='h-4 w-4' />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className='mb-3'>
                      <p className='text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2'>
                        구성 한자
                      </p>
                      {renderIncludedGrid(word)}
                    </div>

                    <div className='pt-3 border-t border-gray-100'>
                      {word.meaning ? (
                        <p className='text-sm text-gray-800'>
                          <span className='text-gray-500 font-medium'>
                            단어 뜻{" "}
                          </span>
                          {word.meaning}
                        </p>
                      ) : (
                        <p className='text-sm text-amber-800 bg-amber-50/80 rounded-lg px-2 py-1.5 border border-amber-100'>
                          아직 등록된 뜻이 없습니다.
                        </p>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        )}

        {currentWords.length > 0 && (
          <div className='hidden xl:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-4'>
            <div className='overflow-x-auto'>
              <table className='w-full min-w-[720px]'>
                <thead className='bg-slate-50 border-b border-gray-200'>
                  <tr>
                    <th className='px-3 py-3 text-center text-xs font-semibold text-gray-600 w-12'>
                      #
                    </th>
                    <th className='px-4 py-3 text-center text-xs font-semibold text-gray-600 min-w-[10rem]'>
                      단어
                    </th>
                    <th className='px-4 py-3 text-center text-xs font-semibold text-gray-600 min-w-[14rem]'>
                      구성 한자
                    </th>
                    <th className='px-4 py-3 text-center text-xs font-semibold text-gray-600 min-w-[9rem]'>
                      단어 뜻
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100'>
                  {currentWords.map((word, index) => {
                    const globalIndex =
                      (listPage - 1) * TEXTBOOK_PAGE_SIZE + index + 1
                    return (
                      <tr
                        key={word.word + String(listPage)}
                        className='hover:bg-orange-50/30'
                      >
                        <td className='px-3 py-3 text-center text-sm text-gray-500 tabular-nums'>
                          {globalIndex}
                        </td>
                        <td className='px-4 py-3 text-center'>
                          <button
                            type='button'
                            onClick={() => handleWordClick(word)}
                            className='font-bold text-lg text-gray-900 hover:text-orange-700'
                          >
                            {word.hanzi}
                          </button>
                          <div className='flex items-center justify-center gap-0.5 mt-1'>
                            <span className='text-sm text-gray-700'>
                              {word.korean}
                            </span>
                            <button
                              type='button'
                              onClick={() =>
                                handleNaverKoreanSearch(word.korean)
                              }
                              className='p-1 text-blue-600 hover:bg-blue-50 rounded'
                              title='네이버 국어사전'
                              aria-label='네이버 국어사전'
                            >
                              <ExternalLink className='h-3.5 w-3.5' />
                            </button>
                            <button
                              type='button'
                              onClick={() => openMeaningModal(word)}
                              className='p-1 text-orange-600 hover:bg-orange-50 rounded'
                              title={
                                word.meaning ? "단어 뜻 수정" : "단어 뜻 등록"
                              }
                              aria-label={
                                word.meaning ? "단어 뜻 수정" : "단어 뜻 등록"
                              }
                            >
                              {word.meaning ? (
                                <Edit className='h-3.5 w-3.5' />
                              ) : (
                                <Plus className='h-3.5 w-3.5' />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className='px-4 py-3'>
                          {renderIncludedGrid(word)}
                        </td>
                        <td className='px-4 py-3 text-center text-sm'>
                          {word.meaning ? (
                            <span className='text-gray-800'>{word.meaning}</span>
                          ) : (
                            <span className='text-amber-800/90'>
                              아직 등록된 뜻이 없습니다.
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(canGoPrev || canGoNext) && (
          <div className='flex flex-col sm:flex-row items-center justify-center gap-3 py-4 px-2'>
            <button
              type='button'
              disabled={!canGoPrev || isLoading}
              onClick={goPrev}
              className='inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto justify-center'
            >
              <ChevronLeft className='h-4 w-4' />
              이전
            </button>
            <span className='text-sm text-gray-600 tabular-nums font-medium'>
              {listPage} 페이지
            </span>
            <button
              type='button'
              disabled={!canGoNext || isLoading}
              onClick={() => void goNext()}
              className='inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto justify-center'
            >
              다음
              <ChevronRight className='h-4 w-4' />
            </button>
          </div>
        )}

        {currentWords.length > 0 && (
          <div className='rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-900 text-center sm:text-left'>
            뜻을 처음 등록하면{" "}
            <span className='font-semibold'>+10 경험치</span>를 받습니다.
          </div>
        )}

        {currentWords.length === 0 && !isLoading && (
          <div className='text-center py-12'>
            <BookOpen className='h-12 w-12 text-gray-400 mx-auto mb-4' />
            <h3 className='text-lg font-medium text-gray-900 mb-2'>
              교과서 한자어가 없습니다
            </h3>
            <p className='text-gray-600'>
              이 급수 한자의 관련 단어에 교과서 표시가 없거나, 아직 데이터가 없을
              수 있습니다.
            </p>
          </div>
        )}
      </main>

      {showModal && selectedItem && (
        <div
          className='fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4'
          onClick={closeModal}
        >
          <div
            className='bg-white rounded-xl p-4 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative shadow-xl'
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              className='absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold'
            >
              ×
            </button>
            <div className='text-center'>
              {selectedItem.type === "word" ? (
                <div>
                  <div className='text-5xl sm:text-6xl font-bold text-gray-900 mb-4'>
                    {(selectedItem.data as TextbookWord).hanzi}
                  </div>
                  <div className='text-xl sm:text-2xl font-semibold text-gray-700 mb-2'>
                    {(selectedItem.data as TextbookWord).korean}
                  </div>
                  <div className='text-lg text-gray-600 mb-6'>
                    교과서 한자어
                  </div>
                  <div className='grid grid-cols-4 gap-3 mt-6 text-left max-w-lg mx-auto'>
                    {(selectedItem.data as TextbookWord).includedHanzi.map(
                      (hanzi: HanziItem, index: number) => (
                        <div
                          key={index}
                          className='bg-gray-50 rounded-lg p-3 relative'
                        >
                          {hanzi.grade > 0 && (
                            <button
                              type='button'
                              onClick={() => setHanziMetaModal(hanzi)}
                              className='absolute top-1 right-1 p-0.5 text-gray-400 hover:text-orange-600'
                              aria-label='급수·번호'
                            >
                              <Info className='h-3.5 w-3.5' />
                            </button>
                          )}
                          <div className='text-2xl font-bold text-gray-900'>
                            {hanzi.character}
                          </div>
                          <div className='text-xs font-semibold text-gray-700'>
                            {hanzi.meaning}
                          </div>
                          <div className='text-xs text-gray-500'>
                            {hanzi.sound}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className='text-7xl sm:text-8xl font-bold text-gray-900 mb-6'>
                    {(selectedItem.data as HanziItem).character}
                  </div>
                  <div className='text-2xl font-semibold text-gray-700 mb-4'>
                    {(selectedItem.data as HanziItem).meaning}
                  </div>
                  <div className='text-xl text-gray-600 mb-2'>
                    {(selectedItem.data as HanziItem).sound}
                  </div>
                  <button
                    type='button'
                    onClick={() =>
                      setHanziMetaModal(selectedItem.data as HanziItem)
                    }
                    className='text-sm text-orange-600 hover:underline'
                  >
                    급수·번호 보기
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {hanziMetaModal && (
        <div
          className='fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70'
          onClick={() => setHanziMetaModal(null)}
        >
          <div
            className='bg-white rounded-xl shadow-xl px-6 py-5 max-w-xs w-full text-center border border-gray-100'
            onClick={(e) => e.stopPropagation()}
          >
            <p className='text-4xl font-bold text-gray-900 mb-2'>
              {hanziMetaModal.character}
            </p>
            <p className='text-sm text-gray-600 mb-1'>
              {hanziMetaModal.meaning} · {hanziMetaModal.sound}
            </p>
            {hanziMetaModal.grade > 0 ? (
              <p className='text-base font-semibold text-orange-700'>
                {hanziMetaModal.grade}급 {hanziMetaModal.gradeNumber}번 한자
              </p>
            ) : (
              <p className='text-sm text-gray-500'>급수 정보 없음</p>
            )}
            <button
              type='button'
              onClick={() => setHanziMetaModal(null)}
              className='mt-4 w-full py-2 rounded-lg bg-gray-100 text-gray-800 text-sm font-medium hover:bg-gray-200'
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {showMeaningModal && selectedWordForMeaning && (
        <div
          className='fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4'
          onClick={closeMeaningModal}
        >
          <div
            className='bg-white rounded-xl p-4 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto relative shadow-xl'
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeMeaningModal}
              className='absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-2xl font-bold'
            >
              ×
            </button>
            <h2 className='text-xl sm:text-2xl font-bold text-gray-900 mb-4 pr-8'>
              {selectedWordForMeaning.meaning ? "뜻 수정" : "뜻 등록"}
            </h2>
            <p className='text-gray-700 mb-4'>
              {selectedWordForMeaning.korean} ({selectedWordForMeaning.hanzi})
            </p>
            <textarea
              value={meaningInput}
              onChange={(e) => setMeaningInput(e.target.value)}
              className='w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 font-medium'
              rows={4}
              placeholder={
                selectedWordForMeaning.meaning
                  ? "수정할 뜻을 입력하세요"
                  : "등록할 뜻을 입력하세요"
              }
            />
            <div className='flex justify-end space-x-2 mt-4'>
              <button
                onClick={closeMeaningModal}
                className='px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100'
              >
                취소
              </button>
              <button
                onClick={() => void submitMeaning()}
                className='px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50'
                disabled={isSubmittingMeaning}
              >
                {isSubmittingMeaning
                  ? "처리 중..."
                  : selectedWordForMeaning.meaning
                  ? "수정"
                  : "등록"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLimitModal && (
        <div className='fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-lg p-6 max-w-md w-full'>
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
                className='w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700'
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
