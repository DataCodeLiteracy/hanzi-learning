"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useData } from "@/contexts/DataContext"
import { MyProfileSkeleton } from "@/components/Skeleton"
import { useModal } from "@/contexts/ModalContext"
import Link from "next/link"
import { useState, useEffect, useMemo, type ReactNode } from "react"
import {
  ArrowLeft,
  User,
  BookOpen,
  Sparkles,
  Database,
} from "lucide-react"
import { CustomSelect } from "@/components/ui/CustomSelect"
import { CustomInput } from "@/components/ui/CustomInput"
import { CustomButton } from "@/components/ui/CustomButton"
import {
  PREFERRED_GRADE_SELECT_OPTIONS,
  formatGradeLabel,
} from "@/lib/gradeLabels"
import {
  buildBirthYearSelectOptions,
  describeDontKnowComboLimit,
  getDontKnowComboLimit,
  getKoreanAge,
  BIRTH_YEAR_SELECT_SCROLL_ANCHOR,
  getDefaultBirthYearPlaceholder,
} from "@/lib/comboDontKnowLimit"
import { ApiClient } from "@/lib/apiClient"

const birthYearOptions = buildBirthYearSelectOptions()
const defaultBirthYearPlaceholder = getDefaultBirthYearPlaceholder()

type SectionAccent = "blue" | "indigo" | "violet" | "amber" | "slate"

const sectionAccentStyles: Record<
  SectionAccent,
  { header: string; icon: string; description: string }
> = {
  blue: {
    header: "bg-blue-50/95 border-b border-blue-100",
    icon: "bg-white border-blue-100 text-blue-600",
    description: "text-blue-700/70",
  },
  indigo: {
    header: "bg-indigo-50/95 border-b border-indigo-100",
    icon: "bg-white border-indigo-100 text-indigo-600",
    description: "text-indigo-700/70",
  },
  violet: {
    header: "bg-violet-50/95 border-b border-violet-100",
    icon: "bg-white border-violet-100 text-violet-600",
    description: "text-violet-700/70",
  },
  amber: {
    header: "bg-amber-50/95 border-b border-amber-100",
    icon: "bg-white border-amber-100 text-amber-600",
    description: "text-amber-800/70",
  },
  slate: {
    header: "bg-slate-100/90 border-b border-slate-200",
    icon: "bg-white border-slate-200 text-slate-600",
    description: "text-slate-600/80",
  },
}

function SettingsSection({
  title,
  description,
  icon,
  accent = "blue",
  children,
}: {
  title: string
  description?: string
  icon: ReactNode
  accent?: SectionAccent
  children: ReactNode
}) {
  const styles = sectionAccentStyles[accent]

  return (
    <section className='rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,23,42,0.06)]'>
      <div className={`px-5 py-4 rounded-t-2xl ${styles.header}`}>
        <div className='flex items-center gap-2.5'>
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm ${styles.icon}`}
          >
            {icon}
          </div>
          <div>
            <h2 className='text-base font-bold text-gray-900'>{title}</h2>
            {description && (
              <p className={`text-xs mt-0.5 ${styles.description}`}>
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className='p-5 space-y-4 bg-white rounded-b-2xl'>{children}</div>
    </section>
  )
}

export default function ProfileSettingsPage() {
  const { user, initialLoading, isAuthenticated, refreshUserData } = useAuth()
  const { clearIndexedDB } = useData()
  const { alert: showAlert } = useModal()

  const [displayName, setDisplayName] = useState("")
  const [birthYear, setBirthYear] = useState<string>("")
  const [todayGoal, setTodayGoal] = useState(100)
  const [inputGoal, setInputGoal] = useState("100")
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingGoal, setIsSavingGoal] = useState(false)
  const [isSavingGrade, setIsSavingGrade] = useState(false)
  const [cacheMessage, setCacheMessage] = useState<string | null>(null)

  const selectedBirthYearNum = birthYear ? Number(birthYear) : user?.birthYear

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "")
      setBirthYear(user.birthYear ? String(user.birthYear) : "")
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    const loadGoal = async () => {
      try {
        const stats = await ApiClient.getUserStatistics(user.id)
        const goal = stats?.todayGoal || 100
        setTodayGoal(goal)
        setInputGoal(String(goal))
      } catch (error) {
        console.error("목표 로드 실패:", error)
      }
    }
    loadGoal()
  }, [user])

  const dontKnowLimit = useMemo(
    () =>
      getDontKnowComboLimit(user?.preferredGrade, selectedBirthYearNum),
    [user?.preferredGrade, selectedBirthYearNum]
  )

  const dontKnowLimitDescription = useMemo(
    () =>
      describeDontKnowComboLimit(user?.preferredGrade, selectedBirthYearNum),
    [user?.preferredGrade, selectedBirthYearNum]
  )

  const handleSaveProfile = async () => {
    if (!user) return
    const trimmed = displayName.trim()
    if (!trimmed) {
      showAlert("이름을 입력해 주세요.", { type: "warning" })
      return
    }
    if (!birthYear) {
      showAlert("출생년도를 선택해 주세요.", { type: "warning" })
      return
    }
    setIsSavingProfile(true)
    try {
      await ApiClient.updateUserProfile(user.id, {
        displayName: trimmed,
        birthYear: Number(birthYear),
      })
      await refreshUserData()
      showAlert("프로필 정보가 저장되었습니다.", { type: "success" })
    } catch (error) {
      console.error(error)
      showAlert("프로필 저장에 실패했습니다.", { type: "error" })
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleSaveGoal = async () => {
    if (!user) return
    const goalValue = parseInt(inputGoal, 10) || 0
    if (goalValue < 30) {
      showAlert("하루 학습 목표는 최소 30EXP 이상이어야 합니다.", {
        type: "warning",
      })
      setInputGoal(String(todayGoal))
      return
    }
    setIsSavingGoal(true)
    try {
      await ApiClient.updateTodayGoal(user.id, goalValue)
      setTodayGoal(goalValue)
      showAlert(`오늘의 학습 목표가 ${goalValue}EXP로 설정되었습니다.`, {
        type: "success",
      })
    } catch (error) {
      console.error(error)
      showAlert("목표 저장에 실패했습니다.", { type: "error" })
    } finally {
      setIsSavingGoal(false)
    }
  }

  const handleGradeChange = async (value: string) => {
    if (!user || isSavingGrade) return
    const newGrade = Number(value)
    if (newGrade === user.preferredGrade) return

    setIsSavingGrade(true)
    try {
      await clearIndexedDB()
      await ApiClient.updateUserPreferredGrade(user.id, newGrade)
      await refreshUserData()

      const newGradeData = await ApiClient.getHanziByGrade(newGrade)

      if (typeof window !== "undefined" && window.indexedDB) {
        const request = window.indexedDB.open("hanziDB", 1)
        request.onsuccess = () => {
          const db = request.result
          const transaction = db.transaction(["hanziStore"], "readwrite")
          const store = transaction.objectStore("hanziStore")
          const storageKey = `currentHanziData_${user.id}`
          store.put(
            {
              grade: newGrade,
              lastUpdated: new Date().toISOString(),
              data: newGradeData,
            },
            storageKey
          )
          window.location.href = "/"
        }
        request.onerror = () => {
          window.location.href = "/"
        }
      } else {
        window.location.href = "/"
      }
    } catch (error) {
      console.error("급수 변경 실패:", error)
      showAlert("급수 변경에 실패했습니다.", { type: "error" })
      setIsSavingGrade(false)
    }
  }

  const handleClearCache = async () => {
    if (!user?.id) return
    try {
      await clearIndexedDB()
      setCacheMessage(
        "캐시를 삭제했습니다. 메인 화면에서 데이터가 다시 불러와집니다."
      )
      setTimeout(() => setCacheMessage(null), 5000)
    } catch {
      setCacheMessage("캐시 삭제에 실패했습니다.")
      setTimeout(() => setCacheMessage(null), 3000)
    }
  }

  if (initialLoading) {
    return <MyProfileSkeleton />
  }

  if (isAuthenticated && !user) {
    return (
      <div className='min-h-screen bg-slate-50 flex items-center justify-center'>
        <div className='text-center space-y-3'>
          <h1 className='text-xl font-bold text-gray-900'>
            로그인이 필요합니다
          </h1>
          <Link
            href='/'
            className='inline-flex items-center justify-center px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors'
          >
            홈으로
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-slate-50'>
      <header className='sticky top-0 z-10 bg-white border-b border-slate-100'>
        <div className='max-w-2xl mx-auto px-4 py-4 flex items-center gap-3'>
          <Link
            href='/my'
            className='inline-flex items-center justify-center p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors'
            aria-label='마이페이지로'
          >
            <ArrowLeft className='h-5 w-5' />
          </Link>
          <div>
            <h1 className='text-lg font-bold text-gray-900'>프로필 정보</h1>
            <p className='text-xs text-gray-500'>학습 설정과 계정 관리</p>
          </div>
        </div>
      </header>

      <main className='max-w-2xl mx-auto px-4 py-6 space-y-5 pb-12'>
        <SettingsSection
          title='기본 정보'
          description='이름과 출생년도(한국나이)는 게임 난이도 조정에 활용됩니다'
          icon={<User className='h-4 w-4' />}
          accent='blue'
        >
          <CustomInput
            label='이름'
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder='이름을 입력하세요'
            autoComplete='name'
          />
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1.5'>
              출생년도
            </label>
            <CustomSelect
              value={birthYear}
              onChange={setBirthYear}
              placeholder={defaultBirthYearPlaceholder}
              options={birthYearOptions}
              initialScrollToValue={String(BIRTH_YEAR_SELECT_SCROLL_ANCHOR)}
              className='w-full'
              searchable
              searchPlaceholder='년도 또는 나이 검색…'
              aria-label='출생년도'
            />
            {birthYear && (
              <p className='text-xs text-blue-600 mt-1.5 font-medium'>
                한국나이 {getKoreanAge(Number(birthYear))}세 기준 · 콤보
                &quot;모르겠음&quot;{" "}
                {getDontKnowComboLimit(user?.preferredGrade, Number(birthYear))}
                번까지
              </p>
            )}
            <p className='text-xs text-gray-500 mt-1.5 leading-relaxed'>
              한국나이 7세 이하 10번 · 8~9세 8번 · 10~11세 7번 · 12~13세 5번 ·
              14~16세 4번 · 17세 이상 3번 (급수와 더 엄격한 쪽 적용)
            </p>
          </div>
          <CustomButton
            variant='primary'
            fullWidth
            loading={isSavingProfile}
            onClick={handleSaveProfile}
          >
            기본 정보 저장
          </CustomButton>
        </SettingsSection>

        <SettingsSection
          title='학습 설정'
          description='게임에 적용되는 급수와 하루 목표'
          icon={<BookOpen className='h-4 w-4' />}
          accent='indigo'
        >
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1.5'>
              학습 중인 급수
            </label>
            <CustomSelect
              value={String(user?.preferredGrade || 8)}
              onChange={(v) => void handleGradeChange(v)}
              options={PREFERRED_GRADE_SELECT_OPTIONS}
              className='w-full'
              disabled={isSavingGrade}
              aria-label='학습 중인 급수'
            />
            <p className='text-xs text-gray-500 mt-1.5'>
              현재{" "}
              <span className='font-semibold text-blue-600'>
                {formatGradeLabel(user?.preferredGrade || 8)}
              </span>
              {isSavingGrade && " · 변경 중..."}
            </p>
          </div>
          <CustomInput
            label='오늘의 학습 목표'
            type='number'
            value={inputGoal}
            onChange={(e) => setInputGoal(e.target.value)}
            min={30}
            max={1000}
            inputMode='numeric'
            suffix='EXP'
          />
          <CustomButton
            variant='secondary'
            fullWidth
            loading={isSavingGoal}
            onClick={handleSaveGoal}
          >
            목표 저장
          </CustomButton>
        </SettingsSection>

        <SettingsSection
          title='콤보 보호'
          description='퀴즈·부분 맞추기에서 콤보 유지 규칙'
          icon={<Sparkles className='h-4 w-4' />}
          accent='violet'
        >
          <div className='rounded-xl bg-blue-50 border border-blue-100 p-4'>
            <div className='flex items-baseline justify-between gap-3 mb-2'>
              <span className='text-sm font-medium text-gray-700'>
                현재 &quot;모르겠음&quot; 허용
              </span>
              <span className='text-2xl font-extrabold text-indigo-600'>
                {dontKnowLimit}번
              </span>
            </div>
            <p className='text-xs text-indigo-800/80 leading-relaxed'>
              {dontKnowLimitDescription}
            </p>
          </div>
        </SettingsSection>

        <SettingsSection
          title='앱 데이터'
          icon={<Database className='h-4 w-4' />}
          accent='amber'
        >
          <p className='text-sm text-gray-600'>
            한자 목록이나 학습 상태가 이상할 때 캐시를 삭제한 뒤 메인 화면에서
            다시 불러올 수 있습니다.
          </p>
          <CustomButton variant='amber' fullWidth onClick={handleClearCache}>
            IndexedDB 캐시 삭제
          </CustomButton>
          {cacheMessage && (
            <p className='text-xs text-green-600'>{cacheMessage}</p>
          )}
        </SettingsSection>
      </main>
    </div>
  )
}
