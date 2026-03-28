# Frontend Story Map

이 문서는 `frontend` 폴더를 볼 때

1. 어떤 파일을 어디서 찾아야 하는지
2. 어떤 Jira 스토리에 업로드하면 되는지

를 빠르게 판단하기 위한 가이드다.

## 1. 먼저 보는 순서

기능을 읽을 때는 아래 순서로 보면 된다.

1. `src/app/router` 또는 `src/pages`
   화면 진입점과 라우팅을 본다.
2. `src/components` 또는 페이지 내부 `components`
   화면 조각이 무엇인지 본다.
3. `src/stores`
   상태가 어디서 바뀌는지 본다.
4. `src/services`
   API, mock, 외부 호출을 본다.
5. `src/utils`, `src/mocks`, `src/types`, `src/features`
   순수 로직, 목업 데이터, 타입 정의를 본다.

업로드 기준도 비슷하다.

- UI만 바꿨으면: `UI 구현` 스토리
- 상태 전환, 단계 이동, 선택 흐름을 바꿨으면: `로직 구현` 스토리
- `services/*` 를 바꿨으면: `API 연동` 또는 `Mock 테스트` 스토리
- 공통 레이아웃/공용 컴포넌트는: 해당 기능의 가장 앞단 UI 스토리를 주 스토리로 잡고, 필요하면 보조 스토리를 코멘트로 남긴다

## 2. 전체 폴더를 기능 기준으로 읽는 법

### Auth / 계정

- `src/pages/auth`
- `src/features/auth`
- `src/services/auth*`
- `src/stores/authStore.ts`

주로 연결되는 스토리:

- `S14P21E205-106`, `107`: 역할 선택
- `S14P21E205-108`, `109`: 보호자 회원가입
- `S14P21E205-113`, `114`, `115`: 로그인
- `S14P21E205-119`: 환자 계정 생성
- `S14P21E205-123`, `124`: 팀 코드 입력/연결
- `S14P21E205-129`, `130`: 비밀번호 재설정
- `S14P21E205-140`: 온보딩

### Patient Main / 환자 메인

- `src/pages/patient/main`
- `src/services/patientCallService.ts`
- `src/services/trackingService.ts`
- `src/hooks/useDwell.ts`
- `src/hooks/useTracking.ts`

주로 연결되는 스토리:

- `S14P21E205-154`, `155`: 환자 메인 레이아웃/선택 카드
- `S14P21E205-156`, `157`: gaze 이벤트/테스트
- `S14P21E205-189`, `190`, `191`: 보호자 호출
- `S14P21E205-196`, `197`, `198`: SOS
- `S14P21E205-390`, `391`: 시선 추적 선택

### Patient Talk / 대화하기 + 맞춤대화 + 응답모드

- `src/pages/patient/talk`
- `src/components/patient/chat`
- `src/features/patient/custom-talk`
- `src/hooks/usePatientIncomingChat.tsx`
- `src/services/mockPatientChatService.ts`
- `src/services/mockSuggestionService.ts`
- `src/features/patient/talk`

주로 연결되는 스토리:

- `S14P21E205-440`, `441`: 대화하기 메인/라우팅
- `S14P21E205-442`, `443`: 보호자 선발화 수신, 응답모드, 예외/입력 차단
- `S14P21E205-169`, `170`: 보호자 메시지 기반 응답 카테고리/추천 흐름
- `S14P21E205-203`, `204`, `205`, `206`: 추천 문장 선택 흐름
- `S14P21E205-160` ~ `165`: 맞춤대화
- `S14P21E205-220` ~ `223`: 키보드 직접 입력

### Favorites / 즐겨찾기

- `src/pages/patient/favorites`
- `src/services/favoritesService.ts`

주로 연결되는 스토리:

- `S14P21E205-173`, `174`, `175`, `176`

### Body Mind / 몸과마음

- `src/pages/patient/body-mind`
- `src/features/patient/body-mind`
- `src/services/bodyMindService.ts`

주로 연결되는 스토리:

- `S14P21E205-181`, `182`, `183`, `184`

### Leisure / 여가

- `src/pages/patient/leisure`
- `src/services/leisureService.ts`
- `src/hooks/usePatientIncomingChat.tsx`

주로 연결되는 스토리:

- `S14P21E205-228`, `229`, `230`
- `S14P21E205-235`, `236`, `237`
- `S14P21E205-239`, `240`, `241`, `242`

### Care / 보호자 화면

- `src/pages/care`
- `src/pages/care/settings`
- `src/services/careSettingService.ts`
- `src/stores/careSetupStore.ts`

주로 연결되는 스토리:

- `S14P21E205-278`, `279`, `280`: 환자 정보
- `S14P21E205-286`: 루틴 설정
- `S14P21E205-392`: 캘리브레이션 준비 안내
- `S14P21E205-414`, `415`, `416`: Voice Banking

### Care Chat / 보호자 채팅

- `src/features/care/chat`
- `src/pages/care/ChatPage.tsx`

주로 연결되는 스토리:

- `S14P21E205-357`

## 3. 지금 가장 헷갈리는 custom-talk 상세 지도

현재 `custom-talk` 는 `src/features/patient/custom-talk` 아래로 모여 있다.

- 페이지: `src/features/patient/custom-talk/pages/CustomTalk*.tsx`
- UI: `src/features/patient/custom-talk/components/*`
- 상태: `src/features/patient/custom-talk/store/customTalkStore.ts`
- 타입: `src/features/patient/custom-talk/types.ts`
- API/mock: `src/features/patient/custom-talk/services/customTalkMockService.ts`
- 보조 로직: `src/features/patient/custom-talk/utils/*`
- 목업 데이터: `src/features/patient/custom-talk/mocks/*`

### custom-talk 읽는 순서

1. `CustomTalkDirectionPage.tsx`
2. `CustomTalkRecommendPage.tsx`
3. `CustomTalkComposePage.tsx`
4. `CustomTalkGeneratedPage.tsx`
5. `CustomTalkKeyboardPage.tsx`
6. `customTalkStore.ts`
7. `customTalkMockService.ts`

이 순서로 보면 "화면 -> 상태 -> 데이터" 흐름이 보인다.

## 4. custom-talk 파일별 업로드 기준

### 공통 기반

- `src/features/patient/custom-talk/components/CustomTalkStageLayout.tsx`
  주 스토리: `S14P21E205-160`
  보조 스토리: `162`, `163`, `165`, `220`
  이유: 맞춤대화 전체 단계의 공통 레이아웃이다.

- `src/features/patient/custom-talk/components/CustomTalkContextPanel.tsx`
  주 스토리: `S14P21E205-160`
  보조 스토리: `161`, `162`, `163`, `165`
  이유: 공통 맥락 패널이고 todayData, 최근 대화, 미리보기 UI를 보여준다.

- `src/features/patient/custom-talk/components/customTalkUi.ts`
  주 스토리: `S14P21E205-160`
  보조 스토리: `162`, `163`, `165`, `220`
  이유: 공통 스타일 상수다.

- `src/features/patient/custom-talk/types.ts`
  주 스토리: 현재 수정한 기능의 주 스토리를 따라간다
  이유: 타입 정의 파일이라 독립 업로드보다 기능 변경에 붙여야 한다.

### 단계 1: 맞춤대화 진입 / 카테고리 선택

- `src/features/patient/custom-talk/pages/CustomTalkDirectionPage.tsx`
  주 스토리: `S14P21E205-162`
  보조 스토리: `160`, `161`
  이유: 카테고리 선택, 추천 흐름 진입, 단어 조합 진입 UI가 여기 있다.

- `src/features/patient/custom-talk/store/customTalkStore.ts`
  관련 메서드:
  `initializeCustomTalk`, `refreshCategories`, `selectCategory`
  주 스토리:
  - todayData / 컨텍스트 로딩 수정이면 `S14P21E205-161`
  - 카테고리/진입 흐름 수정이면 `S14P21E205-162`

- `src/features/patient/custom-talk/services/customTalkMockService.ts`
  관련 함수:
  `fetchCustomTalkContext`, `fetchVisibleCustomCategories`
  주 스토리:
  - Mock이면 `S14P21E205-161`
  - 실 API 붙이면 이후 `todayData API` 성격으로 `161`

### 단계 2: 추천 문장 선택

- `src/features/patient/custom-talk/pages/CustomTalkRecommendPage.tsx`
  주 스토리: `S14P21E205-162`
  보조 스토리: `203`, `204`
  이유: 맞춤대화 안의 추천 문장 선택 화면이다.

- `src/features/patient/custom-talk/store/customTalkStore.ts`
  관련 메서드:
  `loadRecommendedSentences`, `selectRecommendedSentence`
  주 스토리:
  - UI 흐름이면 `S14P21E205-162`
  - 추천 선택 로직/발화 확정이면 `S14P21E205-204`
  - 추천 API 연결이면 `S14P21E205-206`

- `src/features/patient/custom-talk/services/customTalkMockService.ts`
  관련 함수:
  `fetchRecommendedCustomSentences`, `submitCustomTalkUtterance`
  주 스토리:
  - Mock이면 `S14P21E205-205`
  - API면 `S14P21E205-206`

### 단계 3: 단어 조합

- `src/features/patient/custom-talk/pages/CustomTalkComposePage.tsx`
  주 스토리: `S14P21E205-163`
  보조 스토리: `164`
  이유: 주어 -> 목적어 -> 서술어 -> 문장부호 4단계 UI가 여기 있다.

- `src/features/patient/custom-talk/store/customTalkStore.ts`
  관련 메서드:
  `startCompose`, `refreshComposeStep`, `selectComposeWord`, `skipComposeStep`, `goBackComposeStep`
  주 스토리:
  - 단계 이동/UI 흐름이면 `S14P21E205-163`
  - 선택 결과를 서버에 저장하면 `S14P21E205-164`

- `src/features/patient/custom-talk/services/customTalkMockService.ts`
  관련 함수:
  `fetchComposeWords`, `saveComposeSelection`
  주 스토리:
  - Mock이면 `S14P21E205-163`
  - 실 API면 `S14P21E205-164`

### 단계 4: 생성 문장 선택 + 키보드 fallback

- `src/features/patient/custom-talk/pages/CustomTalkGeneratedPage.tsx`
  주 스토리: `S14P21E205-165`
  이유: 생성 문장 선택과 키보드 fallback 진입이 여기 있다.

- `src/features/patient/custom-talk/store/customTalkStore.ts`
  관련 메서드:
  `buildGeneratedSentences`, `selectGeneratedSentence`, `openKeyboard`
  주 스토리:
  - 생성 결과 흐름이면 `S14P21E205-165`
  - API 붙이면 추천/발화 성격에 따라 `206` 또는 `223`

- `src/features/patient/custom-talk/services/customTalkMockService.ts`
  관련 함수:
  `fetchGeneratedCustomSentences`
  주 스토리:
  - Mock이면 `S14P21E205-165`
  - 실 API면 생성 문장 API 성격으로 `165` 에 코멘트 남기고 분리 가능

### 단계 5: 키보드 직접 입력

- `src/features/patient/custom-talk/pages/CustomTalkKeyboardPage.tsx`
  주 스토리: `S14P21E205-220`
  보조 스토리: `221`
  이유: 키보드 화면 UI 진입과 버튼 연결이 여기 있다.

- `src/features/patient/custom-talk/components/CustomTalkKeyboardGrid.tsx`
  주 스토리: `S14P21E205-220`
  이유: 6분할 키보드 화면 UI다.

- `src/features/patient/custom-talk/components/KeyboardSentenceDisplay.tsx`
  주 스토리: `S14P21E205-220`
  이유: 입력 문장 표시 UI다.

- `src/features/patient/custom-talk/store/customTalkStore.ts`
  관련 메서드:
  `initializeKeyboard`, `selectKeyboardRootMenu`, `selectKeyboardGroup`, `selectKeyboardChar`, `goKeyboardNextPage`, `goKeyboardBack`, `deleteLastManualChar`, `submitManualInput`
  주 스토리:
  - 키보드 선택/입력/삭제/이동 로직이면 `S14P21E205-221`
  - Mock 동작이면 `S14P21E205-222`
  - 실 API 제출이면 `S14P21E205-223`

- `src/features/patient/custom-talk/services/customTalkMockService.ts`
  관련 함수:
  `initializeCustomTalkKeyboard`, `submitCustomTalkUtterance`
  주 스토리:
  - Mock이면 `S14P21E205-222`
  - 실 API면 `S14P21E205-223`

- `src/features/patient/custom-talk/utils/keyboardNavigator.ts`
  주 스토리: `S14P21E205-221`
  이유: 키보드 페이지 이동 규칙 로직이다.

## 5. 대화하기 / 응답모드 파일별 업로드 기준

- `src/pages/patient/talk/TalkMainPage.tsx`
  주 스토리: `S14P21E205-440`
  보조 스토리: `441`, `442`, `443`

- `src/hooks/usePatientIncomingChat.tsx`
  주 스토리: `S14P21E205-442`
  보조 스토리: `443`, `235`, `236`, `237`, `239`, `240`, `241`, `242`
  이유: 선발화 수신, 응답모드, 인터럽트, 복귀 상태를 다 관리한다.

- `src/components/patient/chat/ReplyModePanel.tsx`
  주 스토리: `S14P21E205-443`
  보조 스토리: `169`, `170`, `203`, `204`

- `src/components/patient/chat/SuggestionList.tsx`
  주 스토리: `S14P21E205-203`
  보조 스토리: `170`

- `src/components/patient/chat/IncomingInterruptOverlay.tsx`
  주 스토리: `S14P21E205-235`
  보조 스토리: `442`

## 6. 추천 작업 방식

지금처럼 헷갈릴 때는 기능 단위 폴더로 생각하면 된다.

추천 기준:

1. `custom-talk` 수정이면
   `CustomTalk*.tsx` -> `customTalkStore.ts` -> `customTalkMockService.ts` 순서로 본다.
2. 대화하기 응답모드 수정이면
   `TalkMainPage.tsx` -> `usePatientIncomingChat.tsx` -> `components/patient/chat/*` 순서로 본다.
3. 업로드할 Jira 스토리가 애매하면
   화면이면 UI 스토리, 상태면 로직 스토리, 서비스면 API 스토리를 우선 선택한다.
4. 공용 파일이면
   이번에 실제로 가장 많이 영향 준 화면의 주 스토리에 올리고, 나머지는 코멘트로 남긴다.

## 7. 다음 리팩터링 추천

가장 먼저 정리할 대상은 `custom-talk` 이다.

현재 구조:

- `src/features/patient/custom-talk/pages`
- `src/features/patient/custom-talk/components`
- `src/features/patient/custom-talk/store`
- `src/features/patient/custom-talk/services`
- `src/features/patient/custom-talk/utils`
- `src/features/patient/custom-talk/mocks`
- `src/features/patient/custom-talk/types.ts`

핵심 목표는 하나다.

`custom-talk 관련 파일은 이 폴더만 열면 된다` 라는 상태를 만드는 것.

## 8. 참고

IDE 탭에 보이는 아래 파일은 현재 워크트리에서 확인되지 않았다.

- `KeyboardAssistPanel.tsx`
- `CustomTalkOptionGrid.tsx`
- `CustomTalkLayout.tsx`

이미 리네임되었거나, IDE 탭만 남아 있을 가능성이 높다.
