# 이시가키 여행 플래너 (ishigaki-travel)

- 요구사항 원본: `code_artifact.md` (화면 요구사항 + 실제 여행 일정 프레임)
- 작업 일지: `docs/WORKLOG.md` — **작업 단계가 끝날 때마다 갱신할 것** (재부팅 후 이어하기용)
- 사용자 명령 기록: `docs/prompt-history.md` — UserPromptSubmit 훅이 자동 누적
- 재부팅 후 이어하기: 이 폴더에서 `claude --continue` (직전 대화) 또는 `claude --resume` (목록 선택)

## 구조
- `index.html`, `css/style.css`, `js/data.js`(샘플 일정), `js/app.js` — 빌드 없는 정적 SPA (GitHub Pages 배포)
- 상태는 `localStorage` 에 저장, "샘플 데이터 불러오기"로 초기 일정 복원
- 일정 TIP: `js/data.js` 의 `DEMO_TIPS` — **내용을 고치면 `DEMO_TIPS_REV` 를 1 올리고 `DEMO_TIPS_UPDATED` 를 확인 날짜로** (사용자가 수정하지 않은 샘플 TIP 이 자동 갱신됨)
