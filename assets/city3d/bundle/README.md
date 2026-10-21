# Cell City selected bundle assets

16 models by RG Poly, selected from the user's purchased Creator Bundle: Volume 1.
License: [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).
The creator's product pages were checked on 2026-10-21:

- [Medieval Megapack](https://rg-poly.itch.io/medieval-megapack-low-poly): 10 workshop, supply and wall models.
- [Cute Park](https://rg-poly.itch.io/cute-park-pack): 3 tree/bush models.
- [Kitchen/Restaurant](https://rg-poly.itch.io/kitchenrestaurant-megapack): 2 workbench/jar models.
- [FarmLand](https://rg-poly.itch.io/farmland): 1 tank model.

`sources.json` records each original ZIP/internal path, checksum, triangle count
and runtime dependency. Original accompanying text files are in `licenses/`.
The Cute Park archive's original license text has the title “Cute Dungeon
Megapack”; its contents are retained verbatim, and the Cute Park product page
also lists CC0 1.0.

Reproduce with `python scripts/import-city-assets.py` from the repository root.
This reads local `cell-city-assets/` ZIPs without importing their full contents.
Embedded images become external PNGs deduplicated by checksum; geometry, UVs
and image pixels are preserved. Roughness/metalness are normalized for Cell City.

The selected models and three shared 1024×1024 PNGs total 2,362,064 bytes.
The PNGs require about 16 MiB of texture memory with RGBA8 and full mipmaps.
New model requests start only when the “신규 에셋 적용” checkbox is checked.
