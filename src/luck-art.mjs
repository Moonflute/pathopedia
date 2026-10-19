import {cardArtwork} from './card-art.mjs';
// Game-only vector mascots; the clinical collection remains the shared artwork source.
const eyes='<path d="M42 63v5m16-5v5" stroke="#132536" stroke-width="4" stroke-linecap="round"/><path d="M46 73q4 4 8 0" fill="none" stroke="#132536" stroke-width="2.5" stroke-linecap="round"/>';
const feet='<path d="M33 86l-6 7m40-7 6 7" stroke="#17354b" stroke-width="7" stroke-linecap="round"/>';
const art={
 saline:'<path d="M51 16v-5q0-5 5-5" fill="none" stroke="#c1f3fa" stroke-width="4"/><rect x="25" y="18" width="50" height="66" rx="14" fill="#9ee8ee"/><path d="M29 48q12-7 23 0t19 0v24q0 10-12 10H39q-10 0-10-10z" fill="#49bdcf"/><rect x="38" y="26" width="24" height="20" rx="5" fill="#efffff"/><path d="M45 36h10m-5-5v10" stroke="#33a0b5" stroke-width="3"/><path d="M51 84v5q0 9 13 7" fill="none" stroke="#c0f4fa" stroke-width="4"/>',
 beta:'<rect x="33" y="13" width="34" height="16" rx="5" fill="#e5ad40"/><rect x="23" y="28" width="54" height="59" rx="15" fill="#a95827"/><path d="M29 38q0-5 7-5h7v10H29z" fill="#ecae69" stroke="none"/><rect x="28" y="49" width="44" height="31" rx="9" fill="#ffe5a3"/><path d="M39 23h22" stroke="#fff2b0" stroke-width="3"/>',
 adren:'<path d="M37 15h26v13H37z" fill="#a8cddd"/><rect x="30" y="26" width="40" height="62" rx="13" fill="#ec6b86"/><rect x="34" y="45" width="32" height="36" rx="8" fill="#ffe4e9"/><path d="M57 32l-11 11h9l-7 10" fill="none" stroke="#fff3ae" stroke-width="4"/><path d="M39 20h22" stroke="#e7f8ff" stroke-width="3"/>',
 peroxide:'<path d="M38 14h24v18H38z" fill="#aaedec"/><rect x="34" y="12" width="32" height="12" rx="4" fill="#5baab5"/><path d="M38 31Q22 37 23 51v27q0 10 13 10h28q13 0 13-10V51q1-14-15-20" fill="#e0fbf5"/><path d="M27 55h46v23q0 6-10 6H37q-10 0-10-6z" fill="#87dadc" stroke="none"/><circle cx="35" cy="46" r="5" fill="#fff"/><circle cx="62" cy="39" r="7" fill="#fff"/><circle cx="78" cy="24" r="7" fill="#d9ffff" stroke-width="2"/>',
 yeast:'<ellipse cx="32" cy="35" rx="15" ry="19" transform="rotate(-28 32 35)" fill="#e7c172"/><ellipse cx="54" cy="63" rx="28" ry="29" fill="#f1d797"/><path d="M36 49q9-11 20-9" fill="none" stroke="#fff4cd" stroke-width="6"/><circle cx="72" cy="24" r="7" fill="#ffe4a1"/><path d="M77 11v-6m9 17h6" stroke="#ffe4a1" stroke-width="3"/>',
 plasmid:'<circle cx="50" cy="51" r="32" fill="#5e9b64"/><circle cx="50" cy="51" r="23" fill="#c5ee98"/><path d="M26 43q7-19 23-17t24 18M26 61q6 19 24 18t25-19" fill="none" stroke="#ebffc0" stroke-width="5"/><path d="M23 48l10-5m-4-8 9 2m25-4 6 7M27 68l9-3m26 8 4-8" stroke="#356846" stroke-width="3"/><path d="M50 14v-7m0 80v7m-35-43H7m79 0h7" stroke="#bce891" stroke-width="4"/>',
 phage:'<path d="M50 9l22 13v27L50 62 28 49V22z" fill="#a3c8f0"/><path d="M50 13v44m-19-31 19 11 19-11" fill="none" stroke="#e7f4ff" stroke-width="3"/><path d="M50 59v20m-8-16h16m-16 7h16m-8 9-21 11m21-11 21 11m-21-11v17" fill="none" stroke="#b4dafa" stroke-width="5"/><path d="M38 32v5m24-5v5" stroke="#18334f" stroke-width="4"/><path d="M45 46q5 4 10 0" fill="none" stroke="#18334f" stroke-width="2.5"/>',
 toxin:'<path d="M33 20l5-9 14 3 10-7 8 14 14 5-6 14 9 13-11 10-4 17-16 1-11 10-12-11-17-5 3-17-8-13 12-9z" fill="#8cbd45"/><path d="M32 38q15-17 31-6t8 36q-5 17-27 11T25 53" fill="#d5ec7d"/><path d="M23 24l-8-7m66 2 5-8M15 76l-7 4" stroke="#ddf998" stroke-width="4"/>'
};
const cache=new Map();
export function luckArtwork(def,mode){
 if(!def.art.startsWith('item:'))return cardArtwork(mode==='remedy'?'drug':'pathogen',def.art);
 const id=def.art.slice(5);if(!art[id])return null;
 if(!cache.has(id)){
  const face=['phage'].includes(id)?'':eyes;
  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g stroke="#17354b" stroke-width="3" stroke-linejoin="round">'+feet+art[id]+'</g>'+face+'</svg>';
  cache.set(id,{src:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)});
 }
 return cache.get(id);
}
