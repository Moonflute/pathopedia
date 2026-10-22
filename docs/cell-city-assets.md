# Cell City 에셋 활용 가이드

v0.67.0 · 2026년 10월 22일. 보유한 팩에서 지금 쓸 리소스와 후속 작업의 후보를 찾는 기준이다. 현재 원형 혈관 수로 도시의 외벽·지붕·기관 표식은 유지하고, 항구·보급·정원·조직 복구를 소품으로 보강한다.

## 외관과 배치 기준

밝은 크림색 외벽, 적갈색 기와, 청록 설비, 채도가 낮은 목재·녹색과 무광 표면을 맞춘다. 세포·병원체·장기 색상은 기능 식별에 사용한다. 사람 캐릭터와 실사풍 건물로 세포를 교체하지 않는다.

주택의 손상·화재·복구는 실제 조직 상태에 연결한다. 혈관, 서비스 지점, 피부 조직, 호흡기 착지점, 신장 배출구와 감염 경보의 공간을 비워 둔다. 새로운 통로를 장식 목적으로 혈관에 연결하지 않는다. 정원 소품은 이미 확보한 정원 부지 안에 둔다.

## 보유 팩에서 찾을 리소스

원본은 `cell-city-assets/`에 보관한다. 파일 수에는 색상·크기·조합 변형이 포함된다. 원본 프로젝트 전체를 배포하지 않고 선택한 메시와 필요한 이미지·라이선스만 `assets/city3d/bundle/`로 추출한다.

| 팩과 보관 파일 | 찾을 수 있는 리소스 | 현재 사용과 후속 후보 |
| --- | --- | --- |
| Medieval Megapack · `MedievalMegapack_Godot.zip` | 집, 창고, 시장, 성벽, 목책, 배·부두, 로프, 도구, 무기 32종 | 기존 공방·보급·방어선에 사용. 활·방패·검·도끼는 시설과 역할 장비 후보 |
| Cute Park · `Cute Park.zip` | 나무·관목·꽃·가로등·벤치·분수 | 기존 나무·관목 사용. 분수는 별도 이미지가 필요한 모델이 있어 선별 |
| Kitchen Restaurant · `Restaurant_Godot.zip` | 작업대, 선반, 병, 식품 자루, 조리 도구 | 기존 작업대·병 사용. 선반·자루는 후속 보급 시설 후보 |
| FarmLand · `Farm Pack Godot.zip` | 저장 탱크, 사일로, 창고, 농촌 소품 | 기존 탱크·사일로 사용. 작은 화분·저장 소품 후보 |
| Food Extended · `Food Extended.zip` | 빵·과일·식품 자루와 음식 장식 | 부두·영양 가공소 후보. 기존 Farm·Kitchen과 같은 이미지 공유 가능 |
| Cute Dungeon · `DUNGEON EXPORT.zip` | 석재 기단·계단·문·횃불·돌 | 방어 시설 부품 후보. 던전 전체 외관은 후순위 |
| Roadside Fences · `Fences and walls glb.zip` | 파손 석벽, 목문, 울타리, 경계 장식 | GLB의 이미지 연결은 별도 작업. 전용 PNG는 `EmaceRoadSideTales_Texture_01A.zip` |
| Backroad Bridges · `Gltf.zip` | 판자 통로·교각·다리 부품 | glTF·BIN·동봉 이미지를 함께 취급. 입구 데크 보강 후보 |
| Old Town · `old town Glb.zip` 또는 `OldTown_Glb.zip` | 크레인, 비계, 판자, 사다리, 식량 자루·바구니·통 | v0.67.0 부두·공방·조직 복구에 사용. 대형 주택은 기존 카툰 주택을 유지 |
| Pirate Island · `PirateIsland_Godot.zip` | 배, 닻, 상자, 사다리와 항구 소품 | 작은 배·닻 사용. 대형 해적선과 열대 섬 전체는 후순위 |
| TerraToon · `terratoon-stylized-tree-pack-low-poly-forest-foliage-godot.zip` | 나무, 관목으로 쓸 수관, 뿌리·지형 조각 | 정원의 나무 2종·관목 사용. Godot 재질을 웹용 아틀라스로 연결 |
| Rocks and Stone · `Glb.zip`, `RocksAndStone_Godot_2026-09-29.zip` | 돌·돌무더기·절벽 103개 | 조직 파괴 현장 잔해 사용. 같은 팩의 두 배포본 중 GLB판을 추출 |
| Nature Extended · `Low Poly Nature_Godot.zip` | 변형 포함 GLB 3,300개. 꽃·갈대·돌·나무·버섯 | 꽃·클로버·갈대 사용. 기존 Farm·Kitchen 아틀라스와 해시가 동일 |
| NatureForge · `NatureForge 3.0 - Godot 4 project (Godot 4.7+).zip` | glTF·BIN 127세트. 건초·농촌 가구·꽃·풀·울타리·돌 | 건초·벤치 사용. 작은 소품의 색은 정점에 담아 2K 이미지 추가 방지 |

같은 `EmaceRoadSideTales_Texture_01A.png` 이름이라도 울타리와 다리 팩의 파일 내용은 다르다. 반대로 Farm·Kitchen·Food·Nature Extended의 공통 아틀라스는 내용 해시로 공유한다. NatureForge 원본 ZIP에는 별도 보관한 Old Town ZIP과 동일한 파일도 중첩돼 있다. 보관 원본과 중복본은 추출 스크립트가 변경하거나 삭제하지 않는다.

## v0.67.0에 추가한 모델

삼각형은 파일 내 메시 합계, KB는 1,000바이트 기준이다. 재질·물리 보조 메시 때문에 실제 장면의 표시량과 차이가 있을 수 있다. 반복 배치량과 화면에 보이는 영역에 따라 프레임 부하는 달라진다.

| 런타임 이름 | 출처 팩 | 삼각형 | 모델 KB | 사용 위치 |
| --- | --- | ---: | ---: | --- |
| `harbour-crane` | old-town | 58 | 5.0 | 식량 부두 하역 설비 |
| `repair-scaffold` | old-town | 126 | 13.5 | 보수 공방, 실제 조직 복구 |
| `repair-planks` | old-town | 204 | 15.4 | 보수 공방 자재 |
| `repair-ladder` | old-town | 132 | 10.3 | 보수 공방 |
| `supply-bags` | old-town | 166 | 15.5 | 부두, 식량선 적재와 하역 |
| `supply-basket` | old-town | 1440 | 133.2 | 부두 식량 |
| `supply-barrel` | old-town | 512 | 30.8 | 부두 저장물 |
| `harbour-boat` | pirate-island | 406 | 27.3 | 실제 원료 입항 시 식량선 |
| `harbour-anchor` | pirate-island | 436 | 32.5 | 식량선 장식 |
| `garden-tree` | terratoon | 196 | 22.7 | 수로 정원과 마을 조경 |
| `garden-tree-small` | terratoon | 102 | 11.8 | 수로 정원과 마을 조경 |
| `garden-shrub` | terratoon | 114 | 13.0 | 수로 정원 |
| `rubble-rock` | rocks-and-stone | 72 | 11.3 | 실제 조직 파괴 현장 |
| `rubble-stone` | rocks-and-stone | 466 | 41.8 | 실제 조직 파괴 현장 |
| `garden-flower` | nature-extended | 592 | 50.9 | 수로 정원 화분 |
| `garden-clover` | nature-extended | 44 | 5.4 | 수로 정원 지피 식물 |
| `canal-reed` | nature-extended | 36 | 3.9 | 수로 정원 가장자리 |
| `hay-bale` | natureforge | 619 | 86.3 | 부두 적재물 |
| `garden-bench` | natureforge | 292 | 46.9 | 수로 정원 벤치 |

### 원본 파일 경로

| 런타임 이름 | 원본 ZIP | ZIP 내부 경로 |
| --- | --- | --- |
| `harbour-crane` | `old town Glb.zip` | `EA_crane_01a.glb` |
| `repair-scaffold` | `old town Glb.zip` | `EA_scaffolding_l_small_01a.glb` |
| `repair-planks` | `old town Glb.zip` | `EA_Planks_01a.glb` |
| `repair-ladder` | `old town Glb.zip` | `EA_ladder_small_01a.glb` |
| `supply-bags` | `old town Glb.zip` | `EA_bags_01b.glb` |
| `supply-basket` | `old town Glb.zip` | `EA_Basket_apple_01a.glb` |
| `supply-barrel` | `old town Glb.zip` | `EA_Barrel_01a.glb` |
| `harbour-boat` | `PirateIsland_Godot.zip` | `PirateIsland/Models/Ships/SM_Boat_A.glb` |
| `harbour-anchor` | `PirateIsland_Godot.zip` | `PirateIsland/Models/Ships/SM_Anchor_A.glb` |
| `garden-tree` | `terratoon-stylized-tree-pack-low-poly-forest-foliage-godot.zip` | `TerraToonStylizedTreePack/Meshes/EA02_Env_Tree_01a.glb` |
| `garden-tree-small` | `terratoon-stylized-tree-pack-low-poly-forest-foliage-godot.zip` | `TerraToonStylizedTreePack/Meshes/EA02_Env_Tree_01d.glb` |
| `garden-shrub` | `terratoon-stylized-tree-pack-low-poly-forest-foliage-godot.zip` | `TerraToonStylizedTreePack/Meshes/EA02_Env_TreeCrown_01.glb` |
| `rubble-rock` | `Glb.zip` | `Glb/EA01_Env_Rock_01a.glb` |
| `rubble-stone` | `Glb.zip` | `Glb/EA01_Env_Stone_Cobble_06.glb` |
| `garden-flower` | `Low Poly Nature_Godot.zip` | `low-poly-nature--extended/LowPolyNature_Godot/Models/Flowers/Flower_1_1_A.glb` |
| `garden-clover` | `Low Poly Nature_Godot.zip` | `low-poly-nature--extended/LowPolyNature_Godot/Models/Flowers/Clover_1_1_A.glb` |
| `canal-reed` | `Low Poly Nature_Godot.zip` | `low-poly-nature--extended/LowPolyNature_Godot/Models/Farm Plants/Reed_Single.glb` |
| `hay-bale` | `NatureForge 3.0 - Godot 4 project (Godot 4.7+).zip` | `NatureForgeStylizedMeadowFarmKit/Meshes/EA_M_HayBale_Dry_01a_PRE.gltf` |
| `garden-bench` | `NatureForge 3.0 - Godot 4 project (Godot 4.7+).zip` | `NatureForgeStylizedMeadowFarmKit/Meshes/EA_M_Furniture_Bench_Wooden_01_PRE.gltf` |

## 용량과 렌더링 기준

현재 선택 묶음은 **43개 모델·7개 이미지·4,864,667바이트**다. 기존 3,587,172바이트에서 약 1.28MB 늘었다. manifest·라이선스·코드·기존 Three.js/Kenney 파일은 이 모델·이미지 합계와 별도다.

- 이미지의 내용 해시를 사용해 중복을 제거한다. Pirate 아틀라스는 픽셀을 바꾸지 않고 PNG 데이터 압축만 개선해 4,202,618바이트에서 538,774바이트로 줄였다.
- NatureForge의 벤치·건초는 UV 색상표를 선형 RGB 정점색으로 변환했다. 세밀한 이미지 무늬 대신 카툰 색면을 사용하며 2048² 텍스처는 배포하지 않는다.
- 선택 묶음의 텍스처 메모리는 RGBA8·전체 밉맵 가정에서 약 **27.28MiB**, 기존 Kenney의 512² 이미지까지 합치면 약 **28.61MiB**다. 메시·렌더 타깃·그림자·브라우저 메모리는 별도다.
- 선택 묶음은 모델·이미지 5MB 미만, 이미지 한 변 1080 이하를 현재 예산으로 사용한다. 이 예산을 늘릴 때는 사용 위치와 새 이미지 상주량을 함께 검토한다.
- 고정 소품은 기존 16단위 지역별 재질 병합에 포함한다. 개별 가로등 광원과 신규 실시간 그림자 광원을 추가하지 않는다.
- 조직 복구 비계는 최대 8개, 바위 잔해는 최대 12개와 8개의 인스턴스 풀로 제한한다. 기존 조직 갱신 간격 0.18초를 사용하며 새 AI·경로탐색을 추가하지 않는다.
- 실제 추가 후의 FPS·draw·tris는 환경 설정의 성능 표시로 확인한다. 위 파일·메모리 예산이 모든 기기의 FPS를 보장하지는 않는다.

## 코드에서 연결할 위치

| 작업 | 파일 |
| --- | --- |
| 원본 선택, GLB 추출, 출처·체크섬 기록 | `scripts/import-city-assets.py`, `scripts/city_asset_exports.py` |
| 선택 모델·이미지·팩·라이선스 목록 | `assets/city3d/bundle/sources.json` |
| 텍스처·재질 공유, 크기 정규화 | `src/city-three-bundle.mjs` |
| 체크박스 기본값·저장·로딩 중 해제 처리 | `src/city-asset-preference.mjs`, `src/city-ui.mjs` |
| 정적 배치와 정점색 보존, 마을 공방 | `src/city-three-village.mjs` |
| 실제 원료 입항·하역과 배 | `src/city-three-ports.mjs` |
| 수로 정원과 기존 토지 경계 | `src/city-three-canals.mjs`, `src/city-canal-blocks.mjs` |
| 실제 조직 HP·복구에 연결한 소품 | `src/city-three-tissue.mjs` |

신규 에셋 적용 체크는 새 환경에서 기본 ON이다. 사용자가 OFF로 저장한 선택은 존중한다. OFF일 때 신규 묶음의 요청을 시작하지 않으며 이미 로드한 묶음은 재체크를 위해 캐시한다. 체크 전환은 도시 저장·시뮬레이션 상태를 바꾸지 않는다. 원본의 바람·물·하늘 Godot/Unity 셰이더와 데모 씬은 웹 런타임으로 복사하지 않는다.

## 재추출과 출처

프로젝트 루트에서 `python -B scripts/import-city-assets.py`를 실행한다. Python 3와 Pillow가 필요하다. 이 명령은 보관 ZIP을 읽어 선택한 산출물과 manifest만 갱신한다. 새 소품은 `scripts/city_asset_exports.py`의 팩·모델 목록에 추가하고 화면 배치와 함께 검토한다.

RG Poly 모델은 CC0 1.0, EmacEArt 모델은 각 원본의 EmacEArt Asset License를 사용한다. 혼합 묶음 전체를 CC0로 표기하지 않는다. 모델별 저작자·라이선스·원본 판매 페이지는 `sources.json`, 동봉 라이선스와 Old Town 출처 요약은 `assets/city3d/bundle/licenses/`에 기록한다. 게임에 필요한 가공 리소스만 배포하고 원본 팩 자체를 재배포하지 않는다.

이전 작업 기록은 [v0.57부터 v0.59 에셋 계획](cell-city-asset-plan.md)에 남아 있다.

## 화면 예시

![v0.67.0 식량 부두와 신규 에셋 적용 설정](cell-city-v0.67.0.png)
