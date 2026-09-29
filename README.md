# PATHOPEDIA

정보를 선택해 공개하고 균종 + 내성 표현형을 동정하는 개인 복습용 웹게임.
연구 기록물 형태의 동정실과 발견한 균주의 Archive를 제공합니다.

## 실행

Node.js 20 이상. 런타임 의존성이 없는 정적 ES module 앱입니다.

```sh
npm ci
npm run dev
npm test
npm run build
```

개발 서버: http://127.0.0.1:4173. 빌드 결과: `dist/`.
GitHub Actions가 main push 시 테스트 → 정적 빌드 → Pages 배포합니다.
저장소 Pages의 source는 GitHub Actions입니다. `/pathopedia/` 하위 경로에 호환됩니다.

## 게임

- 8 균종, 16 organism/phenotype 기록, 9 정보 항목, 16 항균제.
- 숨은 답은 독립 ID를 가진 **교육용 고정 분리주**입니다. 무작위로 AST를 만들지 않습니다.
- 같은 관찰 결과를 갖는 후보로 조건화한 Shannon entropy H를 계산합니다.
- 검사 비용: `ceil(6 + 18 * H)`; 모든 결과가 같으면 최소 6.
- 공개 전의 **기대 정보량**으로 가격을 정하므로 숨은 답에 따른 가격 누설이 없습니다.
- 결과 비교는 플레이어가 보는 힌트 본문 전체 또는 AST 범주를 기준으로 합니다.
- 점수: `max(0, 1000 - 4 * totalCost - 100 * distinctWrongGuesses)`.
- 같은 힌트/약제를 다시 공개하거나 같은 오답을 반복하면 추가 비용이 없습니다.
- Species와 phenotype이 모두 일치해야 정답입니다.
- 미완료 검체 교체는 Archive에 등록하지 않습니다. 정답은 최고점과 동정 횟수를 누적합니다.
- 진행과 Archive는 localStorage에 저장됩니다. 서버·계정·기기 간 동기화는 없습니다.
- 정적 학습 게임이므로 개발자 도구로 데이터와 정답을 볼 수 있습니다. 경쟁형 anti-cheat를 제공하지 않습니다.

## 의료 데이터의 의미

`data/organisms.json`이 플레이 데이터, `data/schema.json`이 확장용 JSON Schema,
`data/sources.json`이 근거 목록입니다. `scripts/seed.mjs`를 수정하고 `npm run seed`로 다시 생성합니다.
수동 JSON 수정은 seed 재생성 시 덮어써지므로 seed를 단일 작성 원본으로 유지하세요.

원본 `19 the medicine resource`는 **읽기 전용**으로 참고했습니다. 개인정보·학습 이력·원문 전체는 배포하지 않습니다.
`docs/source-audit.json`에는 참고한 파일의 상대 경로와 SHA-256을 기록합니다.
기존 spectrum의 `variable/conditional`을 S로 자동 매핑하지 않았습니다.

현재 기록은 문헌상의 제약을 반영하여 작성한 가상의 고정 교육용 분리주이며 **expert-reviewed가 아닌 educational-draft**입니다.
S/I/R의 의미 및 일부 조합의 추론 규칙은 EUCAST v16.1 (2026)을 따릅니다.
`I = Susceptible, increased exposure`; R 또는 CLSI Intermediate와 같지 않습니다.
NA는 이 패널에서 임상 범주를 부여하지 않는 조합으로 내성과 구분합니다.
개별 실제 균주를 대변하거나 임상 처방을 권고하는 데이터가 아닙니다.

MSSA/MRSA, MSSE/MRSE, E. faecalis/faecium VSE/vanA VRE, E. coli baseline/ESBL,
K. pneumoniae ESBL/KPC, P. aeruginosa non-DTR/DTR, E. cloacae inducible/derepressed AmpC를 포함합니다.
Glycopeptide 감수성, ESBL 이후의 비-β-lactam 결과 등은 해당 분리주의 설정이며 종/phenotype 전체의 보편적 결과가 아닙니다.

MIC와 breakpoint는 현재 모두 null입니다. 고급 모드는 의도적으로 비활성화했습니다.
활성화 전에는 약제·균종·감염부위·노출조건·표준·버전을 고정하고
실측/교육용 MIC 출처 및 수치 판정 테스트를 추가해야 합니다. ECOFF는 임상 breakpoint 대신 쓰지 않습니다.

새 데이터를 추가할 때:

1. 새 taxon/phenotype 조합에 고유 ID를 부여합니다. 기존 기록의 ID는 재사용하지 않습니다.
2. 모든 힌트와 약제 조합을 작성하고 미판정은 NA로 명시합니다.
3. 출처, 검토 상태, 해석 규칙을 입력합니다. 종의 특성과 분리주의 내성을 분리합니다.
4. 동일한 힌트는 본문을 동일하게 유지합니다. 관찰 본문이 바뀌면 정보량 계산도 바뀝니다.
5. 데이터 버전을 올리고 seed와 테스트를 실행합니다. 데이터 버전 변경 시 진행 중 라운드는 초기화되며 유효한 Archive ID는 유지합니다.
6. 전문가 검토 후에만 reviewStatus를 expert-reviewed로 변경합니다.

항생제 자체를 맞추는 모드는 후속 범위입니다. 현 버전에서는 병원체 동정과 항균제 시험을 완성했습니다.

## 버전

SemVer `v 0.0.0` 형식. 작은 수정은 patch, 기능 묶음은 minor 증가 후 patch를 0으로 초기화합니다.
앱 버전은 package.json 및 화면에 표시되며 CHANGELOG.md에 변경 내용을 기록합니다.

## PWA와 아이콘

현재 v 0.2.1. 홈 화면 설치용 manifest와 192/512px 아이콘, iOS용 180px 아이콘을 제공합니다.
지원 브라우저에서 사이트 설치 또는 홈 화면에 추가할 수 있습니다.
첫 온라인 방문에서 캐시 설치가 완료되면 오프라인에서도 게임·Archive를 사용할 수 있습니다.
외부 웹폰트를 불러오지 못하면 시스템 글꼴을 사용합니다.
업데이트는 알림의 ‘업데이트 적용’을 눌러 반영하며 현재 진행 기록은 저장합니다.
앱 파일을 변경해 배포할 때 package.json, src/app.mjs와 sw.js 버전을 함께 올립니다.

아이콘 원본과 정확한 생성 프롬프트는 assets/에 보관합니다. OpenAI 내장 image_gen으로 생성했습니다.
