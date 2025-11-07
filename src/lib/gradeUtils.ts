/**
 * 급수 관련 유틸리티 함수
 */

/**
 * 급수 이름 변환 (5.5 -> 준5급)
 */
export function getGradeName(grade: number): string {
  if (grade === 5.5) return "준5급"
  if (grade === 4.5) return "준4급"
  if (grade === 3.5) return "준3급"
  if (grade === 0) return "사범급"
  return `${grade}급`
}

/**
 * 다음 급수 계산
 * 급수 체계: 8급 → 7급 → 6급 → 5.5급 → 5급 → 4.5급 → 4급 → 3.5급 → 3급 → 2급 → 1급
 * @param currentGrade 현재 급수
 * @returns 다음 급수, 마지막 급수(1급)이면 null
 */
export function getNextGrade(currentGrade: number): number | null {
  const gradeProgression: number[] = [8, 7, 6, 5.5, 5, 4.5, 4, 3.5, 3, 2, 1]
  
  const currentIndex = gradeProgression.indexOf(currentGrade)
  
  if (currentIndex === -1) {
    // 현재 급수가 체계에 없으면 null 반환
    return null
  }
  
  if (currentIndex === gradeProgression.length - 1) {
    // 마지막 급수(1급)이면 null 반환
    return null
  }
  
  return gradeProgression[currentIndex + 1]
}

