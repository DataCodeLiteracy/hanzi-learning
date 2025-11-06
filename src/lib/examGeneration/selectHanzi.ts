// Select hanzi by splitting into textBook vs normal based on relatedWords.isTextBook
// Returns selected arrays sized to match pattern needs

export const selectHanziForPatterns = (
  hanziList: any[],
  gradePatterns: any[]
) => {
  const totalQuestions = gradePatterns.reduce(
    (sum: number, p: any) => sum + (p?.questionCount || 0),
    0
  )
  const textBookNeeded = gradePatterns
    .filter((p: any) => p?.isTextBook)
    .reduce((sum: number, p: any) => sum + (p?.questionCount || 0), 0)
  const normalNeeded = totalQuestions - textBookNeeded

  const isTextBookWord = (rw: any) => {
    if (!rw) return false
    if (Array.isArray(rw)) return rw.some((w: any) => w?.isTextBook)
    return !!rw.isTextBook
  }

  const textBookHanzi = hanziList.filter((h: any) =>
    isTextBookWord(h.relatedWords)
  )
  const normalHanzi = hanziList.filter(
    (h: any) => !isTextBookWord(h.relatedWords)
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
