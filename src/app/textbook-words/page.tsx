"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import LoadingSpinner from "@/components/LoadingSpinner"
import { ApiClient } from "@/lib/apiClient"
import { Hanzi, RelatedWord } from "@/types"
import { ArrowLeft, BookOpen } from "lucide-react"
import Link from "next/link"

interface TextbookWord {
  word: string
  korean: string
  hanzi: string
  includedHanzi: Array<{
    character: string
    meaning: string
    sound: string
    grade: number
    gradeNumber: number
  }>
}

export default function TextbookWordsPage() {
  const { user, loading: authLoading, initialLoading } = useAuth()
  const [textbookWords, setTextbookWords] = useState<TextbookWord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGrade, setSelectedGrade] = useState<number>(8)
  const [selectedItem, setSelectedItem] = useState<{
    type: "word" | "hanzi"
    data: any
  } | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [isLoadingGrade, setIsLoadingGrade] = useState<boolean>(false) // 급수 로딩 상태

  // 8급 데이터 기본 로딩
  const loadData = async (grade: number = 8) => {
    if (grade === 8) setLoading(true)
    else setIsLoadingGrade(true)

    try {
      const hanziData = await ApiClient.getHanziByGrade(grade)
      // setHanziList(hanziData) // This line was removed as per the edit hint

      const words = extractTextbookWords(hanziData, grade, hanziData)
      setTextbookWords(words)
    } catch (error) {
      console.error("데이터 로드 실패:", error)
    } finally {
      if (grade === 8) setLoading(false)
      else setIsLoadingGrade(false)
    }
  }

  useEffect(() => {
    loadData(8) // 8급 기본 로드
  }, []) // loadData를 dependency에서 제거

  // 급수 변경 시 데이터 로드
  const handleGradeChange = async (grade: number) => {
    if (grade === selectedGrade) return // 같은 급수면 불필요한 호출 방지

    setSelectedGrade(grade)
    await loadData(grade)
  }

  // 교과서 한자어 추출 함수
  const extractTextbookWords = (
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
                includedHanzi,
              })
            }
          }
        })
      }
    })

    return Array.from(wordMap.values())
  }

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
      }
    }

    return includedHanzi
  }

  // 급수별 한자 수 계산
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
  const handleHanziClick = (hanzi: any) => {
    setSelectedItem({
      type: "hanzi",
      data: hanzi,
    })
    setShowModal(true)
  }

  // 로딩 중일 때는 로딩 스피너 표시 (진짜 초기 로딩만)
  if (initialLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='인증 상태를 확인하는 중...' />
      </div>
    )
  }

  // 데이터 로딩 중
  if (loading || isLoadingGrade) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='한자 데이터를 불러오는 중...' />
      </div>
    )
  }

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
      {/* 헤더 */}
      <div className='bg-white shadow-sm border-b'>
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

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* 검색 및 필터 */}
        <div className='bg-white rounded-lg shadow-sm p-6 mb-6'>
          <div className='flex justify-between items-center'>
            {/* 급수 필터 */}
            <div className='flex items-center space-x-4'>
              <label className='text-lg font-bold text-gray-900'>
                급수 선택:
              </label>
              <select
                value={selectedGrade}
                onChange={(e) => handleGradeChange(Number(e.target.value))}
                disabled={isLoadingGrade}
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

              {isLoadingGrade && (
                <div className='mt-2 flex items-center space-x-2'>
                  <LoadingSpinner message='' />
                  <span className='text-sm text-gray-600'>
                    급수 데이터를 불러오는 중...
                  </span>
                </div>
              )}
            </div>

            {/* 결과 수 */}
            <div className='flex items-center text-lg font-bold text-gray-600'>
              총 {textbookWords.length}개의 단어
            </div>
          </div>
        </div>

        {/* 단어 목록 테이블 */}
        <div className='bg-white rounded-lg shadow-sm overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'></th>
                  <th className='px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    단어
                  </th>
                  <th className='px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    한자1
                  </th>
                  <th className='px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    한자2
                  </th>
                  <th className='px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    한자3
                  </th>
                  <th className='px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    한자4
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {textbookWords.map((word, index) => (
                  <tr key={word.word} className='hover:bg-gray-50'>
                    <td className='px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center'>
                      {index + 1}
                    </td>
                    <td
                      className='px-3 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 text-center'
                      onClick={() => handleWordClick(word)}
                    >
                      <div className='flex items-center justify-center space-x-2'>
                        <span className='font-semibold'>{word.korean}</span>
                        <span className='text-gray-500'>({word.hanzi})</span>
                      </div>
                    </td>
                    {[0, 1, 2, 3].map((i) => {
                      const hanzi = word.includedHanzi[i]
                      return (
                        <td
                          key={i}
                          className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center ${
                            hanzi ? "cursor-pointer hover:bg-blue-50" : ""
                          }`}
                          onClick={
                            hanzi ? () => handleHanziClick(hanzi) : undefined
                          }
                        >
                          {hanzi ? (
                            <div className='text-center'>
                              <div className='font-semibold text-gray-600'>
                                {hanzi.meaning}
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
                  </tr>
                ))}
              </tbody>
            </table>
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
                    {selectedItem.data.hanzi}
                  </div>
                  <div className='text-2xl font-semibold text-gray-700 mb-2'>
                    {selectedItem.data.korean}
                  </div>
                  <div className='text-lg text-gray-600 mb-6'>
                    교과서 한자어
                  </div>

                  {/* 구성 한자들 */}
                  <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mt-6'>
                    {selectedItem.data.includedHanzi.map(
                      (hanzi: any, index: number) => (
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
                    {selectedItem.data.character}
                  </div>
                  <div className='text-3xl font-semibold text-gray-700 mb-4'>
                    {selectedItem.data.meaning}
                  </div>
                  <div className='text-xl text-gray-600 mb-2'>
                    {selectedItem.data.sound}
                  </div>
                  <div className='text-lg text-gray-500'>
                    {selectedItem.data.grade}급 {selectedItem.data.gradeNumber}
                    번
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
