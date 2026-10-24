// A unilateral rope constraint preserves tangential momentum on release.
export function constrainPilotRope(body,delta,velocity,anchor,length,eyeOffset=.58){
 const x=body.x+delta.x-anchor.x,y=body.y+delta.y+eyeOffset-anchor.y,z=body.z+delta.z-anchor.z,d=Math.hypot(x,y,z);
 if(d<=length||d<.001)return false;
 const nx=x/d,ny=y/d,nz=z/d,excess=d-length;
 delta.x-=nx*excess;delta.y-=ny*excess;delta.z-=nz*excess;
 const outward=velocity.x*nx+velocity.y*ny+velocity.z*nz;
 if(outward>0){velocity.x-=nx*outward;velocity.y-=ny*outward;velocity.z-=nz*outward;}return true;
}
