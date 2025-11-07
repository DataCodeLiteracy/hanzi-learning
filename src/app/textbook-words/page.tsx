"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import LoadingSpinner from "@/components/LoadingSpinner"
import { ApiClient } from "@/lib/apiClient"
import { Hanzi } from "@/types"
import { ArrowLeft, BookOpen, ExternalLink, Edit, Plus } from "lucide-react"
import Link from "next/link"
import { useTimeTracking } from "@/hooks/useTimeTracking"
import {
  checkGradeQueryLimit,
  incrementGradeQueryCount,
  type PageType,
} from "@/lib/gradeQueryLimit"

const PAGE_TYPE: PageType = "textbook-words"

interface TextbookWord {
  word: string
  korean: string
  hanzi: string
  meaning?: string // 교과서 한자어의 뜻
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

export default function TextbookWordsPage() {
  const { user, initialLoading } = useAuth()
  const { hanziList: dataHanziList } = useData() // DataContext의 hanziList 가져오기
  const [textbookWords, setTextbookWords] = useState<TextbookWord[]>([])
  const [isLoading, setIsLoading] = useState(true) // 통합 로딩 상태
  const [selectedGrade, setSelectedGrade] = useState<number>(
    user?.preferredGrade || 8
  )
  const [selectedItem, setSelectedItem] = useState<{
    type: "word" | "hanzi"
    data: TextbookWord | HanziItem
  } | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showLimitModal, setShowLimitModal] = useState<boolean>(false) // 조회 제한 모달
  const gradeDataCache = useRef<Map<number, Hanzi[]>>(new Map()) // 급수별 데이터 캐시
  const [isInitialLoad, setIsInitialLoad] = useState(true) // 초기 로드 여부

  // 시간 추적 훅 (페이지 접속 시간 체크)
  const { endSession, isActive } = useTimeTracking({
    userId: user?.id || "",
    type: "page",
    activity: "textbook-words",
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

  // 뜻 등록 관련 상태
  const [showMeaningModal, setShowMeaningModal] = useState(false)
  const [selectedWordForMeaning, setSelectedWordForMeaning] =
    useState<TextbookWord | null>(null)
  const [meaningInput, setMeaningInput] = useState("")
  const [isSubmittingMeaning, setIsSubmittingMeaning] = useState(false)

  // 단어를 구성하는 한자들 찾기
  const findIncludedHanzi = (
    word: string,
    hanziList: Hanzi[],
    selectedGrade: number
  ) => {
    const includedHanzi: Array<{
      character: string
      meaning: string
      sound: string
      grade: number
      gradeNumber: number
    }> = []

    // 단어의 각 글자가 한자 목록에 있는지 확인
    for (let i = 0; i < word.length; i++) {
      const char = word[i]

      // 먼저 선택한 급수에서 찾기
      let hanzi = hanziList.find(
        (h) => h.character === char && h.grade === selectedGrade
      )

      // 선택한 급수에서 못 찾으면 다른 급수에서 찾기
      if (!hanzi) {
        hanzi = hanziList.find((h) => h.character === char)
      }

      if (hanzi) {
        includedHanzi.push({
          character: hanzi.character,
          meaning: hanzi.meaning,
          sound: hanzi.sound,
          grade: hanzi.grade,
          gradeNumber: hanzi.gradeNumber,
        })
      } else {
        // 한자를 찾지 못한 경우에도 빈 객체로 추가 (UI에서 "-" 표시)
        includedHanzi.push({
          character: char,
          meaning: "?",
          sound: "?",
          grade: 0,
          gradeNumber: 0,
        })
      }
    }

    return includedHanzi
  }

  // 교과서 한자어 추출 함수
  const extractTextbookWords = useCallback(
    (
      hanziList: Hanzi[],
      grade: number,
      allHanziList: Hanzi[]
    ): TextbookWord[] => {
      const wordMap = new Map<string, TextbookWord>()

      // 선택한 급수의 한자만 필터링
      const gradeHanzi = hanziList.filter((hanzi) => hanzi.grade === grade)

      gradeHanzi.forEach((hanzi) => {
        if (hanzi.relatedWords) {
          hanzi.relatedWords.forEach((relatedWord) => {
            if (relatedWord.isTextBook) {
              // 이미 존재하는 단어인지 확인
              if (!wordMap.has(relatedWord.hanzi)) {
                // 해당 단어를 구성하는 한자들 찾기 (전체 한자 목록에서 찾기)
                const includedHanzi = findIncludedHanzi(
                  relatedWord.hanzi,
                  allHanziList,
                  selectedGrade
                )

                wordMap.set(relatedWord.hanzi, {
                  word: relatedWord.hanzi,
                  korean: relatedWord.korean,
                  hanzi: relatedWord.hanzi,
                  meaning: relatedWord.meaning, // 뜻 정보 추가
                  includedHanzi,
                })
              }
            }
          })
        }
      })

      return Array.from(wordMap.values())
    },
    [selectedGrade]
  )

  // 한자 데이터 로드 함수 수정
  const loadData = useCallback(
    async (grade: number = 8) => {
      setIsLoading(true)

      try {
        let hanziData: Hanzi[]

        // preferredGrade일 때는 DataContext의 hanziList(IndexedDB) 사용
        if (user?.preferredGrade === grade && dataHanziList.length > 0) {
          // IndexedDB에서 로드 (preferredGrade)
          const gradeHanzi = dataHanziList.filter(
            (hanzi) => hanzi.grade === grade
          )
          if (gradeHanzi.length > 0) {
            hanziData = gradeHanzi
            console.log(
              `📚 IndexedDB에서 ${grade}급 한자 ${hanziData.length}개 로드`
            )
          } else {
            // IndexedDB에 해당 급수 데이터가 없으면 API로 폴백
            // 조회 제한 확인
            const { canQuery } = checkGradeQueryLimit(
              grade,
              user?.preferredGrade,
              PAGE_TYPE
            )

            if (!canQuery) {
              // 조회 제한 도달 - 모달 표시
              setShowLimitModal(true)
              setIsLoading(false)
              return
            }

            hanziData = await ApiClient.getHanziByGrade(grade)
            // 조회 횟수 증가
            incrementGradeQueryCount(grade, user?.preferredGrade, PAGE_TYPE)
            console.log(
              `📚 API에서 ${grade}급 한자 ${hanziData.length}개 로드 (IndexedDB에 데이터 없음)`
            )
          }
        } else {
          // 다른 급수는 API에서 로드 (selectbox에서 선택할 때마다 API 호출)
          // 조회 제한 확인
          const { canQuery } = checkGradeQueryLimit(
            grade,
            user?.preferredGrade,
            PAGE_TYPE
          )

          if (!canQuery) {
            // 조회 제한 도달 - 모달 표시
            setShowLimitModal(true)
            setIsLoading(false)
            return
          }

          // API 호출
          hanziData = await ApiClient.getHanziByGrade(grade)
          // 캐시에 저장 (다른 용도로 사용 가능)
          gradeDataCache.current.set(grade, hanziData)
          // 조회 횟수 증가
          incrementGradeQueryCount(grade, user?.preferredGrade, PAGE_TYPE)
          console.log(`📚 API에서 ${grade}급 한자 ${hanziData.length}개 로드`)
        }

        const words = extractTextbookWords(hanziData, grade, hanziData)
        setTextbookWords(words)
      } catch (error) {
        console.error("데이터 로드 실패:", error)
      } finally {
        setIsLoading(false)
      }
    },
    [extractTextbookWords, user, dataHanziList]
  )

  useEffect(() => {
    if (user && !initialLoading && isInitialLoad) {
      // preferredGrade가 있으면 그것부터 로드, 없으면 8급
      const initialGrade = user?.preferredGrade || 8
      setSelectedGrade(initialGrade)
      loadData(initialGrade)
      setIsInitialLoad(false) // 초기 로드 완료
    }
  }, [user, initialLoading, isInitialLoad, loadData])

  // 급수 변경 시 데이터 로드
  const handleGradeChange = useCallback(
    async (grade: number) => {
      if (grade === selectedGrade) return // 같은 급수면 불필요한 호출 방지

      setSelectedGrade(grade)
      await loadData(grade)
    },
    [selectedGrade, loadData]
  )

  // 급수별 한자 수 계산 (향후 사용 예정)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getGradeCounts = async () => {
    const counts: { [grade: number]: number } = {}

    // 각 급수별로 교과서 한자어 단어 개수 카운트
    const grades = [8, 7, 6, 5.5, 5, 4.5, 4, 3.5, 3]

    for (const grade of grades) {
      try {
        // 해당 급수의 한자 데이터 로드
        const gradeHanzi = await ApiClient.getHanziByGrade(grade)

        // 교과서 한자어 단어들을 Set으로 중복 제거
        const textbookWords = new Set<string>()

        gradeHanzi.forEach((hanzi) => {
          if (hanzi.relatedWords) {
            hanzi.relatedWords.forEach((relatedWord) => {
              if (relatedWord.isTextBook) {
                textbookWords.add(relatedWord.hanzi)
              }
            })
          }
        })

        const wordCount = textbookWords.size

        // 데이터가 있는 경우에만 카운트 추가
        if (wordCount > 0) {
          counts[grade] = wordCount
        }
      } catch (error) {
        console.error(`${grade}급 데이터 로드 실패:`, error)
      }
    }

    return counts
  }

  // 급수별 카운트 상태 - 제거하고 하드코딩된 급수 사용
  // const [gradeCounts, setGradeCounts] = useState<{ [grade: number]: number }>({})

  // 급수별 카운트 로드 - 제거 (불필요한 모든 급수 조회 방지)
  // useEffect(() => {
  //   const loadGradeCounts = async () => {
  //     const counts = await getGradeCounts()
  //     setGradeCounts(counts)
  //   }

  //   if (!authLoading) {
  //     loadGradeCounts()
  //   }
  // }, [authLoading])

  // 모달 닫기
  const closeModal = () => {
    setShowModal(false)
    setSelectedItem(null)
  }

  // 단어 클릭 핸들러
  const handleWordClick = (word: TextbookWord) => {
    setSelectedItem({
      type: "word",
      data: word,
    })
    setShowModal(true)
  }

  // 한자 클릭 핸들러
  const handleHanziClick = (hanzi: HanziItem) => {
    setSelectedItem({
      type: "hanzi",
      data: hanzi,
    })
    setShowModal(true)
  }

  // 네이버 국어사전 검색 함수
  const handleNaverKoreanSearch = (word: string) => {
    const searchUrl = `https://ko.dict.naver.com/#/search?query=${encodeURIComponent(
      word
    )}`
    window.open(searchUrl, "_blank")
  }

  // 뜻 등록 모달 열기
  const openMeaningModal = (word: TextbookWord) => {
    setSelectedWordForMeaning(word)
    setMeaningInput(word.meaning || "")
    setShowMeaningModal(true)
  }

  // 뜻 등록 모달 닫기
  const closeMeaningModal = () => {
    setShowMeaningModal(false)
    setSelectedWordForMeaning(null)
    setMeaningInput("")
  }

  // 뜻 등록/수정 제출
  const submitMeaning = async () => {
    if (!selectedWordForMeaning || !meaningInput.trim() || !user) return

    setIsSubmittingMeaning(true)
    try {
      // 해당 한자를 찾아서 relatedWords의 meaning 업데이트
      let hanziData: Hanzi[]

      // preferredGrade일 때는 DataContext의 hanziList(IndexedDB) 사용
      if (user?.preferredGrade === selectedGrade && dataHanziList.length > 0) {
        const gradeHanzi = dataHanziList.filter(
          (hanzi) => hanzi.grade === selectedGrade
        )
        if (gradeHanzi.length > 0) {
          hanziData = gradeHanzi
        } else {
          // IndexedDB에 데이터가 없으면 API 호출
          hanziData = await ApiClient.getHanziByGrade(selectedGrade)
        }
      } else {
        // 다른 급수는 API에서 로드
        hanziData = await ApiClient.getHanziByGrade(selectedGrade)
      }
      const targetHanzi = hanziData.find((hanzi) =>
        hanzi.relatedWords?.some(
          (word) =>
            word.hanzi === selectedWordForMeaning.hanzi && word.isTextBook
        )
      )

      if (targetHanzi) {
        // relatedWords에서 해당 단어 찾기
        const relatedWordIndex = targetHanzi.relatedWords?.findIndex(
          (word) =>
            word.hanzi === selectedWordForMeaning.hanzi && word.isTextBook
        )

        if (relatedWordIndex !== undefined && relatedWordIndex >= 0) {
          // 새로운 relatedWords 배열 생성
          const updatedRelatedWords = [...(targetHanzi.relatedWords || [])]
          updatedRelatedWords[relatedWordIndex] = {
            ...updatedRelatedWords[relatedWordIndex],
            meaning: meaningInput.trim(),
          }

          // 한자 문서 업데이트
          await ApiClient.updateDocument("hanzi", targetHanzi.id, {
            relatedWords: updatedRelatedWords,
          })

          // 경험치 10 추가 (새로 등록하는 경우에만)
          if (!selectedWordForMeaning.meaning) {
            await ApiClient.addUserExperience(user.id, 10)
            await ApiClient.updateTodayExperience(user.id, 10)
            alert("뜻이 성공적으로 등록되었습니다! +10 경험치를 획득했습니다.")
          } else {
            alert("뜻이 성공적으로 수정되었습니다!")
          }

          // 데이터 다시 로드하여 UI 업데이트
          await loadData(selectedGrade)
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

  // 로딩 중일 때는 로딩 스피너 표시 (진짜 초기 로딩만)
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

  return (
    <div className='min-h-screen bg-gray-50'>
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

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20'>
        {/* 검색 및 필터 */}
        <div className='bg-white rounded-lg shadow-sm p-6 mb-6'>
          <div className='flex justify-between items-center mb-4'>
            {/* 급수 필터 */}
            <div className='flex items-center space-x-4'>
              <label className='text-lg font-bold text-gray-900'>
                급수 선택:
              </label>
              <select
                value={selectedGrade}
                onChange={(e) => handleGradeChange(Number(e.target.value))}
                disabled={isLoading}
                className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-bold text-lg disabled:opacity-50'
                style={{
                  fontWeight: "bold",
                  color: "#1f2937",
                }}
              >
                {/* 하드코딩된 급수 목록 */}
                <option value={8} className='font-bold'>
                  8급
                </option>
                <option value={7} className='font-bold'>
                  7급
                </option>
                <option value={6} className='font-bold'>
                  6급
                </option>
                <option value={5.5} className='font-bold'>
                  준5급
                </option>
                <option value={5} className='font-bold'>
                  5급
                </option>
                <option value={4.5} className='font-bold'>
                  준4급
                </option>
                <option value={4} className='font-bold'>
                  4급
                </option>
                <option value={3.5} className='font-bold'>
                  준3급
                </option>
                <option value={3} className='font-bold'>
                  3급
                </option>
              </select>
            </div>

            {/* 결과 수 */}
            <div className='flex items-center text-lg font-bold text-gray-600'>
              총 {textbookWords.length}개의 단어
            </div>
          </div>

          {/* 통계 정보 */}
          <div className='flex justify-around items-center py-4 border-t border-gray-200'>
            <div className='text-center'>
              <div className='text-2xl font-bold text-blue-600'>
                {textbookWords.length}
              </div>
              <div className='text-sm text-gray-600'>총 단어</div>
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold text-green-600'>
                {textbookWords.reduce(
                  (total, word) => total + word.includedHanzi.length,
                  0
                )}
              </div>
              <div className='text-sm text-gray-600'>총 등장</div>
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold text-purple-600'>
                {
                  new Set(
                    textbookWords.flatMap((word) =>
                      word.includedHanzi.map((hanzi) => hanzi.character)
                    )
                  ).size
                }
              </div>
              <div className='text-sm text-gray-600'>설명된 단어</div>
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold text-orange-600'>
                {
                  textbookWords.filter((word) => word.includedHanzi.length > 0)
                    .length
                }
              </div>
              <div className='text-sm text-gray-600'>이 개수</div>
            </div>
          </div>
        </div>

        {/* 단어 목록 테이블 */}
        <div className='bg-white rounded-lg shadow-sm overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16'></th>
                  <th className='px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]'>
                    단어
                  </th>
                  <th className='px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]'>
                    한자1
                  </th>
                  <th className='px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]'>
                    한자2
                  </th>
                  <th className='px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]'>
                    한자3
                  </th>
                  <th className='px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]'>
                    한자4
                  </th>
                  <th className='px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]'>
                    뜻
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {textbookWords.map((word, index) => (
                  <tr key={word.word} className='hover:bg-gray-50'>
                    <td className='px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center w-16'>
                      {index + 1}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center min-w-[200px]'>
                      <div className='flex items-center justify-center space-x-2'>
                        <div
                          className='cursor-pointer hover:bg-blue-50 px-2 py-1 rounded'
                          onClick={() => handleWordClick(word)}
                        >
                          <span className='font-semibold'>{word.korean}</span>
                          <span className='text-gray-500'>({word.hanzi})</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleNaverKoreanSearch(word.korean)
                          }}
                          className='text-blue-600 hover:text-blue-800 transition-colors p-1'
                          title='네이버 국어사전에서 검색'
                        >
                          <ExternalLink className='h-3 w-3' />
                        </button>
                      </div>
                    </td>
                    {[0, 1, 2, 3].map((i) => {
                      const hanzi: HanziItem | undefined = word.includedHanzi[i]
                      return (
                        <td
                          key={i}
                          className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center min-w-[120px] ${
                            hanzi ? "cursor-pointer hover:bg-blue-50" : ""
                          }`}
                          onClick={
                            hanzi ? () => handleHanziClick(hanzi) : undefined
                          }
                        >
                          {hanzi ? (
                            <div className='text-center'>
                              <div className='flex items-center justify-center space-x-1 mb-1'>
                                <div className='font-semibold text-gray-600'>
                                  {hanzi.meaning}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleNaverKoreanSearch(hanzi.meaning)
                                  }}
                                  className='text-blue-600 hover:text-blue-800 transition-colors p-1'
                                  title='네이버 국어사전에서 검색'
                                >
                                  <ExternalLink className='h-3 w-3' />
                                </button>
                              </div>
                              <div className='text-gray-900 font-bold'>
                                {hanzi.sound}({hanzi.character})
                              </div>
                              <div className='text-xs text-gray-400'>
                                {hanzi.grade}급 {hanzi.gradeNumber}번
                              </div>
                            </div>
                          ) : (
                            <div className='text-gray-300'>-</div>
                          )}
                        </td>
                      )
                    })}
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center min-w-[150px]'>
                      {word.meaning ? (
                        <div className='flex items-center justify-center space-x-2'>
                          <span className='text-gray-700'>{word.meaning}</span>
                          <button
                            onClick={() => openMeaningModal(word)}
                            className='text-blue-600 hover:text-blue-800 transition-colors p-1'
                            title='뜻 수정'
                          >
                            <Edit className='h-3 w-3' />
                          </button>
                        </div>
                      ) : (
                        <div className='flex items-center justify-center h-full'>
                          <button
                            onClick={() => openMeaningModal(word)}
                            className='flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors px-3 py-2 rounded border border-blue-300 hover:border-blue-400 hover:bg-blue-50'
                            title='뜻 등록 (+10 경험치)'
                          >
                            <Plus className='h-4 w-4' />
                            <span className='text-sm'>등록</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 테이블 밑 정보 */}
          <div className='px-6 py-3 bg-gray-50 border-t border-gray-200'>
            <div className='flex justify-between items-center'>
              <div className='text-sm text-gray-600'>
                총 {textbookWords.length}개의 교과서 한자어
              </div>
              <div className='text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200'>
                💡 뜻 등록 시 <span className='font-semibold'>+10 경험치</span>
                를 획득합니다!
              </div>
            </div>
          </div>
        </div>

        {/* 결과가 없을 때 */}
        {textbookWords.length === 0 && (
          <div className='text-center py-12'>
            <BookOpen className='h-12 w-12 text-gray-400 mx-auto mb-4' />
            <h3 className='text-lg font-medium text-gray-900 mb-2'>
              검색 결과가 없습니다
            </h3>
            <p className='text-gray-600'>다른 검색어나 필터를 시도해보세요.</p>
          </div>
        )}
      </main>

      {/* 모달 */}
      {showModal && selectedItem && (
        <div
          className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
          onClick={closeModal}
        >
          <div
            className='bg-white rounded-lg p-8 max-w-2xl w-full mx-4 relative'
            onClick={(e) => e.stopPropagation()}
          >
            {/* X 버튼 */}
            <button
              onClick={closeModal}
              className='absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold'
            >
              ×
            </button>

            {/* 모달 내용 */}
            <div className='text-center'>
              {selectedItem.type === "word" ? (
                <div>
                  <div className='text-6xl font-bold text-gray-900 mb-4'>
                    {(selectedItem.data as TextbookWord).hanzi}
                  </div>
                  <div className='text-2xl font-semibold text-gray-700 mb-2'>
                    {(selectedItem.data as TextbookWord).korean}
                  </div>
                  <div className='text-lg text-gray-600 mb-6'>
                    교과서 한자어
                  </div>

                  {/* 구성 한자들 */}
                  <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mt-6'>
                    {(selectedItem.data as TextbookWord).includedHanzi.map(
                      (hanzi: HanziItem, index: number) => (
                        <div key={index} className='bg-gray-50 rounded-lg p-4'>
                          <div className='text-3xl font-bold text-gray-900 mb-2'>
                            {hanzi.character}
                          </div>
                          <div className='text-sm font-semibold text-gray-700'>
                            {hanzi.meaning}
                          </div>
                          <div className='text-xs text-gray-500'>
                            {hanzi.sound}
                          </div>
                          <div className='text-xs text-gray-400'>
                            {hanzi.grade}급 {hanzi.gradeNumber}번
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className='text-8xl font-bold text-gray-900 mb-6'>
                    {(selectedItem.data as HanziItem).character}
                  </div>
                  <div className='text-3xl font-semibold text-gray-700 mb-4'>
                    {(selectedItem.data as HanziItem).meaning}
                  </div>
                  <div className='text-xl text-gray-600 mb-2'>
                    {(selectedItem.data as HanziItem).sound}
                  </div>
                  <div className='text-lg text-gray-500'>
                    {(selectedItem.data as HanziItem).grade}급{" "}
                    {(selectedItem.data as HanziItem).gradeNumber}번
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 뜻 등록/수정 모달 */}
      {showMeaningModal && selectedWordForMeaning && (
        <div
          className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
          onClick={closeMeaningModal}
        >
          <div
            className='bg-white rounded-lg p-8 max-w-md w-full mx-4 relative'
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeMeaningModal}
              className='absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold'
            >
              ×
            </button>
            <h2 className='text-2xl font-bold text-gray-900 mb-4'>
              {selectedWordForMeaning.meaning ? "뜻 수정" : "뜻 등록"}
            </h2>
            <p className='text-gray-700 mb-4'>
              {selectedWordForMeaning.korean} ({selectedWordForMeaning.hanzi})
              {selectedWordForMeaning.meaning
                ? "의 뜻을 수정해주세요."
                : "의 뜻을 등록해주세요."}
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
                onClick={submitMeaning}
                className='px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50'
                disabled={isSubmittingMeaning}
              >
                {isSubmittingMeaning
                  ? selectedWordForMeaning.meaning
                    ? "수정 중..."
                    : "등록 중..."
                  : selectedWordForMeaning.meaning
                  ? "수정"
                  : "등록"}
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
                className='w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500'
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
