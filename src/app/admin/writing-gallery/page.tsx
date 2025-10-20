"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ImageIcon,
  Clock,
  CheckCircle,
  X,
  Filter,
  Search,
  User,
  Calendar,
  Award,
  Edit3,
  Save,
  Trash2,
  XCircle,
} from "lucide-react"
import Link from "next/link"

interface WritingSubmission {
  id: string
  userId: string
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
  updatedAt: string
}

interface User {
  id: string
  displayName: string
  email: string
  preferredGrade: number
}

export default function AdminWritingGalleryPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [submissions, setSubmissions] = useState<WritingSubmission[]>([])
  const [users, setUsers] = useState<Record<string, User>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 필터 상태 - 기본값을 '이종현' 사용자로 설정
  const [selectedUser, setSelectedUser] = useState<string>("")
  const [selectedGrade, setSelectedGrade] = useState<string>("all")
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("date")
  const [sortOrder, setSortOrder] = useState<string>("desc")

  // 편집 상태
  const [editingSubmission, setEditingSubmission] = useState<string | null>(
    null
  )
  const [editExperience, setEditExperience] = useState<number>(0)
  const [editNotes, setEditNotes] = useState<string>("")

  // 커스텀 모달 상태
  const [showModal, setShowModal] = useState(false)
  const [modalMessage, setModalMessage] = useState("")
  const [modalType, setModalType] = useState<"success" | "error" | "info">(
    "info"
  )

  // 이미지 모달 상태
  const [selectedImage, setSelectedImage] = useState<{
    url: string
    character: string
    user: string
    date: string
    grade: number
  } | null>(null)

  // 검색
  const [searchQuery, setSearchQuery] = useState<string>("")

  // 관리자 권한 확인
  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      router.push("/")
    }
  }, [user, authLoading, router])

  // 데이터 로드
  const loadData = async () => {
    if (!user?.isAdmin) return

    setLoading(true)
    setError(null)

    try {
      // 모든 제출물 로드
      const submissionsResponse = await fetch("/api/admin/writing-gallery")
      const submissionsData = await submissionsResponse.json()

      if (submissionsData.success) {
        setSubmissions(submissionsData.submissions)
      } else {
        setError(submissionsData.error || "제출물 로드에 실패했습니다")
      }

      // 사용자 정보 로드
      const usersResponse = await fetch("/api/admin/users")
      const usersData = await usersResponse.json()

      if (usersData.success) {
        const usersMap: Record<string, User> = {}
        usersData.users.forEach((u: User) => {
          usersMap[u.id] = u
        })
        setUsers(usersMap)

        // '이종현' 사용자를 찾아서 기본값으로 설정
        const leeJongHyun = Object.values(usersMap).find(
          (user) => user.displayName === "이종현"
        )
        if (leeJongHyun) {
          setSelectedUser(leeJongHyun.id)
          console.log("기본 사용자 설정:", leeJongHyun.displayName)
        } else {
          console.warn("'이종현' 사용자를 찾을 수 없습니다.")
          setSelectedUser("all")
        }
      }
    } catch (err) {
      console.error("Data load error:", err)
      setError("데이터 로드 중 오류가 발생했습니다")
    } finally {
      setLoading(false)
    }
  }

  // 상태 업데이트
  const updateSubmissionStatus = async (
    submissionId: string,
    status: "pending" | "approved" | "rejected",
    experienceAwarded?: number,
    adminNotes?: string
  ) => {
    try {
      const response = await fetch("/api/admin/update-submission", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          submissionId,
          status,
          experienceAwarded,
          adminNotes,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // 경험치 변화가 있으면 사용자에게 알림
        if (data.experienceChange !== 0) {
          const changeText =
            data.experienceChange < 0
              ? `${Math.abs(data.experienceChange)} 경험치 차감`
              : `+${data.experienceChange} 경험치 추가`
          showCustomModal(
            `상태 업데이트 완료!\n\n이전 경험치: ${data.baseExperience}\n새 경험치: ${data.adjustedExperience}\n${changeText}`,
            "success"
          )
        } else {
          showCustomModal("상태 업데이트 완료!", "success")
        }

        // 로컬 상태 업데이트
        setSubmissions((prev) =>
          prev.map((sub) =>
            sub.id === submissionId
              ? {
                  ...sub,
                  status,
                  experienceAwarded: experienceAwarded ?? sub.experienceAwarded,
                  adminNotes: adminNotes ?? sub.adminNotes,
                  updatedAt: new Date().toISOString(),
                }
              : sub
          )
        )

        console.log("🔄 로컬 상태 업데이트:", {
          submissionId,
          status,
          experienceAwarded: experienceAwarded ?? "변경 없음",
          adminNotes: adminNotes ?? "변경 없음",
        })
        setEditingSubmission(null)
      } else {
        showCustomModal(data.error || "상태 업데이트에 실패했습니다", "error")
      }
    } catch (err) {
      console.error("Status update error:", err)
      showCustomModal("상태 업데이트 중 오류가 발생했습니다", "error")
    }
  }

  // 편집 시작
  const startEditing = (submission: WritingSubmission) => {
    setEditingSubmission(submission.id)
    // 저장된 경험치를 사용하되, 없으면 150으로 설정
    const currentExperience = submission.experienceAwarded || 150
    setEditExperience(currentExperience)
    setEditNotes(submission.adminNotes)

    console.log("📝 편집 시작:", {
      submissionId: submission.id,
      character: submission.character,
      currentExperience,
      adminNotes: submission.adminNotes,
    })
  }

  // 편집 저장
  const saveEdit = () => {
    if (!editingSubmission) return

    const submission = submissions.find((s) => s.id === editingSubmission)
    if (!submission) return

    console.log("💾 편집 저장:", {
      submissionId: editingSubmission,
      character: submission.character,
      currentExperience: submission.experienceAwarded || 150,
      newExperience: editExperience,
      status: submission.status,
      adminNotes: editNotes,
    })

    updateSubmissionStatus(
      editingSubmission,
      submission.status,
      editExperience,
      editNotes
    )
  }

  // 편집 취소
  const cancelEdit = () => {
    setEditingSubmission(null)
    setEditExperience(0)
    setEditNotes("")
  }

  // 이미지 클릭 핸들러
  const handleImageClick = (submission: WritingSubmission) => {
    const user = users[submission.userId]
    setSelectedImage({
      url: submission.imageUrl,
      character: submission.character,
      user: user?.displayName || "알 수 없음",
      date: submission.submissionDate,
      grade: submission.grade,
    })
  }

  // 이미지 모달 닫기
  const closeImageModal = () => {
    setSelectedImage(null)
  }

  // 커스텀 모달 표시
  const showCustomModal = (
    message: string,
    type: "success" | "error" | "info" = "info"
  ) => {
    setModalMessage(message)
    setModalType(type)
    setShowModal(true)
  }

  // 커스텀 모달 닫기
  const closeCustomModal = () => {
    setShowModal(false)
    setModalMessage("")
  }

  // 제출물 삭제
  const deleteSubmission = async (submissionId: string, character: string) => {
    if (
      !confirm(
        `'${character}' 제출물을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`
      )
    ) {
      return
    }

    try {
      const response = await fetch("/api/admin/delete-submission", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ submissionId }),
      })

      const data = await response.json()

      if (data.success) {
        // 로컬 상태에서 제출물 제거
        setSubmissions((prev) => prev.filter((sub) => sub.id !== submissionId))

        showCustomModal(
          `제출물이 성공적으로 삭제되었습니다!\n\n한자: ${data.deletedSubmission.character}\n차감된 경험치: ${data.deletedSubmission.experienceDeducted}`,
          "success"
        )
      } else {
        showCustomModal(data.error || "제출물 삭제에 실패했습니다", "error")
      }
    } catch (err) {
      console.error("Delete submission error:", err)
      showCustomModal("제출물 삭제 중 오류가 발생했습니다", "error")
    }
  }

  // 전체 통계 계산
  const totalSubmissions = submissions.length
  const pendingSubmissions = submissions.filter(
    (s) => s.status === "pending"
  ).length
  const approvedSubmissions = submissions.filter(
    (s) => s.status === "approved"
  ).length
  const rejectedSubmissions = submissions.filter(
    (s) => s.status === "rejected"
  ).length

  // 필터링 및 정렬된 제출물
  const filteredSubmissions = submissions
    .filter((submission) => {
      if (
        selectedUser &&
        selectedUser !== "all" &&
        submission.userId !== selectedUser
      ) {
        return false
      }
      if (
        selectedGrade !== "all" &&
        submission.grade !== parseInt(selectedGrade)
      ) {
        return false
      }
      if (selectedDate && submission.submissionDate !== selectedDate) {
        return false
      }
      if (selectedStatus !== "all" && submission.status !== selectedStatus) {
        return false
      }
      if (searchQuery) {
        const user = users[submission.userId]
        const searchLower = searchQuery.toLowerCase()
        return (
          submission.character.toLowerCase().includes(searchLower) ||
          user?.displayName?.toLowerCase().includes(searchLower) ||
          user?.email?.toLowerCase().includes(searchLower)
        )
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
        case "user":
          const userA = users[a.userId]?.displayName || ""
          const userB = users[b.userId]?.displayName || ""
          comparison = userA.localeCompare(userB)
          break
        default:
          comparison = 0
      }

      return sortOrder === "asc" ? comparison : -comparison
    })

  // 필터링된 통계 계산 (현재 선택된 사용자)
  const filteredTotalSubmissions = filteredSubmissions.length
  const filteredPendingSubmissions = filteredSubmissions.filter(
    (s) => s.status === "pending"
  ).length
  const filteredApprovedSubmissions = filteredSubmissions.filter(
    (s) => s.status === "approved"
  ).length
  const filteredRejectedSubmissions = filteredSubmissions.filter(
    (s) => s.status === "rejected"
  ).length

  // 현재 선택된 사용자 정보
  const currentUser =
    selectedUser && selectedUser !== "all" ? users[selectedUser] : null

  useEffect(() => {
    loadData()
  }, [user])

  // 로딩 중
  if (authLoading || loading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <div className='w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4'></div>
          <p className='text-gray-600'>관리자 페이지를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  // 권한 없음
  if (!user?.isAdmin) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-gray-900 mb-4'>
            접근 권한이 없습니다
          </h1>
          <Link href='/' className='text-blue-600 hover:text-blue-700'>
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* 헤더 */}
      <div className='bg-white shadow-sm border-b'>
        <div className='max-w-7xl mx-auto px-4 py-3 sm:py-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-3 sm:space-x-4'>
              <Link href='/admin'>
                <button className='p-2 hover:bg-gray-100 rounded-lg transition-colors'>
                  <ArrowLeft className='w-5 h-5 sm:w-6 sm:h-6 text-gray-600' />
                </button>
              </Link>
              <h1 className='text-lg sm:text-2xl font-bold text-gray-900'>
                쓰기 갤러리 관리
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 py-6 sm:py-8'>
        {/* 필터 섹션 */}
        <div className='bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-4 sm:mb-6'>
          <h2 className='text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center'>
            <Filter className='w-4 h-4 sm:w-5 sm:h-5 mr-2' />
            필터 및 검색
          </h2>

          <div className='space-y-4'>
            {/* 검색 */}
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
              <input
                type='text'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='한자, 사용자명, 이메일로 검색...'
                className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900'
              />
            </div>

            {/* 필터 그리드 */}
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4'>
              {/* 사용자 필터 */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  사용자
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className='w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900'
                >
                  <option value='all' className='text-gray-900'>
                    전체 사용자
                  </option>
                  {Object.values(users).map((user) => (
                    <option
                      key={user.id}
                      value={user.id}
                      className='text-gray-900'
                    >
                      {user.displayName}
                    </option>
                  ))}
                </select>
              </div>

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
                  <option value='pending' className='text-gray-900'>
                    검토 중
                  </option>
                  <option value='approved' className='text-gray-900'>
                    승인됨
                  </option>
                  <option value='rejected' className='text-gray-900'>
                    거부됨
                  </option>
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
                  <option value='user' className='text-gray-900'>
                    사용자
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
        </div>

        {/* 통계 */}
        {/* 전체 통계 카드 */}
        <div className='mb-6'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>
            전체 통계
          </h3>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4'>
            <div className='bg-white rounded-lg shadow-sm border p-3 sm:p-4'>
              <div className='flex items-center'>
                <ImageIcon className='w-6 h-6 sm:w-8 sm:h-8 text-blue-500 mr-2 sm:mr-3' />
                <div>
                  <p className='text-xs sm:text-sm text-gray-800'>총 제출물</p>
                  <p className='text-lg sm:text-2xl font-bold text-gray-900'>
                    {totalSubmissions}
                  </p>
                </div>
              </div>
            </div>

            <div className='bg-white rounded-lg shadow-sm border p-3 sm:p-4'>
              <div className='flex items-center'>
                <Clock className='w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 mr-2 sm:mr-3' />
                <div>
                  <p className='text-xs sm:text-sm text-gray-800'>검토 중</p>
                  <p className='text-lg sm:text-2xl font-bold text-gray-900'>
                    {pendingSubmissions}
                  </p>
                </div>
              </div>
            </div>

            <div className='bg-white rounded-lg shadow-sm border p-3 sm:p-4'>
              <div className='flex items-center'>
                <CheckCircle className='w-6 h-6 sm:w-8 sm:h-8 text-green-500 mr-2 sm:mr-3' />
                <div>
                  <p className='text-xs sm:text-sm text-gray-800'>승인됨</p>
                  <p className='text-lg sm:text-2xl font-bold text-gray-900'>
                    {approvedSubmissions}
                  </p>
                </div>
              </div>
            </div>

            <div className='bg-white rounded-lg shadow-sm border p-3 sm:p-4'>
              <div className='flex items-center'>
                <X className='w-6 h-6 sm:w-8 sm:h-8 text-red-500 mr-2 sm:mr-3' />
                <div>
                  <p className='text-xs sm:text-sm text-gray-800'>거부됨</p>
                  <p className='text-lg sm:text-2xl font-bold text-gray-900'>
                    {rejectedSubmissions}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 선택된 사용자 통계 카드 */}
        {currentUser && (
          <div className='mb-6'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>
              {currentUser.displayName} 사용자 통계
            </h3>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4'>
              <div className='bg-blue-50 rounded-lg shadow-sm border border-blue-200 p-3 sm:p-4'>
                <div className='flex items-center'>
                  <ImageIcon className='w-6 h-6 sm:w-8 sm:h-8 text-blue-600 mr-2 sm:mr-3' />
                  <div>
                    <p className='text-xs sm:text-sm text-blue-800'>
                      총 제출물
                    </p>
                    <p className='text-lg sm:text-2xl font-bold text-blue-900'>
                      {filteredTotalSubmissions}
                    </p>
                  </div>
                </div>
              </div>

              <div className='bg-yellow-50 rounded-lg shadow-sm border border-yellow-200 p-3 sm:p-4'>
                <div className='flex items-center'>
                  <Clock className='w-6 h-6 sm:w-8 sm:h-8 text-yellow-600 mr-2 sm:mr-3' />
                  <div>
                    <p className='text-xs sm:text-sm text-yellow-800'>
                      검토 중
                    </p>
                    <p className='text-lg sm:text-2xl font-bold text-yellow-900'>
                      {filteredPendingSubmissions}
                    </p>
                  </div>
                </div>
              </div>

              <div className='bg-green-50 rounded-lg shadow-sm border border-green-200 p-3 sm:p-4'>
                <div className='flex items-center'>
                  <CheckCircle className='w-6 h-6 sm:w-8 sm:h-8 text-green-600 mr-2 sm:mr-3' />
                  <div>
                    <p className='text-xs sm:text-sm text-green-800'>승인됨</p>
                    <p className='text-lg sm:text-2xl font-bold text-green-900'>
                      {filteredApprovedSubmissions}
                    </p>
                  </div>
                </div>
              </div>

              <div className='bg-red-50 rounded-lg shadow-sm border border-red-200 p-3 sm:p-4'>
                <div className='flex items-center'>
                  <X className='w-6 h-6 sm:w-8 sm:h-8 text-red-600 mr-2 sm:mr-3' />
                  <div>
                    <p className='text-xs sm:text-sm text-red-800'>거부됨</p>
                    <p className='text-lg sm:text-2xl font-bold text-red-900'>
                      {filteredRejectedSubmissions}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 오류 메시지 */}
        {error && (
          <div className='mb-6 p-4 bg-red-50 border border-red-200 rounded-lg'>
            <div className='flex items-center'>
              <X className='w-5 h-5 text-red-600 mr-2' />
              <span className='text-red-800'>{error}</span>
            </div>
          </div>
        )}

        {/* 제출물 목록 */}
        {filteredSubmissions.length > 0 ? (
          <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6'>
            {filteredSubmissions.map((submission) => {
              const user = users[submission.userId]
              const isEditing = editingSubmission === submission.id

              return (
                <div
                  key={submission.id}
                  className='bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow'
                >
                  {/* 이미지 */}
                  <div
                    className='aspect-video bg-gray-100 relative cursor-pointer hover:opacity-90 transition-opacity'
                    onClick={() => handleImageClick(submission)}
                  >
                    <img
                      src={submission.imageUrl}
                      alt={`${submission.character} 쓰기 연습`}
                      className='w-full h-full object-cover'
                    />
                    <div className='absolute top-2 left-2'>
                      <span className='px-2 py-1 bg-black bg-opacity-50 text-white text-xs rounded'>
                        {submission.grade}급
                      </span>
                    </div>
                    <div className='absolute top-2 right-2'>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          submission.status === "approved"
                            ? "bg-green-500 text-white"
                            : submission.status === "rejected"
                            ? "bg-red-500 text-white"
                            : "bg-yellow-500 text-white"
                        }`}
                      >
                        {submission.status === "approved"
                          ? "승인됨"
                          : submission.status === "rejected"
                          ? "거부됨"
                          : "검토 중"}
                      </span>
                    </div>
                  </div>

                  {/* 내용 */}
                  <div className='p-4'>
                    {/* 사용자 정보 */}
                    <div className='flex items-center mb-3'>
                      <User className='w-4 h-4 text-gray-400 mr-2' />
                      <span className='text-sm text-gray-900'>
                        {user?.displayName || "알 수 없음"}
                      </span>
                    </div>

                    {/* 한자 정보 */}
                    <div className='mb-3'>
                      <div className='flex items-center justify-between'>
                        <span className='text-2xl font-bold text-gray-900'>
                          {submission.character}
                        </span>
                        <span className='text-sm text-gray-900'>
                          {submission.submissionDate}
                        </span>
                      </div>
                    </div>

                    {/* 경험치 정보 */}
                    <div className='mb-3'>
                      <div className='flex items-center justify-between'>
                        <span className='text-sm text-gray-900'>경험치:</span>
                        {isEditing ? (
                          <div className='flex flex-col items-end space-y-1'>
                            <div className='flex items-center space-x-2'>
                              <span className='text-xs text-gray-500'>
                                기본: 150
                              </span>
                              <input
                                type='number'
                                value={
                                  editExperience === 0 ? "" : editExperience
                                }
                                onChange={(e) => {
                                  const value = e.target.value
                                  if (value === "") {
                                    setEditExperience(0)
                                  } else {
                                    const numValue = parseInt(value)
                                    setEditExperience(
                                      isNaN(numValue) ? 0 : numValue
                                    )
                                  }
                                }}
                                onFocus={(e) => {
                                  if (e.target.value === "0") {
                                    e.target.select()
                                  }
                                }}
                                className='w-20 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900'
                                placeholder='150'
                                min='0'
                                max='150'
                              />
                              <span
                                className={`text-xs ${
                                  editExperience >
                                  (submission.experienceAwarded || 150)
                                    ? "text-green-600"
                                    : editExperience <
                                      (submission.experienceAwarded || 150)
                                    ? "text-red-600"
                                    : "text-gray-500"
                                }`}
                              >
                                {(() => {
                                  const currentExp =
                                    submission.experienceAwarded || 150
                                  const change = editExperience - currentExp
                                  if (change > 0) {
                                    return `추가: +${change}`
                                  } else if (change < 0) {
                                    return `차감: ${change}`
                                  } else {
                                    return "변화 없음"
                                  }
                                })()}
                              </span>
                            </div>
                            <span className='text-xs text-gray-400'>
                              예: 75→100 = +25 추가, 100→75 = -25 차감, 150→150
                              = 변화 없음
                            </span>
                          </div>
                        ) : (
                          <span className='text-sm font-medium text-blue-600'>
                            {submission.experienceAwarded || 150}exp
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 관리자 노트 */}
                    <div className='mb-4'>
                      <label className='block text-sm text-gray-900 mb-1'>
                        관리자 노트:
                      </label>
                      {isEditing ? (
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className='w-full px-3 py-2 border border-gray-300 rounded text-sm resize-none text-gray-900 placeholder-gray-600'
                          rows={2}
                          placeholder='관리자 노트를 입력하세요...'
                        />
                      ) : (
                        <p className='text-sm text-gray-900 min-h-[2.5rem]'>
                          {submission.adminNotes || "노트 없음"}
                        </p>
                      )}
                    </div>

                    {/* 액션 버튼들 */}
                    <div className='flex flex-wrap gap-2'>
                      {isEditing ? (
                        <>
                          <button
                            onClick={saveEdit}
                            className='flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 flex items-center justify-center'
                          >
                            <Save className='w-4 h-4 mr-1' />
                            저장
                          </button>
                          <button
                            onClick={cancelEdit}
                            className='flex-1 bg-gray-500 text-white px-3 py-2 rounded text-sm hover:bg-gray-600 flex items-center justify-center'
                          >
                            <XCircle className='w-4 h-4 mr-1' />
                            취소
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditing(submission)}
                            className='flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 flex items-center justify-center'
                          >
                            <Edit3 className='w-4 h-4 mr-1' />
                            편집
                          </button>
                          {submission.status !== "approved" && (
                            <button
                              onClick={() =>
                                updateSubmissionStatus(
                                  submission.id,
                                  "approved"
                                )
                              }
                              className='flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 flex items-center justify-center'
                            >
                              <CheckCircle className='w-4 h-4 mr-1' />
                              승인
                            </button>
                          )}
                          {submission.status !== "rejected" && (
                            <button
                              onClick={() =>
                                updateSubmissionStatus(
                                  submission.id,
                                  "rejected"
                                )
                              }
                              className='flex-1 bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 flex items-center justify-center'
                            >
                              <X className='w-4 h-4 mr-1' />
                              거부
                            </button>
                          )}
                          <button
                            onClick={() =>
                              deleteSubmission(
                                submission.id,
                                submission.character
                              )
                            }
                            className='flex-1 bg-gray-600 text-white px-3 py-2 rounded text-sm hover:bg-gray-700 flex items-center justify-center'
                          >
                            <Trash2 className='w-4 h-4 mr-1' />
                            삭제
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className='text-center py-12'>
            <ImageIcon className='w-16 h-16 text-gray-300 mx-auto mb-4' />
            <h3 className='text-lg font-medium text-gray-900 mb-2'>
              제출물이 없습니다
            </h3>
            <p className='text-gray-800'>필터 조건에 맞는 제출물이 없습니다.</p>
          </div>
        )}
      </div>

      {/* 이미지 모달 */}
      {selectedImage && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75'
          onClick={closeImageModal}
        >
          <div
            className='relative max-w-4xl max-h-full w-full h-full flex flex-col'
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className='bg-white rounded-t-lg p-4 flex items-center justify-between'>
              <div>
                <h3 className='text-lg font-semibold text-gray-900'>
                  {selectedImage.character} - {selectedImage.user}
                </h3>
                <p className='text-sm text-gray-600'>
                  {selectedImage.grade}급 • {selectedImage.date}
                </p>
              </div>
              <button
                onClick={closeImageModal}
                className='p-2 hover:bg-gray-100 rounded-lg transition-colors'
              >
                <X className='w-6 h-6 text-gray-600' />
              </button>
            </div>

            {/* 이미지 컨테이너 */}
            <div className='bg-white rounded-b-lg flex-1 flex items-center justify-center p-4 overflow-hidden'>
              <img
                src={selectedImage.url}
                alt={`${selectedImage.character} 쓰기 연습`}
                className='max-w-full max-h-full object-contain rounded-lg shadow-lg'
              />
            </div>

            {/* 모달 푸터 */}
            <div className='bg-gray-50 rounded-b-lg p-4 text-center'>
              <p className='text-sm text-gray-600'>
                이미지를 클릭하여 전체 크기로 보세요
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 커스텀 모달 */}
      {showModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50'>
          <div className='bg-white rounded-lg shadow-xl max-w-md w-full mx-4'>
            <div className='p-6'>
              <div className='flex items-center mb-4'>
                {modalType === "success" && (
                  <CheckCircle className='w-6 h-6 text-green-600 mr-3' />
                )}
                {modalType === "error" && (
                  <X className='w-6 h-6 text-red-600 mr-3' />
                )}
                {modalType === "info" && (
                  <div className='w-6 h-6 bg-blue-600 rounded-full mr-3 flex items-center justify-center'>
                    <span className='text-white text-sm font-bold'>i</span>
                  </div>
                )}
                <h3 className='text-lg font-semibold text-gray-900'>
                  {modalType === "success" && "성공"}
                  {modalType === "error" && "오류"}
                  {modalType === "info" && "알림"}
                </h3>
              </div>
              <div className='text-gray-700 whitespace-pre-line mb-6'>
                {modalMessage}
              </div>
              <div className='flex justify-end'>
                <button
                  onClick={closeCustomModal}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    modalType === "success"
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : modalType === "error"
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
