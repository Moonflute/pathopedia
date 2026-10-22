"""Selected expansion assets. Read source archives; emit only game resources."""
import hashlib
import io
import json
import posixpath
import struct
import zlib
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EMACE = 'LicenseRef-EmacEArt'
PACKS = [
    ('old-town', ['old town Glb.zip', 'OldTown_Glb.zip'], '', EMACE,
     'https://emaceart.itch.io/old-town-environment-courtyards', None, False, [
         ('harbour-crane', 'EA_crane_01a.glb'),
         ('repair-scaffold', 'EA_scaffolding_l_small_01a.glb'),
         ('repair-planks', 'EA_Planks_01a.glb'),
         ('repair-ladder', 'EA_ladder_small_01a.glb'),
         ('supply-bags', 'EA_bags_01b.glb'),
         ('supply-basket', 'EA_Basket_apple_01a.glb'),
         ('supply-barrel', 'EA_Barrel_01a.glb'),
     ]),
    ('pirate-island', ['PirateIsland_Godot.zip'], 'PirateIsland/Models/',
     'CC0-1.0', 'https://rg-poly.itch.io/pirate-island',
     'PirateIsland/Textures/T_Atlas_TI.png', False, [
         ('harbour-boat', 'Props/SM_Boat_A.glb'),
         ('harbour-anchor', 'Props/SM_Anchor_A.glb'),
     ]),
    ('terratoon', ['terratoon-stylized-tree-pack-low-poly-forest-foliage-godot.zip'],
     'TerraToonStylizedTreePack/Meshes/', EMACE,
     'https://emaceart.itch.io/terratoon-stylized-tree-pack-low-poly-forest-foliage',
     'TerraToonStylizedTreePack/Textures/Atlas_TerraToon.png', False, [
         ('garden-tree', 'EA02_Env_Tree_01a.glb'),
         ('garden-tree-small', 'EA02_Env_Tree_01d.glb'),
         ('garden-shrub', 'EA02_Env_TreeCrown_01.glb'),
     ]),
    ('rocks-and-stone', ['Glb.zip'], 'Glb/', EMACE,
     'https://emaceart.itch.io/l100-rocks-stones-and-clifs', None, False, [
         ('rubble-rock', 'EA01_Env_Rock_01a.glb'),
         ('rubble-stone', 'EA01_Env_Stone_Cobble_06.glb'),
     ]),
    ('nature-extended', ['Low Poly Nature_Godot.zip'],
     'low-poly-nature--extended/LowPolyNature_Godot/Models/', 'CC0-1.0',
     'https://rg-poly.itch.io/nature-megapack-low-poly-refreshed-unity-urp', None, False, [
         ('garden-flower', 'Flowers/Flower_1_1_A.glb'),
         ('garden-clover', 'Flowers/Clover_1_1_A.glb'),
         ('canal-reed', 'Farm Plants/Reed_Single.glb'),
     ]),
    ('natureforge', ['NatureForge 3.0 - Godot 4 project (Godot 4.7+).zip'],
     'NatureForgeStylizedMeadowFarmKit/Meshes/', EMACE,
     'https://emaceart.itch.io/poly-meadows', None, True, [
         ('hay-bale', 'EA_M_HayBale_Dry_01a_PRE.gltf'),
         ('garden-bench', 'EA_M_Furniture_Bench_Wooden_01_PRE.gltf'),
     ]),
]


def file_sha(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def optimize_png(data):
    """Recompress unchanged PNG scanlines; retain all other chunks and pixels."""
    chunks, payload, at = [], [], 8
    while at < len(data):
        length = struct.unpack_from('>I', data, at)[0]
        chunk = data[at:at + length + 12]
        if chunk[4:8] == b'IDAT':
            payload.append(chunk[8:-4])
            if not chunks or chunks[-1] is not None:
                chunks.append(None)
        else:
            chunks.append(chunk)
        at += length + 12
    compressed = zlib.compress(zlib.decompress(b''.join(payload)), 9)
    body = b'IDAT' + compressed
    replacement = struct.pack('>I', len(compressed)) + body + struct.pack('>I', zlib.crc32(body))
    result, inserted = [data[:8]], False
    for chunk in chunks:
        if chunk is not None:
            result.append(chunk)
        elif not inserted:
            result.append(replacement)
            inserted = True
    result = b''.join(result)
    return result if len(result) < len(data) else data


def texture_bytes(archive, source, image, doc, buffers):
    if 'bufferView' in image:
        view = doc['bufferViews'][image['bufferView']]
        start = view.get('byteOffset', 0)
        return buffers[view.get('buffer', 0)][start:start + view['byteLength']]
    return archive.read(posixpath.normpath(posixpath.join(posixpath.dirname(source), image['uri'])))


def bake_palette(doc, buffers, atlas):
    """Sample the small props' UV palette into linear vertex colours, avoiding a 2K map."""
    from PIL import Image
    image = Image.open(io.BytesIO(atlas)).convert('RGB')
    width, height = image.size
    linear = [(v / 255 / 12.92 if v <= 10 else ((v / 255 + .055) / 1.055) ** 2.4) for v in range(256)]
    for mesh in doc['meshes']:
        for primitive in mesh['primitives']:
            uv = doc['accessors'][primitive['attributes']['TEXCOORD_0']]
            assert uv['componentType'] == 5126 and uv['type'] == 'VEC2'
            view = doc['bufferViews'][uv['bufferView']]
            raw = buffers[view.get('buffer', 0)]
            offset = view.get('byteOffset', 0) + uv.get('byteOffset', 0)
            stride = view.get('byteStride', 8)
            values = bytearray()
            for i in range(uv['count']):
                u, v = struct.unpack_from('<ff', raw, offset + i * stride)
                pixel = image.getpixel((min(width - 1, int((u % 1) * width)), min(height - 1, int((v % 1) * height))))
                values.extend(struct.pack('<fff', *(linear[channel] for channel in pixel)))
            view_index = len(doc['bufferViews'])
            doc['bufferViews'].append({'buffer': len(buffers), 'byteLength': len(values), 'target': 34962})
            buffers.append(bytes(values))
            primitive['attributes']['COLOR_0'] = len(doc['accessors'])
            doc['accessors'].append({'bufferView': view_index, 'componentType': 5126, 'count': uv['count'], 'type': 'VEC3'})
    doc['images'], doc['textures'] = [], []
    for material in doc['materials']:
        material['pbrMetallicRoughness'] = {'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': 0, 'roughnessFactor': 1}


def export_additions(out, decode, encode, sha):
    result = {'models': {}, 'textures': {}, 'archives': {}}
    for pack, aliases, prefix, license_id, page, override, bake, entries in PACKS:
        path = next((ROOT / 'cell-city-assets' / n for n in aliases if (ROOT / 'cell-city-assets' / n).exists()), None)
        if path is None:
            raise FileNotFoundError(aliases[0])
        result['archives'][path.name] = {'sha256': file_sha(path), 'pack': pack, 'license': license_id, 'page': page}
        with zipfile.ZipFile(path) as archive:
            for source in archive.namelist():
                if Path(source).name.lower() == 'license.txt':
                    (out / 'licenses' / (pack + '-LICENSE.txt')).write_bytes(archive.read(source))
                    break
            for name, relative in entries:
                source = prefix + relative
                if source not in archive.namelist():
                    matches = [n for n in archive.namelist() if Path(n).name == Path(relative).name]
                    if len(matches) != 1:
                        raise ValueError(('Ambiguous source', source, matches))
                    source = matches[0]
                if source.endswith('.glb'):
                    doc, binary = decode(archive.read(source))
                    buffers = [binary]
                else:
                    doc = json.loads(archive.read(source))
                    buffers = [archive.read(posixpath.normpath(posixpath.join(posixpath.dirname(source), b['uri']))) for b in doc['buffers']]
                original_images = doc.get('images', [])
                image_views = {im['bufferView'] for im in original_images if 'bufferView' in im}
                if bake:
                    bake_palette(doc, buffers, texture_bytes(archive, source, original_images[0], doc, buffers))
                elif override:
                    doc['images'] = [{'uri': override}]
                    doc['textures'] = [{'sampler': 0, 'source': 0}]
                    doc['samplers'] = [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}]
                    for material in doc['materials']:
                        material['pbrMetallicRoughness'] = {'baseColorFactor': [1, 1, 1, 1], 'baseColorTexture': {'index': 0}, 'metallicFactor': 0, 'roughnessFactor': 1}
                    # These colours contain Godot wind weights, not surface colour.
                    for mesh in doc['meshes']:
                        for primitive in mesh['primitives']:
                            primitive['attributes'].pop('COLOR_0', None)
                doc.setdefault('images', [])
                for image in doc['images']:
                    data = archive.read(override) if override else texture_bytes(archive, source, image, doc, buffers)
                    if pack == 'pirate-island':
                        data = optimize_png(data)
                    digest = sha(data)
                    image_path = 'textures/' + digest[:16] + '.png'
                    (out / image_path).write_bytes(data)
                    width, height = struct.unpack_from('>II', data, 16)
                    result['textures'][image_path] = {'sha256': digest, 'bytes': len(data), 'width': width, 'height': height}
                    image.clear()
                    image['uri'] = '../' + image_path
                views, mapping, chunks, offset = [], {}, [], 0
                for index, view in enumerate(doc.get('bufferViews', [])):
                    if index in image_views:
                        continue
                    original_offset = view.get('byteOffset', 0)
                    data = buffers[view.get('buffer', 0)][original_offset:original_offset + view['byteLength']]
                    mapping[index] = len(views)
                    views.append({**view, 'buffer': 0, 'byteOffset': offset})
                    data += b'\0' * (-len(data) % 4)
                    chunks.append(data)
                    offset += len(data)
                doc['bufferViews'] = views
                def remap(value):
                    if isinstance(value, dict):
                        for key, item in value.items():
                            if key == 'bufferView':
                                value[key] = mapping[item]
                            else:
                                remap(item)
                    elif isinstance(value, list):
                        for item in value:
                            remap(item)
                remap(doc)
                doc['buffers'] = [{'byteLength': offset}]
                for material in doc.get('materials', []):
                    pbr = material.setdefault('pbrMetallicRoughness', {})
                    pbr['metallicFactor'], pbr['roughnessFactor'] = 0, 1
                    material.get('extensions', {}).pop('KHR_materials_specular', None)
                doc['extensionsUsed'] = [e for e in doc.get('extensionsUsed', []) if e != 'KHR_materials_specular']
                data = encode(doc, b''.join(chunks))
                model_path = 'models/' + name + '.glb'
                (out / model_path).write_bytes(data)
                triangles = sum(doc['accessors'][p['indices']]['count'] // 3 if 'indices' in p else doc['accessors'][p['attributes']['POSITION']]['count'] // 3 for mesh in doc['meshes'] for p in mesh['primitives'])
                result['models'][name] = {'path': model_path, 'archive': path.name, 'source': source,
                                          'pack': pack, 'author': 'RG Poly' if license_id == 'CC0-1.0' else 'EmacEArt',
                                          'license': license_id, 'page': page, 'bytes': len(data),
                                          'sha256': sha(data), 'triangles': triangles,
                                          'textureMode': 'vertex-colours' if bake else 'shared-atlas'}
    (out / 'licenses' / 'old-town-LICENSE.txt').write_text(
        'EmacEArt Asset License\nOld Town environment: Town and Courtyards\n'
        'Personal and commercial project use is permitted; attribution is optional.\n'
        'Do not resell or redistribute the source assets as standalone files or an asset pack.\n'
        'Author and complete terms: https://emaceart.itch.io/old-town-environment-courtyards\n', encoding='utf-8')
    return result
