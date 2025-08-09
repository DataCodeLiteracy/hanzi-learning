"use client"

import { useAuth } from "@/contexts/AuthContext"
import LoadingSpinner from "@/components/LoadingSpinner"
import { ArrowLeft, BookOpen, ExternalLink, Search, Info } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { ApiClient } from "@/lib/apiClient"
import { Hanzi } from "@/types"

export default function HanziListPage() {
  const {
    user,
    loading: authLoading,
    initialLoading,
    isAuthenticated,
  } = useAuth()
  const [selectedGrade, setSelectedGrade] = useState<number>(8)
  const [hanziList, setHanziList] = useState<Hanzi[]>([])
  const [loading, setLoading] = useState(true)
  const [isLoadingGrade, setIsLoadingGrade] = useState<boolean>(false) // 급수 로딩 상태
  const [noDataMessage, setNoDataMessage] = useState<string>("")
  const [showNoDataModal, setShowNoDataModal] = useState<boolean>(false)

  // 8급 데이터 기본 로딩
  const loadHanziData = async (grade: number) => {
    if (grade === 8) setLoading(true)
    else setIsLoadingGrade(true)

    try {
      const data = await ApiClient.getHanziByGrade(grade)
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
    } catch (error) {
      console.error("한자 데이터 로드 실패:", error)
    } finally {
      if (grade === 8) setLoading(false)
      else setIsLoadingGrade(false)
    }
  }

  useEffect(() => {
    loadHanziData(8) // 8급 기본 로드
  }, [])

  // 급수 변경 시 데이터 로드
  const handleGradeChange = async (grade: number) => {
    if (grade === selectedGrade) return // 같은 급수면 불필요한 호출 방지

    setSelectedGrade(grade)
    await loadHanziData(grade)
  }

  // 네이버 한자 사전으로 연결
  const openNaverDictionary = (character: string) => {
    const url = `https://hanja.dict.naver.com/search?query=${encodeURIComponent(
      character
    )}`
    window.open(url, "_blank")
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

  // 데이터 로딩 중
  if (loading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='한자 데이터를 불러오는 중...' />
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
            <div className='mb-4'>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                급수 선택
              </label>
              <select
                value={selectedGrade}
                onChange={(e) => handleGradeChange(Number(e.target.value))}
                disabled={isLoadingGrade}
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium disabled:opacity-50'
              >
                {[8, 7, 6, 5.5, 5, 4.5, 4, 3.5, 3].map((grade) => (
                  <option key={grade} value={grade} className='font-medium'>
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

              {isLoadingGrade && (
                <div className='mt-2 flex items-center space-x-2'>
                  <LoadingSpinner message='' />
                  <span className='text-sm text-gray-600'>
                    급수 데이터를 불러오는 중...
                  </span>
                </div>
              )}
            </div>
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
    </div>
  )
}
