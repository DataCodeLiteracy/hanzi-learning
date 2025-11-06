export const findTextBookWord = (hanzi: any) => {
  if (!hanzi?.relatedWords) return null
  if (Array.isArray(hanzi.relatedWords)) {
    return hanzi.relatedWords.find((word: any) => word?.isTextBook)
  }
  return hanzi.relatedWords?.isTextBook ? hanzi.relatedWords : null
}
