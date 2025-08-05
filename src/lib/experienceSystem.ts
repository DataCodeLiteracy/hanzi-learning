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
 * 레벨별 필요 경험치 계산
 * 레벨 1: 0점
 * 레벨 2: 100점
 * 레벨 100: 2,000,000점
 * 지수적 증가로 구현
 */
export const calculateRequiredExperience = (level: number): number => {
  if (level <= 1) return 0

  // 지수적 증가 공식: 100 * (1.15 ^ (level - 2))
  // 레벨 2: 100점
  // 레벨 3: 115점
  // 레벨 10: 약 350점
  // 레벨 50: 약 5,000점
  // 레벨 100: 약 2,000,000점
  return Math.floor(100 * Math.pow(1.15, level - 2))
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
