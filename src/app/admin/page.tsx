"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { ApiClient } from "@/lib/apiClient"
import { Hanzi } from "@/types"
import LoadingSpinner from "@/components/LoadingSpinner"
import ConfirmModal from "@/components/ConfirmModal"
import { ensureStrokeOrder } from "@/lib/hanziWriter"
import { Plus, Edit, Trash2, Save, X, Upload, Download } from "lucide-react"

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const [hanziList, setHanziList] = useState<Hanzi[]>([])
  const [selectedGrade, setSelectedGrade] = useState<number>(8)
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingHanzi, setEditingHanzi] = useState<Hanzi | null>(null)
  const [deletingHanzi, setDeletingHanzi] = useState<Hanzi | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  // 페이지 로드 시 데이터 자동 로드
  useEffect(() => {
    if (user && user.isAdmin) {
      loadHanziData()
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

  // 인증이 완료되었지만 관리자가 아닐 때
  if (!user || !user.isAdmin) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-gray-900 mb-4'>
            관리자 권한이 필요합니다
          </h1>
          <Link href='/' className='text-blue-600 hover:text-blue-700'>
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  // 한자 데이터 로드
  const loadHanziData = async () => {
    setIsLoading(true)
    try {
      console.log(`Loading hanzi data for grade: ${selectedGrade}`)
      const data = await ApiClient.getHanziByGrade(selectedGrade)
      console.log(`Loaded ${data.length} hanzi characters`)
      setHanziList(data)
    } catch (error) {
      console.error("한자 데이터 로드 에러:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // JSON 파일 업로드 처리
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === "application/json") {
      setUploadedFile(file)
    } else {
      alert("JSON 파일만 업로드 가능합니다.")
    }
  }

  // JSON 파일에서 한자 데이터 가져오기
  const processUploadedFile = async () => {
    if (!uploadedFile) return

    try {
      const text = await uploadedFile.text()
      const data = JSON.parse(text)

      if (Array.isArray(data)) {
        // 현재 등급의 기존 한자 데이터 가져오기
        const existingHanzi = await ApiClient.getHanziByGrade(selectedGrade)
        const existingCharacters = new Set(
          existingHanzi.map((h) => h.character)
        )

        // 배열 형태의 JSON 처리
        let successCount = 0
        let duplicateCount = 0
        let errorCount = 0

        for (const hanziData of data) {
          try {
            // 중복 체크
            if (existingCharacters.has(hanziData.character)) {
              console.log(`중복된 한자 건너뛰기: ${hanziData.character}`)
              duplicateCount++
              continue
            }

            await ApiClient.createDocument("hanzi", {
              character: hanziData.character,
              meaning: hanziData.meaning,
              sound: hanziData.sound || hanziData.pinyin,
              pinyin: hanziData.pinyin,
              grade: hanziData.grade || selectedGrade,
              strokes: hanziData.strokes || 0,
              radicals: hanziData.radicals || [],
              relatedWords: hanziData.relatedWords || [],
              strokeOrder: hanziData.strokeOrder || [],
              difficulty: hanziData.difficulty || "easy",
              frequency: hanziData.frequency || 1,
              notes: hanziData.notes || "",
            })
            successCount++
            existingCharacters.add(hanziData.character) // 새로 추가된 한자도 중복 체크에 포함
          } catch (error) {
            console.error(`한자 ${hanziData.character} 등록 실패:`, error)
            errorCount++
          }
        }

        let message = `${successCount}개의 한자가 성공적으로 등록되었습니다.`
        if (duplicateCount > 0) {
          message += `\n${duplicateCount}개의 중복 한자는 건너뛰었습니다.`
        }
        if (errorCount > 0) {
          message += `\n${errorCount}개의 한자 등록에 실패했습니다.`
        }

        alert(message)
        setUploadedFile(null)
        loadHanziData()
      } else {
        alert("JSON 파일 형식이 올바르지 않습니다. 배열 형태여야 합니다.")
      }
    } catch (error) {
      console.error("파일 처리 에러:", error)
      alert("파일 처리 중 오류가 발생했습니다.")
    }
  }

  // 한자 수정
  const updateHanzi = async () => {
    if (!editingHanzi) return

    try {
      await ApiClient.updateDocument("hanzi", editingHanzi.id, {
        character: editingHanzi.character,
        meaning: editingHanzi.meaning,
        sound: editingHanzi.sound,
        pinyin: editingHanzi.pinyin,
        grade: editingHanzi.grade,
        strokes: editingHanzi.strokes,
        radicals: editingHanzi.radicals.filter((r) => r.trim() !== ""),
        relatedWords:
          editingHanzi.relatedWords?.filter(
            (w) => w.hanzi.trim() !== "" && w.korean.trim() !== ""
          ) || [],
        strokeOrder: editingHanzi.strokeOrder || [],
        difficulty: editingHanzi.difficulty || "easy",
        frequency: editingHanzi.frequency || 1,
        notes: editingHanzi.notes || "",
      })

      setEditingHanzi(null)
      loadHanziData()
    } catch (error) {
      console.error("한자 수정 에러:", error)
      alert("한자 수정에 실패했습니다.")
    }
  }

  // 한자 삭제
  const deleteHanzi = async () => {
    if (!deletingHanzi) return

    try {
      await ApiClient.deleteDocument("hanzi", deletingHanzi.id)
      setDeletingHanzi(null)
      loadHanziData()
    } catch (error) {
      console.error("한자 삭제 에러:", error)
      alert("한자 삭제에 실패했습니다.")
    }
  }

  // 등급 변경 시 데이터 로드
  const handleGradeChange = (grade: number) => {
    setSelectedGrade(grade)
    loadHanziData()
  }

  // 현재 등급의 모든 한자에 stroke order 생성
  const generateStrokeOrdersForGrade = async () => {
    if (!hanziList.length) {
      alert("생성할 한자가 없습니다.")
      return
    }

    setIsLoading(true)
    let successCount = 0
    let errorCount = 0

    try {
      for (const hanzi of hanziList) {
        try {
          await ensureStrokeOrder(hanzi)
          successCount++
        } catch (error) {
          console.error(`Stroke order 생성 실패: ${hanzi.character}`, error)
          errorCount++
        }
      }

      let message = `${successCount}개의 한자에 stroke order가 생성되었습니다.`
      if (errorCount > 0) {
        message += `\n${errorCount}개의 한자 생성에 실패했습니다.`
      }

      alert(message)
      loadHanziData() // 목록 새로고침
    } catch (error) {
      console.error("Stroke order 일괄 생성 실패:", error)
      alert("Stroke order 생성 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* 헤더 */}
      <header className='bg-white shadow-sm'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-4'>
            <h1 className='text-2xl font-bold text-gray-900'>관리자 페이지</h1>
            <Link href='/' className='text-blue-600 hover:text-blue-700'>
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='space-y-8'>
          {/* 등급 선택 */}
          <div className='bg-white rounded-lg shadow-sm p-6'>
            <div className='flex justify-between items-center mb-4'>
              <h2 className='text-lg font-semibold text-gray-900'>등급 선택</h2>
              <button
                onClick={generateStrokeOrdersForGrade}
                disabled={isLoading || hanziList.length === 0}
                className='flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50'
              >
                <Download className='h-4 w-4' />
                <span>Stroke Order 생성</span>
              </button>
            </div>
            <div className='flex flex-wrap gap-2'>
              {[8, 7, 6].map((grade) => (
                <button
                  key={grade}
                  onClick={() => handleGradeChange(grade)}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    selectedGrade === grade
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                  }`}
                >
                  {grade}급
                </button>
              ))}
              <button
                onClick={() => handleGradeChange(5.5)}
                className={`px-4 py-2 rounded-md transition-colors ${
                  selectedGrade === 5.5
                    ? "bg-green-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                }`}
              >
                준5급
              </button>
              <button
                onClick={() => handleGradeChange(5)}
                className={`px-4 py-2 rounded-md transition-colors ${
                  selectedGrade === 5
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                }`}
              >
                5급
              </button>
              <button
                onClick={() => handleGradeChange(4.5)}
                className={`px-4 py-2 rounded-md transition-colors ${
                  selectedGrade === 4.5
                    ? "bg-green-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                }`}
              >
                준4급
              </button>
              <button
                onClick={() => handleGradeChange(4)}
                className={`px-4 py-2 rounded-md transition-colors ${
                  selectedGrade === 4
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                }`}
              >
                4급
              </button>
              <button
                onClick={() => handleGradeChange(3.5)}
                className={`px-4 py-2 rounded-md transition-colors ${
                  selectedGrade === 3.5
                    ? "bg-green-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                }`}
              >
                준3급
              </button>
              <button
                onClick={() => handleGradeChange(3)}
                className={`px-4 py-2 rounded-md transition-colors ${
                  selectedGrade === 3
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                }`}
              >
                3급
              </button>
            </div>
          </div>

          {/* JSON 파일 업로드 */}
          <div className='bg-white rounded-lg shadow-sm p-6'>
            <h2 className='text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2'>
              <Upload className='h-5 w-5' />
              <span>JSON 파일로 한자 일괄 등록</span>
            </h2>
            <div className='space-y-4'>
              <div className='flex items-center space-x-4'>
                <input
                  type='file'
                  accept='.json'
                  onChange={handleFileUpload}
                  className='block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100'
                />
                {uploadedFile && (
                  <button
                    onClick={processUploadedFile}
                    className='flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors'
                  >
                    <Upload className='h-4 w-4' />
                    <span>업로드</span>
                  </button>
                )}
              </div>
              <div className='text-sm text-gray-600'>
                <p>JSON 파일 형식 예시:</p>
                <pre className='bg-gray-100 p-2 rounded text-xs mt-2 overflow-x-auto'>
                  {`[
  {
    "character": "火",
    "meaning": "불",
    "sound": "화",
    "pinyin": "huǒ",
    "grade": 8,
    "strokes": 4,
    "radicals": ["火"],
    "relatedWords": [
      {"hanzi": "火事", "korean": "화재"},
      {"hanzi": "火山", "korean": "화산"},
      {"hanzi": "火災", "korean": "화재"}
    ],
    "strokeOrder": ["1", "2", "3", "4"],
    "difficulty": "easy",
    "frequency": 1,
    "notes": "기본 한자"
  }
]`}
                </pre>
                <p className='mt-2 text-blue-600'>
                  💡 등급이 일치하는 기존 데이터에 누적 등록됩니다.
                </p>
              </div>
            </div>
          </div>

          {/* 한자 목록 */}
          <div className='bg-white rounded-lg shadow-sm'>
            <div className='px-6 py-4 border-b'>
              <h2 className='text-lg font-semibold text-gray-900'>
                {selectedGrade}급 한자 목록 ({hanziList.length}개)
              </h2>
            </div>

            {isLoading ? (
              <div className='p-8'>
                <LoadingSpinner message='한자 데이터를 불러오는 중...' />
              </div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='min-w-full divide-y divide-gray-200'>
                  <thead className='bg-gray-50'>
                    <tr>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        한자
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        음
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        의미
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        획수
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        난이도
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Stroke Order
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className='bg-white divide-y divide-gray-200'>
                    {hanziList.map((hanzi) => (
                      <tr key={hanzi.id}>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>
                          {hanzi.character}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                          {hanzi.sound}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                          {hanzi.meaning}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                          {hanzi.strokes}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              hanzi.difficulty === "easy"
                                ? "bg-green-100 text-green-800"
                                : hanzi.difficulty === "medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {hanzi.difficulty === "easy"
                              ? "쉬움"
                              : hanzi.difficulty === "medium"
                              ? "보통"
                              : "어려움"}
                          </span>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                          {hanzi.strokeOrder && hanzi.strokeOrder.length > 0 ? (
                            <span className='px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800'>
                              생성됨
                            </span>
                          ) : (
                            <span className='px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800'>
                              미생성
                            </span>
                          )}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-medium'>
                          <div className='flex space-x-2'>
                            <button
                              onClick={() => setEditingHanzi(hanzi)}
                              className='text-blue-600 hover:text-blue-900'
                            >
                              <Edit className='h-4 w-4' />
                            </button>
                            <button
                              onClick={() => setDeletingHanzi(hanzi)}
                              className='text-red-600 hover:text-red-900'
                            >
                              <Trash2 className='h-4 w-4' />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 수정 모달 */}
      {editingHanzi && (
        <div className='fixed inset-0 z-50 flex items-center justify-center'>
          <div
            className='absolute inset-0 bg-black bg-opacity-50'
            onClick={() => setEditingHanzi(null)}
          />
          <div className='relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>
              한자 수정
            </h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <input
                type='text'
                placeholder='한자'
                value={editingHanzi.character}
                onChange={(e) =>
                  setEditingHanzi({
                    ...editingHanzi,
                    character: e.target.value,
                  })
                }
                className='w-full px-3 py-2 border border-gray-300 rounded-md'
              />
              <input
                type='text'
                placeholder='음'
                value={editingHanzi.sound}
                onChange={(e) =>
                  setEditingHanzi({ ...editingHanzi, sound: e.target.value })
                }
                className='w-full px-3 py-2 border border-gray-300 rounded-md'
              />
              <input
                type='text'
                placeholder='의미'
                value={editingHanzi.meaning}
                onChange={(e) =>
                  setEditingHanzi({ ...editingHanzi, meaning: e.target.value })
                }
                className='w-full px-3 py-2 border border-gray-300 rounded-md'
              />
              <input
                type='number'
                placeholder='획수'
                value={editingHanzi.strokes}
                onChange={(e) =>
                  setEditingHanzi({
                    ...editingHanzi,
                    strokes: parseInt(e.target.value) || 0,
                  })
                }
                className='w-full px-3 py-2 border border-gray-300 rounded-md'
              />
              <input
                type='number'
                placeholder='등급'
                value={editingHanzi.grade}
                onChange={(e) =>
                  setEditingHanzi({
                    ...editingHanzi,
                    grade: parseInt(e.target.value) || 8,
                  })
                }
                min='3'
                max='8'
                className='w-full px-3 py-2 border border-gray-300 rounded-md'
              />
              <select
                value={editingHanzi.difficulty || "easy"}
                onChange={(e) =>
                  setEditingHanzi({
                    ...editingHanzi,
                    difficulty: e.target.value as "easy" | "medium" | "hard",
                  })
                }
                className='w-full px-3 py-2 border border-gray-300 rounded-md'
              >
                <option value='easy'>쉬움</option>
                <option value='medium'>보통</option>
                <option value='hard'>어려움</option>
              </select>
              <input
                type='number'
                placeholder='빈도'
                value={editingHanzi.frequency || 1}
                onChange={(e) =>
                  setEditingHanzi({
                    ...editingHanzi,
                    frequency: parseInt(e.target.value) || 1,
                  })
                }
                min='1'
                max='5'
                className='w-full px-3 py-2 border border-gray-300 rounded-md'
              />
              <input
                type='text'
                placeholder='메모'
                value={editingHanzi.notes || ""}
                onChange={(e) =>
                  setEditingHanzi({ ...editingHanzi, notes: e.target.value })
                }
                className='w-full px-3 py-2 border border-gray-300 rounded-md'
              />
            </div>
            <div className='flex justify-end space-x-3 mt-6'>
              <button
                onClick={() => setEditingHanzi(null)}
                className='px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md'
              >
                취소
              </button>
              <button
                onClick={updateHanzi}
                className='flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'
              >
                <Save className='h-4 w-4' />
                <span>저장</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={!!deletingHanzi}
        onClose={() => setDeletingHanzi(null)}
        onConfirm={deleteHanzi}
        title='한자 삭제'
        message={`"${deletingHanzi?.character}" 한자를 삭제하시겠습니까?`}
        confirmText='삭제'
        cancelText='취소'
        type='warning'
      />
    </div>
  )
}
