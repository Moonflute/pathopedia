"""Export the small, reviewed CC0 subset; never ship the source ZIP library.

Run from the repository root with Python 3. Reads archives in cell-city-assets/.
Externalizes embedded atlas images and deduplicates by SHA256, without changing
mesh data, UVs or image pixels. Output is reproducible and checked into Git.
"""
import hashlib
import json
import posixpath
import struct
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/city3d/bundle'
PACKS = [
    ('MedievalMegapack_Godot.zip', 'MedievalMegapack_Godot/Models/', [
        ('crate', 'Other/Box_1_A.glb'),
        ('logs', 'Other/CutedWood_1_A.glb'),
        ('hammer', 'Tools/Hammer_1_A.glb'),
        ('bucket', 'Tools/Bucket_2_A.glb'),
        ('bench', 'Other/Bench_1_A.glb'),
        ('table', 'Other/Table_1_A.glb'),
        ('palisade', 'Palisade/Palisade_A_2_2.glb'),
        ('gate', 'Buildings/Castle_Gate.glb'),
        ('workshop', 'Buildings/BarnWood_1_A.glb'),
        ('cart', 'Other/Cart_1_A.glb'),
    ]),
    ('Cute Park.zip', 'Cute Park/gLTF/', [
        ('tree-cube', 'TreeCube_1_2.glb'),
        ('tree-round', 'Tree_2_1.glb'),
        ('bush', 'Bush_1_1.glb'),
    ]),
    ('Restaurant_Godot.zip', 'Restaurant_Godot/Models/', [
        ('station', 'Furniture/StationTable_1_A.glb'),
        ('jar', 'Food/Jar_1_A.glb'),
    ]),
    ('Farm Pack Godot.zip', 'Farm Pack/Models/', [
        ('tank', 'Buildings/SM_MilkTank_1_B.glb'),
    ]),
]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def decode(data):
    assert struct.unpack_from('<II', data) == (0x46546c67, 2)
    size = struct.unpack_from('<I', data, 12)[0]
    doc = json.loads(data[20:20 + size])
    start = 20 + size
    binary = data[start + 8:] if start < len(data) else b''
    return doc, binary


def encode(doc, binary):
    raw = json.dumps(doc, ensure_ascii=False, separators=(',', ':')).encode()
    raw += b' ' * (-len(raw) % 4)
    binary += b'\0' * (-len(binary) % 4)
    return (struct.pack('<III', 0x46546c67, 2, 28 + len(raw) + len(binary))
            + struct.pack('<II', len(raw), 0x4e4f534a) + raw
            + struct.pack('<II', len(binary), 0x004e4942) + binary)


def export():
    (OUT / 'models').mkdir(parents=True, exist_ok=True)
    (OUT / 'textures').mkdir(exist_ok=True)
    (OUT / 'licenses').mkdir(exist_ok=True)
    manifest = {'author': 'RG Poly', 'license': 'CC0-1.0',
                'page': 'https://rg-poly.itch.io/', 'models': {},
                'textures': {}, 'archives': {}}
    for zip_name, prefix, models in PACKS:
        archive = ROOT / 'cell-city-assets' / zip_name
        with zipfile.ZipFile(archive) as z:
            manifest['archives'][zip_name] = {'sha256': sha(archive.read_bytes())}
            for source in z.namelist():
                if source.lower().endswith('.txt'):
                    license_name = f'{archive.stem}-{Path(source).name}'
                    (OUT / 'licenses' / license_name).write_bytes(z.read(source))
            for name, relative in models:
                source = prefix + relative
                doc, binary = decode(z.read(source))
                image_views = set()
                for image in doc.get('images', []):
                    if 'bufferView' in image:
                        index = image.pop('bufferView')
                        view = doc['bufferViews'][index]
                        offset = view.get('byteOffset', 0)
                        data = binary[offset:offset + view['byteLength']]
                        image_views.add(index)
                    else:
                        path = posixpath.normpath(posixpath.join(posixpath.dirname(source), image['uri']))
                        data = z.read(path)
                    digest = sha(data)
                    path = f'textures/{digest[:16]}.png'
                    (OUT / path).write_bytes(data)
                    image['uri'] = '../' + path
                    image.pop('mimeType', None)
                    width, height = struct.unpack_from('>II', data, 16)
                    manifest['textures'][path] = {'sha256': digest, 'bytes': len(data),
                                                  'width': width, 'height': height}
                # Drop image bufferViews and repack remaining mesh bytes.
                views, mapping, chunks, offset = [], {}, [], 0
                for index, view in enumerate(doc.get('bufferViews', [])):
                    if index in image_views:
                        continue
                    original_offset = view.get('byteOffset', 0)
                    data = binary[original_offset:original_offset + view['byteLength']]
                    mapping[index] = len(views)
                    views.append({**view, 'byteOffset': offset})
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
                    pbr['metallicFactor'] = 0
                    pbr['roughnessFactor'] = 1
                    material.get('extensions', {}).pop('KHR_materials_specular', None)
                doc['extensionsUsed'] = [e for e in doc.get('extensionsUsed', [])
                                         if e != 'KHR_materials_specular']
                result = encode(doc, b''.join(chunks))
                path = f'models/{name}.glb'
                (OUT / path).write_bytes(result)
                triangles = sum(doc['accessors'][p['indices']]['count'] // 3
                                if 'indices' in p else doc['accessors'][p['attributes']['POSITION']]['count'] // 3
                                for mesh in doc['meshes'] for p in mesh['primitives'])
                manifest['models'][name] = {'path': path, 'archive': zip_name,
                                            'source': source, 'bytes': len(result),
                                            'sha256': sha(result), 'triangles': triangles}
    manifest['totalBytes'] = (sum(m['bytes'] for m in manifest['models'].values())
                              + sum(t['bytes'] for t in manifest['textures'].values()))
    (OUT / 'sources.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'models': len(manifest['models']), 'textures': len(manifest['textures']),
                      'bytes': manifest['totalBytes']}, indent=2))


if __name__ == '__main__':
    export()
