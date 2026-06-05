const DEFAULT_DONT_KNOW_COMBO_LIMIT = 3

/** 한국 나이 (만 나이 아님): 올해 − 출생년도 + 1 */
export function getKoreanAge(
  birthYear: number,
  referenceYear = new Date().getFullYear()
): number {
  return referenceYear - birthYear + 1
}

/** 한국 나이 기준 콤보 유지 '모르겠음' 허용 횟수 */
export function getDontKnowLimitByKoreanAge(koreanAge: number): number {
  if (koreanAge <= 7) return 10
  if (koreanAge <= 9) return 8
  if (koreanAge <= 11) return 7
  if (koreanAge <= 13) return 5
  if (koreanAge <= 16) return 4
  return 3
}

/** 급수별 콤보 유지 '모르겠음' 허용 횟수 (콤보 진행 중) */
export function getDontKnowLimitByGrade(preferredGrade: number): number {
  if (preferredGrade <= 4.5) {
    return 3
  }
  if (preferredGrade === 8 || preferredGrade === 7) {
    return 7
  }
  if (preferredGrade === 6) {
    return 6
  }
  if (preferredGrade === 5.5 || preferredGrade === 5) {
    return 5
  }
  return DEFAULT_DONT_KNOW_COMBO_LIMIT
}

/** 출생년도 → 한국 나이 → 허용 횟수 */
export function getDontKnowLimitByBirthYear(
  birthYear: number,
  referenceYear = new Date().getFullYear()
): number {
  return getDontKnowLimitByKoreanAge(getKoreanAge(birthYear, referenceYear))
}

/**
 * 급수·나이(출생년도→한국나이) 기준 최종 '모르겠음' 허용 횟수.
 * 두 조건 모두 있으면 더 엄격한(적은) 값을 사용합니다.
 */
export function getDontKnowComboLimit(
  preferredGrade?: number,
  birthYear?: number
): number {
  const grade = preferredGrade ?? 8
  const gradeLimit = getDontKnowLimitByGrade(grade)

  if (birthYear == null || !Number.isFinite(birthYear)) {
    return gradeLimit
  }

  const ageLimit = getDontKnowLimitByBirthYear(birthYear)
  return Math.min(gradeLimit, ageLimit)
}

export function describeDontKnowComboLimit(
  preferredGrade?: number,
  birthYear?: number
): string {
  const total = getDontKnowComboLimit(preferredGrade, birthYear)
  const gradeLimit = getDontKnowLimitByGrade(preferredGrade ?? 8)
  const hasBirthYear = birthYear != null && Number.isFinite(birthYear)

  if (!hasBirthYear) {
    return `콤보 중 '모르겠음' ${total}번까지 유지 (급수 기준)`
  }

  const koreanAge = getKoreanAge(birthYear!)
  const ageLimit = getDontKnowLimitByBirthYear(birthYear!)
  if (ageLimit < gradeLimit) {
    return `콤보 중 '모르겠음' ${total}번까지 유지 (한국나이 ${koreanAge}세 기준)`
  }
  return `콤보 중 '모르겠음' ${total}번까지 유지 (급수·한국나이 중 적용)`
}

/** 초등 5학년 기준 출생년도 (안내·placeholder) */
export const FIFTH_GRADE_BIRTH_YEAR = 2015

/** 출생년도 선택 목록을 열 때 가운데에 보여줄 기준년 (선택값과 별개) */
export const BIRTH_YEAR_SELECT_SCROLL_ANCHOR = 2019

/** @deprecated FIFTH_GRADE_BIRTH_YEAR 사용 */
export const DEFAULT_BIRTH_YEAR = FIFTH_GRADE_BIRTH_YEAR

export function buildBirthYearSelectOptions(
  referenceYear = new Date().getFullYear(),
  span = 40
) {
  const startYear = referenceYear
  const endYear = referenceYear - span + 1

  return Array.from({ length: startYear - endYear + 1 }, (_, i) => {
    const year = startYear - i
    const koreanAge = getKoreanAge(year, referenceYear)
    const isFifthGrade = year === FIFTH_GRADE_BIRTH_YEAR
    return {
      value: String(year),
      label: isFifthGrade
        ? `${year}년생 · 한국나이 ${koreanAge}세 (5학년 기준)`
        : `${year}년생 · 한국나이 ${koreanAge}세`,
    }
  })
}

export function getDefaultBirthYearPlaceholder(
  referenceYear = new Date().getFullYear()
): string {
  const age = getKoreanAge(FIFTH_GRADE_BIRTH_YEAR, referenceYear)
  return `${FIFTH_GRADE_BIRTH_YEAR}년생 · 한국나이 ${age}세 (5학년 기준)`
}
