import * as T from './vendor/three/three.module.min.js';

// Small, related house types: silhouettes vary while every detail stays on its lot.
const plains=[
 {kind:'farmhouse',width:1.08,depth:.86,height:.82,roof:'gable',rise:.48,turn:1,feature:'porch'},
 {kind:'garden-cottage',width:.96,depth:.96,height:.96,roof:'hip',rise:.48,turn:0,feature:'shutters'},
 {kind:'attic-cottage',width:.94,depth:1,height:1.08,roof:'gable',rise:.6,turn:1,feature:'dormer'},
 {kind:'timber-house',width:.84,depth:.92,height:1.42,roof:'gable',rise:.56,turn:0,feature:'timber'},
 {kind:'craft-cottage',width:1.08,depth:.84,height:.86,roof:'shed',rise:.38,turn:0,feature:'shop'},
 {kind:'porch-house',width:1.02,depth:.88,height:1.18,roof:'hip',rise:.4,turn:0,feature:'porch'}
];
const canals=[
 {kind:'canal-gable',width:.82,depth:.96,height:1.62,roof:'gable',rise:.5,turn:0,feature:'balcony'},
 {kind:'small-palazzo',width:1.08,depth:.86,height:1.3,roof:'hip',rise:.36,turn:0,feature:'loggia'},
 {kind:'merchant-house',width:.94,depth:.94,height:1.06,roof:'gable',rise:.42,turn:1,feature:'shop'},
 {kind:'tall-townhouse',width:.78,depth:.9,height:1.82,roof:'gable',rise:.54,turn:0,feature:'shutters'},
 {kind:'terrace-house',width:1.04,depth:.88,height:1.26,roof:'hip',rise:.18,turn:0,feature:'terrace'},
 {kind:'quay-cottage',width:1.08,depth:.86,height:.96,roof:'gable',rise:.38,turn:1,feature:'balcony'}
];

export function houseDesign(theme,seed=0){
 const index=((Math.trunc(seed)%6)+6)%6;return (theme==='2'?canals:plains)[index];
}

// Position, not the infill enumeration, keeps existing homes recognisable on rebuild.
export function houseSeed(x,z){
 let h=Math.imul(Math.round(x*100),73856093)^Math.imul(Math.round(z*100),19349663);
 h=Math.imul(h^(h>>>16),0x45d9f3b);return (h^(h>>>16))>>>0;
}

export function houseRoofGeometry(kind){
 if(kind==='hip'){
  const g=new T.ConeGeometry(Math.SQRT1_2,1,4);g.rotateY(Math.PI/4);g.translate(0,.5,0);return g;
 }
 const shape=new T.Shape();shape.moveTo(-.5,0);shape.lineTo(.5,0);
 if(kind==='shed'){shape.lineTo(.5,.18);shape.lineTo(-.5,1);}else shape.lineTo(0,1);
 shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:1,bevelEnabled:false,steps:1});g.translate(0,0,-.5);return g;
}
