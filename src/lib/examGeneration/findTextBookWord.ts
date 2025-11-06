import type { Hanzi } from "@/types/index"
import type { RelatedWord } from "@/types/index"

export const findTextBookWord = (hanzi: Hanzi): RelatedWord | null => {
  if (!hanzi?.relatedWords) return null
  if (Array.isArray(hanzi.relatedWords)) {
    return (
      hanzi.relatedWords.find((word: RelatedWord) => word?.isTextBook) || null
    )
  }
  return null // Hanzi 타입의 relatedWords는 항상 배열이므로 이 분기는 실행되지 않음
}
