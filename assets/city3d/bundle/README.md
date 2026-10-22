# Cell City selected bundle assets

43 selected models by RG Poly and EmacEArt from the purchased Creator Bundle.
Per-model source, checksums and licenses are recorded in `sources.json`.
RG Poly: CC0-1.0. EmacEArt: LicenseRef-EmacEArt, accompanying terms in `licenses/`.
The whole mixed collection must not be labelled CC0.

See [Cell City asset guide](../../../docs/cell-city-assets.md) for the source library,
active model inventory, placement rules, deferred candidates and resource budgets.

Reproduce from the repository root with `python -B scripts/import-city-assets.py`
(Python 3 and Pillow). The original ZIP library is read without alteration.
Shared PNGs are deduplicated; the Pirate atlas is losslessly recompressed.
NatureForge's two small props use sampled vertex colours instead of their 2K map.
Godot-only materials of the selected Pirate/TerraToon models are assigned to shared
atlases. Their wind-weight vertex colours are omitted from surface shading.

Models and 7 images total 4,864,667 bytes.
RGBA8 textures with full mipmaps are about 27.28 MiB, excluding Kenney,
geometry, render targets and shadows. This is a memory estimate, not an FPS claim.
Requests start only with the 신규 에셋 적용 checkbox enabled; it defaults on.
