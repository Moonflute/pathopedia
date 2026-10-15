
import fs from 'node:fs';
import path from 'node:path';
if(fs.existsSync('assets/cards/production-v1/jobs.json'))throw Error('Production plan already exists; preserve generated images and progress.');
const inventory=JSON.parse(fs.readFileSync('assets/cards/full-art-inventory.json','utf8'));
const common="Use case: scientific-educational. Asset type: square central illustration for a medical card encyclopedia, standalone transparent RGBA PNG.\nStyle: hand-drawn 2D Korean indie fantasy webtoon combined with a vintage European picture-book. Thin natural dark-brown outlines, slight organic variation, clean clear silhouettes. Matte flat paint and only 1–2 discrete cel-shadow tones; extremely subtle paper grain inside paint only. Crisp, no beauty-filter softness, blur, haze, bloom, glossy highlights, strong gradients or realistic 3D.\nComposition: one coherent main medical subject, centered and generously framed in a square with 6–10% empty margin. Legible at a small 150px thumbnail. No card frame, text, labels, arrows, numbers, lettered diagrams, logos, watermark, badges or decorative symbols.\nBackground: TRUE transparency (alpha=0) everywhere outside the subject. Keep all subject paint opaque, including pale membranes and cutaway tissues. Do not draw a white/gray/colored/checkerboard background, floor, ground, shadow or backdrop swash.\nABSOLUTELY NO surrounding effects: no sparkles, stars, diamonds, particles, scattered dots, petals, leaves, flowers, aura, halo, glow, magic rays/trails, bokeh, glitter or filler. Attached pathogen structures and necessary disease lesions are allowed, decorative substitutes are forbidden.\nNo weapons, drug bottle, fantasy mascot face, humanoid microbe or anthropomorphism.\n";
const pathogenRules="Primary request: illustrate ONLY the named canonical pathogen, showing its recognizable morphology. Use the supplied DB morphology/culture description as the medical constraint; biochemical text is contextual, never draw assay symbols. Depict one characteristic organism or a compact medically plausible group, not every life-cycle stage and not a scene. Do not claim species can be uniquely distinguished by an invented structure. Culture features can affect colony shape/color only where explicitly recorded. Never draw real culture pigment as magical glow. Bacterial cocci and rods lack eukaryotic nuclei/organelles. Attached flagella, capsule, spores, fungal hyphae and parasite structures must be plausible.\nPalette: Gram-positive PURPLE, Gram-negative muted PINK, Pseudomonas GREEN, anaerobes GRAY, atypical wall-less/chlamydial organisms RED mixed with WHITE. Fungi, viruses, parasites use restrained species-specific navy/teal, terracotta, ivory, ochre or violet without a bright-pastel restriction. Choose sober colors; no glow.\n";
const diseaseRules="Primary request: depict the named infectious disease through its main anatomical site and ONE characteristic symptom/lesion from the supplied clinical notes. Favor a clear isolated correct gross-anatomy cutaway or a natural relaxed person/body-part crop. Do not make a full multi-panel medical infographic. If showing a patient, use ordinary cream/earth-tone clothing, a believable mildly ill expression and an uncomplicated pose; no magical costumes. Hands only when necessary, with correct five fingers, coherent wrist-elbow-shoulder connection and no twisting reach behind the body; otherwise crop them naturally outside the frame. Feet must have exactly five toes. No detached extra limbs. Place internal anatomy at its correct position relative to the body's own left/right, using simple accurate shapes; do not invent detailed branches, bone joints or organs. A single local opaque organ overlay is acceptable; do not turn skin or the whole subject into translucent ghost material. Disease signs are localized actual lesions, not surrounding red rays, halos, arbitrary dots or glowing pain indicators. Non-graphic clinical depiction, no gratuitous gore or stigma. Do not illustrate rare complications as obligatory or fabricate a lesion for latent/asymptomatic infection.\n";
const trial=JSON.parse(fs.readFileSync('assets/cards/trials-2026-10-12-v2/manifest.json','utf8'));
fs.mkdirSync('assets/cards/production-v1',{recursive:true});
const jobs=[...inventory.pathogens.map(p=>({
 kind:'pathogen',id:p.id,name:p.name,domain:p.domain,status:'pending',
 file:'assets/cards/illustrations-v1/pathogens/'+p.id+'.png',
 alt:p.name+' — 특징적인 형태를 표현한 삽화',sourceIds:p.sourceIds,
 prompt:common+pathogenRules+'\nSubject: '+p.name+'.\nDB morphology: '+p.morphology+'\nDB culture: '+p.culture+'\nDB laboratory context (do not render text): '+p.diagnostics,
})),...inventory.diseases.map(d=>({
 kind:'disease',id:d.id,name:d.name,category:d.category,status:'pending',
 file:'assets/cards/illustrations-v1/diseases/'+d.id+'.png',
 alt:d.name+' — 침범 부위와 핵심 임상 특징을 표현한 삽화',sourceIds:d.sourceIds,
 prompt:common+diseaseRules+'\nSubject: '+d.name+' ('+d.englishName+').\nAnatomic sites: '+d.sites.join(', ')+'.\nClinical core: '+d.summary+'\nPresentation: '+d.presentation,
}))];
for(const job of jobs){
 const approved=trial.assets.find(a=>a.id===job.id&&a.kind===job.kind);
 if(!approved)continue;
 fs.mkdirSync(path.dirname(job.file),{recursive:true});
 fs.copyFileSync('assets/cards/trials-2026-10-12-v2/'+approved.file,job.file);
 job.status='ready';job.reusedFrom='assets/cards/trials-2026-10-12-v2/'+approved.file;
 job.originalPromptSet='assets/cards/trials-2026-10-12-v2/prompts.md';
}
const plan={schemaVersion:1,mode:'built-in image_gen.imagegen',styleRules:'assets/cards/art-direction.md',createdAt:'2026-10-12',canonicalCounts:{pathogens:inventory.pathogens.length,diseases:inventory.diseases.length},jobs};
fs.writeFileSync('assets/cards/production-v1/jobs.json',JSON.stringify(plan,null,2)+'\n');
fs.writeFileSync('assets/cards/production-v1/README.md','# 전체 카드 삽화\n\n병원체 182종과 질병 259개의 독립적인 중앙 삽화. 내성형은 기본 병원체 이미지를 공유합니다. 약제 삽화는 이번 범위에 포함하지 않습니다.\n\n생성 방식: built-in image_gen.imagegen. 모든 최종 프롬프트와 진행 상태: [jobs.json](jobs.json). 승인한 11장은 이전 시안과 프롬프트를 그대로 재사용했습니다. 이미지 위치: [illustrations-v1](../illustrations-v1/). 앱 연결 목록: [card-art.json](../../../data/card-art.json).\n');
console.log(JSON.stringify({total:jobs.length,reused:jobs.filter(j=>j.status==='ready').length}));
