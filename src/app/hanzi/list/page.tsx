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
  const [selectedGrade, setSelectedGrade] = useState<number>(
    user?.preferredGrade || 8
  )
  const [hanziList, setHanziList] = useState<Hanzi[]>([])
  const [loading, setLoading] = useState(true)
  const [isLoadingGrade, setIsLoadingGrade] = useState<boolean>(false) // 급수 로딩 상태
  const [noDataMessage, setNoDataMessage] = useState<string>("")
  const [showNoDataModal, setShowNoDataModal] = useState<boolean>(false)
  const [knownHanzi, setKnownHanzi] = useState<Set<string>>(new Set()) // 알고 있는 한자 ID들
  const [gradeDataCache, setGradeDataCache] = useState<Map<number, Hanzi[]>>(
    new Map()
  ) // 급수별 데이터 캐시
  const [userStatsCache, setUserStatsCache] = useState<any[]>([]) // 사용자 통계 캐시
  const [learningStats, setLearningStats] = useState<{
    total: number
    completed: number
    percentage: number
  }>({ total: 0, completed: 0, percentage: 0 })
  const [showSyncSuccess, setShowSyncSuccess] = useState<boolean>(false)
  const [syncResult, setSyncResult] = useState<{
    count: number
    grades: number[]
  }>({ count: 0, grades: [] })

  // 학습완료 통계 계산
  const calculateLearningStats = (
    hanziList: Hanzi[],
    knownHanzi: Set<string>
  ) => {
    const total = hanziList.length
    const completed = knownHanzi.size
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

    setLearningStats({ total, completed, percentage })
  }

  // 8급 데이터 기본 로딩
  const loadHanziData = async (grade: number) => {
    if (grade === 8) setLoading(true)
    else setIsLoadingGrade(true)

    try {
      // 캐시된 데이터가 있으면 사용
      let data: Hanzi[]
      if (gradeDataCache.has(grade)) {
        data = gradeDataCache.get(grade)!
      } else {
        data = await ApiClient.getHanziByGrade(grade)
        // 캐시에 저장
        setGradeDataCache((prev) => new Map(prev).set(grade, data))
      }

      setHanziList(data)

      // 알고 있는 한자 정보 로드 (캐시 활용)
      if (user) {
        try {
          // 새로운 함수 사용: 해당 급수의 한자들에 대한 통계만 조회
          const gradeStats = await ApiClient.getHanziStatisticsByGrade(
            user.id,
            grade
          )

          // 현재 급수의 한자들 중에서 학습완료된 것들 찾기
          const knownIds = new Set<string>() // 로컬 변수로 선언
          const matchedDetails: Array<{
            hanziId: string
            character: string
            meaning: string
            matchType: string
          }> = []

          data.forEach((hanzi) => {
            // 해당 한자의 통계 찾기
            const stat = gradeStats.find((s) => s.hanziId === hanzi.id)
            if (stat?.isKnown) {
              knownIds.add(hanzi.id)
              matchedDetails.push({
                hanziId: hanzi.id,
                character: hanzi.character,
                meaning: hanzi.meaning,
                matchType: "직접 ID 매칭",
              })
            }
          })

          setKnownHanzi(knownIds)
          calculateLearningStats(data, knownIds) // 통계 계산
        } catch (error) {
          console.error("한자 통계 로드 실패:", error)
          setKnownHanzi(new Set())
          calculateLearningStats(data, new Set())
        }
      } else {
        // 사용자가 없으면 통계만 계산
        calculateLearningStats(data, new Set())
      }

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
      // 8급 초기 로딩 시에는 hanziStatistics까지 완전히 로드된 후에만 로딩 종료
      if (grade === 8) {
        setLoading(false)
      } else {
        setIsLoadingGrade(false)
      }
    }
  }

  useEffect(() => {
    if (user && !authLoading) {
      loadHanziData(8) // 8급 기본 로드
    }
  }, [user, authLoading])

  // 사용자 정보 로드 후 선호 급수 반영
  useEffect(() => {
    if (user?.preferredGrade && user.preferredGrade !== selectedGrade) {
      setSelectedGrade(user.preferredGrade)
      loadHanziData(user.preferredGrade)
    }
  }, [user])

  // 초기 데이터 로드 후 통계 계산
  useEffect(() => {
    if (hanziList.length > 0 && knownHanzi.size >= 0) {
      calculateLearningStats(hanziList, knownHanzi)
    }
  }, [hanziList, knownHanzi])

  // 급수 변경 시 데이터 로드
  const handleGradeChange = async (grade: number) => {
    if (grade === selectedGrade) return // 같은 급수면 불필요한 호출 방지

    setSelectedGrade(grade)
    setIsLoadingGrade(true)

    // 급수 변경 시 통계 초기화
    setLearningStats({ total: 0, completed: 0, percentage: 0 })

    try {
      const data = await ApiClient.getHanziByGrade(grade)
      setHanziList(data)

      // 새로운 급수의 학습완료 상태 가져오기
      if (user) {
        try {
          // 새로운 함수 사용: 해당 급수의 한자들에 대한 통계만 조회
          const gradeStats = await ApiClient.getHanziStatisticsByGrade(
            user.id,
            grade
          )

          // 현재 급수의 한자들 중에서 학습완료된 것들 찾기
          const knownIds = new Set<string>()
          const matchedDetails: Array<{
            hanziId: string
            character: string
            meaning: string
            matchType: string
          }> = []

          data.forEach((hanzi) => {
            // 해당 한자의 통계 찾기
            const stat = gradeStats.find((s) => s.hanziId === hanzi.id)
            if (stat?.isKnown) {
              knownIds.add(hanzi.id)
              matchedDetails.push({
                hanziId: hanzi.id,
                character: hanzi.character,
                meaning: hanzi.meaning,
                matchType: "직접 ID 매칭",
              })
            }
          })

          setKnownHanzi(knownIds)

          // 새로운 급수의 학습완료 통계 계산
          calculateLearningStats(data, knownIds)
        } catch (error) {
          console.error("한자 통계 로드 실패:", error)
          setKnownHanzi(new Set())
          calculateLearningStats(data, new Set())
        }
      } else {
        // 사용자가 없으면 통계만 계산
        calculateLearningStats(data, new Set())
      }

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
      setIsLoadingGrade(false)
    }
  }

  // 네이버 한자 사전으로 연결
  const openNaverDictionary = (character: string) => {
    const url = `https://hanja.dict.naver.com/search?query=${encodeURIComponent(
      character
    )}`
    window.open(url, "_blank")
  }

  // 알고 있는 한자 체크박스 변경 처리
  const handleKnownToggle = async (hanziId: string, isKnown: boolean) => {
    if (!user) return

    try {
      // 로컬 상태 업데이트
      const newKnownHanzi = new Set(knownHanzi)
      if (isKnown) {
        newKnownHanzi.add(hanziId)
      } else {
        newKnownHanzi.delete(hanziId)
      }
      setKnownHanzi(newKnownHanzi)

      // 현재 한자의 정보 가져오기 (character, meaning, sound 등)
      const currentHanzi = hanziList.find((h) => h.id === hanziId)
      if (!currentHanzi) return

      // 모든 급수에서 동일한 한자 찾아서 업데이트
      const allGrades = [8, 7, 6, 5.5, 5, 4.5, 4, 3.5, 3]
      const updatePromises: Promise<void>[] = []

      for (const grade of allGrades) {
        try {
          // 해당 급수의 한자 데이터 가져오기 (캐시 우선)
          let gradeData: Hanzi[]
          if (gradeDataCache.has(grade)) {
            gradeData = gradeDataCache.get(grade)!
          } else {
            gradeData = await ApiClient.getHanziByGrade(grade)
            setGradeDataCache((prev) => new Map(prev).set(grade, gradeData))
          }

          // 동일한 한자 찾기 (character가 같은 것)
          const sameCharacter = gradeData.find(
            (h) => h.character === currentHanzi.character
          )

          if (sameCharacter) {
            // 해당 급수에서도 학습완료 상태 업데이트
            updatePromises.push(
              ApiClient.updateHanziStatisticsWithKnown(
                user.id,
                sameCharacter.id,
                "quiz",
                true, // isCorrect는 의미 없으므로 true로 설정
                isKnown
              )
            )
          }
        } catch (error) {
          // 해당 급수에 데이터가 없거나 오류가 발생하면 무시
          console.log(`${grade}급 데이터 없음 또는 오류:`, error)
        }
      }

      // 모든 업데이트 완료 대기
      await Promise.all(updatePromises)

      // 사용자 통계 캐시 업데이트 (새로운 상태 반영)
      try {
        const updatedStats = await ApiClient.getHanziStatisticsNew(user.id)
        setUserStatsCache(updatedStats)
      } catch (error) {
        console.error("통계 캐시 업데이트 실패:", error)
      }

      console.log(
        `${
          isKnown ? "학습완료" : "학습미완료"
        } 상태를 모든 급수에서 업데이트했습니다.`
      )

      // 학습완료 통계 다시 계산
      calculateLearningStats(hanziList, newKnownHanzi)
    } catch (error) {
      console.error("한자 상태 업데이트 실패:", error)
      // 실패 시 원래 상태로 되돌리기
      setKnownHanzi(knownHanzi)
    }
  }

  // 다른 급수에 학습완료 상태 동기화
  const handleSyncAcrossGrades = async () => {
    if (!user) return

    setIsLoadingGrade(true)
    try {
      // 현재 급수에서 체크된 한자들의 character 추출
      const currentKnownCharacters = new Set<string>()
      const currentKnownDetails: Array<{
        id: string
        character: string
        meaning: string
      }> = []

      hanziList.forEach((hanzi) => {
        if (knownHanzi.has(hanzi.id)) {
          currentKnownCharacters.add(hanzi.character)
          currentKnownDetails.push({
            id: hanzi.id,
            character: hanzi.character,
            meaning: hanzi.meaning,
          })
        }
      })

      if (currentKnownCharacters.size === 0) {
        console.log("동기화할 학습완료 한자가 없습니다.")
        setIsLoadingGrade(false)
        return
      }

      console.log("=== 동기화 시작 ===")
      console.log(`현재 급수: ${selectedGrade}급`)
      console.log(`동기화할 한자들:`, currentKnownDetails)
      console.log(
        `동기화할 character들: ${Array.from(currentKnownCharacters).join(", ")}`
      )

      const allGrades = [8, 7, 6, 5.5, 5, 4.5, 4, 3.5, 3]
      const updatePromises: Promise<void>[] = []
      const syncedGrades: number[] = []
      const syncDetails: Array<{
        grade: number
        hanziId: string
        character: string
        success: boolean
      }> = []

      for (const grade of allGrades) {
        if (grade === selectedGrade) continue // 현재 급수는 제외

        try {
          console.log(`\n--- ${grade}급 처리 시작 ---`)

          let gradeData: Hanzi[]
          if (gradeDataCache.has(grade)) {
            gradeData = gradeDataCache.get(grade)!
            console.log(
              `${grade}급 데이터를 캐시에서 가져왔습니다. (${gradeData.length}개)`
            )
          } else {
            gradeData = await ApiClient.getHanziByGrade(grade)
            setGradeDataCache((prev) => new Map(prev).set(grade, gradeData))
            console.log(
              `${grade}급 데이터를 새로 로드했습니다. (${gradeData.length}개)`
            )
          }

          // 현재 급수에서 체크된 character와 일치하는 한자들 찾기
          let gradeSyncedCount = 0
          const gradeMatches: Array<{
            hanziId: string
            character: string
            meaning: string
          }> = []

          gradeData.forEach((hanzi) => {
            if (currentKnownCharacters.has(hanzi.character)) {
              gradeMatches.push({
                hanziId: hanzi.id,
                character: hanzi.character,
                meaning: hanzi.meaning,
              })

              console.log(
                `${grade}급에서 매칭된 한자: ${hanzi.character} (${hanzi.meaning}) - ID: ${hanzi.id}`
              )

              const updatePromise = ApiClient.updateHanziStatisticsWithKnown(
                user.id,
                hanzi.id,
                "quiz",
                true, // isCorrect는 의미 없으므로 true로 설정
                true // isKnown = true
              )
                .then(() => {
                  console.log(
                    `✅ ${grade}급 ${hanzi.character} (${hanzi.id}) 동기화 성공`
                  )
                  syncDetails.push({
                    grade,
                    hanziId: hanzi.id,
                    character: hanzi.character,
                    success: true,
                  })
                })
                .catch((error) => {
                  console.error(
                    `❌ ${grade}급 ${hanzi.character} (${hanzi.id}) 동기화 실패:`,
                    error
                  )
                  syncDetails.push({
                    grade,
                    hanziId: hanzi.id,
                    character: hanzi.character,
                    success: false,
                  })
                })

              updatePromises.push(updatePromise)
              gradeSyncedCount++
            }
          })

          if (gradeSyncedCount > 0) {
            syncedGrades.push(grade)
            console.log(
              `${grade}급에서 ${gradeSyncedCount}개 한자 동기화 예정:`,
              gradeMatches
            )
          } else {
            console.log(`${grade}급에는 동기화할 한자가 없습니다.`)
          }
        } catch (error) {
          console.error(`${grade}급 처리 중 오류:`, error)
        }
      }

      if (updatePromises.length > 0) {
        console.log(`\n=== 동기화 실행 ===`)
        console.log(
          `총 ${updatePromises.length}개의 한자 통계를 다른 급수에 동기화합니다...`
        )

        // 모든 업데이트 완료 대기
        await Promise.all(updatePromises)

        console.log(`\n=== 동기화 결과 ===`)
        console.log(
          `동기화 완료된 한자들:`,
          syncDetails.filter((d) => d.success)
        )
        console.log(
          `동기화 실패한 한자들:`,
          syncDetails.filter((d) => !d.success)
        )
        console.log(
          `${updatePromises.length}개의 한자 통계를 ${syncedGrades.join(
            ", "
          )}급에 동기화 완료!`
        )

        // 동기화 결과 저장 및 성공 메시지 표시
        setSyncResult({ count: updatePromises.length, grades: syncedGrades })
        setShowSyncSuccess(true)

        // 3초 후 성공 메시지 자동 숨김
        setTimeout(() => setShowSyncSuccess(false), 3000)

        // 사용자 통계 캐시 완전 새로고침
        try {
          console.log("\n=== 캐시 새로고침 ===")
          console.log("통계 캐시를 새로고침합니다...")
          const updatedStats = await ApiClient.getHanziStatisticsNew(user.id)
          setUserStatsCache(updatedStats)
          console.log("통계 캐시 새로고침 완료")

          // 새로고침된 통계에서 동기화된 한자들 확인
          const syncedStats = updatedStats.filter((stat) =>
            syncDetails.some(
              (detail) => detail.hanziId === stat.hanziId && detail.success
            )
          )
          console.log("동기화된 한자들의 최신 통계:", syncedStats)
        } catch (error) {
          console.error("통계 캐시 업데이트 실패:", error)
        }
      } else {
        console.log("동기화할 한자가 다른 급수에 없습니다.")
      }
    } catch (error) {
      console.error("다른 급수 동기화 실패:", error)
    } finally {
      setIsLoadingGrade(false)
    }
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
      <main className='max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-5 sm:py-8'>
        <div className='space-y-5 sm:space-y-6'>
          {/* 급수 선택 */}
          <div className='bg-white rounded-lg shadow-lg p-4 sm:p-6'>
            <h3 className='text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center space-x-2'>
              <BookOpen className='h-4 w-4 sm:h-5 sm:w-5' />
              <span>급수 선택</span>
            </h3>
            <div className='mb-3 sm:mb-4'>
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
            </div>
          </div>

          {/* 학습완료 통계 */}
          <div className='bg-white rounded-lg shadow-lg p-4 sm:p-6'>
            <div className='flex items-center justify-between mb-3 sm:mb-4'>
              <h3 className='text-lg sm:text-xl font-semibold text-gray-900 flex items-center space-x-2'>
                <BookOpen className='h-4 w-4 sm:h-5 sm:w-5' />
                <span>학습 진행률</span>
              </h3>
              <button
                onClick={handleSyncAcrossGrades}
                disabled={isLoadingGrade || learningStats.completed === 0}
                className='px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2'
                title='현재 급수에서 체크된 학습완료 한자들을 다른 모든 급수에 동기화합니다'
              >
                {isLoadingGrade ? (
                  <>
                    <LoadingSpinner message='' />
                    <span>동기화 중...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className='w-4 h-4'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                      />
                    </svg>
                    <span>다른 급수 동기화</span>
                  </>
                )}
              </button>
            </div>

            {isLoadingGrade ? (
              <div className='flex items-center justify-center py-8'>
                <LoadingSpinner message='급수 데이터를 불러오는 중...' />
              </div>
            ) : (
              <>
                <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
                  <div className='text-center p-3 bg-blue-50 rounded-lg'>
                    <div className='text-2xl font-bold text-blue-600'>
                      {learningStats.total}
                    </div>
                    <div className='text-sm text-gray-600'>전체 한자</div>
                  </div>
                  <div className='text-center p-3 bg-green-50 rounded-lg'>
                    <div className='text-2xl font-bold text-green-600'>
                      {learningStats.completed}
                    </div>
                    <div className='text-sm text-gray-600'>학습완료</div>
                  </div>
                  <div className='text-center p-3 bg-purple-50 rounded-lg'>
                    <div className='text-2xl font-bold text-purple-600'>
                      {learningStats.percentage}%
                    </div>
                    <div className='text-sm text-gray-600'>진행률</div>
                  </div>
                </div>
                {/* 진행률 바 */}
                <div className='mt-4'>
                  <div className='flex justify-between text-sm text-gray-600 mb-1'>
                    <span>진행률</span>
                    <span>{learningStats.percentage}%</span>
                  </div>
                  <div className='w-full bg-gray-200 rounded-full h-3'>
                    <div
                      className='bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500'
                      style={{ width: `${learningStats.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 동기화 성공 메시지 */}
          {showSyncSuccess && (
            <div className='bg-green-50 border border-green-200 rounded-lg p-4 mb-4'>
              <div className='flex items-center space-x-2'>
                <svg
                  className='w-5 h-5 text-green-600'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M5 13l4 4L19 7'
                  />
                </svg>
                <div className='text-green-800'>
                  <span className='font-semibold'>동기화 완료!</span>
                  <span className='ml-2'>
                    {syncResult.count}개의 한자가{" "}
                    {syncResult.grades
                      .map((g) =>
                        g === 5.5
                          ? "준5급"
                          : g === 4.5
                          ? "준4급"
                          : g === 3.5
                          ? "준3급"
                          : `${g}급`
                      )
                      .join(", ")}
                    에 동기화되었습니다.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 한자 목록 */}
          <div className='bg-white rounded-lg shadow-lg p-4 sm:p-6'>
            <div className='flex items-center justify-between mb-4 sm:mb-6'>
              <h3 className='text-lg sm:text-xl font-semibold text-gray-900 flex items-center space-x-2'>
                <Search className='h-4 w-4 sm:h-5 sm:w-5' />
                <span>{gradeName} 한자 목록</span>
              </h3>
              <div className='text-sm text-gray-600'>
                총 {hanziList.length}개
              </div>
            </div>

            {loading ? (
              <div className='flex justify-center py-6 sm:py-8'>
                <LoadingSpinner message='한자를 불러오는 중...' />
              </div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='min-w-full divide-y divide-gray-200'>
                  <thead className='bg-gray-50'>
                    <tr>
                      <th className='px-2 sm:px-2 lg:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        순번
                      </th>
                      <th className='px-2 sm:px-2 lg:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        한자
                      </th>
                      <th className='px-2 sm:px-2 lg:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        뜻
                      </th>
                      <th className='px-2 sm:px-2 lg:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        음
                      </th>
                      <th className='hidden md:table-cell px-3 sm:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        획수
                      </th>
                      <th className='px-2 sm:px-2 lg:px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        사전
                      </th>
                      <th className='px-2 sm:px-2 lg:px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        학습완료
                      </th>
                    </tr>
                  </thead>
                  <tbody className='bg-white divide-y divide-gray-200'>
                    {hanziList.map((hanzi, index) => (
                      <tr key={hanzi.id} className='hover:bg-gray-50'>
                        <td className='px-2 sm:px-2 lg:px-4 py-3 sm:py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center'>
                          {hanzi.gradeNumber || index + 1}
                        </td>
                        <td className='px-2 sm:px-2 lg:px-4 py-3 sm:py-4 whitespace-nowrap text-center'>
                          <div className='text-lg sm:text-xl lg:text-2xl font-bold text-gray-900'>
                            {hanzi.character}
                          </div>
                        </td>
                        <td className='px-2 sm:px-2 lg:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 text-center'>
                          {hanzi.meaning}
                        </td>
                        <td className='px-2 sm:px-2 lg:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 text-center'>
                          {hanzi.sound}
                        </td>
                        <td className='hidden md:table-cell px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 text-center'>
                          {hanzi.strokes}획
                        </td>
                        <td className='px-2 sm:px-2 lg:px-3 py-3 sm:py-4 whitespace-nowrap text-sm font-medium text-center'>
                          <button
                            onClick={() => openNaverDictionary(hanzi.character)}
                            className='inline-flex items-center px-2 sm:px-2 py-1 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                          >
                            <ExternalLink className='h-3 w-3 mr-1' />
                            사전
                          </button>
                        </td>
                        <td className='px-2 sm:px-2 lg:px-3 py-3 sm:py-4 whitespace-nowrap text-center'>
                          <input
                            type='checkbox'
                            checked={knownHanzi.has(hanzi.id)}
                            onChange={(e) =>
                              handleKnownToggle(hanzi.id, e.target.checked)
                            }
                            className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer'
                            title='이 한자를 학습 완료했다고 체크하세요'
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && hanziList.length === 0 && (
              <div className='text-center py-6 sm:py-8'>
                <Info className='h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4' />
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
