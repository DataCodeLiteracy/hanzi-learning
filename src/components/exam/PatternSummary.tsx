"use client"

interface Props {
  name: string
  description: string
  completedCount: number
  totalCount: number
  children?: React.ReactNode
}

export default function PatternSummary({
  name,
  description,
  completedCount,
  totalCount,
  children,
}: Props) {
  return (
    <div className='bg-white rounded-lg shadow-sm p-6 mb-6'>
      <h2 className='text-xl font-bold text-black mb-2'>{name}</h2>
      <p className='text-black mb-4'>{description}</p>
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <div className='text-sm text-gray-600'>
            답안 완료: {completedCount}/{totalCount}
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
