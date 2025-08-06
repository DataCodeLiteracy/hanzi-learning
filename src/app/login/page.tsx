"use client"

import { useAuth } from "@/contexts/AuthContext"
import LoadingSpinner from "@/components/LoadingSpinner"
import { LogIn, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const { user, loading: authLoading, signIn } = useAuth()
  const router = useRouter()

  // 이미 로그인된 사용자는 메인 페이지로 리다이렉트
  useEffect(() => {
    if (user && !authLoading) {
      router.push("/")
    }
  }, [user, authLoading, router])

  // 로딩 중일 때는 로딩 스피너 표시
  if (authLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='인증 상태를 확인하는 중...' />
      </div>
    )
  }

  // 이미 로그인된 경우 로딩 표시
  if (user) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='메인 페이지로 이동하는 중...' />
      </div>
    )
  }

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
              <h1 className='text-xl sm:text-2xl font-bold text-gray-900'>
                로그인
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8'>
        <div className='text-center py-8 sm:py-12'>
          <div className='max-w-md mx-auto'>
            <h2 className='text-2xl sm:text-3xl font-bold text-gray-900 mb-4'>
              한자 학습에 오신 것을 환영합니다
            </h2>
            <p className='text-sm sm:text-base text-gray-600 mb-6 sm:mb-8'>
              한자 진흥회 데이터를 기반으로 한 다양한 학습 게임을 통해 한자를
              재미있게 배워보세요.
            </p>
            <button
              onClick={signIn}
              className='flex items-center space-x-2 px-4 py-3 sm:px-6 sm:py-3 text-base sm:text-lg text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors mx-auto'
            >
              <LogIn className='h-4 w-4 sm:h-5 sm:w-5' />
              <span>Google로 시작하기</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
