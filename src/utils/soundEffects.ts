/**
 * 게임 효과음 유틸리티
 * Web Audio API를 사용하여 간단한 효과음을 생성합니다.
 * 시스템 볼륨과 독립적으로 코드에서 볼륨을 제어할 수 있습니다.
 */

// 오디오 컨텍스트 생성 (싱글톤)
let audioContext: AudioContext | null = null

// 전역 볼륨 설정 (0.0 ~ 1.0, 기본값 0.6)
let globalVolume: number = 0.6

/**
 * 전역 볼륨 설정 (0.0 ~ 1.0)
 */
export function setSoundVolume(volume: number): void {
  globalVolume = Math.max(0, Math.min(1, volume))
}

/**
 * 현재 전역 볼륨 가져오기
 */
export function getSoundVolume(): number {
  return globalVolume
}

/**
 * 오디오 컨텍스트 가져오기 (브라우저 호환성 처리)
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null

  if (!audioContext) {
    try {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext
      audioContext = new AudioContextClass()
    } catch (error) {
      console.warn("AudioContext를 생성할 수 없습니다:", error)
      return null
    }
  }

  // 일시정지된 상태면 재개
  if (audioContext.state === "suspended") {
    audioContext.resume()
  }

  return audioContext
}

/**
 * 톤 생성 및 재생 (ADSR 엔벨로프 포함)
 */
function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  relativeVolume: number = 0.5,
  startTime: number = 0
): void {
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    const now = ctx.currentTime + startTime

    // 전역 볼륨 적용 (최대 1.0으로 제한)
    const finalVolume = Math.min(1.0, relativeVolume * globalVolume)

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.frequency.value = frequency
    oscillator.type = type

    // ADSR 엔벨로프: Attack, Decay, Sustain, Release
    const attackTime = 0.05
    const decayTime = 0.1
    const sustainLevel = finalVolume * 0.7
    const releaseTime = duration - attackTime - decayTime - 0.1

    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(finalVolume, now + attackTime) // Attack
    gainNode.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime) // Decay
    gainNode.gain.setValueAtTime(sustainLevel, now + attackTime + decayTime) // Sustain
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration) // Release

    oscillator.start(now)
    oscillator.stop(now + duration)
  } catch (error) {
    console.warn("효과음 재생 실패:", error)
  }
}

/**
 * 정답 효과음 (밝고 긍정적인 멜로디, 약 2초)
 */
export function playCorrectSound(): void {
  const ctx = getAudioContext()
  if (!ctx) return

  // 상승하는 멜로디: C5 -> E5 -> G5 (도-미-솔)
  // 볼륨을 더 크게 설정 (0.6 ~ 0.8)
  playTone(523.25, 0.4, "sine", 0.6, 0) // C5
  playTone(659.25, 0.4, "sine", 0.7, 0.15) // E5
  playTone(783.99, 0.5, "sine", 0.8, 0.3) // G5
  
  // 하모니 추가 (옥타브 위)
  playTone(1046.5, 0.6, "sine", 0.6, 0.5) // C6
  playTone(1318.51, 0.7, "sine", 0.7, 0.8) // E6
  
  // 마무리 톤
  playTone(1567.98, 0.5, "sine", 0.6, 1.2) // G6
}

/**
 * 오답 효과음 (낮고 부정적인 톤, 약 2초)
 */
export function playWrongSound(): void {
  const ctx = getAudioContext()
  if (!ctx) return

  // 하강하는 낮은 톤들 (볼륨을 더 크게 설정)
  playTone(196, 0.5, "sawtooth", 0.6, 0) // G3
  playTone(174.61, 0.5, "sawtooth", 0.6, 0.3) // F3
  playTone(155.56, 0.6, "sawtooth", 0.7, 0.6) // D#3
  playTone(146.83, 0.6, "sawtooth", 0.6, 1.0) // D3
}

/**
 * 모르겠음 효과음 (중립적인 톤, 약 2초)
 */
export function playDontKnowSound(): void {
  const ctx = getAudioContext()
  if (!ctx) return

  // 중간 톤의 부드러운 멜로디 (볼륨을 더 크게 설정)
  playTone(392, 0.5, "sine", 0.5, 0) // G4
  playTone(440, 0.5, "sine", 0.5, 0.4) // A4
  playTone(392, 0.6, "sine", 0.45, 0.8) // G4
  playTone(349.23, 0.5, "sine", 0.4, 1.2) // F4
}

