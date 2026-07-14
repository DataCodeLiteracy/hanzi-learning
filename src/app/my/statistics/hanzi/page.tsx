"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { ApiClient } from "@/lib/apiClient"
import { StatsContentSkeleton } from "../StatsContentSkeleton"
import { Skeleton } from "@/components/Skeleton"
import { TrendingUp, TrendingDown } from "lucide-react"
import Link from "next/link"
import { CustomSelect } from "@/components/ui/CustomSelect"

interface HanziStatistics {
  hanziId: string
  character: string
  meaning: string
  sound: string
  grade: number
  totalAttempts: number
  correctAttempts: number
  accuracy: number
  lastAttempted: string
}

export default function HanziStatisticsPage() {
  const { user, loading: authLoading } = useAuth()
  const [selectedGrade, setSelectedGrade] = useState<number>(8)
  const [hanziStats, setHanziStats] = useState<HanziStatistics[]>([])
  // isLoading은 사용되지 않지만 setIsLoading으로 리렌더링 트리거
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isLoadingGrade, setIsLoadingGrade] = useState<boolean>(false)

  const gradeSelectOptions = useMemo(
    () =>
      [8, 7, 6, 5.5, 5, 4.5, 4, 3.5, 3].map((grade) => ({
        value: String(grade),
        label:
          grade === 5.5
            ? "준5급"
            : grade === 4.5
            ? "준4급"
            : grade === 3.5
            ? "준3급"
            : `${grade}급`,
      })),
    []
  )

  // 급수별 한자 통계 로드
  const loadHanziStats = useCallback(async (grade: number) => {
    if (!user) return

    if (grade === 8) setIsLoading(true)
    else setIsLoadingGrade(true)

    try {
      const gradeData = await ApiClient.getHanziByGrade(grade)
      // 한자별 통계 데이터 가져오기
      const statsPromises = gradeData.map(async (hanzi) => {
        try {
          const stats = await ApiClient.getHanziStatistics(user.id, hanzi.id)
          return {
            hanziId: hanzi.id,
            character: hanzi.character,
            meaning: hanzi.meaning,
            sound: hanzi.sound || hanzi.pinyin || "",
            grade: hanzi.grade,
            totalAttempts: stats?.totalStudied || 0,
            correctAttempts: stats?.correctAnswers || 0,
            accuracy:
              stats?.totalStudied && stats.totalStudied > 0
                ? (stats.correctAnswers / stats.totalStudied) * 100
                : 0,
            lastAttempted: stats?.lastStudied || "없음",
          }
        } catch (error) {
          console.error("한자 통계 조회 실패:", error)
          // 통계가 없는 경우 기본값 반환
          return {
            hanziId: hanzi.id,
            character: hanzi.character,
            meaning: hanzi.meaning,
            sound: hanzi.sound || hanzi.pinyin || "",
            grade: hanzi.grade,
            totalAttempts: 0,
            correctAttempts: 0,
            accuracy: 0,
            lastAttempted: "없음",
          }
        }
      })

      const allStats = await Promise.all(statsPromises)
      setHanziStats(allStats)
    } catch (error) {
      console.error("한자 통계 로드 실패:", error)
    } finally {
      if (grade === 8) setIsLoading(false)
      else setIsLoadingGrade(false)
    }
  }, [user])

  // 8급 데이터 기본 로딩
  useEffect(() => {
    if (user) {
      loadHanziStats(8)
    }
  }, [user, loadHanziStats])

  // 급수 변경 시 데이터 로드
  const handleGradeChange = useCallback(async (grade: number) => {
    if (grade === selectedGrade) return

    setSelectedGrade(grade)
    await loadHanziStats(grade)
  }, [selectedGrade, loadHanziStats])

  // 로딩 중일 때는 로딩 스피너 표시
  if (authLoading) {
    return <StatsContentSkeleton />
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

  const totalHanzi = hanziStats.length
  const studiedHanzi = hanziStats.filter((h) => h.totalAttempts > 0).length
  const notStudiedHanzi = totalHanzi - studiedHanzi
  const studiedStats = hanziStats.filter((h) => h.totalAttempts > 0)
  const averageAccuracy =
    studiedStats.length > 0
      ? Math.round(
          studiedStats.reduce((sum, h) => sum + (h.accuracy || 0), 0) /
            studiedStats.length
        )
      : 0

  return (
    <div className='space-y-6'>
          {/* 급수 선택 */}
          <div className='rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,23,42,0.06)] p-5'>
            <h3 className='text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2'>
              <TrendingUp className='h-5 w-5' />
              <span>급수 선택</span>
            </h3>
            <CustomSelect
              value={String(selectedGrade)}
              onChange={(v) => handleGradeChange(Number(v))}
              options={gradeSelectOptions}
              disabled={isLoadingGrade}
              className='w-full'
              aria-label='급수 선택'
            />

            {isLoadingGrade && (
              <div className='mt-2 space-y-2'>
                <Skeleton className='h-3 w-40' />
                <Skeleton className='h-2 w-full rounded-full' />
              </div>
            )}
          </div>

          {/* 요약 통계 */}
          <div className='rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,23,42,0.06)] p-5'>
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
          <div className='rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,23,42,0.06)] p-5'>
            <h3 className='text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2'>
              <TrendingUp className='h-5 w-5' />
              <span>한자별 상세 통계</span>
            </h3>
            {isLoadingGrade ? (
              <div className='space-y-3'>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className='rounded-lg border border-gray-200 p-4 space-y-2'
                  >
                    <Skeleton className='h-4 w-16 mx-auto' />
                    <Skeleton className='h-8 w-12 mx-auto' />
                    <Skeleton className='h-3 w-24 mx-auto' />
                  </div>
                ))}
              </div>
            ) : (
              <div className='space-y-4'>
                {hanziStats.map((hanzi) => (
                  <div
                    key={hanzi.hanziId}
                    className='relative bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors'
                  >
                    {/* 미학습 배지 */}
                    {hanzi.totalAttempts === 0 && (
                      <div className='absolute top-2 right-2 flex items-center space-x-1 bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-medium'>
                        <TrendingDown className='h-3 w-3' />
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
                            : `${selectedGrade}급`}
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
                            {hanzi.totalAttempts}
                          </div>
                        </div>

                        {/* 정답 */}
                        <div className='text-center'>
                          <div className='text-xs text-gray-500 font-medium mb-1'>
                            정답
                          </div>
                          <div className='text-lg font-semibold text-green-600 flex items-center justify-center'>
                            <TrendingUp className='h-4 w-4 mr-1' />
                            {hanzi.correctAttempts}
                          </div>
                        </div>

                        {/* 오답 */}
                        <div className='text-center'>
                          <div className='text-xs text-gray-500 font-medium mb-1'>
                            오답
                          </div>
                          <div className='text-lg font-semibold text-red-600 flex items-center justify-center'>
                            <TrendingDown className='h-4 w-4 mr-1' />
                            {hanzi.totalAttempts - hanzi.correctAttempts}
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
  )
}
