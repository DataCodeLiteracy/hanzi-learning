"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Filter,
  Image as ImageIcon,
  CheckCircle,
  X,
  Clock,
} from "lucide-react"
import Link from "next/link"

interface WritingSubmission {
  id: string
  hanziId: string
  character: string
  imageUrl: string
  fileName: string
  grade: number
  submissionDate: string
  status: "pending" | "approved" | "rejected"
  adminNotes: string
  experienceAwarded: number
  createdAt: string
}

interface HanziStatistics {
  id: string
  character: string
  totalWrited: number
  lastWrited: string
  grade: number
}

export default function WritingGalleryPage() {
  const { user, initialLoading } = useAuth()
  const router = useRouter()

  const [submissions, setSubmissions] = useState<WritingSubmission[]>([])
  const [hanziStats, setHanziStats] = useState<HanziStatistics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 필터 상태
  const [selectedGrade, setSelectedGrade] = useState<string>("all")
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("date") // date, character, grade
  const [sortOrder, setSortOrder] = useState<string>("desc") // asc, desc

  // 갤러리 데이터 로드
  const loadSubmissions = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        userId: user.id,
        ...(selectedGrade !== "all" && { grade: selectedGrade }),
        ...(selectedDate && { date: selectedDate }),
      })

      const response = await fetch(`/api/writing-gallery?${params}`)
      const data = await response.json()

      if (data.success) {
        setSubmissions(data.submissions)
      } else {
        setError(data.error || "갤러리 로드에 실패했습니다")
      }
    } catch (err) {
      console.error("Gallery load error:", err)
      setError("갤러리 로드 중 오류가 발생했습니다")
    } finally {
      setLoading(false)
    }
  }

  // 한자 통계 로드
  const loadHanziStatistics = async () => {
    if (!user || !user.id) return

    try {
      const { ApiClient } = await import("@/lib/apiClient")
      const stats = await ApiClient.getHanziStatisticsNew(user.id)
      if (stats && Array.isArray(stats)) {
        setHanziStats(stats as any)
      } else {
        console.warn("Hanzi statistics 데이터가 올바르지 않습니다:", stats)
        setHanziStats([])
      }
    } catch (err) {
      console.error("Hanzi statistics load error:", err)
      setHanziStats([])
    }
  }

  // 필터링 및 정렬된 제출물
  const filteredSubmissions = submissions
    .filter((submission) => {
      if (selectedStatus !== "all" && submission.status !== selectedStatus) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case "date":
          comparison =
            new Date(a.submissionDate).getTime() -
            new Date(b.submissionDate).getTime()
          break
        case "character":
          comparison = a.character.localeCompare(b.character)
          break
        case "grade":
          comparison = a.grade - b.grade
          break
        default:
          comparison = 0
      }

      return sortOrder === "asc" ? comparison : -comparison
    })

  // 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 border-green-200"
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  // 상태별 텍스트
  const getStatusText = (status: string) => {
    switch (status) {
      case "approved":
        return "승인됨"
      case "rejected":
        return "거부됨"
      case "pending":
        return "검토 중"
      default:
        return "알 수 없음"
    }
  }

  // 날짜 포맷팅
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  useEffect(() => {
    loadSubmissions()
    loadHanziStatistics()
  }, [user, selectedGrade, selectedDate])

  // 로딩 중이거나 초기 로딩 중일 때는 로그인 체크하지 않음
  if (initialLoading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600'>로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <h2 className='text-xl font-semibold text-gray-900 mb-4'>
            로그인이 필요합니다
          </h2>
          <button
            onClick={() => router.push("/login")}
            className='bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700'
          >
            로그인하기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* 헤더 - 모바일 최적화 */}
      <div className='bg-white shadow-sm border-b'>
        <div className='max-w-6xl mx-auto px-4 py-3 sm:py-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-3 sm:space-x-4'>
              <Link href='/games/writing'>
                <button className='p-2 hover:bg-gray-100 rounded-lg transition-colors'>
                  <ArrowLeft className='w-5 h-5 sm:w-6 sm:h-6 text-gray-600' />
                </button>
              </Link>
              <h1 className='text-lg sm:text-2xl font-bold text-gray-900'>
                한자 쓰기 갤러리
              </h1>
            </div>
            <Link href='/games/writing/upload'>
              <button className='bg-blue-600 text-white px-3 py-2 sm:px-4 rounded-lg hover:bg-blue-700 flex items-center text-sm sm:text-base'>
                <ImageIcon className='w-4 h-4 mr-1 sm:mr-2' />
                <span className='hidden sm:inline'>새 이미지 업로드</span>
                <span className='sm:hidden'>업로드</span>
              </button>
            </Link>
          </div>
        </div>
      </div>

      <div className='max-w-6xl mx-auto px-4 py-6 sm:py-8'>
        {/* 필터 섹션 - 모바일 최적화 */}
        <div className='bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-4 sm:mb-6'>
          <h2 className='text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center'>
            <Filter className='w-4 h-4 sm:w-5 sm:h-5 mr-2' />
            필터
          </h2>

          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4'>
            {/* 급수 필터 */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                급수
              </label>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className='w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900'
              >
                <option value='all' className='text-gray-900'>
                  전체
                </option>
                <option value='3'>3급</option>
                <option value='4'>4급</option>
                <option value='5'>5급</option>
                <option value='6'>6급</option>
                <option value='7'>7급</option>
                <option value='8'>8급</option>
              </select>
            </div>

            {/* 날짜 필터 */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                날짜
              </label>
              <input
                type='date'
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className='w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900'
              />
            </div>

            {/* 상태 필터 */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                상태
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className='w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900'
              >
                <option value='all' className='text-gray-900'>
                  전체
                </option>
                <option value='pending'>검토 중</option>
                <option value='approved'>승인됨</option>
                <option value='rejected'>거부됨</option>
              </select>
            </div>

            {/* 정렬 기준 */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                정렬 기준
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className='w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900'
              >
                <option value='date' className='text-gray-900'>
                  날짜
                </option>
                <option value='character' className='text-gray-900'>
                  한자
                </option>
                <option value='grade' className='text-gray-900'>
                  급수
                </option>
              </select>
            </div>

            {/* 정렬 순서 */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                정렬 순서
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className='w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900'
              >
                <option value='desc' className='text-gray-900'>
                  최신순
                </option>
                <option value='asc' className='text-gray-900'>
                  오래된순
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* 통계 - 모바일 최적화 */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6'>
          <div className='bg-white rounded-lg shadow-sm border p-3 sm:p-4'>
            <div className='flex items-center'>
              <ImageIcon className='w-6 h-6 sm:w-8 sm:h-8 text-blue-500 mr-2 sm:mr-3' />
              <div>
                <p className='text-xs sm:text-sm text-gray-600'>총 업로드</p>
                <p className='text-lg sm:text-2xl font-bold text-gray-900'>
                  {submissions.length}
                </p>
              </div>
            </div>
          </div>

          <div className='bg-white rounded-lg shadow-sm border p-3 sm:p-4'>
            <div className='flex items-center'>
              <Clock className='w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 mr-2 sm:mr-3' />
              <div>
                <p className='text-xs sm:text-sm text-gray-600'>검토 중</p>
                <p className='text-lg sm:text-2xl font-bold text-gray-900'>
                  {submissions.filter((s) => s.status === "pending").length}
                </p>
              </div>
            </div>
          </div>

          <div className='bg-white rounded-lg shadow-sm border p-3 sm:p-4'>
            <div className='flex items-center'>
              <CheckCircle className='w-6 h-6 sm:w-8 sm:h-8 text-green-500 mr-2 sm:mr-3' />
              <div>
                <p className='text-xs sm:text-sm text-gray-600'>승인됨</p>
                <p className='text-lg sm:text-2xl font-bold text-gray-900'>
                  {submissions.filter((s) => s.status === "approved").length}
                </p>
              </div>
            </div>
          </div>

          <div className='bg-white rounded-lg shadow-sm border p-3 sm:p-4'>
            <div className='flex items-center'>
              <X className='w-6 h-6 sm:w-8 sm:h-8 text-red-500 mr-2 sm:mr-3' />
              <div>
                <p className='text-xs sm:text-sm text-gray-600'>거부됨</p>
                <p className='text-lg sm:text-2xl font-bold text-gray-900'>
                  {submissions.filter((s) => s.status === "rejected").length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 오류 메시지 */}
        {error && (
          <div className='mb-6 p-4 bg-red-50 border border-red-200 rounded-lg'>
            <div className='flex items-center'>
              <X className='w-5 h-5 text-red-600 mr-2' />
              <span className='text-red-800'>{error}</span>
            </div>
          </div>
        )}

        {/* 로딩 */}
        {loading && (
          <div className='flex justify-center py-12'>
            <div className='text-center'>
              <div className='w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4'></div>
              <p className='text-gray-600'>갤러리를 불러오는 중...</p>
            </div>
          </div>
        )}

        {/* 갤러리 그리드 */}
        {!loading && (
          <>
            {filteredSubmissions.length === 0 ? (
              <div className='text-center py-12'>
                <ImageIcon className='w-16 h-16 text-gray-300 mx-auto mb-4' />
                <h3 className='text-lg font-medium text-gray-900 mb-2'>
                  업로드된 이미지가 없습니다
                </h3>
                <p className='text-gray-500 mb-6'>
                  한자 쓰기 연습 이미지를 업로드해보세요
                </p>
                <Link href='/games/writing/upload'>
                  <button className='bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700'>
                    이미지 업로드하기
                  </button>
                </Link>
              </div>
            ) : (
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6'>
                {filteredSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className='bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow'
                  >
                    {/* 이미지 */}
                    <div className='aspect-square bg-gray-100 relative'>
                      <img
                        src={submission.imageUrl}
                        alt={`한자 쓰기 연습 - ${submission.grade}급`}
                        className='w-full h-full object-cover'
                      />

                      {/* 상태 배지 */}
                      <div className='absolute top-2 right-2'>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                            submission.status
                          )}`}
                        >
                          {getStatusText(submission.status)}
                        </span>
                      </div>
                    </div>

                    {/* 정보 */}
                    <div className='p-4'>
                      <div className='flex items-center justify-between mb-2'>
                        <h3 className='font-semibold text-gray-900'>
                          {submission.grade}급
                        </h3>
                        <span className='text-sm text-gray-500'>
                          {formatDate(submission.submissionDate)}
                        </span>
                      </div>

                      {/* 연습한 한자 */}
                      <div className='mb-3'>
                        <p className='text-sm text-gray-600 mb-1'>
                          연습한 한자:
                        </p>
                        <div className='flex flex-wrap gap-1'>
                          <span className='px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded'>
                            {submission.character}
                          </span>
                        </div>

                        {/* 한자 통계 정보 */}
                        {(() => {
                          const stats = hanziStats.find(
                            (s) => s.character === submission.character
                          )
                          return stats ? (
                            <div className='mt-2 text-xs text-gray-500'>
                              <div className='flex justify-between'>
                                <span>총 연습 횟수: {stats.totalWrited}회</span>
                                <span>
                                  마지막 연습:{" "}
                                  {stats.lastWrited
                                    ? new Date(
                                        stats.lastWrited
                                      ).toLocaleDateString("ko-KR")
                                    : "없음"}
                                </span>
                              </div>
                            </div>
                          ) : null
                        })()}
                      </div>

                      {/* 경험치 */}
                      {submission.experienceAwarded > 0 && (
                        <div className='text-sm text-green-600 font-medium'>
                          +{submission.experienceAwarded} 경험치
                        </div>
                      )}

                      {/* 관리자 메모 */}
                      {submission.adminNotes && (
                        <div className='mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600'>
                          <strong>관리자 메모:</strong> {submission.adminNotes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
