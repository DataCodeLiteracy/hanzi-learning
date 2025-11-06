import type {
  ExamQuestionDetail,
  CorrectAnswerItem,
  SentenceReadingQuestionData,
} from "@/types/exam"

export const generateCorrectAnswers = (
  structuredQuestions: ExamQuestionDetail[]
) => {
  const correctAnswers: CorrectAnswerItem[] = []
  structuredQuestions.forEach((question, index) => {
    let correctAnswer: string | number | null = null
    switch (question.type) {
      case "sound":
        correctAnswer = question.sound
        break
      case "meaning":
        correctAnswer = question.character
        break
      case "word_reading": {
        const relatedWords = question.relatedWords
        const korean =
          Array.isArray(relatedWords) && relatedWords.length > 0
            ? relatedWords[0]?.korean
            : !Array.isArray(relatedWords)
            ? relatedWords?.korean
            : undefined
        correctAnswer = korean || question.sound || ""
        break
      }
      case "word_meaning":
        correctAnswer = question.character
        break
      case "blank_hanzi":
        correctAnswer = question.character
        break
      case "word_meaning_select": {
        // correctAnswerIndex가 없으면 문제가 있으므로 로그 출력
        const correctAnswerIndex = (question as any).correctAnswerIndex
        console.log(`🔍 generateCorrectAnswers - word_meaning_select:`, {
          questionIndex: index,
          questionId: question.id,
          character: question.character,
          correctAnswerIndex: correctAnswerIndex,
          correctAnswer: correctAnswerIndex ?? 1,
          hasCorrectAnswerIndex: correctAnswerIndex !== undefined && correctAnswerIndex !== null,
          questionObjectKeys: Object.keys(question), // 객체 키 확인
          questionObject: question, // 전체 객체 확인
        })
        
        if (correctAnswerIndex === undefined || correctAnswerIndex === null) {
          console.error(
            `⚠️ generateCorrectAnswers - word_meaning_select에 correctAnswerIndex가 없습니다:`,
            {
              questionIndex: index,
              questionId: question.id,
              character: question.character,
              options: (question as any).options,
              allKeys: Object.keys(question),
            }
          )
        }
        
        correctAnswer = correctAnswerIndex ?? 1
        break
      }
      case "hanzi_write":
        correctAnswer = `${question.meaning} ${question.sound}`
        break
      case "word_reading_write":
        correctAnswer =
          question.correctAnswer ||
          question.textBookWord?.korean ||
          question.sound ||
          ""
        break
      case "sentence_reading": {
        // 문제 생성 시점에 이미 correctAnswer가 설정되어 있으면 그것을 사용
        const sentenceQuestion = question as SentenceReadingQuestionData
        const relatedWords = sentenceQuestion.relatedWords
        const textBookWordKorean =
          Array.isArray(relatedWords) &&
          relatedWords.find((rw) => rw?.isTextBook)?.korean
        const singleRelatedWordKorean =
          !Array.isArray(relatedWords) && relatedWords?.isTextBook
            ? relatedWords.korean
            : null

        correctAnswer =
          sentenceQuestion.correctAnswer ||
          sentenceQuestion.textBookWord?.korean ||
          textBookWordKorean ||
          singleRelatedWordKorean ||
          sentenceQuestion.sound ||
          ""
        break
      }
    }
    correctAnswers.push({
      questionIndex: index,
      type: question.type,
      character: question.character,
      correctAnswer: correctAnswer ?? "",
    })
  })

  // 정답 배열 생성 후 word_meaning_select 패턴 확인
  const wmSelectAnswers = correctAnswers.filter(
    (ca) => ca.type === "word_meaning_select"
  )
  if (wmSelectAnswers.length > 0) {
    console.log(`📋 generateCorrectAnswers - word_meaning_select 정답 배열:`, wmSelectAnswers)
  }

  return correctAnswers
}
