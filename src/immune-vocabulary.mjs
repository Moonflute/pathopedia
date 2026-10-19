// Stable codes shared by card authoring and future immune-system features.
export const IMMUNE_VOCABULARY = Object.freeze({
  entityTypes:{
    barrier:{label:'장벽'},organ:{label:'기관'},tissue:{label:'림프조직'},cell:{label:'세포'},
    receptor:{label:'수용체'},ligand:{label:'막 리간드'},presenter:{label:'항원제시 분자'},adaptor:{label:'신호 전달 단백질'},
    sensor:{label:'세포내 감지 단백질'},complex:{label:'단백질 복합체'},
    complement:{label:'보체 성분'},regulator:{label:'조절 단백질'},effector:{label:'방어 단백질'},
    antibody:{label:'항체'},cytokine:{label:'사이토카인'},chemokine:{label:'케모카인'}
  },
  arms:{innate:{label:'선천면역'},adaptive:{label:'적응면역'}},
  locations:{
    skin:{label:'피부'},mucosa:{label:'점막'},airway:{label:'기도'},blood:{label:'혈액'},
    marrow:{label:'골수'},thymus:{label:'흉선'},lymphoid:{label:'이차 림프기관'},
    tissue:{label:'말초 조직'},surface:{label:'세포 표면'},cytosol:{label:'세포질'},
    endosome:{label:'엔도솜'},er:{label:'소포체'},granule:{label:'세포내 과립'},
    extracellular:{label:'세포외 공간'},secretion:{label:'점막 분비액'}
  },
  functions:{
    barrier:{label:'장벽 방어',shortLabel:'장벽',icon:'skin'},
    development:{label:'세포 생성·성숙',shortLabel:'성숙',icon:'development'},
    sensing:{label:'항원·위험 감지',shortLabel:'감지',icon:'receptor'},
    presentation:{label:'항원 제시',shortLabel:'제시',icon:'presentation'},
    phagocytosis:{label:'탐식·잔해 제거',shortLabel:'탐식',icon:'phagocyte'},
    cytotoxicity:{label:'표적 세포 살상',shortLabel:'살상',icon:'cytotoxic'},
    secretion:{label:'면역 매개물질 분비',shortLabel:'분비',icon:'signal'},
    activation:{label:'반응 활성화·증폭',shortLabel:'활성',icon:'activation'},
    recruitment:{label:'면역세포 동원',shortLabel:'동원',icon:'recruitment'},
    opsonization:{label:'표적 표지·옵소닌',shortLabel:'표지',icon:'opsonin'},
    complement:{label:'보체 반응',shortLabel:'보체',icon:'complement'},
    neutralization:{label:'부착·독성 중화',shortLabel:'중화',icon:'antibody'},
    regulation:{label:'반응 억제·항상성',shortLabel:'조절',icon:'regulation'},
    memory:{label:'면역 기억',shortLabel:'기억',icon:'memory'},
    repair:{label:'조직 유지·복구',shortLabel:'복구',icon:'clinical'}
  },
  relationTypes:{
    hosts:{label:'위치·성숙 장소',verb:'자리 제공',icon:'environment'},
    includes:{label:'하위 집단',verb:'포함',icon:'development'},
    component:{label:'복합체 구성',verb:'구성',icon:'receptor'},
    precursor:{label:'분화·발달',verb:'분화해 생성',icon:'development'},
    expresses:{label:'발현·보유',verb:'발현·보유',icon:'receptor'},
    produces:{label:'생성·분비',verb:'생성·분비',icon:'signal'},
    binds:{label:'분자 결합',verb:'결합',icon:'receptor',symmetric:true},
    presents:{label:'항원 제시',verb:'항원 제시',icon:'presentation'},
    activates:{label:'활성·생존 지원',verb:'활성·생존 지원',icon:'activation'},
    induces:{label:'생성·분화 유도',verb:'생성·분화 유도',icon:'development'},
    recruits:{label:'이동·동원',verb:'동원',icon:'recruitment'},
    inhibits:{label:'억제·제한',verb:'억제·제한',icon:'regulation'},
    cooperates:{label:'기능 협력',verb:'협력',icon:'routes',symmetric:true},
    'processed-into':{label:'절단·전환',verb:'가공되어 생성',icon:'complement'}
  }
});
