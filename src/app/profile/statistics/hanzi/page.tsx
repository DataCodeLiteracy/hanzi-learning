"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import LoadingSpinner from "@/components/LoadingSpinner"
import {
  ArrowLeft,
  BookOpen,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect, Suspense } from "react"
import { ApiClient } from "@/lib/apiClient"
import {
  HanziStatisticsService,
  HanziStatistics,
} from "@/lib/services/hanziStatisticsService"
import { useSearchParams } from "next/navigation"

function HanziStatisticsContent() {
  const { user, loading: authLoading } = useAuth()
  const { hanziList } = useData()
  const searchParams = useSearchParams()
  const [selectedGrade, setSelectedGrade] = useState<number>(() => {
    const gradeParam = searchParams.get("grade")
    return gradeParam ? Number(gradeParam) : 8
  })
  const [hanziStatistics, setHanziStatistics] = useState<HanziStatistics[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  // 한자 통계 로드
  useEffect(() => {
    if (user && selectedGrade) {
      const loadHanziStatistics = async () => {
        try {
          const stats = await HanziStatisticsService.getGradeHanziStatistics(
            user.id,
            selectedGrade
          )
          setHanziStatistics(stats)
        } catch (error) {
          console.error("한자 통계 로드 실패:", error)
        }
      }
      loadHanziStatistics()
    }
  }, [user, selectedGrade])

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

  const totalHanzi = hanziStatistics.length
  const studiedHanzi = hanziStatistics.filter((h) => h.totalStudied > 0).length
  const notStudiedHanzi = totalHanzi - studiedHanzi
  const studiedStats = hanziStatistics.filter((h) => h.totalStudied > 0)
  const averageAccuracy =
    studiedStats.length > 0
      ? Math.round(
          studiedStats.reduce((sum, h) => sum + (h.accuracy || 0), 0) /
            studiedStats.length
        )
      : 0

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      {/* 헤더 */}
      <header className='bg-white shadow-sm'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-4'>
            <div className='flex items-center space-x-4'>
              <Link
                href='/profile'
                className='text-blue-600 hover:text-blue-700'
              >
                <ArrowLeft className='h-5 w-5' />
              </Link>
              <h1 className='text-2xl font-bold text-gray-900'>한자별 통계</h1>
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
                const gradeData = hanziList.filter((h) => h.grade === grade)
                return (
                  <option key={grade} value={grade} className='font-medium'>
                    {grade === 5.5
                      ? "준5급"
                      : grade === 4.5
                      ? "준4급"
                      : grade === 3.5
                      ? "준3급"
                      : `${grade}급`}{" "}
                    ({gradeData.length}개)
                  </option>
                )
              })}
            </select>
          </div>

          {/* 요약 통계 */}
          <div className='bg-white rounded-lg shadow-lg p-6'>
            <h3 className='text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2'>
              <TrendingUp className='h-5 w-5' />
              <span>요약 통계</span>
            </h3>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
              <div className='text-center p-4 bg-blue-50 rounded-lg'>
                <div className='text-2xl font-bold text-blue-600'>
                  {totalHanzi}
                </div>
                <div className='text-sm text-gray-600'>총 한자</div>
              </div>
              <div className='text-center p-4 bg-green-50 rounded-lg'>
                <div className='text-2xl font-bold text-green-600'>
                  {studiedHanzi}
                </div>
                <div className='text-sm text-gray-600'>학습한 한자</div>
              </div>
              <div className='text-center p-4 bg-orange-50 rounded-lg'>
                <div className='text-2xl font-bold text-orange-600'>
                  {notStudiedHanzi}
                </div>
                <div className='text-sm text-gray-600'>미학습 한자</div>
              </div>
              <div className='text-center p-4 bg-purple-50 rounded-lg'>
                <div className='text-2xl font-bold text-purple-600'>
                  {averageAccuracy}%
                </div>
                <div className='text-sm text-gray-600'>평균 정답률</div>
              </div>
            </div>
          </div>

          {/* 한자별 상세 통계 */}
          <div className='bg-white rounded-lg shadow-lg p-6'>
            <h3 className='text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2'>
              <BookOpen className='h-5 w-5' />
              <span>한자별 상세 통계</span>
            </h3>
            {loading ? (
              <div className='flex justify-center py-8'>
                <LoadingSpinner message='통계를 불러오는 중...' />
              </div>
            ) : (
              <div className='space-y-4'>
                {hanziStatistics.map((hanzi) => (
                  <div
                    key={hanzi.hanziId}
                    className='relative bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors'
                  >
                    {/* 미학습 배지 */}
                    {hanzi.totalStudied === 0 && (
                      <div className='absolute top-2 right-2 flex items-center space-x-1 bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-medium'>
                        <AlertTriangle className='h-3 w-3' />
                        <span>미학습</span>
                      </div>
                    )}

                    <div className='space-y-3'>
                      {/* 한자 번호 */}
                      <div className='text-center'>
                        <div className='text-sm text-gray-500 font-medium'>
                          {selectedGrade === 5.5
                            ? "준5급"
                            : selectedGrade === 4.5
                            ? "준4급"
                            : selectedGrade === 3.5
                            ? "준3급"
                            : `${selectedGrade}급`}{" "}
                          {hanzi.gradeNumber}번
                        </div>
                      </div>

                      {/* 한자 */}
                      <div className='text-center'>
                        <div className='text-4xl font-bold text-gray-900'>
                          {hanzi.character}
                        </div>
                      </div>

                      {/* 뜻과 음 (가로 배치) */}
                      <div className='flex justify-center space-x-6 text-sm text-gray-600'>
                        <div className='text-center'>
                          <div className='text-xs text-gray-500 mb-1'>뜻</div>
                          <div className='font-medium'>{hanzi.meaning}</div>
                        </div>
                        <div className='text-center'>
                          <div className='text-xs text-gray-500 mb-1'>음</div>
                          <div className='font-medium'>{hanzi.sound}</div>
                        </div>
                      </div>

                      {/* 통계 정보 */}
                      <div className='grid grid-cols-4 gap-4 pt-3 border-t border-gray-100'>
                        {/* 학습 횟수 */}
                        <div className='text-center'>
                          <div className='text-xs text-gray-500 font-medium mb-1'>
                            학습 횟수
                          </div>
                          <div className='text-lg font-semibold text-gray-900'>
                            {hanzi.totalStudied}
                          </div>
                        </div>

                        {/* 정답 */}
                        <div className='text-center'>
                          <div className='text-xs text-gray-500 font-medium mb-1'>
                            정답
                          </div>
                          <div className='text-lg font-semibold text-green-600 flex items-center justify-center'>
                            <CheckCircle className='h-4 w-4 mr-1' />
                            {hanzi.correctAnswers}
                          </div>
                        </div>

                        {/* 오답 */}
                        <div className='text-center'>
                          <div className='text-xs text-gray-500 font-medium mb-1'>
                            오답
                          </div>
                          <div className='text-lg font-semibold text-red-600 flex items-center justify-center'>
                            <XCircle className='h-4 w-4 mr-1' />
                            {hanzi.wrongAnswers}
                          </div>
                        </div>

                        {/* 정답률 */}
                        <div className='text-center'>
                          <div className='text-xs text-gray-500 font-medium mb-1'>
                            정답률
                          </div>
                          <div
                            className={`text-lg font-semibold ${
                              hanzi.accuracy >= 80
                                ? "text-green-600"
                                : hanzi.accuracy >= 60
                                ? "text-yellow-600"
                                : "text-red-600"
                            }`}
                          >
                            {hanzi.accuracy}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function HanziStatisticsPage() {
  return (
    <Suspense
      fallback={<LoadingSpinner message='통계 데이터를 불러오는 중...' />}
    >
      <HanziStatisticsContent />
    </Suspense>
  )
}
