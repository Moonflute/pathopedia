# 항기생충제 삽화 개정

2026-10-17. Built-in image_gen.imagegen으로 기존 약제 19종을 다시 생성했다. 실제 알파 투명 배경과 기존 카드의 손그림 2D 화풍을 유지하며, 그림은 무손실 WebP로 연결한다.

## 형태와 의미

- 원충: 네모 파리채. 연충: 망주머니가 처지는 잠자리채. 외부기생충: 두 팔 집게.
- 선충: 가는 끈. 조충: 마디 띠. 흡충: 잎 장식. 여러 대상은 문양을 조합한다.
- 약마다 머리 비율·망 깊이·연결부·손잡이·색면을 달리한다. 주변 반짝임과 부유 장식은 넣지 않는다.
- 작은 동물·곤충 각인은 대표 기생충의 숙주 또는 전파 경로를 기억하는 단서다. hostSymbols에 기생충과 역할을 별도로 기록하며 전체 적응증이나 매개체 살충 효과를 뜻하지 않는다.
- Pneumocystis는 진균이므로 Atovaquone·Pentamidine은 분무기를 함께 사용한다. 임상 DB의 적응증과 설명은 그대로 따른다.

| 약제 | 형태 | 개별 표현 |
|---|---|---|
| Albendazole | net | 넓은 잠자리채 · 끈과 마디 띠 · 개 문양 |
| Mebendazole | net | 얕고 둥근 잠자리채 · 선충 끈 장식 |
| Ivermectin | net+forceps | 길쭉한 잠자리채와 작은 집게 · 선충 끈 장식 |
| Praziquantel | net | 파란 잠자리채 · 마디 띠와 잎 · 물고기 문양 |
| Triclabendazole | net | 겨자색 타원 잠자리채 · 흡충 잎 · 양 문양 |
| Permethrin | forceps | 테라코타 집게 · 피부를 뜻하는 손 문양 |
| Metronidazole | knife+swatter | 회색 네모 파리채와 칼 |
| Nitazoxanide | swatter | 넓은 산호색 네모 파리채 · 송아지 문양 |
| Paromomycin | swatter | 각진 황동 파리채 · 둥근 손잡이 끝 |
| Pyrimethamine | swatter | 길고 가는 파란 네모 파리채 · 고양이 문양 |
| Sulfadiazine | swatter | 넓은 파란 네모 파리채 · 고양이 문양 |
| Artemether–lumefantrine | swatter | 벽돌색·황토색 이중 테두리 파리채 · 모기 문양 |
| Atovaquone–proguanil | swatter | 황토색 네모 파리채와 두 색 손잡이 · 모기 문양 |
| Primaquine | swatter | 가늘고 긴 붉은 네모 파리채 · 모기 문양 |
| Miltefosine | swatter | 버건디 네모 파리채 · 모래파리 문양 |
| Benznidazole | swatter | 버건디 네모 파리채 · 아르마딜로 문양 |
| Pentamidine | swatter+spray | 청회색 네모 파리채와 분무기 |
| Atovaquone | swatter+spray | 황토색 네모 파리채와 분무기 · 진드기 문양 |
| Quinine | swatter | 벽돌색 넓은 네모 파리채 · 모기와 진드기 문양 |

## 제작과 재사용

- [jobs.json](jobs.json): 최종 파일, 프롬프트, 문양의 역할, 의학적 참고 URL, 원본 생성 경로.
- [prompts.md](prompts.md): 최종 프롬프트 모음.
- [cleanup.json](cleanup.json): 사용자 요청에 따라 삭제한 교체 전 파일 목록.
- 최종 PNG는 ../illustrations-v1/drugs/에 로컬 보존하며, 같은 이름의 WebP를 배포한다.
- scripts/seed-drug-art.mjs는 이 개정 기록을 사용하므로 이전 타공형 파리채로 돌아가지 않는다.
- 승인받은 세 도구 시안은 생성 참조로 활용한 뒤 정리했다. 이후 변형은 현재 최종 그림을 참조한다.
