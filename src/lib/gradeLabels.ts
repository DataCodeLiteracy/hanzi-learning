export const PREFERRED_GRADES = [8, 7, 6, 5.5, 5, 4.5, 4, 3.5, 3] as const

export function formatGradeLabel(grade: number): string {
  if (grade === 5.5) return "준5급"
  if (grade === 4.5) return "준4급"
  if (grade === 3.5) return "준3급"
  return `${grade}급`
}

export const PREFERRED_GRADE_SELECT_OPTIONS = PREFERRED_GRADES.map((grade) => ({
  value: String(grade),
  label: formatGradeLabel(grade),
}))
