"use client"
import Link from "next/link"
import { ArrowLeft, Clock } from "lucide-react"

interface Props {
  backHref: string
  title: string
  patternIndex: number
  totalPatterns: number
  patternName: string
  timeLeftText: string
}

export default function ExamHeader({
  backHref,
  title,
  patternIndex,
  totalPatterns,
  patternName,
  timeLeftText,
}: Props) {
  return (
    <div className='bg-white shadow-sm border-b'>
      <div className='max-w-4xl mx-auto px-4 py-4'>
        {/* 상단: 제목과 타이머 */}
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center space-x-4'>
            <Link href={backHref} className='text-gray-600 hover:text-gray-800'>
              <ArrowLeft className='w-6 h-6' />
            </Link>
            <div>
              <h1 className='text-xl font-bold text-gray-900'>{title}</h1>
              <p className='text-sm text-black'>
                패턴 {patternIndex + 1}/{totalPatterns}: {patternName}
              </p>
            </div>
          </div>

          <div className='flex items-center space-x-4'>
            <div className='flex items-center text-red-600'>
              <Clock className='w-5 h-5 mr-2' />
              <span className='font-mono text-lg font-bold'>
                {timeLeftText}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
