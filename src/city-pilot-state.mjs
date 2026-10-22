// Control ownership is transient. Saves always remain ordinary, autonomous cities.
const pilots=new WeakMap();
export const pilotedCell=s=>pilots.get(s)||null;
export function setPilotedCell(s,cell){if(cell)pilots.set(s,cell);else pilots.delete(s);}
