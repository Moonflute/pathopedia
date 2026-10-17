# 카드 중앙 삽화 제작 기준

최신 사용자 지시를 반영한 현재 기준. 과거 버전의 장식 관련 프롬프트보다 이 문서를 우선한다.

## 절대 금지

참고 웹툰에 있더라도, 카드용 중앙 삽화에는 메인 객체 주변의 반짝임·별·빛 입자·꽃·부유 문양·오라·광선·빛 띠 같은 장식 효과를 넣지 않는다. 삭제한 효과를 다른 주변 장식으로 대체하지 않는다. 빈 공간은 비워둔다.

메인 객체와 특징을 설명하는 데 필요한 의학적 요소만 남긴다. 바깥 빈 공간은 실제 알파 채널을 가진 투명 PNG로 처리한다. 그림 뒤의 색과 질감은 웹 카드 바탕을 사용한다.

## 질병 삽화의 인체 구조

사용자 수정 지시(2026-10-12). 질병 그림은 자연스럽게 가능한 기본 자세와 침범 부위·병변을 우선한다. 손을 뒤로 비틀거나 병변을 만지는 복잡한 자세를 기본값으로 넣지 않는다. 손·팔은 필요한 경우에만 넣고, 관절 연결·손의 방향·손가락과 발가락 수를 명시한다. 생략한 손은 자연스러운 화면 밖 크롭으로 처리하며, 몸에 붙지 않은 손이나 불가능한 관절로 대체하지 않는다.

장기 오버레이는 실제 인체 위치에 맞춘 간단한 형태로 제한한다. 세부 해부학 구조를 임의로 늘리지 않는다. 폐렴은 기침과 흉곽 안의 폐 병변, 연조직염은 부어오른 다리의 홍반, 대상포진은 자연스러운 등 자세와 편측의 국소 병변으로 전달한다.

현재 수정 시안: [투명 배경 카드 11장](trials-2026-10-12-v2/cards.html), [개별 프롬프트](trials-2026-10-12-v2/prompts.md), [자산 목록](trials-2026-10-12-v2/manifest.json).

## 유지할 화풍

한국 인디 판타지 웹툰과 빈티지 유럽 동화책의 손그림 2D 선화. 얇고 자연스러운 짙은 갈색 윤곽선, 플랫 색면, 1~2단계 명암. 뽀샤시한 필터·블룸·번들거림은 금지한다. 카드별 색과 밝기는 자유롭게 고른다. 참고 이미지에서는 선화와 채색 방식을 참고한다.

이름·설명·기능 아이콘·카드 프레임·내성 테이프는 웹앱 UI에서 붙인다. 내성형은 기존 병원체의 중앙 그림을 공유한다.

## 약제 무기 상징: 확정 기준 (2026-10-16)

카드 그림은 계열과 작용 대상이 연상되는 컨셉아트다. 같은 계열은 비슷한 실루엣·재질을 공유하고, 개별 약제는 날·가드·손잡이·색면을 달리한다. 모든 무기·도구의 작용 끝과 주사기 바늘은 왼쪽 위, 손잡이·주사기 밀대는 오른쪽 아래를 향한다. 배경은 실제 알파 투명이며 주변 장식 효과는 넣지 않는다.

| 스펙트럼 | 고정 표현 |
|---|---|
| 그람양성균 | 보라 |
| 그람음성균 | 핑크 |
| 녹농균 | 무기에 짧은 고리로 달린 작은 초록 장식품 |
| 혐기성균 | 회색 |
| 비정형균 | 흰색이 섞인 빨강 |

색은 빛이 아니라 무기의 색면·재질로 표현한다. 녹농균 표식은 무기 전체를 초록으로 칠하지 않고 작은 키링으로 붙인다. 실제 임상 적응증과 감수성 조건은 카드 데이터의 설명을 따른다.

| 계열·약제 | 확정 형태 |
|---|---|
| Penicillin | 단검 |
| Cephalosporin | 장검, 날 뿌리에 크고 대비가 높은 세대 로마 숫자 I·II·III·IV·V |
| Carbapenem | 미사일 |
| Monobactam | 단도 |
| Vancomycin·Teicoplanin·Linezolid·Daptomycin | 대검 |
| Aminoglycoside | 폭탄 |
| Macrolide | 창 |
| Tetracycline·Glycylcycline·Lincosamide | 해머 |
| Quinolone | 도끼 |
| 항결핵제 4종 | 하나의 무기를 네 부분으로 나누어 각 카드에 한 조각씩 |
| Metronidazole | 칼과 파리채 함께 |
| TMP–SMX·Fidaxomicin | 유리병 |
| 원충 대상 | 네모 파리채: 직선 네 변, 둥근 모서리, 촘촘한 망 |
| 연충 대상 | 잠자리채: 원형·타원 테두리 아래로 처지는 망주머니 |
| 외부기생충 대상 | 두 팔이 분명한 집게 |
| 항진균제 | 스프레이 |
| 항바이러스제 | 주사기, 표적 바이러스 군이 비슷한 약제끼리 같은 형태 계열 |

Paromomycin은 항기생충 파리채 형태에 aminoglycoside 폭탄형 손잡이를 결합한다. 항결핵 4종은 같은 상아색·청회색 검의 끝/중간 날/가드/손잡이 조각을 공유한다. 항진균·항기생충·항바이러스제의 다른 배색은 사용자가 위임한 미술적 변주이며 별도의 범용 임상 색 코드로 사용하지 않는다.

승인한 8장 시안은 그대로 재사용한다. 전체 80종의 개별 형태·색·생성 상태와 최종 프롬프트는 [제작 목록](drug-production-v1/jobs.json), [프롬프트](drug-production-v1/prompts.md)에 보관한다. 약제 이름, 설명, 표적 아이콘은 기존 카드 UI에서 제공하며 중앙 그림에 새 설명문을 추가하지 않는다.

## 항기생충제 도구와 문양 (2026-10-17)

원충은 네모 파리채, 연충은 잠자리채, 외부기생충은 집게를 사용한다. 파리채는 직선 네 변과 촘촘한 망을 유지한다. 망은 상아색 바탕에 가는 격자로 표현하며 큰 구멍·원형 타공·벌집·스펀지 모양을 금지한다. 잠자리채는 테두리 아래로 처지는 부드러운 망주머니가 핵심이다.

같은 분류 안에서는 머리 비율·테두리·주머니 깊이·연결부·손잡이 재질과 색을 달리한다. 선충은 가는 끈, 조충은 마디 띠, 흡충은 잎 장식을 사용하며 실제 대상에 맞춰 조합한다. 숙주·중간숙주·보유숙주·매개체는 작은 각인으로 표현하고, 각각의 역할과 대표 기생충을 제작 DB의 hostSymbols에 구별해 저장한다. 이 문양은 전체 적응증을 뜻하지 않으며 매개체 자체를 죽인다는 뜻도 아니다.

Ivermectin은 잠자리채와 집게, Metronidazole은 회색 칼과 네모 파리채를 조합한다. Atovaquone·Pentamidine의 Pneumocystis 관련 쓰임은 진균 계열의 분무기를 함께 배치해 표현한다. 숙주 문양이 필요 없는 약에는 억지로 동물을 붙이지 않는다.

최종 19종의 파일·문양·참고 자료·프롬프트는 [항기생충제 개정 기록](parasite-production-v2/README.md)에 보관한다. 도구 방향·투명 배경·주변 효과 금지는 기존 카드 공통 기준을 따른다.

## 면역계 삽화 (2026-10-18)

세포·조직·단백질의 익숙한 교과서 형태를 같은 갈색 선화와 절제된 색면으로 표현한다. 세포 아형은 기본 형태를 공유하고 중앙의 T·B·Th1·Th2·Th17 등의 표기로 구별한다. 단백질은 대표적인 큰 구조를 간략화한 개념도이며 원자 단위의 정확한 구조를 주장하지 않는다.

피부·점막·골수·흉선·림프절·비장·MALT는 큰 층과 구획만 남긴다. 촘촘한 작은 세포·구멍·섬유·잔주름·현실적인 살점 질감은 줄이고 매끈한 색면을 쓴다. 세포 내부의 핵 모양·과립처럼 식별에 필요한 특징은 유지한다.

항체는 반듯하면서 분절된 막대형 중쇄·경쇄와 절제된 음영을 유지한다. G·A·M·D·E를 표기하며, IgA의 A는 이량체 전체의 중심에 둔다. 승인한 IgA의 분절과 음영을 살리고 단순한 연속 선 아이콘으로 바꾸지 않는다. 면역계의 문자·숫자 표시는 사용자 요청에 따른 공통 무문자 규칙의 예외다.

전체 97종과 승인 시안 8종의 재사용 이력은 [면역계 제작 목록](immune-production-v1/jobs.json), [프롬프트](immune-production-v1/prompts.md)에 남긴다. 조직·기관 수정 전 원본과 시안은 보존한다.

## 재사용할 공통 생성 프롬프트

CURRENT CARD ART RULES v9 — ABSOLUTE OVERRIDE OF EARLIER ORNAMENT DIRECTIONS:
Hand-drawn 2D Korean indie-fantasy webtoon / vintage storybook linework only. Thin natural dark-brown contours; matte flat colors; 1–2 discrete shadow tones. Clear clean edges, no beauty filter, haze, bloom, blur, gloss or strong gradients. Choose palette and brightness per subject; do not restrict every card to bright cream/pastel colors.
The central card illustration contains ONLY its main subject and the medical objects necessary to convey that subject, on a genuinely transparent RGBA background; web code supplies the card surface beneath it.
ABSOLUTELY NO decorative effects or filler around the main object: no sparkles, twinkles, four-point stars, diamonds, glowing flecks, light particles, scattered dots, stars, flowers, rosettes, petals, leaves, twigs, decorative floating symbols, luminous trails, magic ribbons, beams, auras, halos, rays, lens flare, bokeh, glitter, atmospheric motes or confetti. Do not replace forbidden decorations with another kind of decoration.
Do not add magical glow to medical action. Represent medical features through the actual subject morphology, a necessary object or a sober cutaway, not a sparkle effect.
References inform linework and flat coloring ONLY; decorative effects appearing in a webtoon reference are NEVER allowed in the card artwork.
Leave negative space empty. No background swashes, floral trim, ornamental framing or empty-space filler. All surrounding negative space must have alpha=0. Do not paint a blue/gray/white/checkerboard background, a floor or a cast shadow. Keep paint inside the actual subject opaque, including pale cells and medical cutaways.
No text, labels, formulas, logos, watermark, border, card frame or UI; web code supplies these separately. The only allowed numerals in drug artwork are the large integral Roman generation marks on cephalosporin longswords. Immune-card artwork additionally permits the approved concise identity marks directly on the subject (T/B, subtype identifiers, antibody class letters and protein names); no separate title or label plaque. Resistance variants reuse the canonical base pathogen artwork.
For antimicrobial WEAPON artwork, use Gram-negative PINK, Gram-positive PURPLE, anaerobes GRAY, and atypicals RED mixed with WHITE as matte material colors. Pseudomonas is a SMALL GREEN enamel keychain physically attached to the weapon, never a glow or green weapon body. Follow the approved family-to-form table above and the individual drug-production-v1/jobs.json prompt. Every active tip points upper-left and every grip/plunger lower-right. Cephalosporin generation numerals must be large and high-contrast. Similar antiviral target groups share syringe construction. No surrounding decorative effects.

## 과거 샘플 (화풍 기록)

- sau: sau-v5.png
- oxacillin: oxacillin-v5.png (화풍 기록용. 약제 표현은 반려되어 새 무기 상징 방향에 재사용하지 않는다.)
- community-pneumonia: community-pneumonia-v5.png

이번 세 장의 개별 프롬프트: prompts-v5.md
Generation mode: built-in image_gen.imagegen.
