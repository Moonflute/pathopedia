// Shared presentation rules. Simulation colors and saved coordinates are separate.
export const CITY_STYLE=Object.freeze({
 meadow:0x9db58d,grassLight:0xa6bb94,grassDark:0x94ad85,sky:0xdfe8dc,
 plaster:0xf1e6cc,plasterWarm:0xe5d9bc,stone:0xb8b5a4,trim:0xc5b69a,
 timber:0x8c785c,brass:0xc5aa6e,teal:0x79a9a6,rose:0xdba39a,
 sage:0xa6b57c,lavender:0xb3a2c7,glass:0x527d7f,
 road:0xd6c9ac,roadEdge:0x8f9f85,plaza:0xeadfc5,water:0x5e9b9c,waterLight:0x79b5ae,
 roofs:Object.freeze([0xad6658,0x547c82,0xb28f56,0x7d758b,0xa56b83,0x75886b]),
 foliage:Object.freeze([0x668267,0x75916e,0x8b9f75]),
 roughness:.92,atlasTint:0xe5e3d7,
 houseHeight:1.08,houseUpperHeight:1.48,landmarkHeight:4.6,
 labelHeight:Object.freeze({heart:4.9,lung:4.3,gut:3.9,kidney:4,marrow:4.2,lymph:4.9}),
 activity:Object.freeze({build:0xd6a451,repair:0x69a59a,fabricate:0xd1aa65,produce:0x75b5a7,collect:0xa596ad,patch:0xd6b77b,present:0x9abe75,prime:0x80baca,differentiate:0xb9a2cc,degranulate:0xdf9c95,cytotoxic:0x9a9bc9,regulate:0x7ecbb0,net:0xeee4b7}),
 mainRoad:1.5,alley:.72,curb:.22
});

// Coherent roof families let the six neighbourhoods read at overview scale.
export const NEIGHBOURHOOD_ROOFS=Object.freeze({
 heart:[0xad6658,0xc17c69,0xa36454],lung:[0x547c82,0x719b9d,0x638c8f],
 gut:[0xb28f56,0xc6a66f,0xa78658],kidney:[0x7d758b,0x9b90a8,0x807c96],
 marrow:[0xa56b83,0xbc8c9e,0x956c83],lymph:[0x75886b,0x94a481,0x7f956e]
});
