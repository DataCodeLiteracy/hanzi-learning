// 패턴 기본 정보 정의
export const patterns = {
  sound: {
    type: "sound",
    name: "한자의 음(소리) 찾기",
    description: "[ ] 안의 한자의 음(소리)으로 알맞은 것을 선택하세요.",
    needsAI: false,
  },
  meaning: {
    type: "meaning",
    name: "뜻에 맞는 한자 찾기",
    description: "[ ] 안의 뜻에 맞는 한자를 선택하세요.",
    needsAI: false,
  },
  word_reading: {
    type: "word_reading",
    name: "한자어 독음 문제",
    description: "[ ] 안의 한자어를 바르게 읽은 것을 선택하세요.",
    needsAI: false,
  },
  word_meaning: {
    type: "word_meaning",
    name: "한자어 뜻 문제",
    description: "[ ] 안의 뜻을 가진 한자를 선택하세요.",
    needsAI: true,
  },
  blank_hanzi: {
    type: "blank_hanzi",
    name: "빈칸 한자 찾기",
    description: "○에 들어갈 알맞은 한자를 선택하세요.",
    needsAI: true,
  },
  word_meaning_select: {
    type: "word_meaning_select",
    name: "한자어 뜻 찾기",
    description: "[ ] 안의 한자어의 뜻을 찾아 번호를 쓰세요.",
    needsAI: false,
  },
  hanzi_write: {
    type: "hanzi_write",
    name: "한자 뜻과 음 쓰기",
    description: "한자의 훈(뜻)과 음(소리)을 <보기>와 같이 한글로 쓰세요.",
    needsAI: false,
  },
  word_reading_write: {
    type: "word_reading_write",
    name: "한자어 독음 쓰기",
    description: "한자어의 독음(소리)을 <보기>와 같이 한글로 쓰세요.",
    needsAI: false,
  },
  sentence_reading: {
    type: "sentence_reading",
    name: "문장 독음 문제",
    description: "[ ] 안의 한자어의 독음(소리)을 선택하세요.",
    needsAI: false,
  },
} as const

export type PatternType = keyof typeof patterns
