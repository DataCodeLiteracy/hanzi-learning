"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import LoadingSpinner from "@/components/LoadingSpinner"
import DailyLimitModal from "@/components/exam/DailyLimitModal"
import { Trophy, Clock, Target, Award, ArrowLeft, Settings } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { gradeInfo } from "@/lib/gradeInfo"
import { getGradePatterns } from "@/lib/gradePatterns"
import { useSelectedHanzi } from "@/contexts/SelectedHanziContext"

const gradeExtra: Record<number, { description: string; level: string }> = {
  8: { description: "기초 한자 학습", level: "기초" },
  7: { description: "초급 한자 학습", level: "초급" },
  6: { description: "중급 한자 학습", level: "중급" },
  5: { description: "고급 한자 학습", level: "고급" },
  4: { description: "전문 한자 학습", level: "전문" },
  3: { description: "최고급 한자 학습", level: "최고급" },
  2: { description: "마스터 한자 학습", level: "마스터" },
  1: { description: "전문가 한자 학습", level: "전문가" },
  0: { description: "사범 한자 학습", level: "사범" },
}

export default function ExamPage() {
  const { user, loading: authLoading, initialLoading } = useAuth()
  const { userStatistics, hanziList, isLoading: dataLoading } = useData()
  const [currentGrade, setCurrentGrade] = useState<number | null>(null)
  const { setSelected } = useSelectedHanzi()
  const [isLoading, setIsLoading] = useState(true)
  const [showDailyLimitModal, setShowDailyLimitModal] = useState(false)
  const [checkingDailyLimit, setCheckingDailyLimit] = useState(true)
  const router = useRouter()

  // /games/exam 접근 시, 급수/패턴에 맞게 사전 선발(교과/일반) 구성 후 세션에 저장
  useEffect(() => {
    if (!currentGrade || !hanziList || hanziList.length === 0) return

    try {
      const patterns = getGradePatterns(currentGrade)
      const totalQuestions = patterns.reduce(
        (acc: number, p: any) => acc + p.questionCount,
        0
      )
      const textBookNeeded = patterns
        .filter((p: any) => p.isTextBook)
        .reduce((acc: number, p: any) => acc + p.questionCount, 0)
      const normalNeeded = totalQuestions - textBookNeeded

      // 현 급수 한자만 사용
      const gradeHanzi = hanziList.filter((h: any) => h.grade === currentGrade)
      // 데이터가 아직 비어있으면 선발 보류
      if (!gradeHanzi || gradeHanzi.length === 0) {
        console.log("선발 대기: 급수 한자 데이터가 아직 비어있음", {
          grade: currentGrade,
          gradeHanziCount: gradeHanzi?.length ?? 0,
        })
        return
      }
      console.log("/games/exam 선발 시작", {
        grade: currentGrade,
        totalQuestions,
        textBookNeeded,
        normalNeeded,
        gradeHanziCount: gradeHanzi.length,
      })

      const isTextBookWord = (rw: any) => {
        if (!rw) return false
        if (Array.isArray(rw)) return rw.some((w: any) => w?.isTextBook)
        return !!rw.isTextBook
      }

      const textBookHanzi = gradeHanzi.filter((h: any) =>
        isTextBookWord(h.relatedWords)
      )
      const normalHanzi = gradeHanzi.filter(
        (h: any) => !isTextBookWord(h.relatedWords)
      )
      console.log("교과/일반 분리", {
        textBookCount: textBookHanzi.length,
        normalCount: normalHanzi.length,
      })

      const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5)
      const selectedTextBook = shuffle(textBookHanzi).slice(
        0,
        Math.min(textBookNeeded, textBookHanzi.length)
      )
      const selectedNormal = shuffle(normalHanzi).slice(
        0,
        Math.min(normalNeeded, normalHanzi.length)
      )

      const payload = {
        grade: currentGrade,
        textBookIds: selectedTextBook.map((h: any) => h.id),
        normalIds: selectedNormal.map((h: any) => h.id),
        counts: { totalQuestions, textBookNeeded, normalNeeded },
      }

      // Context에 저장
      console.log("📝 Context에 저장 시작:", {
        grade: currentGrade,
        textBookIdsCount: payload.textBookIds.length,
        normalIdsCount: payload.normalIds.length,
        textBookIds: payload.textBookIds,
        normalIds: payload.normalIds,
        payload,
      })
      setSelected(currentGrade, {
        textBookIds: payload.textBookIds,
        normalIds: payload.normalIds,
        counts: payload.counts,
      })
      console.log("✅ Context에 저장 완료")

      // localStorage 직접 확인
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("hanzi_learning_selected_hanzi")
          if (stored) {
            const parsed = JSON.parse(stored)
            console.log("✅ localStorage 저장 확인:", {
              grade: currentGrade,
              storedData: parsed[currentGrade],
              textBookIdsCount: parsed[currentGrade]?.textBookIds?.length || 0,
              normalIdsCount: parsed[currentGrade]?.normalIds?.length || 0,
            })
          } else {
            console.warn("⚠️ localStorage에 저장되지 않음")
          }
        } catch (error) {
          console.error("❌ localStorage 확인 실패:", error)
        }
      }
    } catch (e) {
      // 선발 실패 시 무시(세부 페이지에서 자체 선택)
    }
  }, [currentGrade, hanziList])

  // 오늘 시험 여부 확인
  useEffect(() => {
    const checkDailyLimit = async () => {
      if (!user) {
        setCheckingDailyLimit(false)
        return
      }

      try {
        const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD 형식

        // 타임아웃 설정 (5초)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        const response = await fetch(
          `/api/check-daily-exam?userId=${user.id}&date=${today}`,
          { signal: controller.signal }
        )

        clearTimeout(timeoutId)

        if (!response.ok) {
          console.error("하루 1회 제한 확인 API 오류:", response.status)
          // API 오류 시에도 시험 진행 허용
          setCheckingDailyLimit(false)
          return
        }

        const result = await response.json()
        console.log("🔍 하루 1회 제한 확인 결과:", result)

        if (result.hasTakenToday) {
          console.log("🚫 오늘 이미 시험을 봤습니다. 모달 표시")
          setShowDailyLimitModal(true)
        }
      } catch (error) {
        console.error("하루 1회 제한 확인 실패:", error)
        // 타임아웃이거나 네트워크 오류인 경우 시험 진행 허용
        if (error instanceof Error && error.name === "AbortError") {
          console.warn("⚠️ 하루 1회 제한 확인 타임아웃, 시험 진행 허용")
        }
      } finally {
        setCheckingDailyLimit(false)
      }
    }

    if (user) {
      checkDailyLimit()
    } else {
      setCheckingDailyLimit(false)
    }
  }, [user])

  useEffect(() => {
    const loadUserGrade = async () => {
      if (!user) return

      try {
        // 사용자 데이터에서 직접 급수 확인
        if (user.preferredGrade) {
          setCurrentGrade(user.preferredGrade)
        } else {
          // 기본값 8급
          setCurrentGrade(8)
        }
      } catch (error) {
        console.error("사용자 급수 로드 실패:", error)
        setCurrentGrade(8)
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      loadUserGrade()
    } else {
      setIsLoading(false)
    }
  }, [user])

  // 로딩 중 (일일 제한 확인 포함)
  if (
    authLoading ||
    initialLoading ||
    dataLoading ||
    isLoading ||
    checkingDailyLimit
  ) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='시험 정보를 불러오는 중...' />
      </div>
    )
  }

  // 인증 체크
  if (!user) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-gray-900 mb-4'>
            로그인이 필요합니다
          </h1>
          <Link href='/login' className='text-purple-600 hover:text-purple-700'>
            로그인하기
          </Link>
        </div>
      </div>
    )
  }

  const currentGradeInfo = currentGrade ? gradeInfo[currentGrade] : null
  const currentGradeExtra = currentGrade ? gradeExtra[currentGrade] : null

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      {/* 헤더 */}
      <div className='bg-white shadow-sm border-b'>
        <div className='max-w-4xl mx-auto px-4 py-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-3 sm:space-x-4'>
              <Link
                href='/'
                className='text-gray-600 hover:text-gray-800 transition-colors'
              >
                <ArrowLeft className='w-5 h-5 sm:w-6 sm:h-6' />
              </Link>
              <div>
                <h1 className='text-lg sm:text-xl md:text-2xl font-bold text-gray-900'>
                  🏆 한자 실력 급수 시험
                </h1>
                <p className='text-xs sm:text-sm text-gray-600 hidden sm:block'>
                  공식 급수 시험으로 실력을 인증하고 자격증을 취득해보세요!
                </p>
              </div>
            </div>

            <div className='flex items-center space-x-2 sm:space-x-4'>
              <Link
                href='/profile#study-goal'
                className='flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors'
              >
                <Settings className='w-3 h-3 sm:w-4 sm:h-4' />
                <span className='text-xs sm:text-sm font-medium hidden sm:inline'>
                  급수 변경
                </span>
                <span className='text-xs sm:text-sm font-medium sm:hidden'>
                  급수
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className='max-w-4xl mx-auto px-4 py-6 sm:py-8'>
        {currentGradeInfo ? (
          <div className='bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8'>
            <div className='text-center mb-4'>
              <div className='w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3'>
                <Trophy className='w-6 h-6 text-purple-600' />
              </div>
              <h2 className='text-2xl font-bold text-gray-900 mb-3'>
                {currentGradeInfo.name} 시험
              </h2>
              <div className='mb-1'>
                <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800'>
                  {currentGradeExtra?.level} 레벨
                </span>
              </div>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6'>
              <div className='bg-blue-50 rounded-lg p-4 text-center'>
                <Target className='w-6 h-6 text-blue-600 mx-auto mb-2' />
                <div className='text-lg font-bold text-blue-600'>
                  {currentGradeInfo.questionCount}문제
                </div>
                <div className='text-xs text-gray-600'>총 문제 수</div>
              </div>

              <div className='bg-green-50 rounded-lg p-4 text-center'>
                <Clock className='w-6 h-6 text-green-600 mx-auto mb-2' />
                <div className='text-lg font-bold text-green-600'>
                  {currentGradeInfo.timeLimit}분
                </div>
                <div className='text-xs text-gray-600'>제한 시간</div>
              </div>
            </div>

            <div className='bg-gray-50 rounded-lg p-4 sm:p-5 mb-4 sm:mb-6'>
              <h3 className='text-sm sm:text-base font-semibold text-gray-900 mb-3'>
                📋 시험 구성
              </h3>
              <div className='space-y-2'>
                <div className='flex items-center'>
                  <span className='w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600 mr-2'>
                    1
                  </span>
                  <span className='text-sm text-gray-700'>
                    한자의 음(소리) 찾기 (5문제)
                  </span>
                </div>
                <div className='flex items-center'>
                  <span className='w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600 mr-2'>
                    2
                  </span>
                  <span className='text-sm text-gray-700'>
                    뜻에 맞는 한자 찾기 (5문제)
                  </span>
                </div>
                <div className='flex items-center'>
                  <span className='w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600 mr-2'>
                    3
                  </span>
                  <span className='text-sm text-gray-700'>
                    한자어 독음 문제 (7문제)
                  </span>
                </div>
                <div className='flex items-center'>
                  <span className='w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600 mr-2'>
                    4
                  </span>
                  <span className='text-sm text-gray-700'>
                    한자어 뜻 문제 (9문제)
                  </span>
                </div>
                <div className='flex items-center'>
                  <span className='w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600 mr-2'>
                    5
                  </span>
                  <span className='text-sm text-gray-700'>
                    빈칸 한자 찾기 (2문제)
                  </span>
                </div>
                <div className='flex items-center'>
                  <span className='w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600 mr-2'>
                    6
                  </span>
                  <span className='text-sm text-gray-700'>
                    한자어 뜻 찾기 (2문제)
                  </span>
                </div>
                <div className='flex items-center'>
                  <span className='w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600 mr-2'>
                    7
                  </span>
                  <span className='text-sm text-gray-700'>
                    한자 뜻과 음 쓰기 (8문제)
                  </span>
                </div>
                <div className='flex items-center'>
                  <span className='w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600 mr-2'>
                    8
                  </span>
                  <span className='text-sm text-gray-700'>
                    한자어 독음 쓰기 (6문제)
                  </span>
                </div>
                <div className='flex items-center'>
                  <span className='w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600 mr-2'>
                    9
                  </span>
                  <span className='text-sm text-gray-700'>
                    문장 독음 문제 (6문제)
                  </span>
                </div>
              </div>
            </div>

            <div className='text-center'>
              <button
                onClick={() => {
                  // 일일 제한 확인 중이면 클릭 무시
                  if (checkingDailyLimit) {
                    return
                  }
                  // localStorage에 이미 저장되어 있으므로 새로고침되면서 이동
                  window.location.href = `/games/exam/${currentGrade}`
                }}
                disabled={checkingDailyLimit}
                className={`inline-flex items-center px-5 sm:px-6 py-2 sm:py-3 border border-transparent text-sm sm:text-base font-medium rounded-lg shadow-sm transition-colors w-full sm:w-auto ${
                  checkingDailyLimit
                    ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                    : "text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                }`}
              >
                <Trophy className='-ml-1 mr-2 h-4 w-4 sm:h-5 sm:w-5' />
                <span className='text-sm'>
                  {checkingDailyLimit
                    ? "시험 정보 확인 중..."
                    : `${currentGradeInfo.name} 시험 시작하기`}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className='text-center'>
            <div className='text-gray-500 mb-4'>
              사용자 정보를 불러올 수 없습니다.
            </div>
            <Link
              href='/profile'
              className='text-purple-600 hover:text-purple-700'
            >
              프로필 설정하기
            </Link>
          </div>
        )}
      </div>

      {/* 일일 시험 제한 모달 */}
      {showDailyLimitModal && currentGrade && (
        <DailyLimitModal
          show={showDailyLimitModal}
          grade={currentGrade}
          onClose={() => {
            setShowDailyLimitModal(false)
            router.push("/")
          }}
        />
      )}
    </div>
  )
}
