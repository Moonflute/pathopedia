# Cell City 항상성 모델

v0.76.0부터 반지름 58의 도시에서 기존 6개 중심 장기와 9개 외곽 장기·조직 구역을 연결한다. 이전 반지름 44 대비 면적은 약 1.74배다. 중심 동맥·정맥 고리는 유지하며 새 가지가 외곽 구역까지 공급한다. 기존 배치·감염·재고는 보존된다.

## 작동과 관찰

운영 → 항상성에서 과정을 선택한다. 기본 지도에 추가 도구 모음을 두지 않는다. 자극 뒤 **감지 → 신호 → 반응 → 회복**을 표시하고 관련 구역·연결 경로를 강조한다. 건물이나 장기 이름을 선택하면 현장으로 이동한다.

| 과정 | 실제 상태 변화 | 관찰 자극 |
|---|---|---|
| 혈당·에너지 | 장 흡수 → 간문맥 영양 도착 → 혈당; 인슐린 저장·소비 / 글루카곤 간 저장분 방출; 지방 저장·소비 | 식사, 공복, 운동 |
| 물·전해질 | ADH 도착 → 소변량 감소·농축; 알도스테론 → Na/K 처리; 수분 → 혈압·심박 | 탈수, 물 마시기, 짠 음식 |
| 호흡·산도 | 활동·대사 → CO₂ 증가 → 환기 신호; 신장의 느린 HCO₃ 완충 → pH | 운동, 휴식 |
| 체온 | 시상하부 감지 → 피부 혈류·땀 / 근육 떨림; 수분·에너지 소비 | 더위, 추위, 평온 |
| 소화·영양 | 선박 입항 → 장 하역; 췌장 효소·간 담즙은 별도 관으로 도착; 장 → 간문맥 → 간 | 식사, 공복 |
| 갑상선 | 갑상선 가동 저하 → 호르몬 감소 → TSH 증가; 대사율이 산소·열·에너지 소비에 반영 | 가동 40% / 100% |
| 칼슘·뼈 | 부갑상선 감지 → PTH → 뼈 저장분 동원·신장 보존 → 혈중 칼슘 회복 | 칼슘 부족, 칼슘 보급 |
| 적혈구·철 | 노화 적혈구가 비장까지 이동 → 제거 → 간 처리 → 철의 골수 도착 → 영양·생산칸을 써 조혈 | 적혈구 노화 |

신경 신호와 소화관 분비 경로를 혈류와 구분한다. 호르몬은 혈관 경로의 이동을 마친 뒤 효과기에 적용한다. 간문맥은 장·비장에서 간으로 들어가며 간에서 체순환 정맥으로 돌아간다. 새 구역의 산소는 실제 적혈구가 배달하고 부족하면 가동률·건강이 떨어진다.

새 시설은 간·담낭 창고, 췌장 공방, 시상하부·뇌하수체 회관, 갑상선·부갑상선 공방, 부신, 비장, 뼈, 근육, 지방 저장 구역이다. 부갑상선은 갑상선 구역에 있으며 PTH는 그곳에서 출발한다. 갑상선 가동 조작이 부갑상선 분비 능력을 함께 낮추지는 않는다.

## 모델 범위

수치·시간·저장량은 관찰을 위한 교육용 지수다. 실제 생리 시간이나 진단 기준을 재현하지 않는다. 호르몬 수용체·세포 내 대사·전체 전해질 수지·비타민 D 경로·EPO 농도·네프론별 수송 등은 개별 시뮬레이션하지 않는다. 근육과 지방은 집단 구역으로 표현한다. 기존 감염·관류·산소·영양 시스템의 상태를 공유하지만 새 장기의 병원체별 감염 경로까지 확장하지는 않는다.

상태와 이동 중 신호는 저장된다. 구버전 도시에는 정상 상태의 항상성 구역을 추가한다. 신호는 최대 80개, 사건 기록은 24개로 제한한다. 장면은 고정 인스턴스 풀을 재사용하고 기본 세포 상한을 늘리지 않는다. 에셋 배치·용량은 [에셋 문서](cell-city-assets.md)를 참고한다.

## 생리 근거

- [NIDDK — 소화기계의 작동](https://www.niddk.nih.gov/health-information/digestive-diseases/digestive-system-how-it-works): 간·담즙·췌장 효소·영양 흡수.
- [NIDDK — 인슐린 저항성과 전당뇨](https://www.niddk.nih.gov/health-information/diabetes/overview/what-is-diabetes/prediabetes-insulin-resistance): 인슐린과 간·근육·지방의 포도당 처리.
- [NIDDK — 신장의 작동](https://www.niddk.nih.gov/health-information/kidney-disease/kidneys-how-they-work): 수분·전해질·산염기 조절.
- [Endocrine Society — 요붕증과 ADH](https://www.endocrine.org/patient-engagement/endocrine-library/diabetes-insipidus): 시상하부에서 생성되고 뇌하수체 후엽에서 분비되는 ADH의 수분 보존.
- [NIDDK — 부신 기능](https://www.niddk.nih.gov/health-information/endocrine-diseases/adrenal-insufficiency-addisons-disease/definition-facts): 알도스테론과 염분·수분 균형.
- [NHLBI — 호흡 조절](https://www.nhlbi.nih.gov/health/lungs/body-controls-breathing): 뇌·CO₂·호흡 조절.
- [Tan 등, 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC5062957/): 시상하부의 체온 조절 회로.
- [NIDDK — 갑상선 기능 저하](https://www.niddk.nih.gov/-/media/Files/Endocrine-Diseases/Hypothyroidism_508.pdf): TSH–갑상선호르몬 되먹임.
- [NIDDK — 부갑상선과 칼슘](https://www.niddk.nih.gov/health-information/endocrine-diseases/primary-hyperparathyroidism): PTH, 뼈 저장분, 신장 칼슘 처리.
- [Kohyama 등, 2009](https://www.nature.com/articles/nature07472), [Theurl 등, 2016](https://www.nature.com/articles/nm.4146): 비장·간 대식세포의 적혈구 처리와 철 회수.
