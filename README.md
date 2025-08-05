# 한자 학습 앱

한자 진흥회 데이터를 기반으로 한 한자 학습 게임 애플리케이션입니다.

## 🎯 주요 기능

### 게임 기능

- **카드 뒤집기 게임**: 같은 한자를 찾는 메모리 게임
- **퀴즈 게임**: 한자의 뜻과 음을 맞추는 게임
- **쓰기 연습**: Hanzi Writer를 활용한 획순 따라 쓰기
- **부분 맞추기**: 한자의 일부만 보고 맞추는 게임

### 사용자 시스템

- Google 로그인 (Firebase Authentication)
- 개인별 학습 데이터 저장
- 경험치 및 레벨 시스템
- 학습 통계 및 분석

### 관리자 기능

- 한자 데이터 관리 (등급별)
- 한자 추가/수정/삭제
- 등급별 필터링

## 🛠️ 기술 스택

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Firebase (Authentication, Firestore)
- **라이브러리**: Lucide React, Hanzi Writer

## 🚀 시작하기

### 1. 프로젝트 클론

```bash
git clone <repository-url>
cd hanzi-learning
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

```bash
cp .env.local.example .env.local
```

`.env.local` 파일을 열고 Firebase 프로젝트 설정을 입력하세요:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Firebase 설정

1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트 생성
2. Authentication에서 Google 로그인 활성화
3. Firestore Database 생성
4. 프로젝트 설정에서 웹 앱 추가
5. 환경 변수에 설정값 입력

### 5. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 애플리케이션을 확인할 수 있습니다.

## 📁 프로젝트 구조

```
src/
├── app/                    # Next.js App Router
│   ├── admin/             # 관리자 페이지
│   └── games/             # 게임 페이지들
├── components/             # 공통 컴포넌트
├── contexts/              # React Context
├── lib/                   # 유틸리티 및 설정
├── services/              # 비즈니스 로직
└── types/                 # TypeScript 타입 정의
```

## 🎮 게임 설명

### 카드 뒤집기 게임

- 10개 이상의 한자 카드가 5초간 보여진 후 뒤집어집니다
- 같은 한자 쌍을 찾아 점수를 획득합니다

### 퀴즈 게임

- 한자의 뜻이나 음을 4지선다로 맞춥니다
- 정답 시 경험치를 획득합니다

### 쓰기 연습

- Hanzi Writer 라이브러리를 사용하여 획순을 따라 한자를 씁니다
- 정확도에 따라 점수를 획득합니다

### 부분 맞추기 게임

- 한자를 4등분하여 1/4 부분을 랜덤하게 가립니다
- 나머지 3/4 부분만 보고 한자를 맞춥니다

## 👤 사용자 시스템

- **Google 로그인**: Firebase Authentication 사용
- **경험치 시스템**: 게임 플레이 시 경험치 획득
- **레벨 시스템**: 경험치에 따른 레벨 업
- **학습 통계**: 개인별 학습 데이터 분석

## 🔧 관리자 기능

- **접근 권한**: `admin@example.com` 이메일로 로그인 시 접근 가능
- **한자 관리**: 등급별 한자 추가/수정/삭제
- **데이터 관리**: Firestore를 통한 데이터 관리

## 📊 데이터 구조

### Firestore Collections

- `users`: 사용자 정보
- `hanzi`: 한자 데이터
- `learningSessions`: 학습 세션 데이터
- `userStatistics`: 사용자 통계

## 🚀 배포

### Vercel 배포 (권장)

```bash
npm run build
```

Vercel에 연결하여 자동 배포를 설정할 수 있습니다.

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 📞 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해주세요.
