"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { ApiClient } from "@/lib/apiClient"
import {
  ArrowLeft,
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface Feedback {
  id: string
  userId: string
  userEmail: string
  userName: string
  type: "bug" | "feature" | "improvement" | "other"
  title: string
  content: string
  status: "pending" | "in_progress" | "completed"
  createdAt: string
  updatedAt: string
}

export default function AdminFeedbackPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(
    null
  )
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !user.isAdmin) {
      router.push("/")
      return
    }
    loadFeedbacks()
  }, [user, router])

  const loadFeedbacks = async () => {
    try {
      setLoading(true)
      const feedbackList = await ApiClient.getFeedbackList()
      setFeedbacks(feedbackList)
    } catch (error) {
      console.error("피드백 목록 로드 실패:", error)
      alert("피드백 목록을 불러오는데 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (
    feedbackId: string,
    newStatus: "pending" | "in_progress" | "completed"
  ) => {
    try {
      await ApiClient.updateFeedbackStatus(feedbackId, newStatus)
      setFeedbacks((prev) =>
        prev.map((feedback) =>
          feedback.id === feedbackId
            ? {
                ...feedback,
                status: newStatus,
                updatedAt: new Date().toISOString(),
              }
            : feedback
        )
      )
      alert("상태가 업데이트되었습니다.")
    } catch (error) {
      console.error("상태 업데이트 실패:", error)
      alert("상태 업데이트에 실패했습니다.")
    }
  }

  const handleDelete = async (feedbackId: string) => {
    if (!confirm("정말로 이 피드백을 삭제하시겠습니까?")) return

    try {
      setDeletingId(feedbackId)
      await ApiClient.deleteFeedback(feedbackId)
      setFeedbacks((prev) =>
        prev.filter((feedback) => feedback.id !== feedbackId)
      )
      alert("피드백이 삭제되었습니다.")
    } catch (error) {
      console.error("피드백 삭제 실패:", error)
      alert("피드백 삭제에 실패했습니다.")
    } finally {
      setDeletingId(null)
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "bug":
        return "버그 신고"
      case "feature":
        return "기능 요청"
      case "improvement":
        return "개선 제안"
      default:
        return "기타"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "대기중"
      case "in_progress":
        return "처리중"
      case "completed":
        return "완료"
      default:
        return "알 수 없음"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-yellow-600 bg-yellow-100"
      case "in_progress":
        return "text-blue-600 bg-blue-100"
      case "completed":
        return "text-green-600 bg-green-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className='h-4 w-4' />
      case "in_progress":
        return <AlertCircle className='h-4 w-4' />
      case "completed":
        return <CheckCircle className='h-4 w-4' />
      default:
        return <Clock className='h-4 w-4' />
    }
  }

  if (!user || !user.isAdmin) {
    return null
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <header className='bg-white shadow-sm'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
            <div className='flex justify-between items-center py-4'>
              <h1 className='text-xl sm:text-2xl font-bold text-gray-900'>
                고객 피드백 관리
              </h1>
            </div>
          </div>
        </header>
        <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          <div className='flex justify-center'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* 헤더 */}
      <header className='bg-white shadow-sm'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-4'>
            <Link
              href='/admin'
              className='text-gray-600 hover:text-gray-900 transition-colors'
            >
              <ArrowLeft className='h-5 w-5' />
            </Link>
            <h1 className='text-xl sm:text-2xl font-bold text-gray-900'>
              고객 피드백 관리
            </h1>
            <div className='w-5'></div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* 피드백 통계 */}
        <div className='mb-6'>
          <div className='bg-white rounded-lg shadow-sm p-4'>
            <div className='text-center'>
              <h2 className='text-lg font-semibold text-gray-900 mb-2'>
                총 {feedbacks.length}건의 피드백
              </h2>
              <div className='flex justify-center space-x-6 text-sm text-gray-600'>
                <span>
                  대기중:{" "}
                  {feedbacks.filter((f) => f.status === "pending").length}건
                </span>
                <span>
                  처리중:{" "}
                  {feedbacks.filter((f) => f.status === "in_progress").length}건
                </span>
                <span>
                  완료:{" "}
                  {feedbacks.filter((f) => f.status === "completed").length}건
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 피드백 목록 */}
        <div className='bg-white rounded-lg shadow-sm overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    유형
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    제목
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    작성자
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    상태
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    작성일
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {feedbacks.map((feedback) => (
                  <tr key={feedback.id} className='hover:bg-gray-50'>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800'>
                        {getTypeLabel(feedback.type)}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='text-sm font-medium text-gray-900 max-w-xs truncate'>
                        {feedback.title}
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='text-sm text-gray-900'>
                        {feedback.userName}
                      </div>
                      <div className='text-sm text-gray-500'>
                        {feedback.userEmail}
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          feedback.status
                        )}`}
                      >
                        {getStatusIcon(feedback.status)}
                        <span className='ml-1'>
                          {getStatusLabel(feedback.status)}
                        </span>
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                      {new Date(feedback.createdAt).toLocaleDateString("ko-KR")}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm font-medium'>
                      <div className='flex space-x-2'>
                        <button
                          onClick={() => {
                            setSelectedFeedback(feedback)
                            setShowDetailModal(true)
                          }}
                          className='text-blue-600 hover:text-blue-900 transition-colors'
                        >
                          <Eye className='h-4 w-4' />
                        </button>
                        <button
                          onClick={() => handleDelete(feedback.id)}
                          disabled={deletingId === feedback.id}
                          className='text-red-600 hover:text-red-900 transition-colors disabled:opacity-50'
                        >
                          {deletingId === feedback.id ? (
                            <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-red-600'></div>
                          ) : (
                            <Trash2 className='h-4 w-4' />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {feedbacks.length === 0 && (
          <div className='text-center py-12'>
            <p className='text-gray-500'>등록된 피드백이 없습니다.</p>
          </div>
        )}
      </main>

      {/* 피드백 상세 모달 */}
      {showDetailModal && selectedFeedback && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
          <div className='bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
            <div className='p-6'>
              <div className='flex justify-between items-start mb-4'>
                <h3 className='text-lg font-semibold text-gray-900'>
                  피드백 상세보기
                </h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className='text-gray-400 hover:text-gray-600 transition-colors'
                >
                  ✕
                </button>
              </div>

              <div className='space-y-4'>
                {/* 피드백 정보 */}
                <div className='grid grid-cols-1 gap-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      유형
                    </label>
                    <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800'>
                      {getTypeLabel(selectedFeedback.type)}
                    </span>
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      제목
                    </label>
                    <p className='text-sm text-gray-900'>
                      {selectedFeedback.title}
                    </p>
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      작성자
                    </label>
                    <p className='text-sm text-gray-900'>
                      {selectedFeedback.userName}
                    </p>
                    <p className='text-sm text-gray-500'>
                      {selectedFeedback.userEmail}
                    </p>
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      상태
                    </label>
                    <select
                      value={selectedFeedback.status}
                      onChange={(e) =>
                        handleStatusUpdate(
                          selectedFeedback.id,
                          e.target.value as any
                        )
                      }
                      className='block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    >
                      <option value='pending'>대기중</option>
                      <option value='in_progress'>처리중</option>
                      <option value='completed'>완료</option>
                    </select>
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      작성일
                    </label>
                    <p className='text-sm text-gray-500'>
                      {new Date(selectedFeedback.createdAt).toLocaleString(
                        "ko-KR"
                      )}
                    </p>
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      수정일
                    </label>
                    <p className='text-sm text-gray-500'>
                      {new Date(selectedFeedback.updatedAt).toLocaleString(
                        "ko-KR"
                      )}
                    </p>
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      내용
                    </label>
                    <div className='bg-gray-50 p-3 rounded-md'>
                      <p className='text-sm text-gray-900 whitespace-pre-wrap'>
                        {selectedFeedback.content}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className='flex justify-end mt-6'>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className='px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors'
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
