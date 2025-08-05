import { Loader2 } from "lucide-react"

interface LoadingSpinnerProps {
  message?: string
  size?: "sm" | "md" | "lg"
}

export default function LoadingSpinner({
  message = "로딩 중...",
  size = "md",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  }

  return (
    <div className='flex flex-col items-center justify-center py-8'>
      <Loader2
        className={`${sizeClasses[size]} text-blue-500 animate-spin mb-4`}
      />
      <p className='text-gray-600 text-sm'>{message}</p>
    </div>
  )
}
