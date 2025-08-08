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
  const { user, loading: authLoading } = useAuth()
  const [hanziList, setHanziList] = useState<Hanzi[]>([])
  const [textbookWords, setTextbookWords] = useState<TextbookWord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGrade, setSelectedGrade] = useState<number>(8)

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const hanzi = await ApiClient.getAllHanzi()
        setHanziList(hanzi)

        // 교과서 한자어 추출
        const words = extractTextbookWords(hanzi, selectedGrade)
        setTextbookWords(words)
      } catch (error) {
        console.error("데이터 로드 실패:", error)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      loadData()
    }
  }, [authLoading, selectedGrade])

  // 교과서 한자어 추출 함수
  const extractTextbookWords = (
    hanziList: Hanzi[],
    grade: number
  ): TextbookWord[] => {
    const wordMap = new Map<string, TextbookWord>()

    hanziList.forEach((hanzi) => {
      if (hanzi.relatedWords) {
        hanzi.relatedWords.forEach((relatedWord) => {
          if (relatedWord.isTextBook) {
            // 이미 존재하는 단어인지 확인
            if (!wordMap.has(relatedWord.hanzi)) {
              // 해당 단어를 구성하는 한자들 찾기
              const includedHanzi = findIncludedHanzi(
                relatedWord.hanzi,
                hanziList
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
  const findIncludedHanzi = (word: string, hanziList: Hanzi[]) => {
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
      const hanzi = hanziList.find((h) => h.character === char)
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
  const getGradeCounts = () => {
    const counts: { [grade: number]: number } = {}
    hanziList.forEach((hanzi) => {
      if (hanzi.relatedWords?.some((rw) => rw.isTextBook)) {
        counts[hanzi.grade] = (counts[hanzi.grade] || 0) + 1
      }
    })
    return counts
  }

  const gradeCounts = getGradeCounts()

  if (authLoading || loading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <LoadingSpinner />
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
                onChange={(e) => setSelectedGrade(Number(e.target.value))}
                className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-bold text-lg'
                style={{
                  fontWeight: "bold",
                  color: "#1f2937",
                }}
              >
                {[8, 7, 6, 5.5, 5, 4.5, 4, 3.5, 3].map((grade) => (
                  <option key={grade} value={grade} className='font-bold'>
                    {grade === 5.5
                      ? "준5급"
                      : grade === 4.5
                      ? "준4급"
                      : grade === 3.5
                      ? "준3급"
                      : `${grade}급`}
                  </option>
                ))}
              </select>
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
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    번호
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    단어
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    한자1
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    한자2
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    한자3
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    한자4
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {textbookWords.map((word, index) => (
                  <tr key={word.word} className='hover:bg-gray-50'>
                    <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>
                      {index + 1}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                      <div>
                        <div className='font-semibold'>{word.korean}</div>
                        <div className='text-gray-500'>({word.hanzi})</div>
                      </div>
                    </td>
                    {[0, 1, 2, 3].map((i) => {
                      const hanzi = word.includedHanzi[i]
                      return (
                        <td
                          key={i}
                          className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'
                        >
                          {hanzi ? (
                            <div>
                              <div className='font-semibold'>
                                {hanzi.meaning}
                              </div>
                              <div className='text-gray-500'>
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
    </div>
  )
}
