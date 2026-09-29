# v0.6.0 데이터 완성도 재점검

결론: 수량 확대는 반영됐지만, 의사 수준의 복습 자료로 충분히 검증됐다고 말할 수 없다.

## 확인한 사실

- 49개 균종·균군, 76개 표현형, 28개 약제, 2,128개 조합.
- 전체 76개 기록은 educational-draft이며 전문 검토 완료 상태가 아니다.
- S/I/R 1,352개, ACTIVE/INACTIVE/ACT 776개. 이 집계는 근거의 정확성을 보증하지 않는다.
- ACT 106개 중 92개는 `requires-organism-specific-ast-and-clinical-context`라는 일반 설명이다. 특정 분리주의 관찰 결과가 확정된 것으로 볼 수 없다.
- 검증 코드는 허용 범주, 필드 완결성, source ID 존재, 게임 동작과 일부 표현형 불변 조건을 검사한다. 인용 원문이 각 조합의 판정을 뒷받침하는지는 자동 검증하지 않는다.
- MIC 부재 자체가 정성 학습 자료를 무효화하지는 않지만, 실측 AST 자료로 설명해서는 안 된다.

## 이번에 확인해 수정한 모순

BAN-117의 cephalosporin 5개 및 TMP-SMX가 ACTIVE로 기재돼 있었다. [CDC 2023 탄저 지침](https://www.cdc.gov/mmwr/volumes/72/rr/rr7206a1.htm)의 Treatment Recommendations는 cephalosporin, TMP-SMX 및 aztreonam의 in-vitro 비활성을 명시한다. v0.6.1에서 해당 결과를 문헌상 INACTIVE로 교정하고 직접 출처와 회귀 검사를 추가했다. 기존 aztreonam INACTIVE에도 같은 직접 근거를 연결했다.

## v0.6.0 당시 미해결 작업

1. 일반적인 '추가 AST 필요' 설명으로 채운 92개 ACT를 실제 게임 분리주의 확정 결과와 구분하고 조합별 직접 근거를 검토한다.
2. 나머지 문헌 활성 776개 및 authored-isolate 989개의 설정을 원문과 대조한다. 명칭이나 출처 링크만으로 검증됐다고 간주하지 않는다.
3. CDF-121 oxacillin ACTIVE 등 일반 약제 계열 지식을 그대로 적용한 항목을 우선 검토한다. 현재 판정은 이번 감사에서 확증하지 못했다.
4. Bacteroides fragilis group, Neisseria, H. pylori 등 주요 세균과 azithromycin, ertapenem, rifampicin, cefiderocol, 신형 β-lactam/BLI, 요로감염 약제 등의 범위 공백을 보완한다.
5. 현재 출제 목록은 세균에 한정돼 있다. 진균·바이러스·기생충은 별도 데이터 모델과 약제 범위 검토가 필요하다.

이번 감사는 표본 기반 재점검이다. 알려진 한 모순의 수정이나 테스트 통과를 전체 데이터의 의학적 검증 완료로 해석하지 않는다.


## v0.7.0 후속 반영

- 위 92개 일반 ACT가 있던 8개 기록을 근거 문헌의 임상 상황별 요법 단서로 전환했다. 이를 S 또는 R로 억지 변환하지 않았다. 배포 데이터에서 해당 자리표시자는 0개이며 재유입을 검사한다.
- CDF-121의 검증되지 않은 oxacillin ACTIVE를 삭제하고 CDI 지침 맥락으로 전환했다. 경구 fidaxomicin/vancomycin과 제한적인 metronidazole 대안을 구분한다.
- 37개 세균 공백 및 진균 23·바이러스 42·기생충 31종·군을 추가했다. [현재 전체 수록 목록](data-coverage-v0.7.0.md)을 참조한다.
- 의료 검토에서 M. genitalium의 levofloxacin 대체 오류, Enterobius ivermectin, Toxoplasma/PCP 대안 누락, C. auris·희귀 사상균·기생충의 병용/병기 조건 등을 보완했다.
- 링크 검사에서 실제 404였던 WHO 파상풍 문헌, 희귀 사상균 DOI, FDA letermovir 라벨과 구 Yellow Book 주소를 수정했다. 일부 사이트의 자동 요청 403은 문헌 부재로 판단하지 않았다.
- 남은 한계: 기존 세균의 모든 authored AST·문헌 활성 값을 원문 대조한 독립 전문가 검토를 완료했다는 뜻은 아니다. 추가 요법 기록 역시 지침·연구의 조건을 갖춘 교육용 편집 데이터이며 `expert-reviewed`로 승격하지 않았다. 전 세계 모든 인간 병원체, 모든 약제, 모든 임상 상황을 완전 수록한 자료가 아니다.
