# MINJOON - 개발 현황 & 로드맵

기획: `STORYBOARD Version 2026 10 24.pdf` · 플랫폼: PC 데스크톱 앱 (Electron) · 1280x720 가로

## 실행

```bash
npm start          # 브라우저 개발: http://localhost:8080
npm install -D electron && npm run app   # 데스크톱 앱 (Node.js 필요: brew install node)
```

## 구조

```
index.html, lib/phaser.min.js     Phaser 4.2.1 (빌드 없이 실행)
electron/                         데스크톱 창 (app:// 프로토콜, F11 전체화면)
src/config.js                     해상도, 폰트, 텍스트 속도
src/scenes/                       Boot → Preload → Title → Story ⇄ 미니게임 → ChapterEnd / Ending
src/game/statDefs.js              스탯 정의, 난이도, 강화 옵션, 사망 조건(거북목 100)
src/game/story/                   챕터 스크립트 (작성법: src/game/story/README.md)
src/game/endings.js               엔딩 목록
src/minigames/                    BaseMinigame + 각 미니게임 (index.js에 등록)
src/ui/                           Button, DialogueBox, StatsBar
src/engine/                       에셋 로더(실패 시 대체 텍스처), 세이브, 물리 엔티티 API(awef에서 이식)
```

## 완료

- [x] 엔진 기반: 씬 구조, 에셋 파이프라인 + 폴백, 자동 저장/이어하기
- [x] 스탯 시스템: 한화 / Aura / 거북목 / Depression / GPA, 난이도별 시작 스탯
- [x] 스토리 엔진: 대사, 선택지(안 눌리는 버튼, Aura 조건, 한화 비용), 스탯 강화, CG, 미니게임 연결
- [x] Prologue (7학년 Day 1~2)
- [x] Chapter 1 (8학년): 돌발 QTE, 1.1 배드민턴(입단 → 김우찬 조작판 → KISAC), 1.2 Osaka 재판, 1.3 졸업 러너 → 교통사고

## 다음 할 일

1. **Chapter 2 (9학년)**
   - 2.1 쌤들한테 찍히기 (도키도키 문예부 스타일 - 대화/시 쓰기)
   - 2.2 세하 vs 민준 JJS: Round 1 가위바위보(Block > M1 > Manji > Block) + 영역 QTE(타이밍), Round 2 언더테일 탄막(안경)
   - 2.3 Barnum (프나펑 스타일, 맞춘 개수로 점수)
   - 2.4 보스: 쓱싹김치 4페이즈 (포켓몬 배틀 / 리듬게임 / simon says / 마우스로 대사 화살 막기 + rage meter)
   - 2.5 엔딩: 자퇴 / 퇴학
2. **반복 퀘스트 허브** (챕터 사이): 썸티, 폼티, 플러팅, 숙제, 오타쿠짓(Depression 회복 미니게임: Block blast, 테트리스, 어몽어스 전선)
3. **한화 사용처**: 상점/아이템
4. **아트/사운드**: 캐릭터 이미지, 배경, 무릎 꿇기 사진(`kneel_photo`), BGM
5. **배포**: electron-builder로 .exe / .dmg 패키징

## 정해야 할 것 (기획 미정)

- Depression이 100이 되면? (현재: 효과 없음. 거북목 100만 사망)
- 난이도별 시작 스탯 수치 (현재 쉬움/보통/어려움 임의 값, 보통 = 기획서 기본값)
- 스탯 강화 1포인트당 효과 (현재 Aura +10 / Depression -10 / 한화 +1,000 / 거북목 -10, 3포인트)
- GPA 계산 방식 (현재 스토리 결과에 따라 ±0.1~0.3)
