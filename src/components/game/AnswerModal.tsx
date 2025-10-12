import { CheckCircle, XCircle } from "lucide-react"
import { GameQuestion } from "@/hooks/useGameLogic"

interface AnswerModalProps {
  isOpen: boolean
  question: GameQuestion
  selectedAnswer: string | null
  isCorrect: boolean | null
}

export default function AnswerModal({
  isOpen,
  question,
  selectedAnswer,
  isCorrect,
}: AnswerModalProps) {
  if (!isOpen || !selectedAnswer) return null

  const isDontKnow = selectedAnswer === "모르겠음"

  return (
    <div className='fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50'>
      <div className='bg-white rounded-lg shadow-2xl p-6 max-w-lg w-full mx-4 text-center'>
        <div className='mb-4'>
          {isCorrect === true ? (
            <>
              <CheckCircle className='h-12 w-12 text-green-500 mx-auto mb-3' />
              <h3 className='text-xl font-bold text-gray-900 mb-2'>
                정답입니다!
              </h3>
              <p className='text-green-600 text-base'>잘 하셨습니다!</p>
            </>
          ) : isDontKnow ? (
            <>
              <CheckCircle className='h-12 w-12 text-blue-500 mx-auto mb-3' />
              <h3 className='text-xl font-bold text-gray-900 mb-2'>
                정답을 확인해보세요
              </h3>
              <p className='text-gray-600 text-base'>이 한자를 기억해두세요</p>
            </>
          ) : (
            <>
              <XCircle className='h-12 w-12 text-red-500 mx-auto mb-3' />
              <h3 className='text-xl font-bold text-gray-900 mb-2'>
                틀렸습니다
              </h3>
              <p className='text-gray-600 text-base'>정답을 확인해보세요</p>
            </>
          )}
        </div>

        <div className='bg-gray-50 rounded-lg p-4 mb-4'>
          <div className='text-5xl font-bold text-blue-600 mb-4'>
            {question.hanzi}
          </div>
          <div className='space-y-2 mb-4'>
            <div className='text-lg text-gray-700'>
              <span className='text-gray-500 font-medium'>뜻:</span>
              <span className='font-bold text-green-600 ml-2'>
                {question.meaning}
              </span>
            </div>
            <div className='text-lg text-gray-700'>
              <span className='text-gray-500 font-medium'>음:</span>
              <span className='font-bold text-green-600 ml-2'>
                {question.sound}
              </span>
            </div>
          </div>

          {/* 관련 단어 섹션 */}
          {question.relatedWords && question.relatedWords.length > 0 && (
            <div className='border-t pt-3'>
              <h4 className='text-base font-semibold text-gray-700 mb-2'>
                관련 단어
              </h4>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                {question.relatedWords.slice(0, 4).map((word, index) => (
                  <div
                    key={index}
                    className='bg-white rounded-md p-2 text-base'
                  >
                    <div className='font-medium text-gray-900'>
                      {word.hanzi}
                    </div>
                    <div className='text-gray-600'>{word.korean}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className='text-xs text-gray-500'>
          잠시 후 다음 문제로 넘어갑니다...
        </div>
      </div>
    </div>
  )
}
