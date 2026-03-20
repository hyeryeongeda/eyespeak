"""
AI Hub 126 - 디스플레이 중심 안구 움직임 영상 데이터 캐시 빌더
====================================================================
z01 분할 ZIP에서 이미지를 읽고 + TL/VL.zip 레이블 매칭 후
눈 크롭 numpy 캐시 생성.

출력:
  runs/aihub_cache/train_eyes.npy   (N, 64, 64, 3) uint8
  runs/aihub_cache/train_labels.npy (N, 2) float32  [x_norm, y_norm]
  runs/aihub_cache/val_eyes.npy
  runs/aihub_cache/val_labels.npy
  runs/aihub_cache/train_z01_index.pkl
  runs/aihub_cache/val_z01_index.pkl

크롭 전략: 홍채 중심이 아닌 눈꺼풀(eyelid) bbox 중심으로 크롭
  → 크롭 내 홍채 위치가 시선 방향을 인코딩할 수 있음
조건 필터: Laptop+Monitor device, eyelid bbox 있는 것만
정규화: x_norm = x / 2560, y_norm = y / 1440
"""

import os, sys, struct, zlib, json, io, glob, pickle, time
from pathlib import Path
from collections import defaultdict

os.environ['PYTHONIOENCODING'] = 'utf-8'

import numpy as np
from PIL import Image
import zipfile

BASE     = Path('C:/Users/SSAFY/Desktop/GAZE-CAPTURE/GazeCapture/MPIIGAZE')
DATA_DIR = BASE / 'MPIIGaze' / 'Data'

def find_dir(parent: Path, keywords) -> Path:
    """Find subdirectory whose name contains ANY of the given keywords."""
    if isinstance(keywords, str):
        keywords = [keywords]
    for p in sorted(parent.iterdir()):
        if any(kw in p.name for kw in keywords):
            return p
    raise FileNotFoundError(f'No dir matching {keywords} in {parent}')

DATA_126  = find_dir(DATA_DIR, '126')
_SUBDIR   = next(p for p in DATA_126.iterdir() if p.is_dir())  # 01-1.학습데이터셋
TRAIN_DIR = _SUBDIR / 'Training'
VAL_DIR   = _SUBDIR / 'Validation'

CACHE_DIR = BASE / 'runs' / 'aihub_cache'
CACHE_DIR.mkdir(parents=True, exist_ok=True)

GAZE_SIZE     = 64
EYE_MARGIN    = 0.4   # margin around eyelid bbox (fraction of eye size)
# Use max observed gaze range across devices (from data analysis: X max ~2660, Y max ~2445)
# Normalize by a common reference to keep [0,1] range consistent
SCREEN_W   = 2560   # covers laptop (1920) and larger monitors
SCREEN_H   = 1440   # covers laptop (1080) and larger monitors

# ── z01 scanner ────────────────────────────────────────────────
def scan_z01(z01_path: str, cache_pkl: str) -> dict:
    """
    Sequentially scan a z01 split ZIP part for local file headers.
    Returns: {rel_path: (data_offset, comp_size, uncomp_size, method)}
    Saves/loads pickle cache to avoid re-scan.
    """
    if os.path.exists(cache_pkl):
        print(f'  Loading index from cache: {cache_pkl}', flush=True)
        with open(cache_pkl, 'rb') as f:
            return pickle.load(f)

    print(f'  Scanning {z01_path}  ({os.path.getsize(z01_path)/1e9:.1f} GB)...', flush=True)
    LOCAL_SIG  = b'PK\x03\x04'
    DATA_DESC  = b'PK\x07\x08'
    CENTRAL_D  = b'PK\x01\x02'
    END_RECORD = b'PK\x05\x06'

    index   = {}
    t0      = time.time()
    file_sz = os.path.getsize(z01_path)
    count   = 0

    with open(z01_path, 'rb') as f:
        # z01 starts with PK\x07\x08 (4-byte split archive marker)
        # immediately followed by PK\x03\x04 (first local file header)
        first4 = f.read(4)
        if first4 == DATA_DESC:
            pass                # already at position 4 → next read gets PK\x03\x04
        elif first4 != LOCAL_SIG:
            f.seek(0)           # unexpected start, try from beginning

        while True:
            sig = f.read(4)
            if len(sig) < 4:
                break

            if sig == LOCAL_SIG:
                raw = f.read(26)
                if len(raw) < 26:
                    break
                _, flags, method, _, _, _, csz, usz, fnl, exl = struct.unpack('<HHHHHIIIHH', raw)

                fname_bytes = f.read(fnl)
                f.seek(exl, 1)          # skip extra field
                data_start  = f.tell()  # compressed data starts here

                try:
                    fname = fname_bytes.decode('utf-8')
                except Exception:
                    fname = fname_bytes.decode('cp949', errors='replace')

                if fname.endswith('.png') and csz > 0:
                    index[fname] = (data_start, csz, usz, method)
                    count += 1
                    if count % 5000 == 0:
                        pos = f.tell()
                        pct = pos / file_sz * 100
                        ela = time.time() - t0
                        print(f'    [{pct:5.1f}%] {count:,} images indexed  ({ela:.0f}s)', flush=True)

                f.seek(csz, 1)          # skip compressed data

                # data descriptor (optional, flag bit 3)
                if flags & 0x08:
                    nxt = f.read(4)
                    if nxt == DATA_DESC:
                        f.seek(12, 1)   # crc+comp+uncomp
                    else:
                        f.seek(-4, 1)

            elif sig == DATA_DESC:
                f.seek(12, 1)

            elif sig in (CENTRAL_D, END_RECORD):
                break               # central directory → no more local entries

            else:
                # Unknown record; try to re-sync (shouldn't happen in well-formed zip)
                f.seek(-3, 1)

    elapsed = time.time() - t0
    print(f'  Indexed {count:,} PNG files in {elapsed:.0f}s', flush=True)

    with open(cache_pkl, 'wb') as f:
        pickle.dump(index, f)
    print(f'  Index saved: {cache_pkl}', flush=True)
    return index


# ── Label loader ───────────────────────────────────────────────
def load_labels_from_zip(label_zip: str, device_filter=('Laptop', 'Monitor')) -> dict:
    """
    Parse all JSON files from TL.zip or VL.zip.
    Returns: {img_rel_path: {'gaze': [x, y], 'r_iris': {...}, 'l_iris': {...}}}
    Only includes entries where device == device_filter AND at least one iris annotated.
    """
    print(f'  Loading labels from {label_zip} ...', flush=True)
    labels = {}
    t0 = time.time()
    skipped = 0

    with zipfile.ZipFile(label_zip) as zf:
        all_jsons = [n for n in zf.namelist() if n.endswith('.json')]
        total = len(all_jsons)
        print(f'  Total JSON entries: {total:,}', flush=True)

        for i, name in enumerate(all_jsons):
            # Quick device filter from path
            parts = name.split('/')
            allowed = (device_filter,) if isinstance(device_filter, str) else device_filter
            if len(parts) < 3 or parts[2] not in allowed:
                skipped += 1
                continue

            with zf.open(name) as f:
                try:
                    d = json.load(f)
                except Exception:
                    skipped += 1
                    continue

            ann  = d['Annotations']
            pt   = ann['pose']['point']
            anns = ann['annotations']

            # Build iris dict + eyelid bbox dict
            iris_info  = {}
            eye_bboxes = {}   # {side: [x1, y1, x2, y2]} using eyelid polygon
            for a in anns:
                lbl = a['label']
                if lbl in ('r_iris', 'l_iris') and 'cx' in a:
                    iris_info[lbl] = {
                        'cx': float(a['cx']), 'cy': float(a['cy']),
                        'rx': float(a['rx']), 'ry': float(a['ry']),
                    }
                elif lbl in ('r_eyelid', 'l_eyelid') and 'points' in a and a['points']:
                    pts = a['points']
                    xs  = [p[0] for p in pts]
                    ys  = [p[1] for p in pts]
                    key = 'r_iris' if 'r_' in lbl else 'l_iris'
                    eye_bboxes[key] = [min(xs), min(ys), max(xs), max(ys)]
                    # Fallback iris from eyelid center if no explicit iris
                    cx  = (min(xs) + max(xs)) / 2
                    cy  = (min(ys) + max(ys)) / 2
                    rx  = (max(xs) - min(xs)) / 2
                    ry  = (max(ys) - min(ys)) / 2
                    if key not in iris_info:
                        iris_info[key] = {'cx': cx, 'cy': cy, 'rx': rx, 'ry': ry}

            # Require eyelid bbox for at least one eye (needed for correct crop strategy)
            if not eye_bboxes:
                skipped += 1
                continue

            # Image path in z01: replace json_rgb→rgb, .json→.png
            img_path = name.replace('/json_rgb/', '/rgb/').replace('.json', '.png')

            labels[img_path] = {
                'gaze':       [float(pt[0]), float(pt[1])],
                'r_iris':     iris_info.get('r_iris'),
                'l_iris':     iris_info.get('l_iris'),
                'r_eye_bbox': eye_bboxes.get('r_iris'),  # [x1,y1,x2,y2]
                'l_eye_bbox': eye_bboxes.get('l_iris'),
            }

            if i % 20000 == 0:
                print(f'  [{i/total*100:.0f}%] {len(labels):,} labels loaded  (skipped {skipped:,})', flush=True)

    elapsed = time.time() - t0
    print(f'  Labels: {len(labels):,} usable / {total:,} total  ({elapsed:.0f}s)', flush=True)
    return labels


# ── Eye crop extractor ─────────────────────────────────────────
def decompress_entry(z01_path: str, offset: int, comp_size: int, method: int) -> bytes:
    with open(z01_path, 'rb') as f:
        f.seek(offset)
        data = f.read(comp_size)
    if method == 8:     # deflate
        return zlib.decompress(data, -15)
    elif method == 0:   # stored
        return data
    else:
        raise ValueError(f'Unsupported compression method: {method}')


def crop_eye(img: Image.Image,
             ex1: float, ey1: float, ex2: float, ey2: float) -> Image.Image:
    """Square crop around eyelid bbox (with margin), resize to GAZE_SIZE.
    Iris appears at its natural position within the crop — encodes gaze direction.
    """
    W, H   = img.size
    ew     = ex2 - ex1
    eh     = ey2 - ey1
    margin = max(ew, eh) * EYE_MARGIN
    x1     = max(0, ex1 - margin)
    y1     = max(0, ey1 - margin)
    x2     = min(W, ex2 + margin)
    y2     = min(H, ey2 + margin)
    # Make square
    side   = max(x2 - x1, y2 - y1)
    cx_i   = (x1 + x2) / 2
    cy_i   = (y1 + y2) / 2
    x1     = max(0, int(cx_i - side / 2))
    y1     = max(0, int(cy_i - side / 2))
    x2     = min(W, x1 + int(side))
    y2     = min(H, y1 + int(side))
    crop   = img.crop((x1, y1, x2, y2)).resize((GAZE_SIZE, GAZE_SIZE), Image.BILINEAR)
    return crop.convert('RGB')


# ── Build one split (train or val) ─────────────────────────────
def build_split(split: str,
                z01_path: str, label_zip: str,
                index_pkl: str) -> None:
    out_eyes   = CACHE_DIR / f'{split}_eyes.npy'
    out_labels = CACHE_DIR / f'{split}_labels.npy'

    if out_eyes.exists() and out_labels.exists():
        print(f'  {split} cache already exists, skipping.', flush=True)
        return

    # 1. Build / load z01 index
    print(f'\n[{split}] Indexing z01 ...', flush=True)
    z01_index = scan_z01(z01_path, index_pkl)
    print(f'  z01 index: {len(z01_index):,} PNG entries', flush=True)

    # 2. Load labels
    print(f'\n[{split}] Loading labels ...', flush=True)
    labels = load_labels_from_zip(label_zip)

    # 3. Match
    matched = [(img_path, lbl) for img_path, lbl in labels.items() if img_path in z01_index]
    print(f'\n[{split}] Matched: {len(matched):,} / {len(labels):,} labels', flush=True)

    if not matched:
        print(f'  WARNING: no matched pairs for {split}!', flush=True)
        return

    # 4. Extract eye crops
    print(f'\n[{split}] Extracting eye crops ...', flush=True)
    eyes_list   = []
    labels_list = []
    errors      = 0
    t0          = time.time()

    for i, (img_path, lbl) in enumerate(matched):
        if i % 2000 == 0:
            ela = time.time() - t0
            print(f'  [{i:,}/{len(matched):,}]  crops={len(eyes_list):,}  err={errors}  ({ela:.0f}s)', flush=True)

        try:
            offset, csz, usz, method = z01_index[img_path]
            raw_bytes = decompress_entry(z01_path, offset, csz, method)
            img       = Image.open(io.BytesIO(raw_bytes)).convert('RGB')
        except Exception as e:
            errors += 1
            continue

        gx, gy = lbl['gaze']
        x_norm = float(np.clip(gx / SCREEN_W, 0.0, 1.0))
        y_norm = float(np.clip(gy / SCREEN_H, 0.0, 1.0))

        # Right eye — use eyelid bbox for crop (iris not centered → encodes gaze)
        rb = lbl.get('r_eye_bbox')
        if rb:
            try:
                crop = crop_eye(img, rb[0], rb[1], rb[2], rb[3])
                eyes_list.append(np.array(crop, dtype=np.uint8))
                labels_list.append([x_norm, y_norm])
            except Exception:
                errors += 1

        # Left eye
        lb = lbl.get('l_eye_bbox')
        if lb:
            try:
                crop = crop_eye(img, lb[0], lb[1], lb[2], lb[3])
                eyes_list.append(np.array(crop, dtype=np.uint8))
                labels_list.append([x_norm, y_norm])
            except Exception:
                errors += 1

    elapsed = time.time() - t0
    print(f'\n[{split}] Done. {len(eyes_list):,} crops  ({errors} errors)  {elapsed:.0f}s', flush=True)

    if not eyes_list:
        print(f'  ERROR: no crops extracted!', flush=True)
        return

    eyes_arr   = np.stack(eyes_list, axis=0)
    labels_arr = np.array(labels_list, dtype=np.float32)

    np.save(str(out_eyes),   eyes_arr)
    np.save(str(out_labels), labels_arr)
    print(f'  Saved: {out_eyes}  shape={eyes_arr.shape}', flush=True)
    print(f'  Saved: {out_labels}  shape={labels_arr.shape}', flush=True)


# ── Main ───────────────────────────────────────────────────────
def main():
    print('=' * 65, flush=True)
    print('AI Hub 126 Dataset Cache Builder', flush=True)
    print('=' * 65, flush=True)

    # Find paths robustly (keywords work in any encoding)
    train_src  = find_dir(TRAIN_DIR, ['01.', '01_', '\xbf\xf8\xc3\xa2'])  # 원천데이터
    val_src    = find_dir(VAL_DIR,   ['01.', '01_', '\xbf\xf8\xc3\xa2'])
    train_lbl  = find_dir(TRAIN_DIR, ['02.', '02_', '\xb6\xf3\xbf\xda'])  # 라벨링
    val_lbl    = find_dir(VAL_DIR,   ['02.', '02_', '\xb6\xf3\xbf\xda'])

    ts_z01  = str(list(train_src.glob('TS.z01'))[0])
    vs_z01  = str(list(val_src.glob('VS.z01'))[0])
    tl_zip  = str(list(train_lbl.glob('TL.zip'))[0])
    vl_zip  = str(list(val_lbl.glob('VL.zip'))[0])

    print(f'Train z01  : {ts_z01}', flush=True)
    print(f'Val   z01  : {vs_z01}', flush=True)
    print(f'Train labels: {tl_zip}', flush=True)
    print(f'Val   labels: {vl_zip}', flush=True)
    print(f'Cache dir   : {CACHE_DIR}', flush=True)
    print(flush=True)

    # Build val split first (smaller labels)
    build_split('val',
                z01_path  = vs_z01,
                label_zip = vl_zip,
                index_pkl = str(CACHE_DIR / 'val_z01_index.pkl'))

    # Build train split
    build_split('train',
                z01_path  = ts_z01,
                label_zip = tl_zip,
                index_pkl = str(CACHE_DIR / 'train_z01_index.pkl'))

    print('\n' + '=' * 65, flush=True)
    print('Cache build complete!', flush=True)
    # Summary
    for split in ('train', 'val'):
        ep = CACHE_DIR / f'{split}_eyes.npy'
        lp = CACHE_DIR / f'{split}_labels.npy'
        if ep.exists():
            eyes = np.load(str(ep), mmap_mode='r')
            lbl  = np.load(str(lp), mmap_mode='r')
            print(f'  {split}: {eyes.shape[0]:,} samples  eyes={eyes.shape}  labels={lbl.shape}', flush=True)


if __name__ == '__main__':
    main()
