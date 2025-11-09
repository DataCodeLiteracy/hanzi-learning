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
  questionIndex: number,
  allHanziList: Hanzi[] = []
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
    case "sound_same": {
      // sound_same 패턴: 같은 sound를 가진 다른 한자를 정답으로 선택
      if (!allHanziList || allHanziList.length === 0) {
        console.warn(`⚠️ sound_same 패턴: allHanziList가 비어있음`, {
          character: hanzi.character,
          sound: hanzi.sound,
          allHanziListLength: allHanziList?.length || 0,
        })
        return null
      }
      
      // 같은 sound를 가진 다른 한자들 찾기
      const sameSoundHanzi = allHanziList.filter(
        (h) => h.sound === hanzi.sound && h.character !== hanzi.character
      )
      
      console.log(`🔍 sound_same 패턴 디버깅:`, {
        character: hanzi.character,
        sound: hanzi.sound,
        allHanziListLength: allHanziList.length,
        sameSoundHanziCount: sameSoundHanzi.length,
        sameSoundHanzi: sameSoundHanzi.map(h => h.character),
      })
      
      if (sameSoundHanzi.length === 0) {
        // 같은 sound를 가진 다른 한자가 없으면 문제 생성 불가
        console.warn(`⚠️ sound_same 패턴: 같은 sound를 가진 다른 한자가 없음`, {
          character: hanzi.character,
          sound: hanzi.sound,
          allHanziListLength: allHanziList.length,
        })
        return null
      }
      
      // 랜덤하게 하나 선택
      const randomIndex = Math.floor(Math.random() * sameSoundHanzi.length)
      const correctAnswerHanzi = sameSoundHanzi[randomIndex]
      
      question.correctAnswer = correctAnswerHanzi.character
      console.log(`✅ sound_same 패턴 생성 성공:`, {
        questionCharacter: hanzi.character,
        questionSound: hanzi.sound,
        correctAnswer: correctAnswerHanzi.character,
        correctAnswerSound: correctAnswerHanzi.sound,
      })
      break
    }
    default:
      break
  }

  return question as ExamQuestionDetail
}
