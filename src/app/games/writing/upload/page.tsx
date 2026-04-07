"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Upload, Camera, X, CheckCircle, Search } from "lucide-react"
import Image from "next/image"
import { CustomSelect } from "@/components/ui/CustomSelect"

const WRITING_UPLOAD_GRADE_OPTIONS = [
  { value: "", label: "급수를 선택하세요" },
  { value: "3", label: "3급" },
  { value: "4", label: "4급" },
  { value: "5", label: "5급" },
  { value: "6", label: "6급" },
  { value: "7", label: "7급" },
  { value: "8", label: "8급" },
]

interface Hanzi {
  id: string
  character: string
  meaning: string
  sound: string
  grade: number
  difficulty: string
  frequency: number
}

export default function WritingUploadPage() {
  const { user, initialLoading } = useAuth()
  const { hanziList: dataHanziList } = useData()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // 한자 선택 관련 상태
  const [selectedGrade, setSelectedGrade] = useState<string>("")
  const [hanziList, setHanziList] = useState<Hanzi[]>([])
  const [filteredHanziList, setFilteredHanziList] = useState<Hanzi[]>([])
  const [selectedHanzi, setSelectedHanzi] = useState<Hanzi | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoadingHanzi, setIsLoadingHanzi] = useState(false)
  const [showHanziList, setShowHanziList] = useState(false)

  // 한자 목록 로드
  const loadHanziByGrade = useCallback(async (grade: number, fromIndexedDB = false) => {
    setIsLoadingHanzi(true)
    setError(null)

    try {
      if (fromIndexedDB && dataHanziList.length > 0) {
        // IndexedDB에서 로드 (preferredGrade)
        const gradeHanzi = dataHanziList.filter(
          (hanzi) => hanzi.grade === grade
        )
        setHanziList(
          gradeHanzi.map((hanzi) => ({
            ...hanzi,
            difficulty: hanzi.difficulty || "medium",
            frequency: hanzi.frequency || 0,
          }))
        )
        setFilteredHanziList(
          gradeHanzi.map((hanzi) => ({
            ...hanzi,
            difficulty: hanzi.difficulty || "medium",
            frequency: hanzi.frequency || 0,
          }))
        )
        console.log(
          `📚 IndexedDB에서 ${grade}급 한자 ${gradeHanzi.length}개 로드`
        )
      } else {
        // API에서 로드 (다른 급수)
        const response = await fetch(`/api/hanzi-by-grade?grade=${grade}`)
        const data = await response.json()

        if (data.success) {
          setHanziList(data.hanziList)
          setFilteredHanziList(data.hanziList)
          console.log(
            `📚 API에서 ${grade}급 한자 ${data.hanziList.length}개 로드`
          )
        } else {
          throw new Error(data.error || "한자 목록 로드 실패")
        }
      }
    } catch (err) {
      console.error("한자 로드 오류:", err)
      setError("한자 목록을 불러오는데 실패했습니다")
    } finally {
      setIsLoadingHanzi(false)
    }
  }, [dataHanziList])

  // 컴포넌트 마운트 시 기본 급수 설정
  useEffect(() => {
    if (user?.preferredGrade) {
      setSelectedGrade(user.preferredGrade.toString())
      loadHanziByGrade(user.preferredGrade, true) // IndexedDB에서 로드
    }
  }, [user, loadHanziByGrade])

  // 급수 변경 핸들러
  const handleGradeChange = (grade: string) => {
    setSelectedGrade(grade)
    setSelectedHanzi(null)
    setSearchQuery("")

    const gradeNum = parseInt(grade)
    const isPreferredGrade = user?.preferredGrade === gradeNum

    loadHanziByGrade(gradeNum, isPreferredGrade)
  }

  // 검색 핸들러
  const handleSearch = (query: string) => {
    setSearchQuery(query)

    if (!query.trim()) {
      setFilteredHanziList(hanziList)
      return
    }

    const filtered = hanziList.filter(
      (hanzi) =>
        hanzi.character.includes(query) ||
        hanzi.meaning.includes(query) ||
        hanzi.sound.includes(query)
    )

    setFilteredHanziList(filtered)
  }

  // 한자 선택 핸들러
  const handleHanziSelect = (hanzi: Hanzi) => {
    setSelectedHanzi(hanzi)
    setShowHanziList(false)
    setSearchQuery("")
  }

  // 이미지 선택 핸들러
  const handleImageSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      setError(null)
      setSuccess(null)

      // HEIC/HEIF 파일인지 확인
      const isHeic =
        file.type === "image/heic" ||
        file.type === "image/heif" ||
        file.name.toLowerCase().endsWith(".heic") ||
        file.name.toLowerCase().endsWith(".heif")

      if (isHeic) {
        console.log("🔄 HEIC 파일 감지, heic-to로 클라이언트 변환 시도...")
        try {
          const { heicTo } = await import("heic-to")
          console.log("📦 heic-to 모듈 로딩 완료")

          const convertedBlob = await heicTo({
            blob: file,
            type: "image/jpeg",
            quality: 0.8,
          })

          console.log("🔄 변환된 Blob:", convertedBlob)

          const url = URL.createObjectURL(convertedBlob)
          setPreviewUrl(url)
          console.log("✅ heic-to로 HEIC → JPEG 변환 완료, 미리보기 표시")
        } catch (error) {
          console.error("❌ heic-to 변환 실패:", error)
          console.log("⚠️ 변환 실패, 파일 정보 표시")
          setPreviewUrl("heic-file")
        }
      } else {
        // 일반 이미지 파일
        const url = URL.createObjectURL(file)
        setPreviewUrl(url)
      }
    }
  }

  // 이미지 제거 핸들러
  const handleRemoveImage = () => {
    setSelectedImage(null)
    if (previewUrl && previewUrl !== "heic-file") {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setError(null)
    setSuccess(null)
  }

  // 업로드 핸들러
  const handleUpload = async () => {
    if (!selectedImage) {
      setError("업로드할 이미지를 선택해주세요")
      return
    }

    if (!user) {
      setError("로그인이 필요합니다")
      return
    }

    if (!selectedHanzi) {
      setError("업로드할 한자를 선택해주세요")
      return
    }

    // user.id가 제대로 있는지 확인
    if (!user.id) {
      setError("사용자 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.")
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      console.log("🔍 업로드 정보:", {
        userId: user.id,
        grade: selectedGrade,
        hanziId: selectedHanzi.id,
        character: selectedHanzi.character,
        fileName: selectedImage.name,
      })

      // HEIC 파일인지 확인하고 클라이언트에서 변환
      let fileToUpload = selectedImage
      const isHeic =
        selectedImage.type === "image/heic" ||
        selectedImage.type === "image/heif" ||
        selectedImage.name.toLowerCase().endsWith(".heic") ||
        selectedImage.name.toLowerCase().endsWith(".heif")

      if (isHeic) {
        console.log("🔄 HEIC 파일 감지, heic-to로 업로드용 변환 시작...")
        try {
          const { heicTo } = await import("heic-to")
          console.log("📦 heic-to 모듈 로딩 완료")

          const convertedBlob = await heicTo({
            blob: selectedImage,
            type: "image/jpeg",
            quality: 0.8,
          })

          console.log("🔄 변환된 Blob:", convertedBlob)

          // 변환된 Blob을 File 객체로 변환
          fileToUpload = new File(
            [convertedBlob],
            selectedImage.name.replace(/\.(heic|heif)$/i, ".jpg"),
            { type: "image/jpeg" }
          )
          console.log("✅ heic-to로 HEIC → JPEG 변환 완료, 업로드 준비")
        } catch (error) {
          console.error("❌ heic-to 변환 실패:", error)
          console.log("⚠️ 변환 실패, 원본 파일 사용")
          fileToUpload = selectedImage
        }
      }

      const formData = new FormData()
      formData.append("file", fileToUpload)
      formData.append("userId", user.id)
      formData.append("grade", selectedGrade)
      formData.append("hanziId", selectedHanzi.id)
      formData.append("character", selectedHanzi.character)

      const response = await fetch("/api/upload-writing", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        // 경험치 반영 정보 포함한 성공 메시지
        const experienceMessage = data.experienceUpdateSuccess
          ? `\n\n🎉 경험치 ${data.experienceAdded}점이 반영되었습니다!`
          : "\n\n⚠️ 경험치 반영에 실패했습니다. 관리자에게 문의해주세요."

        setSuccess(`이미지가 성공적으로 업로드되었습니다!${experienceMessage}`)

        // 로딩 유지하면서 갤러리 페이지로 이동
        setTimeout(() => {
          router.push("/games/writing/gallery")
        }, 1500) // 1.5초로 설정하여 사용자가 성공 메시지를 확인할 수 있도록
      } else if (data.error === "duplicate") {
        // 중복 업로드 모달 표시
        setError(data.message)
        // 선택된 한자 초기화
        setSelectedHanzi(null)
        setIsUploading(false) // 중복 에러 시 로딩 해제
        // 3초 후 업로드 페이지로 이동
        setTimeout(() => {
          router.push("/games/writing/upload")
        }, 3000)
      } else {
        setError(data.error || "업로드에 실패했습니다")
        setIsUploading(false) // 에러 시에만 로딩 해제
      }
    } catch (err) {
      console.error("Upload error:", err)
      setError("업로드 중 오류가 발생했습니다")
      setIsUploading(false) // 에러 시에만 로딩 해제
    }
    // 성공 시에는 로딩을 유지하여 리다이렉션까지 기다림
  }

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
    <div className='min-h-screen bg-gray-50 relative'>
      {/* 업로드 중 전체 페이지 오버레이 로딩 */}
      {isUploading && (
        <div className='fixed inset-0 bg-black/70 flex items-center justify-center z-50'>
          <div className='bg-white rounded-xl p-10 max-w-lg mx-4 text-center shadow-2xl border relative overflow-hidden'>
            <div className='absolute inset-0 bg-gradient-to-br from-green-50 to-blue-50 opacity-50'></div>
            <div className='absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-blue-500 animate-pulse'></div>

            <div className='relative z-10'>
              <div className='mb-6'>
                <div className='w-20 h-20 mx-auto mb-6 relative'>
                  <div className='absolute inset-0 flex items-center justify-center'>
                    <div className='w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin'></div>
                  </div>
                  <div className='absolute inset-0 flex items-center justify-center'>
                    <div className='w-8 h-8 bg-green-600 rounded-full animate-ping opacity-75'></div>
                  </div>
                </div>
              </div>

              <h3 className='text-2xl font-bold text-gray-900 mb-3 animate-pulse'>
                📤 이미지 업로드 중...
              </h3>

              <div className='space-y-3 text-gray-700'>
                <p className='text-base leading-relaxed'>
                  한자 쓰기 연습 이미지를 저장하고 있습니다.
                </p>

                <div className='text-sm text-gray-500 mt-4 p-3 bg-gray-50 rounded-lg'>
                  ⏱️ 잠시만 기다려주세요...
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 헤더 - 모바일 최적화 */}
      <div className='bg-white shadow-sm border-b'>
        <div className='max-w-4xl mx-auto px-4 py-3 sm:py-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-3 sm:space-x-4'>
              <Link href='/games/writing'>
                <button className='p-2 hover:bg-gray-100 rounded-lg transition-colors'>
                  <ArrowLeft className='w-5 h-5 sm:w-6 sm:h-6 text-gray-600' />
                </button>
              </Link>
              <h1 className='text-lg sm:text-2xl font-bold text-gray-900'>
                한자 쓰기 업로드
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className='max-w-4xl mx-auto px-4 py-6 sm:py-8'>
        {/* 성공 메시지 */}
        {success && (
          <div className='mb-6 p-4 bg-green-50 border border-green-200 rounded-lg'>
            <div className='flex items-center'>
              <CheckCircle className='w-5 h-5 text-green-600 mr-2' />
              <div className='text-green-800 font-medium whitespace-pre-line'>
                {success}
              </div>
            </div>
          </div>
        )}

        {/* 오류 메시지 */}
        {error && (
          <div className='mb-6 p-4 bg-red-50 border border-red-200 rounded-lg'>
            <div className='flex items-center'>
              <X className='w-5 h-5 text-red-600 mr-2' />
              <div className='text-red-800'>
                {error}
                {error.includes("오늘 이미") && (
                  <div className='mt-2 text-sm text-red-600'>
                    업로드 페이지로 돌아갑니다...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className='space-y-6 sm:space-y-8'>
          {/* 한자 선택 섹션 - 모바일 최적화 */}
          <div className='bg-white rounded-lg shadow-sm border p-4 sm:p-6'>
            <h2 className='text-lg sm:text-xl font-bold text-gray-900 mb-4'>
              연습할 한자 선택
            </h2>

            <div className='space-y-4 sm:space-y-6'>
              {/* 급수 선택 */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  연습할 급수
                </label>
                <CustomSelect
                  value={selectedGrade}
                  onChange={handleGradeChange}
                  options={WRITING_UPLOAD_GRADE_OPTIONS}
                  className='w-full'
                  buttonClassName='p-3'
                  aria-label='연습할 급수'
                />
              </div>

              {/* 한자 검색 및 선택 */}
              {selectedGrade && (
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    한자 검색
                  </label>
                  <div className='relative'>
                    <input
                      type='text'
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      onFocus={() => setShowHanziList(true)}
                      placeholder='한자, 뜻, 음으로 검색하세요'
                      className='w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10 text-gray-900 placeholder-gray-600'
                    />
                    <Search className='absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400' />
                  </div>

                  {/* 한자 목록 - 모바일 최적화 */}
                  {showHanziList && filteredHanziList.length > 0 && (
                    <div className='mt-2 max-h-48 sm:max-h-60 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-lg'>
                      {filteredHanziList.map((hanzi) => (
                        <div
                          key={hanzi.id}
                          onClick={() => handleHanziSelect(hanzi)}
                          className='p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0'
                        >
                          <div className='flex items-center justify-between'>
                            <div className='flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1'>
                              <span className='text-xl sm:text-2xl font-bold text-gray-900 flex-shrink-0'>
                                {hanzi.character}
                              </span>
                              <div className='min-w-0 flex-1'>
                                <p className='text-xs sm:text-sm text-gray-600 truncate'>
                                  {hanzi.meaning}
                                </p>
                                <p className='text-xs text-gray-500 truncate'>
                                  {hanzi.sound}
                                </p>
                              </div>
                            </div>
                            <span className='text-xs text-gray-400 flex-shrink-0 ml-2'>
                              {hanzi.grade}급
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 로딩 상태 */}
                  {isLoadingHanzi && (
                    <div className='mt-2 p-4 text-center'>
                      <div className='w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2'></div>
                      <p className='text-sm text-gray-600'>
                        한자 목록을 불러오는 중...
                      </p>
                    </div>
                  )}

                  {/* 선택된 한자 - 모바일 반응형 */}
                  {selectedHanzi && (
                    <div className='mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg'>
                      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
                        <div className='flex items-center space-x-3 flex-1'>
                          <span className='text-3xl font-bold text-blue-900'>
                            {selectedHanzi.character}
                          </span>
                          <div className='flex-1 min-w-0'>
                            <p className='text-lg font-medium text-blue-800 truncate'>
                              {selectedHanzi.meaning}
                            </p>
                            <p className='text-sm text-blue-600 truncate'>
                              {selectedHanzi.sound}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedHanzi(null)}
                          className='p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors self-start sm:self-center'
                        >
                          <X className='w-5 h-5' />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 이미지 업로드 섹션 */}
          {selectedHanzi && (
            <div className='bg-white rounded-lg shadow-sm border p-6'>
              <h2 className='text-xl font-bold text-gray-900 mb-4'>
                한자 쓰기 연습지 사진
              </h2>

              {!previewUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className='border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer'
                >
                  <Camera className='w-12 h-12 text-gray-400 mx-auto mb-4' />
                  <p className='text-lg font-medium text-gray-700 mb-2'>
                    사진을 선택하거나 드래그하세요
                  </p>
                  <p className='text-sm text-gray-500'>
                    JPG, PNG, HEIC 파일 지원
                  </p>
                  <input
                    ref={fileInputRef}
                    type='file'
                    accept='image/*,.heic,.heif'
                    onChange={handleImageSelect}
                    className='hidden'
                  />
                </div>
              ) : previewUrl === "heic-file" ? (
                <div className='space-y-4'>
                  <div className='relative bg-gray-100 rounded-lg p-8 text-center'>
                    <Camera className='w-12 h-12 text-gray-400 mx-auto mb-4' />
                    <h3 className='text-lg font-semibold text-gray-700 mb-2'>
                      HEIC 파일 선택됨
                    </h3>
                    <p className='text-sm text-gray-500 mb-4'>
                      {selectedImage?.name}
                    </p>
                    <p className='text-xs text-blue-600'>
                      📱 iPhone 사진은 업로드 후 자동으로 JPEG로 변환됩니다
                    </p>
                    <button
                      onClick={handleRemoveImage}
                      className='absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors'
                    >
                      <X className='w-4 h-4' />
                    </button>
                  </div>
                </div>
              ) : (
                <div className='space-y-4'>
                  <div className='relative'>
                    <Image
                      src={previewUrl}
                      alt='업로드된 이미지'
                      width={800}
                      height={600}
                      className='w-full max-w-md mx-auto rounded-lg shadow-sm object-contain'
                      unoptimized
                    />
                    <button
                      onClick={handleRemoveImage}
                      className='absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors'
                    >
                      <X className='w-4 h-4' />
                    </button>
                  </div>

                  <div className='text-center'>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className='text-blue-600 hover:text-blue-700 text-sm font-medium'
                    >
                      다른 이미지 선택
                    </button>
                  </div>
                </div>
              )}

              {/* 업로드 버튼 */}
              {previewUrl && (
                <div className='text-center mt-6'>
                  <button
                    onClick={handleUpload}
                    disabled={isUploading || !selectedHanzi}
                    className='bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center mx-auto'
                  >
                    <Upload className='w-5 h-5 mr-2' />
                    {!selectedHanzi ? "한자를 선택해주세요" : "이미지 업로드"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 안내 메시지 */}
          <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
            <h3 className='text-lg font-semibold text-blue-900 mb-3'>
              📝 업로드 안내
            </h3>
            <div className='space-y-2 text-sm text-blue-800'>
              <div className='flex items-start'>
                <span className='font-medium mr-2'>🎯 선택:</span>
                <span>연습할 한자를 먼저 선택한 후 이미지를 업로드하세요</span>
              </div>
              <div className='flex items-start'>
                <span className='font-medium mr-2'>📸 촬영:</span>
                <span>한자 쓰기 연습지가 잘 보이도록 촬영해주세요</span>
              </div>
              <div className='flex items-start'>
                <span className='font-medium mr-2'>📅 관리:</span>
                <span>업로드한 이미지는 갤러리에서 확인할 수 있습니다</span>
              </div>
              <div className='flex items-start'>
                <span className='font-medium mr-2'>✅ 검토:</span>
                <span>관리자가 검토 후 경험치가 지급됩니다</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
