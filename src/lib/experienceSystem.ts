/**
 * 새로운 레벨 시스템: 점진적 증가 + 레벨별 증가폭 확대
 * 기존 방식: 100 → 150 → 200 → 250 (50씩 증가)
 * 새로운 방식: 레벨이 높아질수록 50의 증가폭이 더 커짐
 *
 * 예시:
 * 레벨 2→3: 100 EXP (기본)
 * 레벨 3→4: 150 EXP (100 + 50)
 * 레벨 4→5: 200 EXP (150 + 50)
 * 레벨 5→6: 250 EXP (200 + 50)
 * ...
 * 레벨 11→12: 600 EXP (550 + 50) × 1.5배 = 900 EXP
 * 레벨 21→22: 1050 EXP (1000 + 50) × 2.0배 = 2100 EXP
 * 레벨 31→32: 1550 EXP (1500 + 50) × 2.5배 = 3875 EXP
 */
export function calculateRequiredExperience(level: number): number {
  if (level <= 1) return 0

  let totalExp = 0
  let baseIncrement = 100 // 레벨 2→3의 기본 증가량

  for (let i = 2; i <= level; i++) {
    // 레벨이 높아질수록 증가폭을 더 크게
    let levelMultiplier = 1.0

    if (i <= 10) {
      levelMultiplier = 1.0 // 초급: 기본 증가폭
    } else if (i <= 20) {
      levelMultiplier = 1.5 // 중급: 1.5배 증가폭
    } else if (i <= 30) {
      levelMultiplier = 2.0 // 고급: 2배 증가폭
    } else if (i <= 40) {
      levelMultiplier = 2.5 // 전문가: 2.5배 증가폭
    } else if (i <= 50) {
      levelMultiplier = 3.0 // 마스터: 3배 증가폭
    } else if (i <= 60) {
      levelMultiplier = 4.0 // 극한: 4배 증가폭
    } else if (i <= 70) {
      levelMultiplier = 5.0 // 전설: 5배 증가폭
    } else if (i <= 80) {
      levelMultiplier = 6.0 // 신화: 6배 증가폭
    } else if (i <= 90) {
      levelMultiplier = 8.0 // 절대: 8배 증가폭
    } else if (i <= 99) {
      levelMultiplier = 10.0 // 궁극: 10배 증가폭
    } else {
      levelMultiplier = 100.0 // 레벨 100: 100배 증가폭
    }

    // 기본 증가량에 레벨 배수 적용
    const increment = Math.round(baseIncrement * levelMultiplier)
    totalExp += increment

    // 다음 레벨을 위해 기본 증가량 증가 (50씩)
    baseIncrement += 50
  }

  return totalExp
}

// 보너스 경험치 계산 (연속 달성일 + 목표 난이도 고려)
export function calculateBonusExperience(
  consecutiveDays: number,
  dailyGoal: number
): number {
  if (consecutiveDays < 10) return 0

  let baseBonus = 0

  // 연속 달성일별 기본 보너스
  if (consecutiveDays >= 30) {
    baseBonus = 500 // 30일 이상: 500 EXP
  } else if (consecutiveDays >= 20) {
    baseBonus = 200 // 20일 이상: 200 EXP
  } else if (consecutiveDays >= 10) {
    baseBonus = 50 // 10일 이상: 50 EXP
  }

  // 목표 난이도에 따른 차등 보너스
  // 목표가 높을수록 더 많은 보너스 (최소 1.0배, 최대 3.0배)
  const difficultyMultiplier = Math.min(Math.max(dailyGoal / 100, 1.0), 3.0)

  const totalBonus = Math.round(baseBonus * difficultyMultiplier)

  return totalBonus
}

/**
 * 현재 경험치로 레벨 계산
 */
export function calculateLevel(experience: number): number {
  if (experience < 100) return 1

  let level = 1
  let requiredExp = 0

  while (requiredExp <= experience) {
    level++
    requiredExp = calculateRequiredExperience(level)
  }

  return level - 1
}

/**
 * 현재 레벨에서 다음 레벨까지의 진행률 계산
 */
export function calculateLevelProgress(experience: number): number {
  const currentLevel = calculateLevel(experience)
  const currentLevelExp = calculateRequiredExperience(currentLevel)
  const nextLevelExp = calculateRequiredExperience(currentLevel + 1)

  if (nextLevelExp === currentLevelExp) return 1

  return (experience - currentLevelExp) / (nextLevelExp - currentLevelExp)
}

/**
 * 다음 레벨까지 필요한 경험치 계산
 */
export function calculateExperienceToNextLevel(experience: number): number {
  const currentLevel = calculateLevel(experience)
  // currentLevelExp는 현재 사용되지 않음 (향후 사용 예정)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const currentLevelExp = calculateRequiredExperience(currentLevel)
  const nextLevelExp = calculateRequiredExperience(currentLevel + 1)

  return nextLevelExp - experience
}

/**
 * 게임별 경험치 계산 (기본)
 */
export function calculateGameExperience(
  correctAnswers: number,
  wrongAnswers: number
): number {
  return correctAnswers + wrongAnswers
}

/**
 * 메모리 게임 경험치 계산 (난이도와 카드 수에 따른 차등 보상)
 */
export function calculateMemoryGameExperience(
  difficulty: "easy" | "medium" | "hard",
  totalPairs: number
): number {
  // 카드 수에 따른 기본 경험치
  let baseExp = 0
  if (totalPairs <= 8) {
    // 4x4 (8쌍)
    baseExp = 5
  } else if (totalPairs <= 12) {
    // 4x6 (12쌍)
    baseExp = 6
  } else {
    // 4x8 (16쌍) 이상
    baseExp = 7
  }

  // 난이도에 따른 추가 경험치
  switch (difficulty) {
    case "easy":
      return baseExp
    case "medium":
      return baseExp + 1
    case "hard":
      return baseExp + 2
    default:
      return baseExp
  }
}
