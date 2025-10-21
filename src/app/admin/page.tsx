"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { ApiClient } from "@/lib/apiClient"
import { Hanzi } from "@/types"
import LoadingSpinner from "@/components/LoadingSpinner"
import { ensureStrokeOrder } from "@/lib/hanziWriter"
import {
  Edit,
  Trash2,
  Upload,
  Download,
  MessageSquare,
  ImageIcon,
} from "lucide-react"
import { migrateAllUsers, migrateUserData } from "@/lib/migration"

export default function AdminPage() {
  const { user, loading: authLoading, initialLoading } = useAuth()
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [selectedGrade, setSelectedGrade] = useState<number>(8)
  const [hanziData, setHanziData] = useState<Hanzi[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [editingHanzi, setEditingHanzi] = useState<Hanzi | null>(null)
  const [deletingHanzi, setDeletingHanzi] = useState<Hanzi | null>(null)
  const [migrationStatus, setMigrationStatus] = useState<string>("")
  const [isMigrating, setIsMigrating] = useState(false)
  const [showDeleteGradeModal, setShowDeleteGradeModal] = useState(false)
  const [deleteGrade, setDeleteGrade] = useState<number>(8)
  const [isDeletingGrade, setIsDeletingGrade] = useState(false)
  const [showEmptyGradeModal, setShowEmptyGradeModal] = useState(false)
  const [emptyGrade, setEmptyGrade] = useState<number>(8)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)

  // 페이지 로드 시 데이터 자동 로드
  useEffect(() => {
    if (user && user.isAdmin) {
      loadHanziData()
    }
  }, [user, selectedGrade])

  // 로딩 중일 때는 로딩 스피너 표시 (진짜 초기 로딩만)
  if (initialLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <LoadingSpinner message='인증 상태를 확인하는 중...' />
      </div>
    )
  }

  // 인증이 완료되었지만 관리자가 아닐 때 (즉시 표시, 로딩 없음)
  if (user && !user.isAdmin) {
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
      const data = await ApiClient.getHanziByGrade(selectedGrade)

      if (data.length === 0) {
        // 한자가 없는 경우 모달 표시
        setEmptyGrade(selectedGrade)
        setShowEmptyGradeModal(true)
      }

      setHanziData(data)
    } catch (error) {
      console.error("한자 데이터 로드 에러:", error)
      // 오류가 발생해도 빈 배열로 설정하여 UI가 깨지지 않도록 함
      setHanziData([])
      // 사용자에게는 조용히 처리하고 콘솔에만 로그 출력
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
      const data = JSON.parse(text) as Array<{
        character: string
        meaning: string
        sound: string
        pinyin?: string
        grade: number
        strokes?: number
        radicals?: string[]
        relatedWords?: Array<{
          hanzi: string
          korean: string
          isTextBook?: boolean
        }>
        strokeOrder?: string[]
        difficulty?: string
        frequency?: number
        notes?: string
        gradeNumber?: number
      }>

      if (Array.isArray(data)) {
        // JSON 파일의 첫 번째 항목에서 grade 확인
        const jsonGrade = data[0]?.grade
        if (!jsonGrade) {
          alert("JSON 파일에 grade 정보가 없습니다.")
          return
        }

        // JSON 파일의 grade에 해당하는 기존 한자 데이터 가져오기
        const existingHanzi = await ApiClient.getHanziByGrade(jsonGrade)
        const existingCharacters = new Set(
          existingHanzi.map((h) => h.character)
        )

        // 배열 형태의 JSON 처리
        let successCount = 0
        let duplicateCount = 0
        let errorCount = 0

        for (const hanziData of data) {
          try {
            // 필수 필드 확인
            if (
              hanziData.character &&
              hanziData.meaning &&
              hanziData.sound &&
              hanziData.grade
            ) {
              // 중복 확인 (JSON 파일의 grade 기준)
              if (existingCharacters.has(hanziData.character)) {
                duplicateCount++
                continue
              }

              // 한자 데이터 생성
              await ApiClient.createDocument("hanzi", {
                character: hanziData.character,
                meaning: hanziData.meaning,
                sound: hanziData.sound,
                pinyin: hanziData.pinyin || "",
                grade: hanziData.grade,
                gradeNumber: hanziData.gradeNumber || 0,
                strokes: hanziData.strokes || 0,
                radicals: hanziData.radicals || [],
                relatedWords:
                  hanziData.relatedWords?.map(
                    (word: {
                      hanzi: string
                      korean: string
                      isTextBook?: boolean
                    }) => ({
                      hanzi: word.hanzi,
                      korean: word.korean,
                      isTextBook: word.isTextBook || false,
                    })
                  ) || [],
                strokeOrder: hanziData.strokeOrder || [],
                difficulty: hanziData.difficulty || "medium",
                frequency: hanziData.frequency || 0,
                notes: hanziData.notes || "",
              })

              successCount++
              existingCharacters.add(hanziData.character)
            } else {
              errorCount++
            }
          } catch (error) {
            console.error("한자 데이터 처리 에러:", error)
            errorCount++
          }
        }

        alert(
          `업로드 완료!\n성공: ${successCount}개\n중복: ${duplicateCount}개\n오류: ${errorCount}개\n업로드된 급수: ${jsonGrade}급`
        )

        // 데이터 새로고침 (JSON 파일의 grade로 설정)
        setSelectedGrade(jsonGrade)
        loadHanziData()
        setUploadedFile(null)
      } else {
        alert("올바른 JSON 형식이 아닙니다.")
      }
    } catch (error) {
      console.error("파일 처리 에러:", error)
      alert("파일 처리 중 오류가 발생했습니다.")
    }
  }

  // 전체 사용자 마이그레이션
  const handleMigrateAllUsers = async () => {
    if (
      !confirm(
        "모든 사용자의 데이터를 새로운 구조로 마이그레이션하시겠습니까? 이 작업은 되돌릴 수 없습니다."
      )
    ) {
      return
    }

    setIsMigrating(true)
    setMigrationStatus("마이그레이션을 시작합니다...")

    try {
      const result = await migrateAllUsers()
      setMigrationStatus(result.message)

      if (result.success) {
        alert("마이그레이션이 성공적으로 완료되었습니다!")
      } else {
        alert("마이그레이션 중 오류가 발생했습니다.")
      }
    } catch (error) {
      console.error("마이그레이션 실패:", error)
      setMigrationStatus("마이그레이션 중 오류가 발생했습니다.")
      alert("마이그레이션 중 오류가 발생했습니다.")
    } finally {
      setIsMigrating(false)
    }
  }

  // 특정 사용자 마이그레이션
  const handleMigrateUser = async (userId: string) => {
    setIsMigrating(true)
    setMigrationStatus(`${userId} 사용자 마이그레이션 중...`)

    try {
      const result = await migrateUserData(userId)
      setMigrationStatus(result.message)

      if (result.success) {
        alert("사용자 마이그레이션이 완료되었습니다!")
      } else {
        alert("사용자 마이그레이션 중 오류가 발생했습니다.")
      }
    } catch (error) {
      console.error("사용자 마이그레이션 실패:", error)
      setMigrationStatus("사용자 마이그레이션 중 오류가 발생했습니다.")
      alert("사용자 마이그레이션 중 오류가 발생했습니다.")
    } finally {
      setIsMigrating(false)
    }
  }

  // 한자 수정
  const updateHanzi = async () => {
    if (!editingHanzi) return

    try {
      const updatedHanzi = {
        ...editingHanzi,
        updatedAt: new Date().toISOString(),
      }

      await ApiClient.updateDocument("hanzi", editingHanzi.id, updatedHanzi)

      alert("한자가 성공적으로 수정되었습니다!")
      setShowEditModal(false)
      setEditingHanzi(null)
      loadHanziData()
    } catch (error) {
      console.error("한자 수정 실패:", error)
      alert("한자 수정 중 오류가 발생했습니다.")
    }
  }

  // 삭제 확인 모달 열기
  const handleDeleteClick = (hanzi: Hanzi) => {
    setDeletingHanzi(hanzi)
    setShowDeleteConfirmModal(true)
  }

  // 한자 삭제 실행
  const confirmDeleteHanzi = async () => {
    if (!deletingHanzi) return

    try {
      await ApiClient.deleteDocument("hanzi", deletingHanzi.id)
      alert("한자가 성공적으로 삭제되었습니다!")
      setShowDeleteConfirmModal(false)
      setDeletingHanzi(null)
      loadHanziData()
    } catch (error) {
      console.error("한자 삭제 실패:", error)
      alert("한자 삭제 중 오류가 발생했습니다.")
    }
  }

  // 수정 모달 열기
  const handleEditClick = (hanzi: Hanzi) => {
    setEditingHanzi({ ...hanzi })
    setShowEditModal(true)
  }

  // RelatedWord 추가
  const addRelatedWord = () => {
    if (!editingHanzi) return

    const newRelatedWords = [
      ...(editingHanzi.relatedWords || []),
      { hanzi: "", korean: "", isTextBook: false },
    ]

    setEditingHanzi({
      ...editingHanzi,
      relatedWords: newRelatedWords,
    })
  }

  // RelatedWord 제거
  const removeRelatedWord = (index: number) => {
    if (!editingHanzi) return

    const newRelatedWords =
      editingHanzi.relatedWords?.filter((_, i) => i !== index) || []

    setEditingHanzi({
      ...editingHanzi,
      relatedWords: newRelatedWords,
    })
  }

  // RelatedWord 업데이트
  const updateRelatedWord = (
    index: number,
    field: string,
    value: string | boolean
  ) => {
    if (!editingHanzi) return

    const newRelatedWords = [...(editingHanzi.relatedWords || [])]
    newRelatedWords[index] = {
      ...newRelatedWords[index],
      [field]: value,
    }

    setEditingHanzi({
      ...editingHanzi,
      relatedWords: newRelatedWords,
    })
  }

  // 특정 급수 삭제
  const deleteGradeHanzi = async () => {
    if (
      !confirm(
        `정말로 ${deleteGrade}급 한자들을 모두 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
      )
    ) {
      return
    }

    setIsDeletingGrade(true)
    try {
      // 해당 급수의 모든 한자 가져오기
      const gradeHanzi = await ApiClient.getHanziByGrade(deleteGrade)

      if (gradeHanzi.length === 0) {
        alert(`${deleteGrade}급 한자가 없습니다.`)
        return
      }

      // 배치 삭제
      const batch = await ApiClient.deleteGradeHanzi(deleteGrade)

      alert(`${deleteGrade}급 한자 ${gradeHanzi.length}개가 삭제되었습니다.`)
      setShowDeleteGradeModal(false)

      // 현재 선택된 급수가 삭제된 급수라면 데이터 새로고침
      if (selectedGrade === deleteGrade) {
        loadHanziData()
      }
    } catch (error) {
      console.error("급수 삭제 에러:", error)
      alert("급수 삭제에 실패했습니다.")
    } finally {
      setIsDeletingGrade(false)
    }
  }

  // 등급 변경 시 데이터 로드
  const handleGradeChange = (grade: number) => {
    setSelectedGrade(grade)
    loadHanziData()
  }

  // 현재 등급의 모든 한자에 stroke order 생성
  const generateStrokeOrdersForGrade = async () => {
    if (!hanziData.length) {
      alert("생성할 한자가 없습니다.")
      return
    }

    setIsLoading(true)
    let successCount = 0
    let errorCount = 0

    try {
      for (const hanzi of hanziData) {
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
          {/* 관리 도구 */}
          <div className='bg-white rounded-lg shadow-sm p-6'>
            <h2 className='text-lg font-semibold text-gray-900 mb-4'>
              관리 도구
            </h2>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
              <button
                onClick={generateStrokeOrdersForGrade}
                disabled={isLoading || hanziData.length === 0}
                className='flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50'
              >
                <Download className='h-4 w-4' />
                <span>Stroke Order 생성</span>
              </button>
              <button
                onClick={() => setShowDeleteGradeModal(true)}
                className='flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors'
              >
                <Trash2 className='h-4 w-4' />
                <span>급수 삭제</span>
              </button>
            </div>
          </div>

          {/* 쓰기 갤러리 관리 */}
          <div className='bg-white rounded-lg shadow-sm p-6'>
            <h2 className='text-lg font-semibold text-gray-900 mb-4'>
              쓰기 갤러리 관리
            </h2>
            <p className='text-sm text-gray-600 mb-4'>
              사용자들이 업로드한 한자 쓰기 이미지를 검토하고 경험치를 조정할 수
              있습니다.
            </p>
            <Link
              href='/admin/writing-gallery'
              className='inline-flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors'
            >
              <ImageIcon className='h-4 w-4' />
              <span>쓰기 갤러리 관리</span>
            </Link>
          </div>

          {/* 고객 피드백 관리 */}
          <div className='bg-white rounded-lg shadow-sm p-6'>
            <h2 className='text-lg font-semibold text-gray-900 mb-4'>
              고객 피드백 관리
            </h2>
            <p className='text-sm text-gray-600 mb-4'>
              고객이 등록한 피드백을 확인하고 관리할 수 있습니다.
            </p>
            <Link
              href='/admin/feedback'
              className='inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
            >
              <MessageSquare className='h-4 w-4' />
              <span>피드백 관리</span>
            </Link>
          </div>

          {/* 등급 선택 */}
          <div className='bg-white rounded-lg shadow-sm p-6'>
            <h2 className='text-lg font-semibold text-gray-900 mb-4'>
              등급 선택
            </h2>
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
          <div
            id='json-upload-section'
            className='bg-white rounded-lg shadow-sm p-6'
          >
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
    "gradeNumber": 1,
    "character": "九",
    "pinyin": "jiǔ",
    "meaning": "아홉",
    "sound": "구",
    "grade": 8,
    "strokes": 2,
    "radicals": ["乙"],
    "relatedWords": [
      { "hanzi": "九月", "korean": "구월", "isTextBook": false }
    ],
    "strokeOrder": [],
    "difficulty": "easy",
    "frequency": 1,
    "notes": "한국한자실력평가원 8급 선정한자"
  }
]`}
                </pre>
                <p className='mt-2 text-blue-600'>
                  💡 등급이 일치하는 기존 데이터에 누적 등록됩니다.
                </p>
              </div>
            </div>
          </div>

          {/* 고객 피드백 관리 */}
          <div className='bg-white rounded-lg shadow-sm p-6'>
            <h2 className='text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2'>
              <MessageSquare className='h-5 w-5' />
              <span>고객 피드백 관리</span>
            </h2>
            <div className='space-y-4'>
              <p className='text-sm text-gray-600'>
                고객이 등록한 피드백을 확인하고 관리할 수 있습니다.
              </p>
              <Link
                href='/admin/feedback'
                className='inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors'
              >
                <MessageSquare className='h-4 w-4' />
                <span>피드백 목록 보기</span>
              </Link>
            </div>
          </div>

          {/* 데이터 마이그레이션 */}
          <div className='bg-white rounded-lg shadow-sm p-6'>
            <h2 className='text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2'>
              <Download className='h-5 w-5' />
              <span>데이터 마이그레이션</span>
            </h2>
            <div className='space-y-4'>
              <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
                <h3 className='text-sm font-semibold text-yellow-800 mb-2'>
                  ⚠️ 주의사항
                </h3>
                <p className='text-sm text-yellow-700'>
                  이 작업은 기존 사용자 데이터를 새로운 구조로
                  마이그레이션합니다. 마이그레이션 후에는 기존 데이터가 새로운
                  컬렉션으로 분리됩니다.
                </p>
              </div>

              <div className='flex space-x-4'>
                <button
                  onClick={handleMigrateAllUsers}
                  disabled={isMigrating}
                  className='flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  <Download className='h-4 w-4' />
                  <span>전체 사용자 마이그레이션</span>
                </button>
              </div>

              {migrationStatus && (
                <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
                  <p className='text-sm text-blue-700'>{migrationStatus}</p>
                </div>
              )}

              {isMigrating && (
                <div className='flex items-center space-x-2'>
                  <LoadingSpinner message='' />
                  <span className='text-sm text-gray-600'>
                    마이그레이션 중...
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 한자 목록 */}
          <div className='bg-white rounded-lg shadow-sm'>
            <div className='px-6 py-4 border-b'>
              <h2 className='text-lg font-semibold text-gray-900'>
                {selectedGrade}급 한자 목록 ({hanziData.length}개)
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
                        번호
                      </th>
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
                    {hanziData.map((hanzi) => (
                      <tr key={hanzi.id}>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>
                          {hanzi.gradeNumber || "미설정"}
                        </td>
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
                              onClick={() => handleEditClick(hanzi)}
                              className='text-blue-600 hover:text-blue-900'
                            >
                              <Edit className='h-4 w-4' />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(hanzi)}
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

      {/* 삭제 확인 모달 */}
      {showDeleteConfirmModal && deletingHanzi && (
        <div className='fixed inset-0 z-50 flex items-center justify-center'>
          <div
            className='absolute inset-0 bg-black bg-opacity-50'
            onClick={() => {
              setDeletingHanzi(null)
              setShowDeleteConfirmModal(false)
            }}
          />
          <div className='relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6'>
            <div className='text-center'>
              <div className='text-red-500 text-4xl mb-4'>⚠️</div>
              <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                한자 삭제
              </h3>
              <p className='text-gray-700 mb-4'>
                "{deletingHanzi.character}" ({deletingHanzi.meaning}) 한자를
                정말로 삭제하시겠습니까?
              </p>
              <p className='text-sm text-red-600 mb-6'>
                이 작업은 되돌릴 수 없습니다.
              </p>
              <div className='flex space-x-3'>
                <button
                  onClick={() => {
                    setDeletingHanzi(null)
                    setShowDeleteConfirmModal(false)
                  }}
                  className='flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md'
                >
                  취소
                </button>
                <button
                  onClick={confirmDeleteHanzi}
                  className='flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700'
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 급수 삭제 모달 */}
      {showDeleteGradeModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center'>
          <div
            className='absolute inset-0'
            style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
            onClick={() => setShowDeleteGradeModal(false)}
          />
          <div className='relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6'>
            <div className='text-center'>
              <div className='text-red-500 text-4xl mb-4'>⚠️</div>
              <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                급수 삭제
              </h3>
              <p className='text-gray-700 mb-4'>
                삭제할 급수를 선택하세요. 이 작업은 되돌릴 수 없습니다.
              </p>

              <select
                value={deleteGrade}
                onChange={(e) => setDeleteGrade(Number(e.target.value))}
                className='w-full px-3 py-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold text-gray-900'
              >
                {[8, 7, 6, 5.5, 5, 4.5, 4, 3.5, 3].map((grade) => {
                  const gradeName =
                    grade === 5.5
                      ? "준5급"
                      : grade === 4.5
                      ? "준4급"
                      : grade === 3.5
                      ? "준3급"
                      : `${grade}급`
                  return (
                    <option key={grade} value={grade}>
                      {gradeName}
                    </option>
                  )
                })}
              </select>

              <div className='flex justify-center space-x-3'>
                <button
                  onClick={() => setShowDeleteGradeModal(false)}
                  className='px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md'
                >
                  취소
                </button>
                <button
                  onClick={deleteGradeHanzi}
                  disabled={isDeletingGrade}
                  className='flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50'
                >
                  <Trash2 className='h-4 w-4' />
                  <span>{isDeletingGrade ? "삭제 중..." : "삭제"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 빈 급수 모달 */}
      {showEmptyGradeModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center'>
          <div
            className='absolute inset-0'
            style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
            onClick={() => setShowEmptyGradeModal(false)}
          />
          <div className='relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6'>
            <div className='text-center'>
              <div className='text-blue-500 text-4xl mb-4'>📝</div>
              <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                등록된 한자가 없습니다
              </h3>
              <p className='text-gray-700 mb-4'>
                {emptyGrade === 5.5
                  ? "준5급"
                  : emptyGrade === 4.5
                  ? "준4급"
                  : emptyGrade === 3.5
                  ? "준3급"
                  : `${emptyGrade}급`}
                에 등록된 한자가 없습니다.
              </p>
              <p className='text-sm text-gray-600 mb-6'>
                JSON 파일을 업로드하여 한자를 등록하거나, 다른 급수를
                선택해보세요.
              </p>
              <button
                onClick={() => setShowEmptyGradeModal(false)}
                className='w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 한자 수정 모달 */}
      {showEditModal && editingHanzi && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div
            className='absolute inset-0 bg-black bg-opacity-50'
            onClick={() => setShowEditModal(false)}
          />
          <div className='relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto'>
            <div className='p-6'>
              <div className='flex justify-between items-center mb-6'>
                <h3 className='text-xl font-semibold text-gray-900'>
                  한자 수정: {editingHanzi.character}
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className='text-gray-500 hover:text-gray-700 text-2xl font-bold'
                >
                  ×
                </button>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                {/* 기본 정보 */}
                <div className='space-y-4'>
                  <h4 className='text-lg font-semibold text-gray-800'>
                    기본 정보
                  </h4>

                  <div>
                    <label className='block text-sm font-semibold text-gray-800 mb-1'>
                      한자
                    </label>
                    <input
                      type='text'
                      value={editingHanzi.character}
                      onChange={(e) =>
                        setEditingHanzi({
                          ...editingHanzi,
                          character: e.target.value,
                        })
                      }
                      className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800'
                    />
                  </div>

                  <div>
                    <label className='block text-sm font-semibold text-gray-800 mb-1'>
                      뜻
                    </label>
                    <input
                      type='text'
                      value={editingHanzi.meaning}
                      onChange={(e) =>
                        setEditingHanzi({
                          ...editingHanzi,
                          meaning: e.target.value,
                        })
                      }
                      className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800'
                    />
                  </div>

                  <div>
                    <label className='block text-sm font-semibold text-gray-800 mb-1'>
                      음
                    </label>
                    <input
                      type='text'
                      value={editingHanzi.sound}
                      onChange={(e) =>
                        setEditingHanzi({
                          ...editingHanzi,
                          sound: e.target.value,
                        })
                      }
                      className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800'
                    />
                  </div>

                  <div>
                    <label className='block text-sm font-semibold text-gray-800 mb-1'>
                      병음 (선택사항)
                    </label>
                    <input
                      type='text'
                      value={editingHanzi.pinyin || ""}
                      onChange={(e) =>
                        setEditingHanzi({
                          ...editingHanzi,
                          pinyin: e.target.value,
                        })
                      }
                      className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800'
                    />
                  </div>

                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-semibold text-gray-800 mb-1'>
                        급수
                      </label>
                      <select
                        value={editingHanzi.grade}
                        onChange={(e) =>
                          setEditingHanzi({
                            ...editingHanzi,
                            grade: Number(e.target.value),
                          })
                        }
                        className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800'
                      >
                        {[8, 7, 6, 5.5, 5, 4.5, 4, 3.5, 3].map((grade) => (
                          <option key={grade} value={grade}>
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

                    <div>
                      <label className='block text-sm font-semibold text-gray-800 mb-1'>
                        급수 내 번호
                      </label>
                      <input
                        type='number'
                        value={editingHanzi.gradeNumber}
                        onChange={(e) =>
                          setEditingHanzi({
                            ...editingHanzi,
                            gradeNumber: Number(e.target.value),
                          })
                        }
                        className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800'
                      />
                    </div>
                  </div>

                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-semibold text-gray-800 mb-1'>
                        획수
                      </label>
                      <input
                        type='number'
                        value={editingHanzi.strokes}
                        onChange={(e) =>
                          setEditingHanzi({
                            ...editingHanzi,
                            strokes: Number(e.target.value),
                          })
                        }
                        className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800'
                      />
                    </div>

                    <div>
                      <label className='block text-sm font-semibold text-gray-800 mb-1'>
                        빈도
                      </label>
                      <input
                        type='number'
                        value={editingHanzi.frequency || 1}
                        onChange={(e) =>
                          setEditingHanzi({
                            ...editingHanzi,
                            frequency: Number(e.target.value),
                          })
                        }
                        className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800'
                      />
                    </div>
                  </div>

                  <div>
                    <label className='block text-sm font-semibold text-gray-800 mb-1'>
                      난이도
                    </label>
                    <select
                      value={editingHanzi.difficulty || "easy"}
                      onChange={(e) =>
                        setEditingHanzi({
                          ...editingHanzi,
                          difficulty: e.target.value as
                            | "easy"
                            | "medium"
                            | "hard",
                        })
                      }
                      className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800'
                    >
                      <option value='easy'>쉬움</option>
                      <option value='medium'>보통</option>
                      <option value='hard'>어려움</option>
                    </select>
                  </div>

                  <div>
                    <label className='block text-sm font-semibold text-gray-800 mb-1'>
                      부수 (쉼표로 구분)
                    </label>
                    <input
                      type='text'
                      value={editingHanzi.radicals.join(", ")}
                      onChange={(e) =>
                        setEditingHanzi({
                          ...editingHanzi,
                          radicals: e.target.value
                            .split(",")
                            .map((r) => r.trim()),
                        })
                      }
                      className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800'
                      placeholder='예: 火, 木'
                    />
                  </div>

                  <div>
                    <label className='block text-sm font-semibold text-gray-800 mb-1'>
                      비고
                    </label>
                    <textarea
                      value={editingHanzi.notes || ""}
                      onChange={(e) =>
                        setEditingHanzi({
                          ...editingHanzi,
                          notes: e.target.value,
                        })
                      }
                      className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800'
                      rows={3}
                    />
                  </div>
                </div>

                {/* 관련 단어 */}
                <div className='space-y-4'>
                  <div className='flex justify-between items-center'>
                    <h4 className='text-lg font-semibold text-gray-800'>
                      관련 단어
                    </h4>
                    <button
                      onClick={addRelatedWord}
                      className='px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium'
                    >
                      + 추가
                    </button>
                  </div>

                  <div className='space-y-3 max-h-96 overflow-y-auto'>
                    {editingHanzi.relatedWords?.map((word, index) => (
                      <div
                        key={index}
                        className='border border-gray-200 rounded-md p-3'
                      >
                        <div className='grid grid-cols-2 gap-2 mb-2'>
                          <div>
                            <label className='block text-xs font-semibold text-gray-800 mb-1'>
                              한자어
                            </label>
                            <input
                              type='text'
                              value={word.hanzi}
                              onChange={(e) =>
                                updateRelatedWord(
                                  index,
                                  "hanzi",
                                  e.target.value
                                )
                              }
                              className='w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800'
                            />
                          </div>
                          <div>
                            <label className='block text-xs font-semibold text-gray-800 mb-1'>
                              한국어
                            </label>
                            <input
                              type='text'
                              value={word.korean}
                              onChange={(e) =>
                                updateRelatedWord(
                                  index,
                                  "korean",
                                  e.target.value
                                )
                              }
                              className='w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800'
                            />
                          </div>
                        </div>
                        <div className='flex justify-between items-center'>
                          <label className='flex items-center'>
                            <input
                              type='checkbox'
                              checked={word.isTextBook}
                              onChange={(e) =>
                                updateRelatedWord(
                                  index,
                                  "isTextBook",
                                  e.target.checked
                                )
                              }
                              className='mr-2'
                            />
                            <span className='text-xs font-medium text-gray-800'>
                              교과서 한자어
                            </span>
                          </label>
                          <button
                            onClick={() => removeRelatedWord(index)}
                            className='text-red-600 hover:text-red-800 text-xs font-medium'
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className='flex justify-end space-x-3 mt-6 pt-6 border-t'>
                <button
                  onClick={() => setShowEditModal(false)}
                  className='px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium'
                >
                  취소
                </button>
                <button
                  onClick={updateHanzi}
                  className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium'
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
