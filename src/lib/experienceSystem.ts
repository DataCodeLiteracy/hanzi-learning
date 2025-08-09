/**
 * 게임별 경험치 가중치
 * 카드 뒤집기 : 퀴즈 : 쓰기 연습 : 부분 맞추기 = 2 : 1 : 3 : 1
 */
export const GAME_EXPERIENCE_WEIGHTS = {
  memory: 2, // 카드 뒤집기 - 게임 완료 시 2EXP
  quiz: 1, // 퀴즈 - 게임 완료 시 1EXP
  writing: 3, // 쓰기 연습 - 게임 완료 시 3EXP
  partial: 1, // 부분 맞추기 - 게임 완료 시 1EXP
} as const

/**
 * 기본 경험치 (가중치 1 기준)
 */
export const BASE_EXPERIENCE = 1

/**
 * 게임별 경험치 계산
 * @param gameType 게임 타입
 * @returns 경험치 (게임 완료 시 고정값)
 */
export const calculateGameExperience = (
  gameType: keyof typeof GAME_EXPERIENCE_WEIGHTS
): number => {
  return GAME_EXPERIENCE_WEIGHTS[gameType]
}

/**
 * 카드 뒤집기 게임 경험치 계산 (난이도와 카드 수에 따라 차등)
 * @param difficulty 난이도 ('easy' | 'medium' | 'hard')
 * @param totalPairs 총 카드 쌍 수
 * @returns 경험치
 */
export const calculateMemoryGameExperience = (
  difficulty: "easy" | "medium" | "hard",
  totalPairs: number
): number => {
  // 카드 수에 따른 기본 경험치 (기존 +2)
  let baseExp = 0
  if (totalPairs <= 8) {
    // 4x4 (8쌍)
    baseExp = 4
  } else if (totalPairs <= 12) {
    // 4x6 (12쌍)
    baseExp = 5
  } else {
    // 4x8 (16쌍) 이상
    baseExp = 6
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

/**
 * 레벨별 필요 경험치 계산 (누적 방식)
 * 레벨 1: 0점
 * 레벨 2: 100점
 * 레벨 3: 250점 (100 + 150)
 * 레벨 4: 450점 (250 + 200)
 * 레벨 5: 700점 (450 + 250)
 * 레벨 6: 1000점 (700 + 300)
 * 레벨 7: 1350점 (1000 + 350)
 * 레벨 8: 1750점 (1350 + 400)
 * 레벨 9: 2200점 (1750 + 450)
 * 레벨 10: 2700점 (2200 + 500)
 * ...
 * 레벨 50: 약 50,000점 (쉬운 구간 끝)
 * 레벨 51: 약 60,000점 (어려운 구간 시작)
 * ...
 * 레벨 100: 1,000,000점
 *
 * 증가 패턴: 1~50은 쉽게, 51~100은 어렵게
 * 레벨 2 → 3: 150 경험치
 * 레벨 3 → 4: 200 경험치
 * 레벨 4 → 5: 250 경험치
 * ...
 */
export const calculateRequiredExperience = (level: number): number => {
  if (level <= 1) return 0
  if (level === 2) return 100

  // 레벨 2부터 시작하여 누적 계산
  let totalExp = 100 // 레벨 2까지의 경험치
  let increment = 150 // 레벨 3부터의 증가량

  for (let i = 3; i <= level; i++) {
    totalExp += increment
    // 레벨에 따라 증가량 조정
    if (i <= 50) {
      increment += 50 // 1~50: 쉬운 구간, 50씩 증가
    } else if (i <= 80) {
      increment += 600 // 51~80: 어려운 구간, 600씩 증가
    } else {
      increment += 1200 // 81~100: 매우 어려운 구간, 1200씩 증가
    }
  }

  return totalExp
}

/**
 * 현재 경험치로 레벨 계산
 * @param experience 총 경험치
 * @returns 현재 레벨
 */
export const calculateLevel = (experience: number): number => {
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
 * 다음 레벨까지 필요한 경험치 계산
 * @param currentExperience 현재 경험치
 * @returns 다음 레벨까지 필요한 경험치
 */
export const calculateExperienceToNextLevel = (
  currentExperience: number
): number => {
  const currentLevel = calculateLevel(currentExperience)
  const nextLevelRequired = calculateRequiredExperience(currentLevel + 1)
  return nextLevelRequired - currentExperience
}

/**
 * 레벨업 진행률 계산 (0-1)
 * @param currentExperience 현재 경험치
 * @returns 진행률 (0-1)
 */
export const calculateLevelProgress = (currentExperience: number): number => {
  const currentLevel = calculateLevel(currentExperience)
  const currentLevelRequired = calculateRequiredExperience(currentLevel)
  const nextLevelRequired = calculateRequiredExperience(currentLevel + 1)

  const progressInLevel = currentExperience - currentLevelRequired
  const totalLevelExp = nextLevelRequired - currentLevelRequired

  return Math.min(1, Math.max(0, progressInLevel / totalLevelExp))
}
