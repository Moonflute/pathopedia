// Authored starting town only. Existing layouts are never rebuilt from this plan.
// Rotations are quarter turns; house doors look into the shared lane/court.
export const TOWN_PLAN=Object.freeze({
 heart:{centre:[0,3],depot:[7,1],production:[-1,-7],houses:[[-6,1,3],[-6,6,3],[-2,10,2],[2,10,2],[6,6,1],[6,10,2]],role:'square'},
 lung:{centre:[-10,-14],depot:[-7,-25],production:[-19,-27],houses:[[-19,-17,3],[-20,-12,3],[-14,-8,2],[-10,-8,2],[-6,-8,2],[-19,-22,3]],role:'wind-garden'},
 gut:{centre:[12,-8],depot:[18,-16],production:[8,-19],houses:[[7,-11,3],[7,-6,3],[11,-1,2],[15,-1,2],[19,-1,2],[21,-7,1]],role:'market'},
 kidney:{centre:[13,14],depot:[21,27],production:[17,7],houses:[[7,14,3],[7,19,3],[11,24,2],[15,24,2],[20,23,2],[21,18,1]],role:'water-garden'},
 marrow:{centre:[-8,18],depot:[0,19],production:[-18,28],houses:[[-16,17,3],[-16,22,3],[-11,27,2],[-7,27,2],[-3,24,1],[-3,28,1]],role:'nursery'},
 lymph:{centre:[-20,1],depot:[-30,-6],production:[-25,-13],houses:[[-28,0,3],[-28,5,3],[-23,10,2],[-19,10,2],[-15,10,2]],role:'commons'}
});
export const TOWN_HOUSES=Object.freeze(Object.entries(TOWN_PLAN).flatMap(([district,p])=>p.houses.map(([col,row,rot])=>({col,row,rot,district}))));
export const GROWTH_OFFSETS=Object.freeze({house:[[0,10],[-5,10],[5,10],[-9,4],[9,4]],depot:[[9,-5],[9,5]],production:[[-9,-7],[-9,8]]});
