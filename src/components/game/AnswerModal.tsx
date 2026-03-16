import { CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react"
import { GameQuestion } from "@/hooks/useGameLogic"

interface AnswerModalProps {
  isOpen: boolean
  question: GameQuestion
  selectedAnswer: string | null
  isCorrect: boolean | null
  /** 현재 콤보 수 (정답 연속 횟수) */
  comboStreak?: number
  /** 콤보를 유지하면서 남은 '모르겠음' 기회 (0~3) */
  dontKnowRemainingForCombo?: number
  /** 이 한자 데이터에 문제가 있다고 신고 (한자 목록에서 모달로 확인·삭제용) */
  onReportDataIssue?: (hanziId: string) => void
  /** 현재 신고 요청 중인 한자 ID (버튼 로딩 표시) */
  reportLoadingHanziId?: string | null
  /** 방금 신고 완료된 한자 ID (버튼 성공 표시) */
  reportSuccessHanziId?: string | null
}

export default function AnswerModal({
  isOpen,
  question,
  selectedAnswer,
  isCorrect,
  comboStreak,
  dontKnowRemainingForCombo,
  onReportDataIssue,
  reportLoadingHanziId,
  reportSuccessHanziId,
}: AnswerModalProps) {
  if (!isOpen || !selectedAnswer) return null

  const isDontKnow = selectedAnswer === "모르겠음"
  const hasComboInfo = typeof comboStreak === "number"
  const hasDontKnowInfo = typeof dontKnowRemainingForCombo === "number"
  const currentCombo = hasComboInfo ? comboStreak! : 0
  // 문제당 점수/보너스는 이 모달에서 노출하지 않음 (콤보 상태만 표시)

  return (
    <div className='fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-start pt-16 sm:pt-20'>
      {/* 헤더 높이를 고려해 상단에서부터 시작, 내부에서만 스크롤 */}
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-3 sm:mx-4 text-center max-h-[calc(100vh-6rem)] overflow-y-auto'>
        <div className='p-6 sm:p-7'>
        <div className='mb-4'>
          {isCorrect === true ? (
            <>
              <CheckCircle className='h-12 w-12 text-green-500 mx-auto mb-3' />
              <h3 className='text-xl font-bold text-gray-900 mb-2'>
                정답입니다!
              </h3>
              <p className='text-green-600 text-base'>잘 하셨습니다!</p>
              {hasComboInfo && (
                <p className='mt-2 text-sm text-green-700'>
                  현재{" "}
                  <span className='font-bold'>{currentCombo}콤보</span>
                  입니다.
                </p>
              )}
            </>
          ) : isDontKnow ? (
            <>
              <CheckCircle className='h-12 w-12 text-blue-500 mx-auto mb-3' />
              <h3 className='text-xl font-bold text-gray-900 mb-2'>
                정답을 확인해보세요
              </h3>
              <p className='text-gray-600 text-base'>이 한자를 기억해두세요</p>
              {hasDontKnowInfo && (
                <>
                  {currentCombo > 0 ? (
                    <p className='mt-2 text-sm text-blue-600'>
                      {dontKnowRemainingForCombo > 0 ? (
                        <>
                          콤보 유지 상태입니다. &quot;모르겠음&quot; 가능{" "}
                          <span className='font-semibold'>
                            {dontKnowRemainingForCombo}회
                          </span>
                          남았습니다.
                        </>
                      ) : (
                        <>다음 &quot;모르겠음&quot;부터 콤보가 초기화됩니다.</>
                      )}
                    </p>
                  ) : (
                    <p className='mt-2 text-sm text-gray-600'>
                      아직 콤보가 쌓이기 전이에요.
                    </p>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <XCircle className='h-12 w-12 text-red-500 mx-auto mb-3' />
              <h3 className='text-xl font-bold text-gray-900 mb-2'>
                틀렸습니다
              </h3>
              <p className='text-gray-600 text-base'>정답을 확인해보세요</p>
              {hasComboInfo && currentCombo === 0 && (
                <p className='mt-2 text-sm text-red-600'>
                  아직 콤보가 쌓이기 전이에요.
                </p>
              )}
            </>
          )}
        </div>

        <div className='bg-gray-50 rounded-xl p-4 sm:p-5 mb-4'>
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
              <div className='flex items-center justify-between gap-2 mb-2'>
                <h4 className='text-base font-semibold text-gray-700'>
                  관련 단어
                </h4>
                {onReportDataIssue && question.hanziId && (
                  <button
                    type='button'
                    onClick={() => onReportDataIssue(question.hanziId)}
                    disabled={reportLoadingHanziId === question.hanziId}
                    className='flex items-center gap-1 px-2 py-1 text-xs text-amber-700 bg-amber-100 hover:bg-amber-200 rounded transition-colors disabled:opacity-70 disabled:cursor-not-allowed'
                    title='이 한자 데이터에 문제가 있다고 신고 (한자 목록에서 확인·삭제)'
                  >
                    {reportLoadingHanziId === question.hanziId ? (
                      <>
                        <Loader2 className='h-3.5 w-3 animate-spin' />
                        신고 중...
                      </>
                    ) : reportSuccessHanziId === question.hanziId ? (
                      <>신고됨</>
                    ) : (
                      <>
                        <AlertTriangle className='h-3.5 w-3' />
                        데이터 문제 신고
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                {question.relatedWords.slice(0, 4).map((word, index) => (
                  <div
                    key={index}
                    className='bg-white rounded-md p-2 text-base'
                  >
                    <div className='font-medium text-gray-900'>{word.hanzi}</div>
                    <div className='text-gray-600'>{word.korean}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 콤보 / 모르겠음 요약 영역 (점수 정보는 숨기고 상태만 표시) */}
        {(hasComboInfo || hasDontKnowInfo) && (
          <div className='mb-3 text-xs sm:text-sm text-gray-700 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-left'>
            {hasComboInfo && (
              <div className='flex justify-between items-center mb-1'>
                <span className='font-medium text-gray-800'>현재 콤보</span>
                <span className='font-bold text-blue-700'>
                  {currentCombo}콤보
                </span>
              </div>
            )}
            {hasDontKnowInfo && isDontKnow && (
              <div className='mt-1 text-blue-700'>
                {currentCombo > 0 ? (
                  <>
                    콤보를 유지한 채로 사용할 수 있는 &quot;모르겠음&quot;이{" "}
                    <span className='font-semibold'>
                      {dontKnowRemainingForCombo > 0
                        ? `${dontKnowRemainingForCombo}번`
                        : "더 이상 없음"}
                    </span>
                    입니다.
                  </>
                ) : (
                  <span className='text-red-600'>
                    아직 콤보가 쌓이기 전이에요.
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        <div className='mt-1 text-xs text-gray-400'>
          잠시 후 자동으로 다음 문제로 넘어갑니다.
        </div>
        </div>
      </div>
    </div>
  )
}
