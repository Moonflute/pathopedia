# Pathopedia v0.7.0 수록 범위

집계 기준: 종 또는 임상적으로 묶은 균군을 taxonId 하나로 센다. 같은 병원체의 내성 표현형을 새 종으로 부풀리지 않는다. 예를 들어 vivax/ovale 묶음과 dermatophytes 묶음은 각각 1개 군이다.

**182종·군 / 209개 기록 / 80개 약제 / 4,733개 패널 내 약제 단서**. 원본은 `data/organisms.json`, schema v2 / dataset v0.4.0이다.

| 분야 | 종·군 | 기록 |
|---|---:|---:|
| 세균 | 86 | 113 |
| 진균 | 23 | 23 |
| 바이러스 | 42 | 42 |
| 기생충 | 31 | 31 |

## 약제 단서의 의미

세균 감수성 패널 67개 기록은 교육용 고정 분리주의 S/I/R·문헌 활성을 사용한다. 세균 치료 단서 46개 및 진균·바이러스·기생충 96개 기록은 명시된 임상 상황의 표준·대안요법 포함 여부를 사용한다. `요법 외`는 내성·비활성이 아니다. 각 경우의 병용·제형·숙주·감염 단계 조건과 근거를 정답 후 기록에서 확인한다.

실측 MIC는 생성하지 않았다. 전체 검토 상태는 educational-draft이며 자동 테스트 통과는 전수 임상 검증을 의미하지 않는다.

## 세균

| 병원체·균군 | 기록 ID |
|---|---|
| Acinetobacter baumannii | GNX-211, GNX-212 |
| Actinomyces israelii | AIS-123 |
| Aerococcus urinae | BGX-525 |
| Aeromonas hydrophila | GNX-215 |
| Anaerobic Gram-positive cocci (Finegoldia/Peptostreptococcus) | BGX-518 |
| Anaplasma phagocytophilum | BGX-536 |
| Bacillus anthracis | BAN-117 |
| Bacillus cereus | BCE-116 |
| Bacteroides fragilis group | BGX-515 |
| Bartonella henselae | BGX-534 |
| Bordetella pertussis | BGX-504 |
| Borrelia burgdorferi sensu lato | BGX-537 |
| Brucella species | BGX-533 |
| Burkholderia cepacia complex | GNX-214 |
| Campylobacter jejuni/coli | BGX-514 |
| Capnocytophaga canimorsus | BGX-527 |
| Chlamydia pneumoniae | BGX-503 |
| Chlamydia trachomatis | BGX-510 |
| Citrobacter freundii | GNX-207 |
| Citrobacter koseri | GNX-208 |
| Clostridioides difficile | CDF-121 |
| Clostridium botulinum | BGX-520 |
| Clostridium perfringens | CPE-122 |
| Clostridium septicum | BGX-521 |
| Clostridium tetani | BGX-519 |
| Corynebacterium diphtheriae | CDI-118 |
| Corynebacterium jeikeium | CJE-119 |
| Coxiella burnetii | BGX-532 |
| Cutibacterium acnes | CAC-120 |
| Eikenella corrodens | BGX-528 |
| Enterobacter cloacae complex | ECL-015, ECL-016 |
| Enterococcus casseliflavus | ECA-114 |
| Enterococcus faecalis | EFA-005, EFA-006, EFA-401 |
| Enterococcus faecium | EFM-007, EFM-008, EFM-402 |
| Enterococcus gallinarum | EGA-113 |
| Escherichia coli | ECO-009, ECO-010, ECO-405, ECO-407, ECO-410 |
| Fusobacterium spp. | BGX-516 |
| Haemophilus influenzae | GNX-225, GNX-226, GNX-227 |
| Helicobacter pylori | BGX-513 |
| Kingella kingae | BGX-529 |
| Klebsiella aerogenes | GNX-209 |
| Klebsiella oxytoca | GNX-210 |
| Klebsiella pneumoniae | KPN-011, KPN-012, KPN-406, KPN-408, KPN-409 |
| Legionella pneumophila | BGX-501 |
| Listeria monocytogenes | LMO-115 |
| Moraxella catarrhalis | GNX-228 |
| Morganella morganii | GNX-204 |
| Mycobacterium abscessus complex | BGX-507 |
| Mycobacterium avium complex | BGX-506 |
| Mycobacterium tuberculosis complex | BGX-505 |
| Mycoplasma genitalium | BGX-511 |
| Mycoplasma pneumoniae | BGX-502 |
| Neisseria gonorrhoeae | BGX-509 |
| Neisseria meningitidis | BGX-522 |
| Nocardia spp. | BGX-508 |
| Orientia tsutsugamushi | BGX-531 |
| Pasteurella multocida | BGX-526 |
| Pathogenic Leptospira species | BGX-530 |
| Prevotella spp. | BGX-517 |
| Proteus mirabilis | GNX-201, GNX-202 |
| Proteus vulgaris | GNX-203 |
| Providencia stuartii | GNX-205 |
| Pseudomonas aeruginosa | PAE-013, PAE-014, PAE-411 |
| Rickettsia typhi | BGX-535 |
| Salmonella enterica (nontyphoidal) | GNX-220 |
| Salmonella enterica serovar Typhi | GNX-219 |
| Serratia marcescens | GNX-206 |
| Shigella sonnei | GNX-221 |
| Staphylococcus aureus | SAU-001, SAU-002, SAU-403, SAU-404 |
| Staphylococcus epidermidis | SEP-003, SEP-004 |
| Staphylococcus lugdunensis | SLU-111 |
| Staphylococcus saprophyticus | SSA-112 |
| Stenotrophomonas maltophilia | GNX-213 |
| Streptococcus agalactiae | SAG-103, SAG-104 |
| Streptococcus anginosus group | BGX-523 |
| Streptococcus dysgalactiae subsp. equisimilis | BGX-524 |
| Streptococcus gallolyticus subsp. gallolyticus | SGL-110 |
| Streptococcus mitis | SMI-108 |
| Streptococcus oralis | SOR-109 |
| Streptococcus pneumoniae | SPN-105, SPN-106, SPN-107 |
| Streptococcus pyogenes | SPY-101, SPY-102 |
| Treponema pallidum | BGX-512 |
| Vibrio cholerae | GNX-216 |
| Vibrio parahaemolyticus | GNX-218 |
| Vibrio vulnificus | GNX-217 |
| Yersinia enterocolitica | GNX-222 |

## 진균

| 병원체·균군 | 기록 ID |
|---|---|
| Aspergillus flavus | AFL-610 |
| Aspergillus fumigatus | AFU-609 |
| Aspergillus terreus | ATE-611 |
| Blastomyces dermatitidis complex | BLA-616 |
| Candida albicans | CAL-601 |
| Candida auris | CAU-603 |
| Candida glabrata (Nakaseomyces glabratus) | CGL-602 |
| Candida parapsilosis | CPA-604 |
| Candida tropicalis | CTR-605 |
| Coccidioides spp. | COC-615 |
| Cryptococcus gattii | CGA-608 |
| Cryptococcus neoformans | CNE-607 |
| Dermatophytes (Trichophyton rubrum / Microsporum spp.) | DER-619 |
| Fusarium spp. | FUS-621 |
| Histoplasma capsulatum | HCA-614 |
| Lomentospora prolificans | LPR-623 |
| Malassezia spp. | MAL-620 |
| Mucorales spp. | MUC-612 |
| Pichia kudriavzevii (Candida krusei) | CKR-606 |
| Pneumocystis jirovecii | PJI-613 |
| Scedosporium apiospermum species complex | SCA-622 |
| Sporothrix schenckii complex | SSS-617 |
| Talaromyces marneffei | TMA-618 |

## 바이러스

| 병원체·균군 | 기록 ID |
|---|---|
| BK polyomavirus | BKV-837 |
| Chikungunya virus | CHK-841 |
| Dabie bandavirus (SFTS virus) | SFT-835 |
| Dengue virus | DEN-832 |
| Epstein-Barr virus | EBV-805 |
| Hantaan virus | HAN-834 |
| Hepatitis A virus | HAV-813 |
| Hepatitis B virus | HBV-811 |
| Hepatitis C virus | HCV-812 |
| Hepatitis D virus | HDV-836 |
| Hepatitis E virus | HEV-814 |
| Herpes simplex virus type 1 | HSV-801 |
| Herpes simplex virus type 2 | HSV-802 |
| Human T-lymphotropic virus type 1 | HTL-816 |
| Human adenovirus | ADV-808 |
| Human cytomegalovirus | CMV-804 |
| Human herpesvirus 6 | HHS-806 |
| Human immunodeficiency virus type 1 | HIV-815 |
| Human metapneumovirus | HMP-823 |
| Human papillomavirus | HPV-810 |
| Human parainfluenza virus | PIV-822 |
| Human rhinovirus | RHV-821 |
| Influenza A virus | FLA-817 |
| Influenza B virus | FLB-818 |
| JC polyomavirus | JCV-838 |
| Japanese encephalitis virus | JEV-833 |
| Kaposi sarcoma-associated herpesvirus | HHE-807 |
| Measles virus | MEA-824 |
| Mpox virus | MPX-839 |
| Mumps virus | MUM-826 |
| Non-polio enteroviruses (coxsackievirus/echovirus) | ENT-829 |
| Norovirus | NOR-828 |
| Parvovirus B19 | PVB-809 |
| Poliovirus | POL-830 |
| Rabies lyssavirus | RAB-831 |
| Respiratory syncytial virus | RSV-819 |
| Rotavirus A | ROT-827 |
| Rubella virus | RUB-825 |
| SARS-CoV-2 | COV-820 |
| Varicella-zoster virus | VZV-803 |
| West Nile virus | WNV-842 |
| Zika virus | ZIK-840 |

## 기생충

| 병원체·균군 | 기록 ID |
|---|---|
| Anisakis spp. | ANI-729 |
| Ascaris lumbricoides | ALU-716 |
| Babesia microti | BMI-731 |
| Clonorchis sinensis | CSI-721 |
| Cryptosporidium spp. | CRY-708 |
| Cyclospora cayetanensis | CYC-709 |
| Cystoisospora belli | CYS-710 |
| Echinococcus granulosus / E. multilocularis | ECH-726 |
| Entamoeba histolytica | EHI-707 |
| Enterobius vermicularis | EVE-717 |
| Fasciola hepatica / F. gigantica | FHE-723 |
| Giardia duodenalis | GLA-706 |
| Hookworms (Ancylostoma duodenale / Necator americanus) | HOO-719 |
| Leishmania spp. | LEI-712 |
| Paragonimus westermani complex | PWE-722 |
| Plasmodium falciparum | PFA-701 |
| Plasmodium knowlesi | PKN-704 |
| Plasmodium malariae | PMA-703 |
| Plasmodium vivax / P. ovale | PVO-702 |
| Sarcoptes scabiei var. hominis | SCA-730 |
| Schistosoma spp. | SCH-720 |
| Strongyloides stercoralis | SST-715 |
| Taenia saginata | TSA-725 |
| Taenia solium larvae (cysticercosis) | TSO-724 |
| Toxocara canis / T. cati | TOX-727 |
| Toxoplasma gondii | TGO-705 |
| Trichinella spp. | TRI-728 |
| Trichomonas vaginalis | TVA-711 |
| Trichuris trichiura | TTR-718 |
| Trypanosoma brucei complex | TBR-714 |
| Trypanosoma cruzi | TCR-713 |

## 약제 도감

하나의 성분이 여러 분야에 쓰여도 한 번 센다. 고정 복합제는 한 항목이다. Amphotericin B 제형은 각 기록의 적용 조건에 기재하며 제형 차이를 별도 약제 수로 부풀리지 않는다.

- Acyclovir — Guanosine nucleoside analogue
- Albendazole — Benzimidazole
- Amikacin — Aminoglycoside
- Amoxicillin — Aminopenicillin
- Amoxicillin–clavulanate — Aminopenicillin/BLI
- Amphotericin B — Polyene
- Ampicillin — Aminopenicillin
- Artemether–lumefantrine — Artemisinin combination
- Atovaquone — Hydroxynaphthoquinone
- Atovaquone–proguanil — Antimalarial combination
- Azithromycin — Azalide macrolide
- Aztreonam — Monobactam
- Baloxavir marboxil — Cap-dependent endonuclease inhibitor
- Benznidazole — Nitroimidazole antitrypanosomal
- Cefazolin — 1st-generation cephalosporin
- Cefepime — 4th-generation cephalosporin
- Ceftaroline — Anti-MRSA cephalosporin
- Ceftazidime — 3rd-generation cephalosporin
- Ceftazidime–avibactam — Cephalosporin/BLI
- Ceftriaxone — 3rd-generation cephalosporin
- Cidofovir — Nucleotide analogue
- Ciprofloxacin — Fluoroquinolone
- Clarithromycin — 14-membered macrolide
- Clindamycin — Lincosamide
- Daptomycin — Lipopeptide
- Dolutegravir — HIV integrase strand-transfer inhibitor
- Doxycycline — Tetracycline
- Entecavir — Guanosine nucleoside analogue
- Erythromycin — Macrolide
- Ethambutol — Arabinose-analog antimycobacterial
- Fidaxomicin — Macrocyclic antibacterial
- Fluconazole — Triazole
- Flucytosine — Pyrimidine analogue
- Foscarnet — Pyrophosphate analogue
- Ganciclovir — Guanosine nucleoside analogue
- Gentamicin — Aminoglycoside
- Imipenem — Carbapenem
- Isavuconazole — Triazole
- Isoniazid — Antimycobacterial prodrug
- Itraconazole — Triazole
- Ivermectin — Macrocyclic lactone
- Lamivudine — Nucleoside reverse-transcriptase inhibitor
- Letermovir — CMV terminase inhibitor
- Levofloxacin — Fluoroquinolone
- Linezolid — Oxazolidinone
- Mebendazole — Benzimidazole
- Meropenem — Carbapenem
- Metronidazole — Nitroimidazole
- Micafungin — Echinocandin
- Miltefosine — Alkylphosphocholine
- Moxifloxacin — Fluoroquinolone
- Nirmatrelvir–ritonavir — Coronavirus protease inhibitor plus pharmacokinetic enhancer
- Nitazoxanide — Thiazolide
- Oseltamivir — Neuraminidase inhibitor
- Oxacillin — Penicillin
- Paromomycin — Aminoglycoside
- Peginterferon alfa — Host-directed immunomodulator
- Penicillin G — Natural penicillin
- Pentamidine — Aromatic diamidine
- Permethrin — Topical pyrethroid
- Piperacillin–tazobactam — Antipseudomonal penicillin/BLI
- Posaconazole — Triazole
- Praziquantel — Pyrazinoisoquinoline
- Primaquine — 8-aminoquinoline
- Pyrazinamide — Nicotinamide-analog antimycobacterial prodrug
- Pyrimethamine — Antifolate
- Quinine — Quinoline antiprotozoal
- Remdesivir — Adenosine nucleotide prodrug
- Ribavirin — Broad-spectrum nucleoside analogue
- Rifampicin — Rifamycin
- Sofosbuvir–velpatasvir — HCV NS5B nucleotide inhibitor plus NS5A inhibitor
- Sulfadiazine — Sulfonamide
- Teicoplanin — Glycopeptide
- Tenofovir (TDF/TAF) — Nucleotide reverse-transcriptase inhibitor
- Terbinafine — Allylamine
- Tigecycline — Glycylcycline
- Triclabendazole — Benzimidazole flukicide
- Trimethoprim–sulfamethoxazole — Antifolate combination
- Vancomycin — Glycopeptide
- Voriconazole — Triazole
