export const CITY_ASSET_KEY='pathopedia:cell-city:3d:assets:v1';
export function readCityAssets(storage){try{return (storage??globalThis.localStorage)?.getItem(CITY_ASSET_KEY)!=='false';}catch{return true;}}
export function storeCityAssets(enabled,storage){try{(storage??globalThis.localStorage)?.setItem(CITY_ASSET_KEY,String(!!enabled));}catch{}}

// A late download must never re-enable an unchecked option or a closed view.
export function createAssetSwitch({load,apply,state=()=>{}}){
 let enabled=false,disposed=false,pending=null,cache=null,applied=null;
 function activate(){if(!enabled||disposed||!cache)return;if(applied!==cache){apply(cache);applied=cache;}state('on');}
 return {async set(value){
  if(disposed)return;enabled=!!value;
  if(!enabled){if(applied){apply(null);applied=null;}state('off');return;}
  if(cache){activate();return;}
  state('loading');
  try{
   pending??=Promise.resolve().then(load).then(result=>{if(disposed){result.dispose();return null;}cache=result;return result;});
   await pending;activate();
  }catch(error){pending=null;if(enabled&&!disposed)state('error',error);}
 },dispose(){disposed=true;cache?.dispose();cache=null;}};
}
