"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { addDoc, collection } from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
  ArrowLeft,
  Send,
  AlertCircle,
  Lightbulb,
  Bug,
  Settings,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function FeedbackPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [feedbackType, setFeedbackType] = useState<
    "bug" | "feature" | "improvement" | "other"
  >("bug")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 모두 입력해주세요.")
      return
    }

    setIsSubmitting(true)
    try {
      await addDoc(collection(db, "feedback"), {
        userId: user.id,
        userEmail: user.email,
        userName: user.displayName || "익명",
        type: feedbackType,
        title: title.trim(),
        content: content.trim(),
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      setIsSubmitted(true)
      setTimeout(() => {
        router.push("/profile")
      }, 2000)
    } catch (error) {
      console.error("피드백 제출 실패:", error)
      alert("피드백 제출에 실패했습니다. 다시 시도해주세요.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "bug":
        return <Bug className='h-4 w-4' />
      case "feature":
        return <Lightbulb className='h-4 w-4' />
      case "improvement":
        return <Settings className='h-4 w-4' />
      default:
        return <AlertCircle className='h-4 w-4' />
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

  if (isSubmitted) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <header className='bg-white shadow-sm'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
            <div className='flex justify-between items-center py-4'>
              <h1 className='text-xl sm:text-2xl font-bold text-gray-900'>
                고객 게시판
              </h1>
            </div>
          </div>
        </header>

        <main className='max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          <div className='bg-white rounded-lg shadow-sm p-6 text-center'>
            <div className='text-green-600 mb-4'>
              <Send className='h-16 w-16 mx-auto' />
            </div>
            <h2 className='text-2xl font-bold text-gray-900 mb-2'>
              피드백이 성공적으로 제출되었습니다!
            </h2>
            <p className='text-gray-600 mb-4'>
              소중한 의견을 보내주셔서 감사합니다.
              <br />
              검토 후 반영하도록 하겠습니다.
            </p>
            <p className='text-sm text-gray-500'>
              잠시 후 마이페이지로 이동합니다...
            </p>
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
              href='/profile'
              className='text-gray-600 hover:text-gray-900 transition-colors'
            >
              <ArrowLeft className='h-5 w-5' />
            </Link>
            <h1 className='text-xl sm:text-2xl font-bold text-gray-900'>
              고객 게시판
            </h1>
            <div className='w-5'></div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className='max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='bg-white rounded-lg shadow-sm p-6'>
          <div className='mb-6'>
            <h2 className='text-lg font-semibold text-gray-900 mb-2'>
              피드백 제출
            </h2>
            <p className='text-sm text-gray-600'>
              버그 신고, 기능 요청, 개선 제안 등을 자유롭게 작성해주세요.
            </p>
          </div>

          <form onSubmit={handleSubmit} className='space-y-6'>
            {/* 피드백 타입 선택 */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-3'>
                피드백 유형
              </label>
              <div className='grid grid-cols-2 gap-3'>
                {(["bug", "feature", "improvement", "other"] as const).map(
                  (type) => (
                    <button
                      key={type}
                      type='button'
                      onClick={() => setFeedbackType(type)}
                      className={`flex items-center justify-center space-x-2 p-3 rounded-lg border transition-colors ${
                        feedbackType === type
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                      }`}
                    >
                      {getTypeIcon(type)}
                      <span className='text-sm font-medium'>
                        {getTypeLabel(type)}
                      </span>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* 제목 입력 */}
            <div>
              <label
                htmlFor='title'
                className='block text-sm font-medium text-gray-700 mb-2'
              >
                제목 *
              </label>
              <input
                type='text'
                id='title'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black placeholder-gray-500'
                placeholder='피드백 제목을 입력해주세요'
                required
              />
            </div>

            {/* 내용 입력 */}
            <div>
              <label
                htmlFor='content'
                className='block text-sm font-medium text-gray-700 mb-2'
              >
                내용 *
              </label>
              <textarea
                id='content'
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black placeholder-gray-500'
                placeholder='자세한 내용을 입력해주세요'
                required
              />
            </div>

            {/* 제출 버튼 */}
            <div className='flex justify-end'>
              <button
                type='submit'
                disabled={isSubmitting}
                className='flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
              >
                {isSubmitting ? (
                  <>
                    <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
                    <span>제출 중...</span>
                  </>
                ) : (
                  <>
                    <Send className='h-4 w-4' />
                    <span>피드백 제출</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
