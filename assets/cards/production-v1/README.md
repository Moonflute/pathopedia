# 전체 카드 삽화

병원체 182종과 질병 259개의 중앙 삽화, 총 441장. 내성형은 기본 병원체 그림을 공유합니다. 약제 삽화는 이번 범위에 포함하지 않습니다.

생성 방식은 built-in image_gen.imagegen입니다. 최종 프롬프트, 출처 ID, 진행 상태, 수정 이력은 [jobs.json](jobs.json)에 기록합니다. 승인한 11장은 이전 시안에서 복사해 재사용합니다. 공통 화풍과 금지 요소는 [art-direction.md](../art-direction.md)를 따릅니다.

그림 원본 PNG는 로컬 assets/cards/illustrations-v1/에 보존합니다. 저장소와 배포에는 최종 WebP만 포함합니다. 전체 생성 후 scripts/prepare-card-art-web.mjs로 동일한 크기·투명도·픽셀 색을 유지하는 무손실 WebP를 만듭니다. 배포와 앱에서는 최종 WebP만 사용합니다. [card-art.json](../../../data/card-art.json)과 src/card-art-data.mjs가 같은 목록을 담습니다. 원본과 이전 수정본은 삭제하지 않습니다.

카드 이름, 설명, 좌우 아이콘과 내성 리본은 웹 컴포넌트에서 표시합니다. 삽화 파일을 교체하면 작은 도감 카드와 확대 카드에 함께 반영됩니다. 앱은 그림을 필요할 때 불러오며, 설치 시 441장을 일괄 다운로드하지 않습니다.

orchestration.js와 orchestration-all.js는 Codex functions.exec 런타임용 함수 표현식입니다. 이미지 생성 도구를 직접 호출하며 일반 Node CLI에서 실행하지 않습니다. scripts/save-card-art.mjs가 생성된 원본을 프로젝트에 보존하고 앱 목록을 갱신합니다. 같은 디스크에서는 NTFS 하드 링크로 동일한 PNG의 중복 공간을 줄이며, 지원되지 않는 환경에서는 복사합니다. 원본을 직접 덮어쓰지 않고 수정본을 새 버전 파일로 저장합니다.

도감 하단 검색창 오른쪽 위의 ‘그림 보기’ 체크박스는 중앙 삽화만 숨기며 카드 크기·설명·좌우 아이콘은 유지합니다. 목록, 확대 카드, 예시 카드에 공통 적용되고 localStorage의 pathopedia:card-artwork 값으로 다음 접속에도 기억합니다.
