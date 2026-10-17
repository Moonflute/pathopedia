// Each drug has one display home; other clinical uses remain searchable on its card.
export const DRUG_ORDER = [
  {id:'antibacterial',label:'항균제',classes:[
    {id:'penicillins',label:'페니실린·베타락탐분해효소 억제제',ids:['penicillin','oxacillin','ampicillin','amoxicillin','amoxclav','piptazo']},
    {id:'cephalosporins',label:'세팔로스포린·베타락탐분해효소 억제제',ids:['cefazolin','ceftriaxone','ceftazidime','ceftazavi','cefepime','ceftaroline']},
    {id:'carbapenems-monobactam',label:'카바페넴·모노박탐',ids:['imipenem','meropenem','aztreonam']},
    {id:'aminoglycosides',label:'아미노글리코사이드',ids:['gentamicin','amikacin']},
    {id:'tetracyclines',label:'테트라사이클린·글리실사이클린',ids:['doxycycline','tigecycline']},
    {id:'macrolides-lincosamides',label:'마크롤라이드·린코사마이드',ids:['erythromycin','clarithromycin','azithromycin','clindamycin']},
    {id:'glycopeptides-lipopeptides',label:'글리코펩타이드·리포펩타이드',ids:['vancomycin','teicoplanin','daptomycin']},
    {id:'oxazolidinones',label:'옥사졸리디논',ids:['linezolid']},
    {id:'antifolates',label:'엽산 합성 억제제',ids:['tmpsmx']},
    {id:'fluoroquinolones',label:'플루오로퀴놀론',ids:['ciprofloxacin','levofloxacin','moxifloxacin']},
    {id:'other-antibacterials',label:'기타 항균제',ids:['metronidazole','fidaxomicin']},
    {id:'antimycobacterials',label:'항결핵제',ids:['isoniazid','rifampicin','pyrazinamide','ethambutol']}
  ]},
  {id:'antiviral',label:'항바이러스제',classes:[
    {id:'herpes-cmv',label:'헤르페스·CMV',ids:['acyclovir','ganciclovir','foscarnet','cidofovir','letermovir']},
    {id:'influenza',label:'인플루엔자',ids:['oseltamivir','baloxavir']},
    {id:'coronavirus',label:'코로나19',ids:['remdesivir','nirmatrelvir-ritonavir']},
    {id:'hepatitis',label:'바이러스 간염',ids:['tenofovir','entecavir','peginterferon-alfa','sofosbuvir-velpatasvir']},
    {id:'hiv',label:'HIV',ids:['lamivudine','dolutegravir']},
    {id:'other-antivirals',label:'기타 항바이러스제',ids:['ribavirin']}
  ]},
  {id:'antifungal',label:'항진균제',classes:[
    {id:'polyenes',label:'폴리엔',ids:['amphotericinb']},
    {id:'azoles',label:'아졸',ids:['fluconazole','itraconazole','voriconazole','posaconazole','isavuconazole']},
    {id:'echinocandins',label:'에키노칸딘',ids:['micafungin']},
    {id:'flucytosine',label:'플루시토신',ids:['flucytosine']},
    {id:'allylamines',label:'알릴아민',ids:['terbinafine']}
  ]},
  {id:'antiparasitic',label:'항기생충제',classes:[
    {id:'antimalarials',label:'항말라리아제',ids:['artemetherlumefantrine','atovaquoneproguanil','quinine','primaquine']},
    {id:'other-antiprotozoals',label:'기타 항원충제',ids:['nitazoxanide','paromomycin','pyrimethamine','sulfadiazine','miltefosine','benznidazole','pentamidine','atovaquone']},
    {id:'anthelmintics',label:'구충제',ids:['albendazole','mebendazole','ivermectin','praziquantel','triclabendazole']},
    {id:'ectoparasiticides',label:'외부기생충 구제제',ids:['permethrin']}
  ]}
];

const positions=new Map();
for(const group of DRUG_ORDER)for(const drugClass of group.classes)for(const id of drugClass.ids){
  if(positions.has(id))throw Error('Duplicate drug display order: '+id);
  positions.set(id,{group:group.id,drugClass:drugClass.id,rank:positions.size});
}

export function drugClassification(id) {
  return positions.get(id) || null;
}

export function sortDrugRecords(drugs) {
  return [...drugs].sort((a,b)=>
    (positions.get(a.id)?.rank ?? Number.MAX_SAFE_INTEGER)-
    (positions.get(b.id)?.rank ?? Number.MAX_SAFE_INTEGER) ||
    a.name.localeCompare(b.name,'ko'));
}
