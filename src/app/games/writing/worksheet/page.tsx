"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import { ApiClient } from "@/lib/apiClient"
import LoadingSpinner from "@/components/LoadingSpinner"
import { ArrowLeft, Printer, CheckSquare, Square } from "lucide-react"
import Link from "next/link"
import { Hanzi } from "@/types"

export default function WorksheetPage() {
  const { user, loading: authLoading } = useAuth()
  const { hanziList: contextHanziList, isLoading: isDataLoading } = useData()
  const [selectedGrade, setSelectedGrade] = useState<number>(8)
  const [hanziList, setHanziList] = useState<Hanzi[]>([])
  const [selectedHanziIds, setSelectedHanziIds] = useState<Set<string>>(
    new Set()
  )
  const [isLoadingHanzi, setIsLoadingHanzi] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [modificationCount, setModificationCount] = useState(0)

  // 급수 목록
  const grades = [8, 7, 6, 5.5, 5, 4.5, 4, 3.5, 3]

  // 급수별 한자 불러오기
  useEffect(() => {
    const loadHanziByGrade = async () => {
      if (!user) return

      setIsLoadingHanzi(true)
      try {
        // 현재 선택된 급수가 사용자의 preferredGrade와 같으면 context에서 가져오기
        if (
          selectedGrade === user.preferredGrade &&
          contextHanziList.length > 0
        ) {
          setHanziList(contextHanziList)
        } else {
          // 다른 급수는 API에서 가져오기
          const data = await ApiClient.getHanziByGrade(selectedGrade)
          setHanziList(data)
        }
      } catch (error) {
        console.error("Failed to load hanzi:", error)
      } finally {
        setIsLoadingHanzi(false)
      }
    }

    loadHanziByGrade()
  }, [selectedGrade, user, contextHanziList])

  // 전체 선택/해제
  const handleToggleAll = () => {
    if (selectedHanziIds.size === hanziList.length) {
      setSelectedHanziIds(new Set())
    } else {
      setSelectedHanziIds(new Set(hanziList.map((h) => h.id)))
    }
  }

  // 개별 선택/해제
  const handleToggleHanzi = (hanziId: string) => {
    const newSet = new Set(selectedHanziIds)
    if (newSet.has(hanziId)) {
      newSet.delete(hanziId)
    } else {
      newSet.add(hanziId)
    }
    setSelectedHanziIds(newSet)
  }

  // 선택된 한자 데이터
  const selectedHanziData = useMemo(() => {
    return hanziList.filter((h) => selectedHanziIds.has(h.id))
  }, [hanziList, selectedHanziIds])

  // 미리보기/출력 모드로 전환
  const handlePreview = () => {
    if (selectedHanziIds.size === 0) {
      alert("한자를 선택해주세요")
      return
    }
    setShowPreview(true)
    setModificationCount((prev) => prev + 1)
  }

  // 인쇄
  const handlePrint = () => {
    window.print()
  }

  // 로딩 중
  if (authLoading || isDataLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='로딩 중...' />
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
          <Link href='/login' className='text-blue-600 hover:text-blue-700'>
            로그인하기
          </Link>
        </div>
      </div>
    )
  }

  // 미리보기/출력 모드
  if (showPreview) {
    return (
      <>
        {/* 프린트 전용 스타일 */}
        <style jsx global>{`
          @media print {
            @page {
              size: A4;
              margin: 0;
              padding: 0;
            }

            .no-print {
              display: none !important;
            }
            .print-page {
              page-break-after: always;
              width: 210mm !important;
              height: 297mm !important;
              margin: 0 !important;
              padding: 8mm !important;
              box-sizing: border-box !important;
            }
            body {
              margin: 0;
              padding: 0;
              zoom: 1;
            }
            /* 인쇄 시에만 색상 더 연하게 */
            .print-page .hanzi-text {
              color: #f0f0f0 !important;
              opacity: 0.45 !important; /* 0.4 → 0.45 */
            }
            .print-page .meaning-text {
              color: #f0f0f0 !important;
              opacity: 0.45 !important; /* 0.35 → 0.45 (동일하게) */
            }
          }

          /* 그리드 갭 완전 제거 */
          .worksheet-grid,
          .worksheet-grid * {
            gap: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border-spacing: 0 !important;
            border-collapse: collapse !important;
          }

          /* 모든 그리드 아이템 갭 제거 */
          [style*="display: grid"] {
            gap: 0px !important;
          }

          [style*="display: grid"] > * {
            margin: 0px !important;
            padding: 0px !important;
          }
        `}</style>

        {/* 헤더 (프린트 시 숨김) */}
        <header className='bg-white shadow-sm no-print'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
            <div className='flex justify-between items-center py-4'>
              <div className='flex items-center space-x-4'>
                <button
                  onClick={() => setShowPreview(false)}
                  className='text-blue-600 hover:text-blue-700'
                >
                  <ArrowLeft className='h-5 w-5' />
                </button>
                <h1 className='text-xl font-bold text-gray-900'>
                  연습지 미리보기
                </h1>
              </div>
              <div className='flex gap-2'>
                <button
                  onClick={handlePrint}
                  className='flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
                >
                  <Printer className='h-4 w-4 mr-2' />
                  인쇄하기
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* 프린트 영역 - 미리보기와 인쇄 동일하게 */}
        <div className='bg-gray-100 min-h-screen p-4 no-print'>
          {selectedHanziData.map((hanzi, index) => (
            <div
              key={hanzi.id}
              className='print-page worksheet-page bg-white mx-auto mb-4'
              style={{
                width: "195mm", // 210mm * 0.93
                height: "260mm", // 297mm * 0.87 (세로 더 줄임)
                padding: "7.4mm", // 8mm * 0.93
                boxShadow: "0 0 10px rgba(0,0,0,0.1)",
                maxWidth: "100%",
                maxHeight: "100vh",
                overflow: "hidden",
              }}
            >
              <WorksheetGrid hanzi={hanzi} pageNumber={index + 1} />
            </div>
          ))}
        </div>

        {/* 프린트 전용 - 미리보기와 동일한 스타일 */}
        <div className='hidden print:block'>
          {selectedHanziData.map((hanzi, index) => (
            <div
              key={hanzi.id}
              className='print-page worksheet-page bg-white'
              style={{
                width: "195mm", // 210mm * 0.93
                height: "260mm", // 297mm * 0.87 (세로 더 줄임)
                padding: "7.4mm", // 8mm * 0.93
                margin: "0",
                pageBreakAfter: "always",
                boxSizing: "border-box",
              }}
            >
              <WorksheetGrid hanzi={hanzi} pageNumber={index + 1} />
            </div>
          ))}
        </div>
      </>
    )
  }

  // 메인 선택 UI
  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      <header className='bg-white shadow-sm'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-4'>
            <div className='flex items-center space-x-4'>
              <Link
                href='/games/writing'
                className='text-blue-600 hover:text-blue-700'
              >
                <ArrowLeft className='h-5 w-5' />
              </Link>
              <h1 className='text-xl font-bold text-gray-900'>연습지 생성</h1>
            </div>
          </div>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='bg-white rounded-xl shadow-lg p-6'>
          {/* 급수 선택 */}
          <div className='mb-6'>
            <label className='block text-sm font-semibold text-gray-700 mb-3'>
              급수 선택
            </label>
            <div className='flex flex-wrap gap-2'>
              {grades.map((grade) => (
                <button
                  key={grade}
                  onClick={() => {
                    setSelectedGrade(grade)
                    setSelectedHanziIds(new Set())
                  }}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    selectedGrade === grade
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {grade}급
                </button>
              ))}
            </div>
          </div>

          {/* 전체 선택 */}
          <div className='mb-4 flex items-center justify-between'>
            <button
              onClick={handleToggleAll}
              className='flex items-center text-blue-600 hover:text-blue-700 font-semibold'
            >
              {selectedHanziIds.size === hanziList.length ? (
                <>
                  <CheckSquare className='h-5 w-5 mr-2' />
                  전체 해제
                </>
              ) : (
                <>
                  <Square className='h-5 w-5 mr-2' />
                  전체 선택
                </>
              )}
            </button>
            <div className='text-sm text-gray-600'>
              {selectedHanziIds.size}개 선택됨 / 총 {hanziList.length}개
            </div>
          </div>

          {/* 한자 목록 */}
          {isLoadingHanzi ? (
            <div className='py-12 text-center'>
              <LoadingSpinner message='한자 목록을 불러오는 중...' />
            </div>
          ) : (
            <div className='grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 mb-6 max-h-96 overflow-y-auto p-2'>
              {hanziList.map((hanzi) => (
                <button
                  key={hanzi.id}
                  onClick={() => handleToggleHanzi(hanzi.id)}
                  className={`aspect-square flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all ${
                    selectedHanziIds.has(hanzi.id)
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-300 hover:border-gray-400 bg-white"
                  }`}
                >
                  <div className='text-3xl mb-1 text-black font-medium'>
                    {hanzi.character}
                  </div>
                  <div className='text-xs text-gray-800 truncate w-full text-center font-medium'>
                    {hanzi.sound}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 미리보기 버튼 */}
          <button
            onClick={handlePreview}
            disabled={selectedHanziIds.size === 0}
            className='w-full bg-purple-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed'
          >
            {selectedHanziIds.size === 0
              ? "한자를 선택하세요"
              : `${selectedHanziIds.size}개 한자 연습지 생성하기`}
          </button>
        </div>
      </main>
    </div>
  )
}

// 워크시트 그리드 컴포넌트 (10x10)
function WorksheetGrid({
  hanzi,
  pageNumber,
}: {
  hanzi: Hanzi
  pageNumber: number
}) {
  return (
    <div className='w-full h-full flex flex-col'>
      {/* 헤더 */}
      <div className='flex justify-between items-center mb-2 px-2'>
        <div className='text-sm text-gray-600'>한자 쓰기 연습</div>
        <div className='text-sm text-gray-600'>페이지 {pageNumber}</div>
      </div>

      {/* 7x8 그리드 - 절대 위치로 벌집 모양 */}
      <div className='flex-1 overflow-hidden relative'>
        {Array.from({ length: 56 }).map((_, index) => {
          const row = Math.floor(index / 7)
          const col = index % 7
          const cellWidth = 100 / 7 // 7열이므로 각 칸은 100/7%
          const cellHeight = 100 / 8 // 8행이므로 각 칸은 100/8%

          return (
            <div
              key={index}
              className='border border-gray-300 absolute flex flex-col'
              style={{
                left: `${col * cellWidth}%`,
                top: `${row * cellHeight}%`,
                width: `${cellWidth}%`,
                height: `${cellHeight}%`,
                margin: "0",
                padding: "0",
                boxSizing: "border-box",
              }}
            >
              {/* 상단: 한자 (연한 회색) */}
              <div className='flex-1 flex items-center justify-center relative border-b border-gray-200 min-h-0'>
                {/* 십자선 */}
                <div className='absolute inset-0'>
                  <div className='absolute top-1/2 left-0 right-0 h-px bg-gray-200'></div>
                  <div className='absolute left-1/2 top-0 bottom-0 w-px bg-gray-200'></div>
                </div>
                <div
                  className='font-serif text-center hanzi-text'
                  style={{
                    fontSize: "clamp(32px, 8vw, 48px)", // 한자 크기 증가
                    lineHeight: "1",
                    color: "#d0d0d0", // 미리보기에서는 조금 더 진하게
                  }}
                >
                  {hanzi.character}
                </div>
              </div>

              {/* 하단: 뜻과 음 공간 (모든 칸에 공간 제공) */}
              <div
                className='flex items-center justify-center text-center px-1 meaning-text'
                style={{
                  fontSize: (() => {
                    // 첫 번째 칸에만 실제 텍스트 표시
                    if (row === 0 && col === 0) {
                      const text = `${hanzi.meaning} ${hanzi.sound}`
                      const length = text.length
                      if (length <= 7) return "16px"
                      if (length <= 10) return "14px"
                      return "12px"
                    }
                    // 나머지 칸은 기본 크기
                    return "12px"
                  })(),
                  height: "25%",
                  lineHeight: "1",
                  color: "#c0c0c0", // 미리보기에서는 조금 더 진하게
                }}
              >
                {/* 첫 번째 칸에만 실제 텍스트 표시, 나머지는 빈 공간 */}
                {row === 0 && col === 0
                  ? `${hanzi.meaning} ${hanzi.sound}`
                  : ""}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
