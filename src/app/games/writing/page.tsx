"use client"

import { useAuth } from "@/contexts/AuthContext"
import LoadingSpinner from "@/components/LoadingSpinner"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function WritingGame() {
  const { user, loading: authLoading } = useAuth()

  // 통합된 로딩 상태 (한자 데이터는 필수가 아님)
  const isLoading = authLoading

  // 현재 선택된 급수는 user.preferredGrade를 사용
  const selectedGrade = user?.preferredGrade || 8

  // 로딩 중일 때는 로딩 스피너 표시
  if (isLoading) {
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

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      {/* 헤더 - 모바일 최적화 */}
      <header className='bg-white shadow-sm'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-3 sm:py-4'>
            <div className='flex items-center space-x-3 sm:space-x-4'>
              <Link href='/' className='text-blue-600 hover:text-blue-700 p-1'>
                <ArrowLeft className='h-5 w-5 sm:h-6 sm:w-6' />
              </Link>
              <h1 className='text-lg sm:text-xl font-bold text-gray-900'>쓰기 연습</h1>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 - 모바일 최적화 */}
      <main className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12'>
        <div className='text-center mb-6 sm:mb-8'>
          <h2 className='text-2xl sm:text-3xl font-bold text-gray-900 mb-2'>
            쓰기 연습 모드 선택
          </h2>
          <p className='text-sm sm:text-base text-gray-600 px-4'>
            이미지 업로드, 갤러리 조회, 연습지 생성 중 원하는 방식을 선택하세요
          </p>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8'>
          {/* 이미지 업로드 옵션 - 모바일 최적화 */}
          <Link href='/games/writing/upload'>
            <div className='bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8 hover:shadow-2xl transition-shadow cursor-pointer border-2 border-transparent hover:border-green-500'>
              <div className='text-center mb-4 sm:mb-6'>
                <div className='w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mx-auto flex items-center justify-center mb-3 sm:mb-4'>
                  <svg
                    className='w-8 h-8 sm:w-10 sm:h-10 text-white'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z'
                    />
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M15 13a3 3 0 11-6 0 3 3 0 016 0z'
                    />
                  </svg>
                </div>
                <h3 className='text-xl sm:text-2xl font-bold text-gray-900 mb-2'>
                  이미지 업로드
                </h3>
                <p className='text-sm sm:text-base text-gray-600 mb-4 sm:mb-6'>
                  한자 쓰기 연습지를 촬영하여 업로드하고 관리자 검토를 받으세요
                </p>
              </div>
              <div className='mt-6 sm:mt-8'>
                <div className='w-full bg-green-600 text-white py-2.5 sm:py-3 px-4 rounded-lg font-semibold text-center hover:bg-green-700 transition-colors text-sm sm:text-base'>
                  이미지 업로드하기
                </div>
              </div>
            </div>
          </Link>

          {/* 갤러리 조회 옵션 - 모바일 최적화 */}
          <Link href='/games/writing/gallery'>
            <div className='bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8 hover:shadow-2xl transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-500'>
              <div className='text-center mb-4 sm:mb-6'>
                <div className='w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mx-auto flex items-center justify-center mb-3 sm:mb-4'>
                  <svg
                    className='w-8 h-8 sm:w-10 sm:h-10 text-white'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
                    />
                  </svg>
                </div>
                <h3 className='text-xl sm:text-2xl font-bold text-gray-900 mb-2'>
                  갤러리 조회
                </h3>
                <p className='text-sm sm:text-base text-gray-600 mb-4 sm:mb-6'>
                  업로드한 이미지를 날짜별, 급수별로 조회하고 학습 기록을
                  확인하세요
                </p>
              </div>
              <div className='mt-6 sm:mt-8'>
                <div className='w-full bg-blue-600 text-white py-2.5 sm:py-3 px-4 rounded-lg font-semibold text-center hover:bg-blue-700 transition-colors text-sm sm:text-base'>
                  갤러리 보기
                </div>
              </div>
            </div>
          </Link>

          {/* A4 연습지 생성 옵션 - 모바일 최적화 */}
          <Link href='/games/writing/worksheet'>
            <div className='bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8 hover:shadow-2xl transition-shadow cursor-pointer border-2 border-transparent hover:border-purple-500'>
              <div className='text-center mb-4 sm:mb-6'>
                <div className='w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full mx-auto flex items-center justify-center mb-3 sm:mb-4'>
                  <svg
                    className='w-8 h-8 sm:w-10 sm:h-10 text-white'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                    />
                  </svg>
                </div>
                <h3 className='text-xl sm:text-2xl font-bold text-gray-900 mb-2'>
                  연습지 생성
                </h3>
                <p className='text-sm sm:text-base text-gray-600 mb-4 sm:mb-6'>
                  원하는 한자를 선택하여 A4 연습지를 생성하고 출력하세요
                </p>
              </div>
              <div className='mt-6 sm:mt-8'>
                <div className='w-full bg-purple-600 text-white py-2.5 sm:py-3 px-4 rounded-lg font-semibold text-center hover:bg-purple-700 transition-colors text-sm sm:text-base'>
                  연습지 만들기
                </div>
              </div>
            </div>
          </Link>
        </div>
      </main>
    </div>
  )
}
