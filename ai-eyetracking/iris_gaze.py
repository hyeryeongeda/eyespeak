"""
홍채 위치 비율 계산 + EAR 깜빡임 감지.
MediaPipe 478점 랜드마크 → 홍채 위치(0~1), EAR, 헤드포즈 보상.
"""

import math
import statistics

# ── 랜드마크 인덱스 ──
R_EYE_OUTER, R_EYE_INNER = 33, 133
L_EYE_INNER, L_EYE_OUTER = 362, 263
R_EYE_TOP, R_EYE_BOTTOM = 159, 145
L_EYE_TOP, L_EYE_BOTTOM = 386, 374
# 눈 높이(eye_h)용: 상단/하단 여러 점 → y 중앙값으로 지터 감소
R_EYE_UPPER = [159, 160, 158, 161]
R_EYE_LOWER = [145, 144, 153, 154]
L_EYE_UPPER = [386, 387, 385, 388]
L_EYE_LOWER = [374, 373, 380, 381]
R_IRIS = [469, 470, 471, 472]
L_IRIS = [474, 475, 476, 477]

# EAR용 추가 랜드마크 (위 2점 + 아래 2점, 좌우 꼬리)
# 오른쪽 눈 EAR: p1=33(outer), p2=160(상1), p3=158(상2), p4=133(inner), p5=153(하1), p6=144(하2)
R_EAR = [33, 160, 158, 133, 153, 144]
# 왼쪽 눈 EAR: p1=263(outer), p2=387(상1), p3=385(상2), p4=362(inner), p5=380(하1), p6=373(하2)
L_EAR = [263, 387, 385, 362, 380, 373]

BLINK_EAR_THRESHOLD = 0.18  # EAR 이 값 이하 → 눈 감음


def _dist(a, b):
    return math.sqrt((a[0] - b[0])**2 + (a[1] - b[1])**2)


def _ear(lm, indices):
    """Eye Aspect Ratio = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)"""
    p = [lm[i] for i in indices]
    vert1 = _dist(p[1], p[5])
    vert2 = _dist(p[2], p[4])
    horiz = _dist(p[0], p[3])
    if horiz < 1:
        return 0.0
    return (vert1 + vert2) / (2.0 * horiz)


def compute_iris_position(landmarks_px, blink_threshold=0.18):
    """
    Returns: (ratio_x, ratio_y, ear, is_blinking)

    ratio_x: 0.0(이미지 왼쪽) ~ 1.0(이미지 오른쪽) 홍채 수평 위치
    ratio_y: 0.0(위) ~ 1.0(아래) 홍채 수직 위치
    ear: Eye Aspect Ratio 평균 (깜빡임 감지용, 0~0.4 정도)
    is_blinking: ear < blink_threshold
    blink_threshold: 적응형 설정 가능 (기본 0.18, ALS 등 ptosis 시 낮게 조정)
    """
    if not landmarks_px or len(landmarks_px) < 478:
        return (None, None, 0.0, True)

    # EAR 계산
    ear_r = _ear(landmarks_px, R_EAR)
    ear_l = _ear(landmarks_px, L_EAR)
    ear_avg = (ear_r + ear_l) / 2.0
    is_blinking = ear_avg < blink_threshold

    if is_blinking:
        return (None, None, ear_avg, True)

    ratios_x = []
    ratios_y = []
    conf_list = []

    for (outer, inner, iris_idxs, upper_indices, lower_indices, ear_per_eye) in [
        (R_EYE_OUTER, R_EYE_INNER, R_IRIS, R_EYE_UPPER, R_EYE_LOWER, ear_r),
        (L_EYE_INNER, L_EYE_OUTER, L_IRIS, L_EYE_UPPER, L_EYE_LOWER, ear_l),
    ]:
        lx, ly = landmarks_px[outer]
        rx, ry = landmarks_px[inner]
        if lx > rx:
            lx, ly, rx, ry = rx, ry, lx, ly

        eye_w = rx - lx
        if eye_w < 3:
            continue

        upper_ys = [landmarks_px[i][1] for i in upper_indices]
        lower_ys = [landmarks_px[i][1] for i in lower_indices]
        ty_median = statistics.median(upper_ys)
        by_median = statistics.median(lower_ys)
        eye_h = abs(by_median - ty_median)

        iris_x = sum(landmarks_px[i][0] for i in iris_idxs) / 4.0
        iris_y = sum(landmarks_px[i][1] for i in iris_idxs) / 4.0

        rx_ratio = (iris_x - lx) / eye_w
        rx_ratio = max(0.0, min(1.0, rx_ratio))
        ry_ratio = (iris_y - ty_median) / eye_h if eye_h > 1 else 0.5
        ry_ratio = max(0.0, min(1.0, ry_ratio))

        confidence = eye_w * ear_per_eye
        conf_list.append(confidence)
        ratios_x.append(rx_ratio)
        ratios_y.append(ry_ratio)

    if not ratios_x:
        return (None, None, ear_avg, True)

    sum_conf = sum(conf_list)
    if sum_conf > 0:
        ratio_x = sum(c * rx for c, rx in zip(conf_list, ratios_x)) / sum_conf
        ratio_y = sum(c * ry for c, ry in zip(conf_list, ratios_y)) / sum_conf
    else:
        ratio_x = sum(ratios_x) / len(ratios_x)
        ratio_y = sum(ratios_y) / len(ratios_y)
    return (ratio_x, ratio_y, ear_avg, is_blinking)
