"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import LoadingSpinner from "@/components/LoadingSpinner"
import { ArrowLeft, BookOpen, ExternalLink, Search, Info } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { ApiClient } from "@/lib/apiClient"
import { Hanzi } from "@/types"

export default function HanziListPage() {
  const { user, loading: authLoading } = useAuth()
  const [selectedGrade, setSelectedGrade] = useState<number>(8)
  const [hanziList, setHanziList] = useState<Hanzi[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  // 한자 데이터 로드
  useEffect(() => {
    const loadHanziData = async () => {
      setLoading(true)
      try {
        const data = await ApiClient.getHanziByGrade(selectedGrade)
        setHanziList(data)
      } catch (error) {
        console.error("한자 데이터 로드 실패:", error)
      } finally {
        setLoading(false)
      }
    }

    loadHanziData()
  }, [selectedGrade])

  // 네이버 한자 사전으로 연결
  const openNaverDictionary = (character: string) => {
    const url = `https://hanja.dict.naver.com/search?query=${encodeURIComponent(
      character
    )}`
    window.open(url, "_blank")
  }

  // 로딩 중일 때는 로딩 스피너 표시
  if (authLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='인증 상태를 확인하는 중...' />
      </div>
    )
  }

  // 인증이 완료되었지만 사용자가 없을 때
  if (!user) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-gray-900 mb-4'>
            로그인이 필요합니다
          </h1>
          <Link href='/' className='text-blue-600 hover:text-blue-700'>
            홈으로 돌아가기
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

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      {/* 헤더 */}
      <header className='bg-white shadow-sm'>
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
      <main className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='space-y-6'>
          {/* 급수 선택 */}
          <div className='bg-white rounded-lg shadow-lg p-6'>
            <h3 className='text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2'>
              <BookOpen className='h-5 w-5' />
              <span>급수 선택</span>
            </h3>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(Number(e.target.value))}
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium'
            >
              {[8, 7, 6, 5.5, 5, 4.5, 4, 3.5, 3].map((grade) => {
                const gradeName =
                  grade === 5.5
                    ? "준5급"
                    : grade === 4.5
                    ? "준4급"
                    : grade === 3.5
                    ? "준3급"
                    : `${grade}급`
                return (
                  <option key={grade} value={grade} className='font-medium'>
                    {gradeName}
                  </option>
                )
              })}
            </select>
          </div>

          {/* 한자 목록 */}
          <div className='bg-white rounded-lg shadow-lg p-6'>
            <div className='flex items-center justify-between mb-6'>
              <h3 className='text-xl font-semibold text-gray-900 flex items-center space-x-2'>
                <Search className='h-5 w-5' />
                <span>{gradeName} 한자 목록</span>
              </h3>
              <div className='text-sm text-gray-600'>
                총 {hanziList.length}개
              </div>
            </div>

            {loading ? (
              <div className='flex justify-center py-8'>
                <LoadingSpinner message='한자를 불러오는 중...' />
              </div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='min-w-full divide-y divide-gray-200'>
                  <thead className='bg-gray-50'>
                    <tr>
                      <th className='px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        순번
                      </th>
                      <th className='px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        한자
                      </th>
                      <th className='px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        음
                      </th>
                      <th className='px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        뜻
                      </th>
                      <th className='hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        획수
                      </th>
                      <th className='px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        사전
                      </th>
                    </tr>
                  </thead>
                  <tbody className='bg-white divide-y divide-gray-200'>
                    {hanziList.map((hanzi, index) => (
                      <tr key={hanzi.id} className='hover:bg-gray-50'>
                        <td className='px-2 sm:px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>
                          {hanzi.gradeNumber || index + 1}
                        </td>
                        <td className='px-2 sm:px-4 py-4 whitespace-nowrap'>
                          <div className='text-xl sm:text-2xl font-bold text-gray-900'>
                            {hanzi.character}
                          </div>
                        </td>
                        <td className='px-2 sm:px-4 py-4 whitespace-nowrap text-sm text-gray-900'>
                          {hanzi.sound}
                        </td>
                        <td className='px-2 sm:px-4 py-4 whitespace-nowrap text-sm text-gray-900'>
                          {hanzi.meaning}
                        </td>
                        <td className='hidden md:table-cell px-4 py-4 whitespace-nowrap text-sm text-gray-900'>
                          {hanzi.strokes}획
                        </td>
                        <td className='px-2 sm:px-4 py-4 whitespace-nowrap text-sm font-medium'>
                          <button
                            onClick={() => openNaverDictionary(hanzi.character)}
                            className='inline-flex items-center px-2 sm:px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                          >
                            <ExternalLink className='h-3 w-3 mr-1' />
                            사전
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && hanziList.length === 0 && (
              <div className='text-center py-8'>
                <Info className='h-12 w-12 text-gray-400 mx-auto mb-4' />
                <p className='text-gray-500'>등록된 한자가 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
