import type { Hanzi } from "@/types/index"
import type { RelatedWord } from "@/types/index"

// Select hanzi by splitting into textBook vs normal based on relatedWords.isTextBook
// Returns selected arrays sized to match pattern needs

interface GradePattern {
  type: string
  name: string
  description: string
  questionCount: number
  isTextBook?: boolean
}

export const selectHanziForPatterns = (
  hanziList: Hanzi[],
  gradePatterns: GradePattern[]
) => {
  const totalQuestions = gradePatterns.reduce(
    (sum: number, p: GradePattern) => sum + (p?.questionCount || 0),
    0
  )
  const textBookNeeded = gradePatterns
    .filter((p: GradePattern) => p?.isTextBook)
    .reduce((sum: number, p: GradePattern) => sum + (p?.questionCount || 0), 0)
  const normalNeeded = totalQuestions - textBookNeeded

  const isTextBookWord = (rw: RelatedWord | RelatedWord[] | undefined): boolean => {
    if (!rw) return false
    if (Array.isArray(rw)) return rw.some((w: RelatedWord) => w?.isTextBook)
    return !!rw.isTextBook
  }

  const textBookHanzi = hanziList.filter((h: Hanzi) =>
    isTextBookWord(h.relatedWords)
  )
  const normalHanzi = hanziList.filter(
    (h: Hanzi) => !isTextBookWord(h.relatedWords)
  )

  const shuffledTextBook = [...textBookHanzi].sort(() => Math.random() - 0.5)
  const shuffledNormal = [...normalHanzi].sort(() => Math.random() - 0.5)

  const selectedTextBookHanzi = shuffledTextBook.slice(0, textBookNeeded)
  const selectedNormalHanzi = shuffledNormal.slice(0, normalNeeded)

  return {
    selectedTextBookHanzi,
    selectedNormalHanzi,
    totalQuestions,
    textBookNeeded,
    normalNeeded,
  }
}
