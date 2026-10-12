# 작업 일지

## 2026-10-12
- [x] code_artifact.md 분석
- [x] 대화/명령 영구 저장 체계: CLAUDE.md, docs/WORKLOG.md, docs/prompt-history.md + 프롬프트 로깅 훅(.claude/settings.json)
- [x] 화면 개발 (index.html / css/style.css / js/app.js / js/data.js)
  - 헤더(요약·샘플 불러오기), Day 탭(+일자 추가), 타임라인 카드(완료 체크·수정·삭제), 등록/수정 폼(필수값 검증, 메모 100자)
  - 데스크톱 우측 패널 / 모바일(<900px) 바텀 시트 + FAB, localStorage 저장
  - headless Chrome 으로 1280px / 375px 렌더링 확인
- [x] 이시가키 실제 일정 + 추천 일정(10/31, 11/03, 투어 후 일정, 끼니별 식사, 11/03 별·은하수 나이트 투어) 샘플 데이터 반영 — `recommended` 플래그로 "추천" 태그 표시
- [x] git 로컬 저장소 초기화 및 첫 커밋 (branch: main)
- [ ] GitHub 'ishigaki-travel' 레포 생성 + push + Pages 활성화 (gh CLI/자격증명 없음 → 사용자 조치 필요)

### 결정/메모
- 원본 10/31 항공편 표기 "이시가키→인천"은 출발편이므로 "인천→이시가키"로, 11/04는 "이시가키→인천"으로 정정 반영
- 비용 단위: 일본 여행이라 원(₩) 대신 엔(¥)으로 표시
- 별 투어를 11/03로 잡은 이유: 2026-11-01 하현 → 11/03 달이 새벽에 떠 초저녁이 어둡고, 다음 날 이른 투어가 없음
- docs/prompt-history.md 는 .gitignore (공개 레포에 명령 기록 노출 방지)
