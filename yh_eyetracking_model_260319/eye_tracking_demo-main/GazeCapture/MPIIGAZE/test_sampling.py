import time
from pathlib import Path
from collections import defaultdict

train_txt = Path('yolo_dataset/train.txt')
lines = train_txt.read_text(encoding='utf-8').strip().split('\n')
print(f'Lines: {len(lines):,}')

t0 = time.time()
groups = defaultdict(list)
for line in lines:
    norm = line.replace('\\', '/')
    try:
        idx = norm.index('/Original/')
        pid = norm[idx+10:idx+13]
    except ValueError:
        pid = 'unknown'
    groups[pid].append(line)
print(f'Grouping: {time.time()-t0:.2f}s')
print('Persons:', sorted(groups.keys()))
print('Counts:', {k: len(v) for k, v in sorted(groups.items())})
