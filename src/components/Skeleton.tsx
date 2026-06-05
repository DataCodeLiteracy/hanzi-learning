interface SkeletonProps {
  className?: string
}

const shimmerClass =
  "relative overflow-hidden rounded-md bg-slate-200 after:absolute after:inset-0 after:-translate-x-full after:bg-gradient-to-r after:from-transparent after:via-white/60 after:to-transparent after:animate-[shimmer_1.4s_infinite]"

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`${shimmerClass} ${className}`} />
}

const cardClass =
  "rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,23,42,0.06)]"

function SkeletonPageHeader({ titleWidth = "w-24" }: { titleWidth?: string }) {
  return (
    <header className='bg-white border-b border-slate-100'>
      <div className='max-w-2xl mx-auto px-4 py-4 flex items-center gap-3'>
        <Skeleton className='h-9 w-9 rounded-xl shrink-0' />
        <Skeleton className={`h-5 ${titleWidth}`} />
      </div>
    </header>
  )
}

/** 마이페이지 (/my) */
export function MyPageSkeleton() {
  return (
    <div className='min-h-screen bg-slate-50'>
      <SkeletonPageHeader titleWidth='w-28' />
      <main className='max-w-2xl mx-auto px-4 py-6 space-y-5 pb-12'>
        <div className={`${cardClass} p-5`}>
          <div className='flex items-center gap-4 mb-5'>
            <Skeleton className='h-16 w-16 rounded-2xl shrink-0' />
            <div className='flex-1 space-y-2'>
              <Skeleton className='h-5 w-32' />
              <Skeleton className='h-3 w-44' />
              <div className='flex gap-2 pt-1'>
                <Skeleton className='h-5 w-14 rounded-full' />
                <Skeleton className='h-5 w-16 rounded-full' />
              </div>
            </div>
          </div>
          <div className='space-y-2'>
            <div className='flex justify-between'>
              <Skeleton className='h-4 w-16' />
              <Skeleton className='h-4 w-24' />
            </div>
            <Skeleton className='h-2.5 w-full rounded-full' />
            <div className='flex justify-between pt-1'>
              <Skeleton className='h-3 w-10' />
              <Skeleton className='h-3 w-14' />
              <Skeleton className='h-3 w-10' />
            </div>
          </div>
        </div>

        <div className={`${cardClass} p-5 space-y-4`}>
          <Skeleton className='h-4 w-24' />
          <div className='flex items-baseline gap-2'>
            <Skeleton className='h-8 w-16' />
            <Skeleton className='h-4 w-20' />
          </div>
          <Skeleton className='h-2 w-full rounded-full' />
          <div className='grid grid-cols-3 gap-2'>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className='rounded-xl bg-slate-50 px-2 py-3 space-y-1.5 text-center'
              >
                <Skeleton className='h-6 w-10 mx-auto' />
                <Skeleton className='h-3 w-12 mx-auto' />
              </div>
            ))}
          </div>
        </div>

        <div className={`${cardClass} divide-y divide-slate-100`}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className='flex items-center gap-4 p-4'>
              <Skeleton className='h-11 w-11 rounded-xl shrink-0' />
              <div className='flex-1 space-y-1.5'>
                <Skeleton className='h-4 w-24' />
                <Skeleton className='h-3 w-40' />
              </div>
              <Skeleton className='h-5 w-5 rounded shrink-0' />
            </div>
          ))}
        </div>

        <div className={`${cardClass} p-5`}>
          <div className='flex justify-between mb-4'>
            <Skeleton className='h-4 w-16' />
            <Skeleton className='h-3 w-12' />
          </div>
          <div className='grid grid-cols-2 gap-3'>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className='rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-2'
              >
                <Skeleton className='h-4 w-20 mx-auto' />
                <Skeleton className='h-3 w-16 mx-auto' />
              </div>
            ))}
          </div>
        </div>

        <div className={`${cardClass} p-5`}>
          <Skeleton className='h-11 w-full rounded-xl' />
        </div>
      </main>
    </div>
  )
}

function SettingsSectionSkeleton({ accent = "blue" }: { accent?: string }) {
  const headerTint =
    accent === "indigo"
      ? "bg-indigo-50/95 border-indigo-100"
      : accent === "violet"
      ? "bg-violet-50/95 border-violet-100"
      : accent === "amber"
      ? "bg-amber-50/95 border-amber-100"
      : "bg-blue-50/95 border-blue-100"

  return (
    <div className={cardClass}>
      <div className={`px-5 py-4 border-b rounded-t-2xl ${headerTint}`}>
        <div className='flex items-center gap-2.5'>
          <Skeleton className='h-9 w-9 rounded-xl shrink-0' />
          <div className='space-y-1.5'>
            <Skeleton className='h-4 w-24' />
            <Skeleton className='h-3 w-48' />
          </div>
        </div>
      </div>
      <div className='p-5 space-y-4 bg-white rounded-b-2xl'>
        <div className='space-y-1.5'>
          <Skeleton className='h-3 w-12' />
          <Skeleton className='h-11 w-full rounded-xl' />
        </div>
        <div className='space-y-1.5'>
          <Skeleton className='h-3 w-16' />
          <Skeleton className='h-11 w-full rounded-xl' />
        </div>
        <Skeleton className='h-11 w-full rounded-xl' />
      </div>
    </div>
  )
}

/** 프로필 정보 (/my/profile) */
export function MyProfileSkeleton() {
  return (
    <div className='min-h-screen bg-slate-50'>
      <header className='sticky top-0 z-10 bg-white border-b border-slate-100'>
        <div className='max-w-2xl mx-auto px-4 py-4 flex items-center gap-3'>
          <Skeleton className='h-9 w-9 rounded-xl shrink-0' />
          <div className='space-y-1.5'>
            <Skeleton className='h-5 w-24' />
            <Skeleton className='h-3 w-32' />
          </div>
        </div>
      </header>
      <main className='max-w-2xl mx-auto px-4 py-6 space-y-5 pb-12'>
        <SettingsSectionSkeleton accent='blue' />
        <SettingsSectionSkeleton accent='indigo' />
        <SettingsSectionSkeleton accent='violet' />
        <SettingsSectionSkeleton accent='amber' />
      </main>
    </div>
  )
}

/** 홈 (/) */
export function HomePageSkeleton() {
  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      <header className='bg-white shadow-sm'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center'>
          <Skeleton className='h-7 w-40 sm:w-52' />
          <Skeleton className='h-10 w-28 sm:w-32 rounded-md' />
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-16 space-y-6 sm:space-y-8'>
        <div className='bg-white rounded-lg shadow-sm p-4 sm:p-6 space-y-4'>
          <div className='space-y-2'>
            <Skeleton className='h-6 w-48 sm:w-64' />
            <Skeleton className='h-4 w-56' />
          </div>
          <Skeleton className='h-5 w-20' />
          <div className='rounded-lg border border-blue-100 bg-blue-50/50 p-4 space-y-3'>
            <Skeleton className='h-4 w-24' />
            <Skeleton className='h-8 w-28' />
            <Skeleton className='h-2 w-full rounded-full' />
          </div>
        </div>

        <div className='space-y-3'>
          <Skeleton className='h-5 w-20' />
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className='bg-white rounded-lg shadow-sm p-4 sm:p-5 space-y-3'
              >
                <Skeleton className='h-10 w-10 rounded-lg' />
                <Skeleton className='h-5 w-24' />
                <Skeleton className='h-3 w-full' />
              </div>
            ))}
          </div>
        </div>

        <div className='bg-white rounded-lg shadow-sm p-4 sm:p-6 space-y-3'>
          <Skeleton className='h-5 w-28' />
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className='flex items-center justify-between py-2 border-b border-slate-100 last:border-0'
            >
              <div className='flex items-center gap-3'>
                <Skeleton className='h-8 w-8 rounded-full' />
                <Skeleton className='h-4 w-24' />
              </div>
              <Skeleton className='h-4 w-12' />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

/** 통계 하위 페이지 공통 */
export function MyStatsSkeleton() {
  return (
    <div className='min-h-screen bg-slate-50'>
      <header className='fixed top-0 left-0 right-0 bg-white shadow-sm z-50'>
        <div className='max-w-4xl mx-auto px-4 py-4 flex items-center gap-3'>
          <Skeleton className='h-9 w-9 rounded-lg shrink-0' />
          <Skeleton className='h-5 w-28' />
        </div>
      </header>
      <main className='max-w-4xl mx-auto px-4 pt-24 pb-12 space-y-6'>
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className='bg-white rounded-lg shadow-sm p-5 space-y-2'
            >
              <Skeleton className='h-3 w-16' />
              <Skeleton className='h-8 w-12' />
            </div>
          ))}
        </div>
        <div className='bg-white rounded-lg shadow-sm p-6 space-y-3'>
          <Skeleton className='h-5 w-32 mb-2' />
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className='flex items-center justify-between p-3 bg-slate-50 rounded-lg'
            >
              <Skeleton className='h-4 w-40' />
              <Skeleton className='h-4 w-16' />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

const gradientPage = "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100"
const grayPage = "min-h-screen bg-gray-50"

function GradientPageHeader({
  maxWidth = "max-w-4xl",
  sticky = false,
}: {
  maxWidth?: string
  sticky?: boolean
}) {
  return (
    <header
      className={`${sticky ? "fixed top-0 left-0 right-0 z-50" : ""} bg-white shadow-sm border-b`}
    >
      <div
        className={`${maxWidth} mx-auto px-4 py-4 flex items-center justify-between`}
      >
        <div className='flex items-center gap-3'>
          <Skeleton className='h-9 w-9 rounded-lg shrink-0' />
          <Skeleton className='h-5 w-32' />
        </div>
        <Skeleton className='h-9 w-24 rounded-lg hidden sm:block' />
      </div>
    </header>
  )
}

export function RankingListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className='space-y-3'>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className='flex items-center justify-between p-3 rounded-lg bg-slate-50'
        >
          <div className='flex items-center gap-3'>
            <Skeleton className='h-8 w-8 rounded-full shrink-0' />
            <Skeleton className='h-4 w-28' />
          </div>
          <Skeleton className='h-4 w-16' />
        </div>
      ))}
    </div>
  )
}

export function TableRowsSkeleton({
  rows = 8,
  cols = 4,
}: {
  rows?: number
  cols?: number
}) {
  return (
    <div className='divide-y divide-slate-100'>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className='flex items-center gap-4 px-6 py-4'>
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton
              key={j}
              className={`h-4 ${j === 0 ? "w-8" : j === 1 ? "w-10" : "flex-1"}`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function HanziGridSkeleton({ count = 24 }: { count?: number }) {
  return (
    <div className='grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3'>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className='aspect-square rounded-lg' />
      ))}
    </div>
  )
}

export function GalleryGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6'>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className='bg-white rounded-lg shadow-sm border overflow-hidden'
        >
          <Skeleton className='aspect-[4/3] w-full rounded-none' />
          <div className='p-4 space-y-2'>
            <Skeleton className='h-4 w-3/4' />
            <Skeleton className='h-3 w-1/2' />
          </div>
        </div>
      ))}
    </div>
  )
}

export function MemoryCardGridSkeleton({
  cols = 4,
  rows = 3,
}: {
  cols?: number
  rows?: number
}) {
  return (
    <div
      className='grid gap-3 mx-auto max-w-md'
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: cols * rows }).map((_, i) => (
        <Skeleton key={i} className='aspect-square rounded-xl' />
      ))}
    </div>
  )
}

/** 로그인 (/login) */
export function LoginPageSkeleton() {
  return (
    <div className={gradientPage}>
      <header className='bg-white shadow-sm'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4'>
          <Skeleton className='h-5 w-5 rounded shrink-0' />
          <Skeleton className='h-6 w-16' />
        </div>
      </header>
      <main className='max-w-md mx-auto px-4 py-12 space-y-6 text-center'>
        <Skeleton className='h-8 w-full max-w-sm mx-auto' />
        <Skeleton className='h-4 w-full max-w-xs mx-auto' />
        <Skeleton className='h-12 w-48 mx-auto rounded-lg' />
      </main>
    </div>
  )
}

/** 게임 설정·생성 (퀴즈/부분/메모리/쓰기 허브) */
export function GameSetupSkeleton() {
  return (
    <div className={`${gradientPage} p-4 pt-6`}>
      <div className='max-w-md mx-auto mb-4'>
        <Skeleton className='h-5 w-36' />
      </div>
      <div className={`${cardClass} max-w-md mx-auto p-8 space-y-6`}>
        <Skeleton className='h-8 w-32 mx-auto' />
        <div className='space-y-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className='space-y-2'>
              <Skeleton className='h-4 w-20' />
              <Skeleton className='h-11 w-full rounded-xl' />
            </div>
          ))}
        </div>
        <Skeleton className='h-12 w-full rounded-xl' />
      </div>
    </div>
  )
}

/** 게임 플레이 준비 (문제 영역) */
export function GamePlaySkeleton() {
  return (
    <div className={gradientPage}>
      <header className='bg-white shadow-sm border-b'>
        <div className='max-w-4xl mx-auto px-4 py-3 flex items-center justify-between'>
          <Skeleton className='h-4 w-20' />
          <div className='flex gap-4'>
            <Skeleton className='h-4 w-16' />
            <Skeleton className='h-4 w-16' />
          </div>
        </div>
      </header>
      <main className='max-w-2xl mx-auto px-4 py-8 space-y-6'>
        <Skeleton className='h-3 w-full rounded-full' />
        <div className={`${cardClass} p-8 space-y-6`}>
          <Skeleton className='h-6 w-3/4 mx-auto' />
          <Skeleton className='h-20 w-20 mx-auto rounded-2xl' />
          <div className='grid grid-cols-2 gap-3'>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className='h-14 w-full rounded-xl' />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

/** 시험 허브 (/games/exam) */
export function ExamHubSkeleton() {
  return (
    <div className={gradientPage}>
      <GradientPageHeader maxWidth='max-w-4xl' />
      <main className='max-w-4xl mx-auto px-4 py-8 space-y-6'>
        <div className={`${cardClass} p-6 space-y-4`}>
          <Skeleton className='h-6 w-40' />
          <Skeleton className='h-4 w-56' />
          <Skeleton className='h-2 w-full rounded-full' />
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${cardClass} p-5 space-y-3`}>
              <Skeleton className='h-6 w-16' />
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-10 w-full rounded-lg' />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

/** 시험 결과·오답 */
export function ExamResultSkeleton() {
  return (
    <div className={gradientPage}>
      <GradientPageHeader maxWidth='max-w-4xl' />
      <main className='max-w-2xl mx-auto px-4 py-8 space-y-6'>
        <div className={`${cardClass} p-8 text-center space-y-4`}>
          <Skeleton className='h-16 w-16 rounded-full mx-auto' />
          <Skeleton className='h-8 w-48 mx-auto' />
          <Skeleton className='h-4 w-32 mx-auto' />
        </div>
        <div className={`${cardClass} p-6 space-y-3`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className='flex justify-between py-2'>
              <Skeleton className='h-4 w-24' />
              <Skeleton className='h-4 w-16' />
            </div>
          ))}
        </div>
        <div className='grid grid-cols-2 gap-3'>
          <Skeleton className='h-11 w-full rounded-xl' />
          <Skeleton className='h-11 w-full rounded-xl' />
        </div>
      </main>
    </div>
  )
}

/** 한자 목록·교과서 한자어 */
export function HanziListPageSkeleton() {
  return (
    <div className={gradientPage}>
      <GradientPageHeader maxWidth='max-w-7xl' sticky />
      <main className='max-w-7xl mx-auto px-4 pt-24 pb-12 space-y-6'>
        <div className='bg-white rounded-lg shadow-sm p-4 sm:p-6 space-y-4'>
          <div className='flex flex-wrap gap-3'>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className='h-9 w-14 rounded-lg' />
            ))}
          </div>
          <Skeleton className='h-10 w-full max-w-md rounded-lg' />
        </div>
        <div className='bg-white rounded-lg shadow-sm overflow-hidden'>
          <div className='px-6 py-4 border-b'>
            <Skeleton className='h-5 w-40' />
          </div>
          <TableRowsSkeleton rows={10} cols={5} />
        </div>
      </main>
    </div>
  )
}

/** 한자 목록 데이터 오버레이 */
export function HanziListOverlaySkeleton() {
  return (
    <div className='fixed inset-0 z-50 bg-white/95'>
      <div className='max-w-7xl mx-auto px-4 pt-24 pb-12 space-y-6'>
        <div className='bg-white rounded-lg shadow-sm p-4 space-y-4'>
          <div className='flex flex-wrap gap-3'>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className='h-9 w-14 rounded-lg' />
            ))}
          </div>
        </div>
        <div className='bg-white rounded-lg shadow-sm overflow-hidden'>
          <TableRowsSkeleton rows={10} cols={5} />
        </div>
      </div>
    </div>
  )
}

/** 관리자 */
export function AdminPageSkeleton() {
  return (
    <div className={gradientPage}>
      <GradientPageHeader maxWidth='max-w-7xl' />
      <main className='max-w-7xl mx-auto px-4 py-8 space-y-6'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className='bg-white rounded-lg shadow-sm p-5 space-y-3'>
              <Skeleton className='h-5 w-28' />
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-10 w-full rounded-lg' />
            </div>
          ))}
        </div>
        <div className='bg-white rounded-lg shadow-sm overflow-hidden'>
          <div className='px-6 py-4 border-b'>
            <Skeleton className='h-5 w-48' />
          </div>
          <TableRowsSkeleton rows={8} cols={5} />
        </div>
      </main>
    </div>
  )
}

/** 갤러리 페이지 (초기·인라인) */
export function GalleryPageSkeleton() {
  return (
    <div className={grayPage}>
      <GradientPageHeader maxWidth='max-w-6xl' />
      <main className='max-w-6xl mx-auto px-4 py-6 space-y-6'>
        <div className='flex flex-wrap gap-3'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-9 w-20 rounded-lg' />
          ))}
        </div>
        <GalleryGridSkeleton />
      </main>
    </div>
  )
}

/** 쓰기 게임 허브 */
export function WritingHubSkeleton() {
  return (
    <div className={gradientPage}>
      <GradientPageHeader maxWidth='max-w-4xl' />
      <main className='max-w-4xl mx-auto px-4 py-8'>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${cardClass} p-6 space-y-3`}>
              <Skeleton className='h-10 w-10 rounded-lg' />
              <Skeleton className='h-5 w-28' />
              <Skeleton className='h-4 w-full' />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

/** 업로드·채점·워크시트 폼 */
export function WritingFormSkeleton() {
  return (
    <div className={grayPage}>
      <GradientPageHeader maxWidth='max-w-4xl' />
      <main className='max-w-4xl mx-auto px-4 py-8 space-y-6'>
        <div className={`${cardClass} p-6 space-y-4`}>
          <Skeleton className='h-5 w-32' />
          <Skeleton className='h-40 w-full rounded-xl' />
          <Skeleton className='h-11 w-full rounded-xl' />
        </div>
      </main>
    </div>
  )
}

/** 피드백 관리 */
export function AdminFeedbackSkeleton() {
  return (
    <div className={grayPage}>
      <header className='bg-white shadow-sm'>
        <div className='max-w-7xl mx-auto px-4 py-4'>
          <Skeleton className='h-6 w-40' />
        </div>
      </header>
      <main className='max-w-7xl mx-auto px-4 py-8 space-y-4'>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`${cardClass} p-5 space-y-3`}>
            <div className='flex justify-between'>
              <Skeleton className='h-5 w-48' />
              <Skeleton className='h-5 w-16 rounded-full' />
            </div>
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-3/4' />
          </div>
        ))}
      </main>
    </div>
  )
}
