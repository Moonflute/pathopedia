const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const midpoint=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

// All input shares a screen-to-world camera, independent of simulation coordinates.
export function createCityCamera(onChange=()=>{}){
  let width=1,height=1,inset=0,scale=.72,x=865,y=445,initialized=false,overview=false;
  const pointers=new Map();let gesture=null;
  const area=()=>({x:width/2,y:46+Math.max(1,height-inset-66)/2});
  const fitted=()=>Math.max(.05,Math.min((width-20)/1300,Math.max(40,height-inset-90)/680));
  const limits=()=>({min:fitted()*.7,max:3.2});
  function transform(){const center=area();return {scale,offsetX:center.x-x*scale,offsetY:center.y-y*scale};}
  function world(point){const t=transform();return {x:(point.x-t.offsetX)/scale,y:(point.y-t.offsetY)/scale};}
  function bound(){x=clamp(x,95,1350);y=clamp(y,100,810);}
  function setViewport(w,h,bottom=0){
    if(initialized&&width===w&&height===h&&inset===bottom)return;
    width=Math.max(1,w);height=Math.max(1,h);inset=Math.max(0,bottom);
    if(!initialized){scale=Math.min(1.05,Math.max(.72,fitted()*1.12));initialized=true;}
    if(overview){scale=fitted();x=720;y=445;}
    else scale=clamp(scale,limits().min,limits().max);
    onChange();
  }
  function pan(dx,dy){if(!dx&&!dy)return;overview=false;x-=dx/scale;y-=dy/scale;bound();onChange();}
  function zoomAt(factor,point=area()){
    if(!Number.isFinite(factor)||factor<=0)return;
    const anchor=world(point),center=area(),range=limits();
    const next=clamp(scale*factor,range.min,range.max);if(next===scale)return;
    overview=false;scale=next;x=anchor.x-(point.x-center.x)/scale;y=anchor.y-(point.y-center.y)/scale;
    bound();onChange();
  }
  function fit(){overview=true;scale=fitted();x=720;y=445;onChange();}
  function focus(point){overview=false;x=point.x;y=point.y;bound();onChange();}
  function down(id,point){
    pointers.set(id,{...point});
    if(pointers.size===1)gesture={start:{...point},moved:false,multiple:false};
    else if(gesture)gesture.multiple=true;
  }
  function move(id,point){
    const previous=pointers.get(id);if(!previous||!gesture)return;
    const before=[...pointers.values()];pointers.set(id,{...point});
    if(pointers.size>=2){
      const after=[...pointers.values()],oldMid=midpoint(before[0],before[1]),newMid=midpoint(after[0],after[1]);
      const oldDistance=distance(before[0],before[1]);
      if(oldDistance>2)zoomAt(distance(after[0],after[1])/oldDistance,oldMid);
      pan(newMid.x-oldMid.x,newMid.y-oldMid.y);gesture.multiple=true;
    }else{
      if(distance(gesture.start,point)>5)gesture.moved=true;
      if(gesture.moved||gesture.multiple)pan(point.x-previous.x,point.y-previous.y);
    }
  }
  function up(id,point,cancelled=false){
    if(!pointers.has(id))return null;
    const tap=!cancelled&&pointers.size===1&&gesture&&!gesture.moved&&!gesture.multiple&&distance(gesture.start,point)<=5;
    pointers.delete(id);if(!pointers.size)gesture=null;
    else if(gesture)gesture.multiple=true;
    return tap?world(point):null;
  }
  function clear(){pointers.clear();gesture=null;}
  return {setViewport,transform,world,pan,zoomAt,fit,focus,down,move,up,clear,
    info:()=>({scale,overview,...limits()})};
}
