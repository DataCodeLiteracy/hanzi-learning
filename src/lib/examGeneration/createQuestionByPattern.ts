import { aiPrompts } from "@/lib/aiPrompts"
import { convertMeaningToNatural } from "@/lib/convertMeaningToNatural"
import { findTextBookWord } from "./findTextBookWord"
import type { ExamQuestionDetail } from "@/types/exam"
import type { Hanzi } from "@/types/index"

interface GradePattern {
  type: string
  name?: string
  description?: string
  questionCount: number
  isTextBook?: boolean
}

export const createQuestionByPattern = (
  pattern: GradePattern,
  hanzi: Hanzi,
  questionIndex: number
): ExamQuestionDetail | null => {
  const question: Partial<ExamQuestionDetail> = {
    id: `q_${questionIndex}`,
    type: pattern.type as ExamQuestionDetail["type"],
    character: hanzi.character,
    meaning: hanzi.meaning,
    sound: hanzi.sound,
    relatedWords: Array.isArray(hanzi.relatedWords)
      ? hanzi.relatedWords[0] || undefined
      : hanzi.relatedWords || undefined,
    aiText: "",
  }

  switch (pattern.type) {
    case "word_reading_write": {
      const textBookWord8 = findTextBookWord(hanzi)
      if (!textBookWord8) return null
      question.textBookWord = textBookWord8
      question.correctAnswer = textBookWord8.korean
      break
    }
    case "blank_hanzi": {
      const textBookWord5 = findTextBookWord(hanzi)
      if (!textBookWord5) return null
      question.aiText = aiPrompts.blank_hanzi.userPrompt({
        ...hanzi,
        relatedWord: {
          hanzi: textBookWord5.hanzi,
          meaning: textBookWord5.korean,
        },
      })
      break
    }
    case "word_meaning_select": {
      const textBookWord6 = findTextBookWord(hanzi)
      if (!textBookWord6) return null
      question.textBookWord = textBookWord6
      question.aiText = aiPrompts.word_meaning_select.userPrompt({
        ...hanzi,
        character: textBookWord6.hanzi,
        meaning: textBookWord6.korean,
      })
      break
    }
    case "sentence_reading": {
      const textBookWord9 = findTextBookWord(hanzi)
      if (!textBookWord9) return null
      question.textBookWord = textBookWord9
      question.aiText = aiPrompts.sentence_reading.userPrompt({
        ...hanzi,
        character: textBookWord9.hanzi,
        meaning: textBookWord9.korean,
      })
      break
    }
    case "word_meaning": {
      const naturalMeaning = convertMeaningToNatural(hanzi.meaning)
      question.aiText = aiPrompts.word_meaning.userPrompt({
        ...hanzi,
        meaning: naturalMeaning,
      })
      break
    }
    default:
      break
  }

  return question as ExamQuestionDetail
}
