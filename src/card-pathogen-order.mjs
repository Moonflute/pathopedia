// Pathogen chapters follow Murray Medical Microbiology, 10th ed., adapted to this catalog.
export const PATHOGEN_ORDER = {
  bacteria: {
    staphylococci: ['sau','sep','slu','ssa','aur'],
    streptococciEnterococci: ['spy','sag','sdy','spn','smi','sor','streptococcus-anginosus-group','sgl','efa','efm','ega','eca'],
    bacillus: ['ban','bce'],
    otherGramPositiveRods: ['lmo','cdi','cje'],
    mycobacteria: ['bgx505','bgx506','bgx507'],
    nocardia: ['bgx508'],
    neisseriaHaemophilus: ['nme','bgx509','mca','kki','hin'],
    enterobacterales: ['eco','kpn','kox','kae','ecl','cfr','cko','sma','pmi','pvu','mmo','pst','sty','sen','ssh','yen'],
    vibrioAeromonas: ['vch','vpa','vvu','ahy'],
    nonfermenters: ['pae','aba','sma2','bcc'],
    campylobacterHelicobacter: ['bgx514','bgx513'],
    otherGramNegativeRods: ['bgx501','bgx504','bru','bhe','pmu','cca','eikenella-corrodens'],
    clostridia: ['cpe','cte','cbo','cse','cdf'],
    nonSporeAnaerobes: ['bgx515','bgx517','bgx516','cac','ais','bgx518'],
    spirochetes: ['bgx512','bbu','lep'],
    mycoplasma: ['bgx502','bgx511'],
    rickettsiaRelated: ['rty','ots','aph','cbu'],
    chlamydia: ['bgx503','bgx510']
  },
  viruses: {
    papillomaPolyoma: ['hpv','bk-polyomavirus','jc-polyomavirus'],
    adenoviruses: ['adenovirus'],
    herpesviruses: ['hsv1','hsv2','vzv','cmv','hhv6','ebv','hhv8'],
    poxviruses: ['mpox-virus'],
    parvoviruses: ['parvovirus-b19'],
    picornaviruses: ['rhinovirus','non-polio-enterovirus','poliovirus'],
    coronaviruses: ['sars-cov-2'],
    noroviruses: ['norovirus'],
    paramyxoPneumo: ['parainfluenza','measles','mumps','rsv','hmpv'],
    orthomyxoviruses: ['influenza-a','influenza-b'],
    rhabdoviruses: ['rabies'],
    reoviruses: ['rotavirus'],
    togaFlaviMatona: ['chikungunya-virus','dengue','zika-virus','japanese-encephalitis','west-nile-virus','rubella'],
    bunyavirales: ['hantaan-virus','sfts-virus'],
    retroviruses: ['hiv1','htlv1'],
    hepatitisViruses: ['hav','hbv','hdv','hcv','hev']
  },
  fungi: {
    superficialCutaneous: ['der','mal'],
    subcutaneous: ['sss'],
    systemicDimorphic: ['hca','bla','coc','tma'],
    opportunisticYeasts: ['cal','cgl','cau','cpa','ctr','ckr','cne','cga'],
    opportunisticMolds: ['afu','afl','ate','muc','fus','scedosporium-apiospermum','lpr'],
    pneumocystis: ['pji']
  },
  parasites: {
    intestinalUrogenitalProtozoa: ['ehi','gla','cry','cyc','cys','tva'],
    bloodTissueProtozoa: ['pfa','pvo','pma','pkn','bmi','tgo','lei','tcr','tbr'],
    nematodes: ['eve','alu','ttr','hoo','sst','tox','tri','ani'],
    trematodes: ['sch','csi','pwe','fhe'],
    cestodes: ['tsa','tso','ech'],
    arthropods: ['sca']
  }
};

const domainRank=new Map(Object.keys(PATHOGEN_ORDER).map((domain,index)=>[domain,index]));
const taxonRank=new Map(Object.entries(PATHOGEN_ORDER).flatMap(([domain,groups])=>
  Object.values(groups).flat().map((id,index)=>[domain+':'+id,index])));

export function sortPathogenRecords(records,catalog) {
  const variant=record=>catalog.variants[record.id];
  const taxon=record=>variant(record)?.pathogenId;
  const cardRank=(record,id)=>record.id===catalog.pathogens[id]?.representativeRecordId?0:variant(record)?.resistance?2:1;
  return [...records].sort((a,b)=>{
    const domainDifference=(domainRank.get(a.domain) ?? domainRank.size)-(domainRank.get(b.domain) ?? domainRank.size);
    if(domainDifference)return domainDifference;
    const aTaxon=taxon(a),bTaxon=taxon(b);
    const orderDifference=(taxonRank.get(a.domain+':'+aTaxon) ?? Number.MAX_SAFE_INTEGER)-
      (taxonRank.get(b.domain+':'+bTaxon) ?? Number.MAX_SAFE_INTEGER);
    if(orderDifference)return orderDifference;
    if(aTaxon!==bTaxon)return a.organism.localeCompare(b.organism,'en');
    return cardRank(a,aTaxon)-cardRank(b,bTaxon);
  });
}
