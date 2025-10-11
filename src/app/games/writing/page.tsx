"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { ApiClient } from "@/lib/apiClient"
import LoadingSpinner from "@/components/LoadingSpinner"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function WritingGame() {
  const { user, loading: authLoading } = useAuth()
  const [selectedGrade, setSelectedGrade] = useState<number>(8)
  const [gradeHanzi, setGradeHanzi] = useState<
    {
      id: string
      character: string
      meaning: string
      sound: string
      pinyin?: string
      grade: number
    }[]
  >([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isLoadingGrade, setIsLoadingGrade] = useState<boolean>(false)

  // 8급 데이터 기본 로딩
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true)
      try {
        const grade8Data = await ApiClient.getHanziByGrade(8)
        setGradeHanzi(grade8Data)
      } catch (error) {
        console.error("초기 데이터 로드 실패:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialData()
  }, [])

  // 급수 변경 시 데이터 업데이트
  const handleGradeChange = async (grade: number) => {
    if (grade === selectedGrade) return

    setSelectedGrade(grade)
    setIsLoadingGrade(true)

    try {
      const gradeData = await ApiClient.getHanziByGrade(grade)
      setGradeHanzi(gradeData)

      if (gradeData.length === 0) {
        // setNoDataMessage(
        //   `선택한 급수(${
        //     grade === 5.5
        //       ? "준5급"
        //       : grade === 4.5
        //       ? "준4급"
        //       : grade === 3.5
        //       ? "준3급"
        //       : `${grade}급`
        //   })에 데이터가 없습니다.`
        // )
        // setShowNoDataModal(true)
      } else {
        // setNoDataMessage("")
        // setShowNoDataModal(false)
      }
    } catch (error) {
      console.error("급수 데이터 로드 실패:", error)
      // setNoDataMessage("데이터 로드 중 오류가 발생했습니다.")
      // setShowNoDataModal(true)
    } finally {
      setIsLoadingGrade(false)
    }
  }

  // 로딩 중일 때는 로딩 스피너 표시
  if (authLoading || isLoading || isLoadingGrade) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='게임을 준비하는 중...' />
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

  // 데이터가 없을 때 표시
  if (gradeHanzi.length === 0) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-gray-900 mb-4'>
            데이터가 없습니다
          </h1>
          <p className='text-gray-600 mb-4'>
            선택한 급수에 해당하는 한자 데이터가 없습니다. 다른 급수를
            선택해주세요.
          </p>
          <div className='flex justify-center space-x-4'>
            <button
              onClick={() => handleGradeChange(8)}
              className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors'
            >
              8급 데이터 로드
            </button>
            <button
              onClick={() => handleGradeChange(5.5)}
              className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors'
            >
              준5급 데이터 로드
            </button>
            <button
              onClick={() => handleGradeChange(4.5)}
              className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors'
            >
              준4급 데이터 로드
            </button>
            <button
              onClick={() => handleGradeChange(3.5)}
              className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors'
            >
              준3급 데이터 로드
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      {/* 헤더 */}
      <header className='bg-white shadow-sm'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-3'>
            <div className='flex items-center space-x-4'>
              <Link href='/' className='text-blue-600 hover:text-blue-700'>
                <ArrowLeft className='h-5 w-5' />
              </Link>
              <h1 className='text-xl font-bold text-gray-900'>쓰기 연습</h1>
            </div>
            <div className='flex items-center space-x-6'>
              <div className='text-center'>
                <div className='text-sm text-gray-600'>완료</div>
                <div className='text-lg font-bold text-green-600'>0/0</div>
              </div>
              <div className='text-center'>
                <div className='text-sm text-gray-600'>문제</div>
                <div className='text-lg font-bold text-blue-600'>1/0</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='bg-white rounded-lg shadow-lg p-6 text-center'>
          <h2 className='text-2xl font-bold text-gray-900 mb-4'>
            쓰기 연습 시작
          </h2>
          <p className='text-gray-600 mb-4'>
            선택한 급수의 한자를 써보세요. 배경에 흐린 한자를 따라 그려보세요.
          </p>
          <div className='flex justify-center space-x-4'>
            <button
              onClick={() => handleGradeChange(8)}
              className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors'
            >
              8급 데이터 로드
            </button>
            <button
              onClick={() => handleGradeChange(5.5)}
              className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors'
            >
              준5급 데이터 로드
            </button>
            <button
              onClick={() => handleGradeChange(4.5)}
              className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors'
            >
              준4급 데이터 로드
            </button>
            <button
              onClick={() => handleGradeChange(3.5)}
              className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors'
            >
              준3급 데이터 로드
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
