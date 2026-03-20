"""MediaPipe Face Mesh(478점) 랜드마크 인덱스 상수.

홍채·눈 윤곽·EAR(Eye Aspect Ratio) 계산에 사용한다.
`iris_gaze.py`와 동일한 정수·리스트 값을 유지하며, 문서(CLAUDE.md) 기준 해부학적 이름도 제공한다.

Attributes:
    LEFT_IRIS_CENTER: 좌안 홍채 중심 인덱스(468).
    RIGHT_IRIS_CENTER: 우안 홍채 중심 인덱스(473).
    LEFT_IRIS / RIGHT_IRIS: 각 홍채 링 랜드마크 4점.
    LEFT_EYE_* / RIGHT_EYE_*: 눈 안쪽·바깥·상·하 단일 점.
    R_* / L_* (EYE/IRIS/EAR): 기존 `iris_gaze.py` 호환 레거시 이름.

Note:
    과거 코드의 ``R_*`` / ``L_*`` 접두사는 루프·카메라 관례상의 좌우이며,
    MediaPipe 공식의 ``left/right iris``(468·473 중심) 명명과 혼동하지 말 것.
"""

from __future__ import annotations

from typing import Final, List

# --- 홍채 (MediaPipe 공식: 좌안 468+469–472, 우안 473+474–477) ---
LEFT_IRIS_CENTER: Final[int] = 468
LEFT_IRIS: Final[List[int]] = [469, 470, 471, 472]
RIGHT_IRIS_CENTER: Final[int] = 473
RIGHT_IRIS: Final[List[int]] = [474, 475, 476, 477]

# --- 눈 윤곽 (CLAUDE.md / Face Mesh) ---
LEFT_EYE_INNER: Final[int] = 133
LEFT_EYE_OUTER: Final[int] = 33
LEFT_EYE_UPPER: Final[int] = 159
LEFT_EYE_LOWER: Final[int] = 145

RIGHT_EYE_INNER: Final[int] = 362
RIGHT_EYE_OUTER: Final[int] = 263
RIGHT_EYE_UPPER: Final[int] = 386
RIGHT_EYE_LOWER: Final[int] = 374

# --- iris_gaze.py 루프용 레거시 이름 (정수 값은 위와 동일) ---
R_EYE_OUTER: Final[int] = LEFT_EYE_OUTER
R_EYE_INNER: Final[int] = LEFT_EYE_INNER
L_EYE_INNER: Final[int] = RIGHT_EYE_INNER
L_EYE_OUTER: Final[int] = RIGHT_EYE_OUTER

# 단일 상·하 끝점 (EAR 외 윤곽 근사용)
R_EYE_TOP: Final[int] = LEFT_EYE_UPPER
R_EYE_BOTTOM: Final[int] = LEFT_EYE_LOWER
L_EYE_TOP: Final[int] = RIGHT_EYE_UPPER
L_EYE_BOTTOM: Final[int] = RIGHT_EYE_LOWER

# 눈 높이(eye_h): 상·하 다중 점 → y 중앙값으로 지터 감소
R_EYE_UPPER: Final[List[int]] = [159, 160, 158, 161]
R_EYE_LOWER: Final[List[int]] = [145, 144, 153, 154]
L_EYE_UPPER: Final[List[int]] = [386, 387, 385, 388]
L_EYE_LOWER: Final[List[int]] = [374, 373, 380, 381]

# 레거시: 루프에서 사용하는 홍채 링 인덱스 (좌안 링 / 우안 링)
R_IRIS: Final[List[int]] = LEFT_IRIS
L_IRIS: Final[List[int]] = RIGHT_IRIS

# EAR: 위 2 + 아래 2 + 좌우 꼬리 (iris_gaze.py 주석과 동일)
# 오른쪽 눈 EAR: p1=33, p2=160, p3=158, p4=133, p5=153, p6=144
R_EAR: Final[List[int]] = [33, 160, 158, 133, 153, 144]
# 왼쪽 눈 EAR: p1=263, p2=387, p3=385, p4=362, p5=380, p6=373
L_EAR: Final[List[int]] = [263, 387, 385, 362, 380, 373]
