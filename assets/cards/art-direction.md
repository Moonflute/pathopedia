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

## 약제 무기 상징: 확정된 색과 잠정 형태

사용자 결정(2026-10-11). 약제 중앙 그림은 무기 상징을 중심으로 구성한다. 병원체 표적 기호를 패치나 판에 붙이는 기존 예시와 이전의 많은 무기 종류 대응안은 채택하지 않는다.

스펙트럼 색은 다음 기준으로 고정한다. 기존 제안의 그람음성 벽돌색, 녹농균 청록색, 혐기성 먹색, 비정형 단색 또는 다른 색 대응보다 이 기준을 우선한다.

| 스펙트럼 | 확정 색 |
|---|---|
| 그람음성균 | 핑크 |
| 그람양성균 | 보라 |
| 녹농균 | 초록 |
| 혐기성균 | 회색 |
| 비정형균 | 흰색이 섞인 빨강 |

흰색이 섞인 빨강은 무기 자체의 색면·재질 배색으로 표현하며, 빛이나 발광 효과로 표현하지 않는다. 구체적인 색상 코드는 아직 정하지 않는다.

무기 종류는 적은 수로 묶는 방향이다. Penicillin 계열=단검, Cephalosporin 계열=장검은 사용자 제안에 따른 잠정안이다. 세부 형태, 나머지 계열의 무기 대응, 스펙트럼을 무기의 어느 부위에 넣을지는 후속 사용자 결정 전까지 확정하지 않는다. 이전 제안의 Penicillin=한손검, Cephalosporin=창 및 계열별 세분화 대응표를 확정 기준으로 사용하지 않는다.

## 재사용할 공통 생성 프롬프트

CURRENT CARD ART RULES v6 — ABSOLUTE OVERRIDE OF EARLIER ORNAMENT DIRECTIONS:
Hand-drawn 2D Korean indie-fantasy webtoon / vintage storybook linework only. Thin natural dark-brown contours; matte flat colors; 1–2 discrete shadow tones. Clear clean edges, no beauty filter, haze, bloom, blur, gloss or strong gradients. Choose palette and brightness per subject; do not restrict every card to bright cream/pastel colors.
The central card illustration contains ONLY its main subject and the medical objects necessary to convey that subject, on a genuinely transparent RGBA background; web code supplies the card surface beneath it.
ABSOLUTELY NO decorative effects or filler around the main object: no sparkles, twinkles, four-point stars, diamonds, glowing flecks, light particles, scattered dots, stars, flowers, rosettes, petals, leaves, twigs, decorative floating symbols, luminous trails, magic ribbons, beams, auras, halos, rays, lens flare, bokeh, glitter, atmospheric motes or confetti. Do not replace forbidden decorations with another kind of decoration.
Do not add magical glow to medical action. Represent medical features through the actual subject morphology, a necessary object or a sober cutaway, not a sparkle effect.
References inform linework and flat coloring ONLY; decorative effects appearing in a webtoon reference are NEVER allowed in the card artwork.
Leave negative space empty. No background swashes, floral trim, ornamental framing or empty-space filler. All surrounding negative space must have alpha=0. Do not paint a blue/gray/white/checkerboard background, a floor or a cast shadow. Keep paint inside the actual subject opaque, including pale cells and medical cutaways.
No text, labels, numbers, formulas, logos, watermark, border, card frame or UI; web code supplies these separately. Resistance variants reuse the canonical base pathogen artwork.
For antimicrobial WEAPON artwork, the user-approved spectrum colors are Gram-negative PINK, Gram-positive PURPLE, Pseudomonas GREEN, anaerobes GRAY, and atypicals RED mixed with WHITE. Apply these as matte material/color areas, never as glowing effects. Exact color codes and spectrum placement remain undecided. Keep the weapon taxonomy small; penicillin DAGGER and cephalosporin LONGSWORD are provisional proposals only. Remaining weapon mappings await the user's follow-up. Earlier many-weapon mappings and pathogen-symbol plaque examples are not approved.

## 과거 샘플 (화풍 기록)

- sau: sau-v5.png
- oxacillin: oxacillin-v5.png (화풍 기록용. 약제 표현은 반려되어 새 무기 상징 방향에 재사용하지 않는다.)
- community-pneumonia: community-pneumonia-v5.png

이번 세 장의 개별 프롬프트: prompts-v5.md
Generation mode: built-in image_gen.imagegen.
