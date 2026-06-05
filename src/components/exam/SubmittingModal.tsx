"use client"

import { Skeleton } from "@/components/Skeleton"

interface Props {
  show: boolean
}

export default function SubmittingModal({ show }: Props) {
  if (!show) return null
  return (
    <div className='fixed inset-0 bg-black/70 flex items-center justify-center z-50'>
      <div className='bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md mx-4 space-y-4'>
        <Skeleton className='h-16 w-16 rounded-full mx-auto' />
        <Skeleton className='h-6 w-40 mx-auto' />
        <Skeleton className='h-4 w-56 mx-auto' />
      </div>
    </div>
  )
}
