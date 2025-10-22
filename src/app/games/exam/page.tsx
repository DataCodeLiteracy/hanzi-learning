"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import LoadingSpinner from "@/components/LoadingSpinner"
import { Trophy, Clock, Target, Award, ArrowLeft, Settings } from "lucide-react"
import Link from "next/link"

interface GradeInfo {
  grade: number
  name: string
  questionCount: number
  timeLimit: number
  description: string
  level: string
}

const gradeInfo: Record<number, GradeInfo> = {
  8: {
    grade: 8,
    name: "8급",
    questionCount: 50,
    timeLimit: 60,
    description: "기초 한자 학습",
    level: "기초",
  },
  7: {
    grade: 7,
    name: "7급",
    questionCount: 50,
    timeLimit: 60,
    description: "초급 한자 학습",
    level: "초급",
  },
  6: {
    grade: 6,
    name: "6급",
    questionCount: 80,
    timeLimit: 60,
    description: "중급 한자 학습",
    level: "중급",
  },
  5: {
    grade: 5,
    name: "5급",
    questionCount: 100,
    timeLimit: 60,
    description: "고급 한자 학습",
    level: "고급",
  },
  4: {
    grade: 4,
    name: "4급",
    questionCount: 100,
    timeLimit: 60,
    description: "전문 한자 학습",
    level: "전문",
  },
  3: {
    grade: 3,
    name: "3급",
    questionCount: 100,
    timeLimit: 60,
    description: "최고급 한자 학습",
    level: "최고급",
  },
  2: {
    grade: 2,
    name: "2급",
    questionCount: 100,
    timeLimit: 60,
    description: "마스터 한자 학습",
    level: "마스터",
  },
  1: {
    grade: 1,
    name: "1급",
    questionCount: 100,
    timeLimit: 60,
    description: "전문가 한자 학습",
    level: "전문가",
  },
  0: {
    grade: 0,
    name: "사범급",
    questionCount: 100,
    timeLimit: 60,
    description: "사범 한자 학습",
    level: "사범",
  },
}

export default function ExamPage() {
  const { user, loading: authLoading, initialLoading } = useAuth()
  const { userStatistics, hanziList, isLoading: dataLoading } = useData()
  const [currentGrade, setCurrentGrade] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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

  // 로딩 중
  if (authLoading || initialLoading || dataLoading || isLoading) {
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
                  {currentGradeInfo.level} 레벨
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
              <Link
                href={`/games/exam/${currentGradeInfo.grade}`}
                className='inline-flex items-center px-5 sm:px-6 py-2 sm:py-3 border border-transparent text-sm sm:text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors w-full sm:w-auto'
              >
                <Trophy className='-ml-1 mr-2 h-4 w-4 sm:h-5 sm:w-5' />
                <span className='text-sm'>
                  {currentGradeInfo.name} 시험 시작하기
                </span>
              </Link>
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
    </div>
  )
}
