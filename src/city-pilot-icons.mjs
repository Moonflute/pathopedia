// Original 32px item sprites, matched to the shapes and palette of the held tools.
// Integer coordinates keep the inventory readable without external image assets.
const ink='#172b30',steel='#718a96',light='#edf6e4',gold='#edbb63';
const p=(d,fill)=>`<path d="${d}" fill="${fill}"/>`;
const r=(x,y,w,h,fill)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
const sprites={
 engulf:[p('M3 8H22V10H30V17H20V20H16V29H8V21H5V18H3Z',ink),r(5,10,16,7,steel),r(7,10,13,2,light),r(20,12,8,3,gold),r(10,19,4,8,steel),r(9,13,10,3,'#94efd9'),r(15,8,3,3,gold),r(24,11,3,6,light)].join(''),
 oxygen:[
  r(6,2,7,5,ink),r(19,2,7,5,ink),r(8,3,3,4,steel),r(21,3,3,4,steel),
  p('M5 7H14V9H16V26H14V29H5V27H3V10H5ZM18 7H27V9H29V26H27V29H18V27H16V10H18Z',ink),
  r(5,10,9,16,'#58bcca'),r(18,10,9,16,'#58bcca'),r(7,8,5,2,'#b6ffff'),r(20,8,5,2,'#b6ffff'),
  r(6,10,3,14,'#bbf9ec'),r(19,10,3,14,'#bbf9ec'),r(12,11,2,15,'#328696'),r(25,11,2,15,'#328696'),
  r(4,18,24,4,ink),r(5,19,22,2,steel),r(13,18,6,4,light),r(15,19,2,2,gold)
 ].join(''),
 nutrient:[
  p('M8 4H25V7H29V26H25V29H5V26H3V10H5V7H8Z',ink),
  p('M8 6H24V8H27V11H5V10H7V8H8Z','#fff0b0'),
  r(5,13,20,13,gold),r(7,15,16,9,'#d79a44'),r(25,12,2,13,'#9d653c'),
  r(5,13,20,2,'#ffe4a1'),r(13,12,4,15,'#fff0bf'),r(7,18,16,4,'#fff0bf'),r(14,19,2,2,'#ba8046'),
  r(8,6,15,2,'#dba552'),r(11,5,3,5,'#f7d483')
 ].join(''),
 repair:[
  p('M21 2H25V6H29V10H27V14H23V17H20V20H17V23H14V27H11V30H5V28H3V23H6V20H9V17H12V14H15V11H14V6H16V4H19V8H21Z',ink),
  p('M21 4H23V8H27V10H25V13H21V16H18V19H15V22H12V26H10V28H6V26H5V24H8V21H11V18H14V15H17V10H16V6H17V10H21Z','#9abacb'),
  p('M21 11H25V13H21V16H18V19H15V22H12V26H10V28H6V26H9V23H12V20H15V17H18V14H21Z','#627c91'),
  p('M17 6V10H19V12H17V15H14V18H11V21H8V24H6V23H8V20H11V17H14V14H16V11H15V6Z','#d8ede8'),r(6,24,3,3,ink)
 ].join(''),
 cleanup:[
  p('M5 8H12V4H27V6H29V13H22V10H17V14H23V27H20V29H6V27H4V15H2V10H5Z',ink),
  r(14,6,11,4,steel),r(13,8,4,8,steel),r(23,6,4,7,light),r(25,8,2,3,ink),r(14,6,9,2,'#b8cbd1'),
  r(6,15,15,11,'#a3c77e'),r(6,15,3,10,'#d0e8a4'),r(18,15,3,11,'#72915e'),
  r(8,18,8,5,ink),r(10,19,4,2,'#dfefc4'),r(5,25,17,2,steel),r(4,10,6,3,gold)
 ].join(''),
 patch:[
  p('M18 3H24V5H26V7H28V13H26V15H24V17H22V19H20V21H18V23H16V25H14V27H7V25H5V23H3V17H5V15H7V13H9V11H11V9H13V7H15V5H18Z',ink),
  p('M18 5H23V7H25V9H26V12H24V14H22V16H20V18H18V20H16V22H14V24H12V25H8V23H6V21H5V18H7V16H9V14H11V12H13V10H15V8H18Z','#e99b92'),
  p('M18 5H23V7H18V9H15V11H13V13H11V15H9V17H7V21H5V18H7V16H9V14H11V12H13V10H15V8H18Z','#ffd1b9'),
  p('M15 10H18V12H20V14H22V17H20V19H17V21H14V19H12V17H10V14H12V12H15Z',light),
  r(15,14,4,4,'#d9cfaa'),r(19,8,2,2,'#945c60'),r(23,10,2,2,'#945c60'),r(8,18,2,2,'#945c60'),r(10,22,2,2,'#945c60')
 ].join(''),
 antigen:[
  r(10,3,12,5,ink),r(11,4,10,3,light),r(18,4,3,3,'#b4c7cb'),
  p('M11 8H21V11H23V26H21V29H11V27H9V12H11Z',ink),
  r(12,9,8,3,'#a3c0d6'),r(11,13,10,12,'#b397d5'),r(12,12,3,11,'#e6d8ff'),
  p('M11 21H21V26H19V27H13V25H11Z','#8261b0'),r(17,13,3,12,'#9876c1'),
  r(14,17,5,5,gold),r(15,16,2,7,gold),r(13,18,7,2,gold),r(15,18,2,2,'#fff5c8'),
  r(4,9,2,6,'#dac7ff'),r(2,11,6,2,'#dac7ff'),r(25,23,2,4,'#dac7ff'),r(24,24,4,2,'#dac7ff')
 ].join(''),
 signal:[
  r(8,2,4,10,ink),r(9,3,2,9,steel),r(7,2,6,3,light),
  p('M8 10H22V12H24V28H7V26H5V13H8Z',ink),r(7,13,15,13,gold),r(8,12,13,2,'#ffedac'),r(20,14,2,12,'#bc8548'),
  r(9,15,10,5,ink),r(11,16,6,2,'#a4e4b7'),r(9,22,8,1,ink),r(9,24,8,1,ink),r(18,22,2,3,light),
  p('M19 3H23V5H25V9H23V6H21V5H19Z','#f9e7a7'),p('M24 1H27V3H29V6H31V10H29V7H27V4H24Z','#ccaa61')
 ].join(''),
 scanner:[
  p('M4 4H27V6H29V23H21V29H12V24H5V22H3V7H4Z',ink),
  r(5,6,22,15,steel),r(5,6,22,2,'#b1c9c6'),r(7,9,18,10,'#243e40'),r(8,10,16,8,'#64ab8c'),
  p('M9 14H12V12H14V16H16V11H18V14H23V16H19V14H18V18H14V14H13V16H9Z','#daffc2'),
  r(14,23,5,4,steel),r(14,23,2,4,'#b6d3c7'),r(8,21,14,1,'#a9c4bf'),r(24,20,2,2,gold)
 ].join(''),
 tractor:[
  p('M8 12H19V9H23V4H29V14H26V22H22V20H17V22H15V29H8V23H5V20H3V15H8Z',ink),
  r(5,15,14,5,steel),r(8,13,13,5,'#54b4c7'),r(9,21,4,6,steel),r(9,21,2,6,'#aac4c9'),
  p('M18 11H23V6H27V12H24V18H21V20H17V18H20V14H18Z','#8ee8e8'),
  r(23,5,5,3,light),r(21,19,5,3,light),r(12,12,2,9,'#c3fff0'),r(16,12,2,8,'#b4f7ec'),r(6,16,4,2,'#d6e2cc'),
  p('M29 10H31V12H29V16H27V14H25V12H27V10Z','#98ffff')
 ].join(''),
 repulsor:[
  p('M3 11H12V8H17V6H23V9H26V20H22V23H14V21H12V29H5V22H3Z',ink),
  r(5,13,12,7,steel),r(6,22,4,5,steel),r(6,22,2,5,'#c8bce0'),
  p('M13 10H18V8H21V11H24V18H21V21H15V19H13Z','#9773ce'),r(14,10,3,9,'#d7bcff'),
  p('M20 11H23V13H25V17H23V19H20V17H18V13H20Z','#ede0ff'),r(21,13,3,4,'#c2f8f3'),
  p('M25 3H28V8H25ZM28 10H31V13H28ZM28 17H31V20H28ZM25 22H28V27H25Z','#bf9eea'),r(6,14,5,3,'#ac8dde')
 ].join('')
};

export const pilotToolIcon=id=>`<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${sprites[id]||sprites.engulf}</svg>`;
