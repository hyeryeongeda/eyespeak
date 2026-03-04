import cv2
import mediapipe as mp
import numpy as np
import pyautogui
import time

pyautogui.FAILSAFE = False

# ── MediaPipe 세팅 ──
mp_face = mp.solutions.face_mesh
face_mesh = mp_face.FaceMesh(refine_landmarks=True, max_num_faces=1)

# ── 화면 크기 ──
SCREEN_W, SCREEN_H = pyautogui.size()

# ── 홍채 랜드마크 인덱스 ──
L_IRIS = [474, 475, 476, 477]
R_IRIS = [469, 470, 471, 472]
L_EYE  = [33, 133]   # 눈 왼쪽끝, 오른쪽끝
R_EYE  = [362, 263]

# ── 캘리브레이션 9포인트 ──
CALIB_PTS = [
    (0.1, 0.1), (0.5, 0.1), (0.9, 0.1),
    (0.1, 0.5), (0.5, 0.5), (0.9, 0.5),
    (0.1, 0.9), (0.5, 0.9), (0.9, 0.9),
]

# ── 칼만 필터 ──
class KalmanFilter:
    def __init__(self):
        self.kf = cv2.KalmanFilter(4, 2)
        self.kf.measurementMatrix  = np.array([[1,0,0,0],[0,1,0,0]], np.float32)
        self.kf.transitionMatrix   = np.array([[1,0,1,0],[0,1,0,1],[0,0,1,0],[0,0,0,1]], np.float32)
        self.kf.processNoiseCov    = np.eye(4, dtype=np.float32) * 0.03
        self.kf.measurementNoiseCov = np.eye(2, dtype=np.float32) * 0.5
        self.initialized = False

    def update(self, x, y):
        m = np.array([[np.float32(x)], [np.float32(y)]])
        if not self.initialized:
            self.kf.statePre = np.array([[x],[y],[0],[0]], np.float32)
            self.initialized = True
        self.kf.correct(m)
        pred = self.kf.predict()
        return float(pred[0][0]), float(pred[1][0])

kalman = KalmanFilter()

# ── 홍채 중심 계산 ──
def iris_center(landmarks, idxs, w, h):
    pts = np.array([(landmarks[i].x * w, landmarks[i].y * h) for i in idxs])
    return pts.mean(axis=0)

# ── 특징 벡터 추출 ──
def get_features(landmarks, w, h):
    lx, ly = iris_center(landmarks, L_IRIS, w, h)
    rx, ry = iris_center(landmarks, R_IRIS, w, h)

    # 눈 너비로 정규화
    l_left  = np.array([landmarks[33].x  * w, landmarks[33].y  * h])
    l_right = np.array([landmarks[133].x * w, landmarks[133].y * h])
    r_left  = np.array([landmarks[362].x * w, landmarks[362].y * h])
    r_right = np.array([landmarks[263].x * w, landmarks[263].y * h])

    l_w = np.linalg.norm(l_right - l_left) + 1e-6
    r_w = np.linalg.norm(r_right - r_left) + 1e-6

    lnx = (lx - l_left[0]) / l_w
    lny = (ly - l_left[1]) / l_w
    rnx = (rx - r_left[0]) / r_w
    rny = (ry - r_left[1]) / r_w

    return np.array([lnx, lny, rnx, rny], dtype=np.float32)

# ── 캘리브레이션 데이터 ──
calib_features = []
calib_targets  = []

# ── 회귀 모델 (캘리브레이션 후 학습) ──
from numpy.linalg import lstsq

def fit_model(features, targets):
    X = np.array(features)
    Y = np.array(targets)
    # bias 추가
    X_ = np.hstack([X, np.ones((len(X), 1))])
    W, _, _, _ = lstsq(X_, Y, rcond=None)
    return W

def predict(W, feat):
    x = np.append(feat, 1.0)
    return W.T @ x

# ── 메인 ──
def main():
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    state = "CALIB"   # CALIB → RUN
    calib_idx = 0
    collect_start = None
    collect_buf = []
    W = None          # 회귀 모델 가중치

    COLLECT_SEC = 2.0  # 포인트당 응시 시간

    print("=== 눈 추적 시작 ===")

    # 시작 안내 화면
    for countdown in range(5, 0, -1):
        guide = np.ones((SCREEN_H, SCREEN_W, 3), dtype=np.uint8) * 40
        cv2.putText(guide, "눈 추적 시작 준비",
            (SCREEN_W//2 - 250, SCREEN_H//2 - 100),
            cv2.FONT_HERSHEY_SIMPLEX, 2, (255,255,255), 3)
        cv2.putText(guide, f"{countdown}초 후 캘리브레이션 시작",
            (SCREEN_W//2 - 280, SCREEN_H//2),
            cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0,255,0), 2)
        cv2.putText(guide, "화면에 뜨는 빨간 점 9개를 순서대로 응시하세요",
            (SCREEN_W//2 - 400, SCREEN_H//2 + 100),
            cv2.FONT_HERSHEY_SIMPLEX, 1, (200,200,200), 2)
        cv2.putText(guide, "고개는 고정! 눈만 움직이세요",
            (SCREEN_W//2 - 250, SCREEN_H//2 + 160),
            cv2.FONT_HERSHEY_SIMPLEX, 1, (200,200,200), 2)
        cv2.namedWindow("Calibration", cv2.WND_PROP_FULLSCREEN)
        cv2.setWindowProperty("Calibration", cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)
        cv2.imshow("Calibration", guide)
        cv2.waitKey(1000)

    print("캘리브레이션 시작!")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.flip(frame, 1)
        h, w = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = face_mesh.process(rgb)

        feat = None
        if res.multi_face_landmarks:
            lm = res.multi_face_landmarks[0].landmark
            feat = get_features(lm, w, h)

            # 눈동자 시각화
            lc = iris_center(lm, L_IRIS, w, h).astype(int)
            rc = iris_center(lm, R_IRIS, w, h).astype(int)
            cv2.circle(frame, tuple(lc), 4, (0, 255, 0), -1)
            cv2.circle(frame, tuple(rc), 4, (0, 255, 0), -1)

        # ── 캘리브레이션 화면 ──
        if state == "CALIB":
            if calib_idx < len(CALIB_PTS):
                tx = int(CALIB_PTS[calib_idx][0] * SCREEN_W)
                ty = int(CALIB_PTS[calib_idx][1] * SCREEN_H)

                # 캘리브레이션 창에 안내
                cv2.putText(frame,
                    f"Point {calib_idx+1}/9: 빨간 점 응시하세요",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0,0,255), 2)

                # 빨간 점 표시 (별도 창)
                calib_screen = np.ones((SCREEN_H, SCREEN_W, 3), dtype=np.uint8) * 40
                cv2.circle(calib_screen, (tx, ty), 20, (0, 0, 255), -1)
                cv2.circle(calib_screen, (tx, ty), 25, (255,255,255), 2)
                cv2.putText(calib_screen,
                    f"점을 응시하세요 ({calib_idx+1}/9)",
                    (SCREEN_W//2 - 150, SCREEN_H - 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255,255,255), 2)
                cv2.namedWindow("Calibration", cv2.WND_PROP_FULLSCREEN)
                cv2.setWindowProperty("Calibration", cv2.WND_PROP_FULLSCREEN,
                                      cv2.WINDOW_FULLSCREEN)
                cv2.imshow("Calibration", calib_screen)

                now = time.time()
                if feat is not None:
                    if collect_start is None:
                        collect_start = now
                        collect_buf = []
                    elif now - collect_start > COLLECT_SEC:
                        # 포인트 완료
                        if collect_buf:
                            calib_features.append(np.mean(collect_buf, axis=0))
                            calib_targets.append([
                                CALIB_PTS[calib_idx][0],
                                CALIB_PTS[calib_idx][1]
                            ])
                        calib_idx += 1
                        collect_start = None
                        collect_buf = []
                        print(f"  포인트 {calib_idx}/9 완료")
                    else:
                        collect_buf.append(feat)

                        # 진행바
                        prog = (now - collect_start) / COLLECT_SEC
                        cv2.rectangle(frame, (10, 50),
                            (10 + int(prog * 200), 65), (0,255,0), -1)
            else:
                # 캘리브레이션 완료 → 모델 학습
                W = fit_model(calib_features, calib_targets)
                state = "RUN"
                cv2.destroyWindow("Calibration")
                print("\n캘리브레이션 완료! 이제 시선으로 마우스 움직여요.")
                print("'q' 누르면 종료")

        # ── 실행 화면 ──
        elif state == "RUN":
            if feat is not None and W is not None:
                pred = predict(W, feat)
                gx = np.clip(pred[0], 0.0, 1.0) * SCREEN_W
                gy = np.clip(pred[1], 0.0, 1.0) * SCREEN_H

                # 칼만 필터로 떨림 제거
                gx, gy = kalman.update(gx, gy)

                pyautogui.moveTo(int(gx), int(gy), duration=0)

                cv2.putText(frame,
                    f"Gaze: ({int(gx)}, {int(gy)})",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0,255,0), 2)
                cv2.putText(frame,
                    "q: 종료 | r: 재캘리브레이션",
                    (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200,200,200), 1)

        cv2.imshow("Eye Tracking", frame)

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('r'):
            # 재캘리브레이션
            calib_features.clear()
            calib_targets.clear()
            state = "CALIB"
            calib_idx = 0
            collect_start = None
            collect_buf = []
            W = None
            kalman.__init__()
            print("재캘리브레이션 시작")

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()