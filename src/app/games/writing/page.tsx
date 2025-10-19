"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import { ApiClient } from "@/lib/apiClient"
import LoadingSpinner from "@/components/LoadingSpinner"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function WritingGame() {
  const { user, loading: authLoading } = useAuth()
  const { hanziList, isLoading: isDataLoading } = useData()

  // 통합된 로딩 상태
  const isLoading = authLoading || isDataLoading || hanziList.length === 0

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

  // 데이터가 없을 때 표시
  if (hanziList.length === 0) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-gray-900 mb-4'>
            데이터가 없습니다
          </h1>
          <p className='text-gray-600 mb-4'>
            현재 학습 급수에 해당하는 한자 데이터가 없습니다. 마이페이지에서
            다른 급수를 선택해주세요.
          </p>
          <div className='flex justify-center space-x-4'>
            <Link
              href='/profile'
              className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors'
            >
              마이페이지로 이동
            </Link>
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
            <Link
              href='/profile'
              className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors'
            >
              마이페이지로 이동
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
