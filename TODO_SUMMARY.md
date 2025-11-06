# Lint Warnings 및 Type Safety 개선 작업

## 작업 목표
- any 타입을 적절한 타입으로 교체하여 타입 안전성 향상
- Lint 경고 해결 (unused vars, exhaustive-deps)
- img 태그를 Next.js Image 컴포넌트로 변경

## 완료된 작업 ✅

### 1. 브랜치 생성
- 브랜치: `fix/lint-warnings-and-type-safety`

### 2. any 타입을 적절한 타입으로 교체 (모두 완료)
다음 파일들에서 any 타입을 구체적인 타입으로 교체했습니다:

- ✅ `src/lib/examGeneration/examAiService.ts` (10개+)
- ✅ `src/lib/examGeneration/selectHanzi.ts` (9개)
- ✅ `src/lib/optionUtils.ts` (9개)
- ✅ `src/lib/examGeneration/generateQuestionsByPattern.ts` (5개)
- ✅ `src/lib/apiClient.ts` (7개)
- ✅ `src/app/games/exam/[grade]/page.tsx` (30개+)
- ✅ `src/app/games/exam/page.tsx` (10개)
- ✅ `src/hooks/useExamActions.ts` (7개)

### 3. 사용하지 않는 변수 처리 (대부분 완료)
- ✅ 사용하지 않는 변수 제거 또는 `_` prefix 추가
- ✅ 사용하지 않는 import 제거

### 4. React Hook 의존성 배열 수정 (대부분 완료)
- ✅ `admin/page.tsx`, `admin/writing-gallery/page.tsx`
- ✅ `exam/[grade]/page.tsx` (5개)
- ✅ `exam/[grade]/result/page.tsx`, `exam/[grade]/wrong-answers/page.tsx`
- ✅ `exam/page.tsx`, `memory/page.tsx` (5개)
- ✅ `partial/page.tsx`, `quiz/page.tsx` (각 3개)
- ✅ `writing/gallery/page.tsx`, `writing/upload/page.tsx`
- ✅ `hanzi/list/page.tsx` (2개), `page.tsx` (4개)
- ✅ `profile/statistics/exam/page.tsx`, `profile/statistics/hanzi/page.tsx`
- ✅ `textbook-words/page.tsx` (2개), `contexts/SelectedHanziContext.tsx`
- ✅ `hooks/useTimeTracking.ts`

### 5. Unused eslint-disable 제거 (완료)
- ✅ `contexts/DataContext.tsx` (2개)
- ✅ `lib/examLogger.ts`

---

## 남아있는 Lint 경고 분석

### 🔵 보류 항목 (의도적으로 `_` prefix 사용 - 향후 사용 예정)

이 항목들은 의도적으로 보류한 것으로, 향후 사용할 가능성이 있어 삭제하지 않고 `_` prefix를 사용했습니다.

#### 1. 사용하지 않는 변수 (의도적 보류)
- ✅ `src/app/admin/page.tsx:21` - `_authLoading`
- ✅ `src/app/games/exam/[grade]/page.tsx:85` - `_currentDuration`
- ✅ `src/app/games/exam/[grade]/page.tsx:102` - `_handleNextPattern`
- ✅ `src/app/games/exam/[grade]/page.tsx:115` - `_setIsSubmitting`
- ✅ `src/app/games/exam/[grade]/page.tsx:116` - `_computeScore`
- ✅ `src/app/games/exam/[grade]/result/page.tsx:54` - `_userStatistics`
- ✅ `src/app/games/exam/page.tsx:32` - `_userStatistics`
- ✅ `src/app/profile/page.tsx:49` - `_authLoading`
- ✅ `src/app/profile/page.tsx:54` - `_userStatistics`
- ✅ `src/app/profile/statistics/game/page.tsx:25` - `_authLoading`
- ✅ `src/app/profile/statistics/hanzi/page.tsx:23` - `_initialLoading`
- ✅ `src/components/exam/WrongAnswersModal.tsx:34` - `_passed`
- ✅ `src/contexts/DataContext.tsx:267` - `_gameType`
- ✅ `src/contexts/DataContext.tsx:268` - `_stats`

**상태**: 의도적으로 보류 (향후 사용 예정)

---

### 🔴 해결해야 할 항목 (React Hook exhaustive-deps)

이 항목들은 실제로 해결해야 하는 문제입니다.

#### 1. 불필요한 의존성 제거
- ⚠️ `src/app/games/exam/[grade]/page.tsx:531` - `classifyAndSelectHanzi` (불필요한 의존성)
- ⚠️ `src/app/games/exam/[grade]/page.tsx:750` - `currentGradeInfo.timeLimit`, `dataLoading` (불필요한 의존성)

#### 2. 누락된 의존성 추가 또는 함수를 useCallback으로 감싸기
- ⚠️ `src/app/hanzi/list/page.tsx:73` - `calculateLearningStats` 함수를 `useCallback`으로 감싸야 함
- ⚠️ `src/app/textbook-words/page.tsx:90` - `extractTextbookWords` 의존성 추가 필요
- ⚠️ `src/contexts/SelectedHanziContext.tsx:86` - `getSelected` 함수를 `useCallback`으로 감싸야 함

---

## 새로운 TODO 목록

### TODO 31: React Hook exhaustive-deps 수정 - exam/[grade]/page.tsx (불필요한 의존성 제거)
- [ ] `classifyAndSelectHanzi` 의존성 제거 (line 531)
- [ ] `currentGradeInfo.timeLimit`, `dataLoading` 의존성 제거 (line 750)

### TODO 32: React Hook exhaustive-deps 수정 - hanzi/list/page.tsx
- [ ] `calculateLearningStats` 함수를 `useCallback`으로 감싸기 (line 73)

### TODO 33: React Hook exhaustive-deps 수정 - textbook-words/page.tsx
- [ ] `extractTextbookWords` 의존성 추가 또는 `useCallback`으로 감싸기 (line 90)

### TODO 34: React Hook exhaustive-deps 수정 - contexts/SelectedHanziContext.tsx
- [ ] `getSelected` 함수를 `useCallback`으로 감싸기 (line 86)

---

## 다음 단계
1. ✅ 사용하지 않는 변수 확인 및 제거 (의도적 보류 항목은 `_` prefix 유지)
2. ⚠️ React Hook 의존성 배열 점검 및 수정 (TODO 31-34)
3. ✅ img 태그를 Next.js Image로 변경 (완료)
4. ⚠️ 전체 린트 검사 및 최종 확인 (TODO 31-34 완료 후)
