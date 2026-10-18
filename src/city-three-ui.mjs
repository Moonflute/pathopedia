import {createCityGame} from './city-ui.mjs';
import {createCityThreeRenderer,createThreeLoop} from './city-three-renderer.mjs';
import {CITY_3D_SAVE_KEY} from './city-three-layout.mjs';

export const createCityThreeGame=data=>createCityGame(data,{mode:'3d',saveKey:CITY_3D_SAVE_KEY,renderer:createCityThreeRenderer,loop:createThreeLoop});
