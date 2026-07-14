import { Skeleton } from "@/components/Skeleton"

/** Content-only skeleton for use inside statistics layout (no duplicate header). */
export function StatsContentSkeleton() {
  return (
    <div className='space-y-5 animate-pulse'>
      <div className='rounded-2xl border border-slate-200/90 bg-white p-5 space-y-4'>
        <Skeleton className='h-4 w-24' />
        <Skeleton className='h-2 w-full rounded-full' />
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-2.5'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className='rounded-xl bg-slate-50 p-3 space-y-2'>
              <Skeleton className='h-5 w-12 mx-auto' />
              <Skeleton className='h-3 w-16 mx-auto' />
            </div>
          ))}
        </div>
      </div>
      <div className='rounded-2xl border border-slate-200/90 bg-white p-5 space-y-4'>
        <Skeleton className='h-4 w-28' />
        <div className='grid grid-cols-7 gap-1'>
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className='aspect-square rounded-xl' />
          ))}
        </div>
      </div>
      <div className='rounded-2xl border border-slate-200/90 bg-white p-5 space-y-3'>
        <Skeleton className='h-4 w-20' />
        <div className='grid grid-cols-2 sm:grid-cols-3 gap-2.5'>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className='rounded-xl bg-slate-50 p-3 space-y-2'>
              <Skeleton className='h-5 w-10 mx-auto' />
              <Skeleton className='h-3 w-14 mx-auto' />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
