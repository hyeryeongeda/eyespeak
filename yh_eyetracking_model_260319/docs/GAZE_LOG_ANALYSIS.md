# gaze 서버 로그 해석

캘리 실패 시 서버 터미널(또는 백그라운드 로그)에 찍히는 메시지로 원인을 파악할 수 있습니다.

---

## 1. "캘리 실패: N번에서 얼굴이 인식되지 않았습니다" (화면 메시지)

**의미**: 캘리 N번 단계에서 2초 동안 (yaw, pitch)가 유효한 샘플이 5개 미만이었다 → 대부분의 프레임에서 **얼굴/눈이 검출되지 않음**.

**서버 로그** (같은 시점):
- `gaze: 인식 없음 frame=(480, 640, 3)` → 프레임은 정상 수신됨.
- `인식 실패: face_roi=False 눈_left=False 눈_right=False` → **얼굴 없음**. Haar cascade가 얼굴을 못 찾음.
- `인식 실패: face_roi=True 눈_left=False 눈_right=False` → 얼굴은 찾았지만 **눈을 못 찾음**.

---

## 2. 로그별 원인과 대응

| 로그 | 원인 | 대응 |
|------|------|------|
| `face_roi=False` | 얼굴이 검출되지 않음 | 얼굴이 화면에 잘 보이게. 정면에 가깝게, 조명 확보. 캠 해상도 320×240 이상 권장. |
| `눈_left=False 눈_right=False` (얼굴은 있음) | 눈 영역 미검출 | 안경 반사 줄이기, 얼굴을 화면 중앙에 더 크게. |
| `frame=None` 또는 decode failed | 이미지 수신/디코딩 실패 | 브라우저 캠 권한, 네트워크 확인. |

---

## 3. 코드에서 한 조정

- **eye_detector.py**: `minSize=(80,80)` → `(50,50)`, `minNeighbors=5` → `4`, `scaleFactor=1.1` → `1.08` 로 완화해 먼 거리/작은 얼굴도 검출되도록 함.
- **app_gaze_web.py / pipeline.py**: 인식이 한 번도 안 됐을 때만 `gaze` 로거로 원인(프레임 크기, face_roi·눈 여부) 로그 출력.

---

## 4. 로그 보는 방법

서버를 **포그라운드**로 실행하면 로그가 터미널에 바로 찍힙니다.

```bash
cd ~/yh_eyetracking_model
. .venv/bin/activate
export GAZE_CHECKPOINT=checkpoints/l2cs_dummy.pt   # 또는 l2cs_best.pt
python3 app_gaze_web.py
```

캘리를 다시 시도하면서 위 로그가 어떻게 나오는지 확인하면 됩니다.
