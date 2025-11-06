import { convertMeaningToNatural } from "@/lib/convertMeaningToNatural"
import { generateUniqueOptions as buildUniqueOptions } from "@/lib/optionUtils"

export function buildQuestionContent(questionData: any, hanziList: any[]) {
  if (!questionData) return { question: "", options: [] as string[] }

  const getOptions = (correctAnswer: string, field: string) => {
    if (questionData.options && questionData.options.length > 0) {
      return questionData.options
    }
    if (!correctAnswer || !hanziList || hanziList.length === 0) {
      return ["선택지1", "선택지2", "선택지3", "선택지4"]
    }
    const newOptions = buildUniqueOptions(correctAnswer, hanziList, field)
    questionData.options = newOptions
    return newOptions
  }

  switch (questionData.type) {
    case "sound":
      return {
        question: `[${questionData.character}] 한자의 음(소리)으로 알맞은 것을 선택하세요.`,
        options: getOptions(questionData.sound, "sound"),
      }
    case "meaning":
      return {
        question: `[${questionData.meaning}] 뜻에 맞는 한자를 선택하세요.`,
        options: getOptions(questionData.character, "character"),
      }
    case "word_reading":
      return {
        question: `[${
          questionData.relatedWords?.hanzi || questionData.character
        }] 한자어를 바르게 읽은 것을 선택하세요.`,
        options: getOptions(
          questionData.relatedWords?.korean || questionData.sound,
          "relatedWords"
        ),
      }
    case "word_meaning":
      return {
        question: `[${convertMeaningToNatural(
          questionData.meaning
        )}] 뜻을 가진 한자를 선택하세요.`,
        options: [],
      }
    case "blank_hanzi":
      return {
        question: `O에 들어갈 알맞은 한자를 보기에서 선택하세요.`,
        options: getOptions(questionData.character, "character"),
      }
    case "word_meaning_select":
      return {
        question: `[${
          questionData.textBookWord?.hanzi || questionData.character
        }]의 뜻을 고르세요.`,
        options: questionData.allOptions || questionData.options || [],
      }
    case "hanzi_write":
      return {
        question: `${questionData.character}의 훈과 음을 입력하세요. (예: 착할 선)`,
        options: [],
      }
    case "word_reading_write":
      return {
        options: [],
      }
    case "sentence_reading":
      // 정답은 textBookWord.korean (단어 음)을 사용해야 함
      const correctAnswerText =
        questionData.textBookWord?.korean ||
        questionData.relatedWords?.korean ||
        questionData.sound
      return {
        options: getOptions(correctAnswerText, "textBookWord"),
      }
    default:
      return { question: "", options: [] as string[] }
  }
}
