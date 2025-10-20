import { Loader2, Brain, Sparkles } from "lucide-react"

interface LoadingSpinnerProps {
  message?: string
  size?: "sm" | "md" | "lg"
  variant?: "default" | "ai" | "grading"
}

export default function LoadingSpinner({
  message = "로딩 중...",
  size = "md",
  variant = "default",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  }

  const getSpinnerIcon = () => {
    switch (variant) {
      case "ai":
        return (
          <div className='relative'>
            <Brain
              className={`${sizeClasses[size]} text-blue-500 animate-pulse`}
            />
            <Sparkles className='absolute -top-1 -right-1 h-3 w-3 text-yellow-400 animate-bounce' />
          </div>
        )
      case "grading":
        return (
          <div className='relative'>
            <div
              className={`${sizeClasses[size]} border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin`}
            ></div>
            <div className='absolute inset-0 flex items-center justify-center'>
              <div className='w-2 h-2 bg-blue-600 rounded-full animate-ping'></div>
            </div>
          </div>
        )
      default:
        return (
          <Loader2
            className={`${sizeClasses[size]} text-blue-500 animate-spin`}
          />
        )
    }
  }

  return (
    <div className='flex flex-col items-center justify-center min-h-screen'>
      {getSpinnerIcon()}
      <p className='text-gray-600 text-sm mt-4'>{message}</p>
    </div>
  )
}
