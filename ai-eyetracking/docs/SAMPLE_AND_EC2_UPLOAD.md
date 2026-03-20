# 샘플링 + EC2 업로드 (한 번에 하기)

AI Hub 안구 데이터에서 **참가자 2명분만** 샘플로 복사한 뒤, **EC2로 SCP 업로드**하는 방법입니다.

---

## 1단계: 샘플 폴더 만들기 (Windows Git Bash 기준)

데이터 구조가 아래와 같을 때:

```text
033.안구 움직임 영상 데이터/
  01.데이터/
    1.Training/
      라벨링데이터/TL/G1/001, 002, 003, ... (30, 50, VR)
```

**데이터 루트**(`033.안구 움직임 영상 데이터`) 경로만 넘기면 스크립트가 `01.데이터/1.Training`을 찾아서 샘플링합니다.

```bash
cd /c/Users/SSAFY/.../yh_eyetracking_model   # 프로젝트 경로로 이동

# 데이터 루트만 지정 (추천)
python scripts/sample_aihub_to_folder.py "/c/Users/SSAFY/Desktop/eye tracking data Ai hub/033.안구 움직임 영상 데이터" -n 2
```

- `-n 2`: 참가자 2명(001, 002)만 복사. 3명이면 `-n 3`.
- 샘플은 **데이터 루트 아래** `eye_tracking_sample` 폴더로 생성됩니다.  
  예: `.../033.안구 움직임 영상 데이터/eye_tracking_sample`

1.Training 경로를 직접 줄 수도 있습니다.

```bash
python scripts/sample_aihub_to_folder.py ".../01.데이터/1.Training" -n 2
```

다른 위치에 만들려면:

```bash
python scripts/sample_aihub_to_folder.py "데이터 루트 또는 1.Training 경로" --dest "C:/Users/SSAFY/Desktop/eye_tracking_sample" -n 2
```

---

## 2단계: EC2(또는 SSAFY 서버)로 SCP 업로드

샘플 폴더를 **프로젝트 폴더 안**으로 올립니다. 업로드 경로를 `~/yh_eyetracking_model/` 로 하면 서버에서 `~/yh_eyetracking_model/eye_tracking_sample` 에 위치합니다.

```bash
# Git Bash (Windows) — 샘플을 프로젝트 폴더 안으로 업로드
scp -i "C:/Users/SSAFY/.ssh/id_rsa" -r "/c/Users/SSAFY/Desktop/eye tracking data Ai hub/033.안구 움직임 영상 데이터/eye_tracking_sample" j-j14e205@70.12.130.106:~/yh_eyetracking_model/
```

| 항목 | 예시 | 설명 |
|------|------|------|
| 키 파일 | `C:/Users/SSAFY/.ssh/id_rsa` | SSH 개인키 전체 경로 |
| 사용자 | `j-j14e205` | SSAFY 서버 계정 (본인 계정으로 변경) |
| 주소 | `70.12.130.106` | SSAFY GPU 서버 (또는 EC2 Public DNS) |
| 업로드 위치 | `~/yh_eyetracking_model/` | **프로젝트 폴더 안** → 결과: `~/yh_eyetracking_model/eye_tracking_sample` |

- **한 번에 쓰기 좋은 한 줄** (키·계정·주소만 본인 환경에 맞게 수정):

```bash
scp -i "C:/Users/SSAFY/.ssh/id_rsa" -r "C:/Users/SSAFY/Desktop/eye tracking data Ai hub/033.안구 움직임 영상 데이터/eye_tracking_sample" j-j14e205@70.12.130.106:~/yh_eyetracking_model/
```

---

## 3단계: 서버에서 포맷 검사 (선택)

Cursor로 서버 접속 후, 프로젝트 폴더 안의 샘플로 포맷 검사 스크립트를 돌립니다.

```bash
cd ~/yh_eyetracking_model
python3 scripts/inspect_aihub_format.py eye_tracking_sample
# 또는
python3 scripts/inspect_aihub_format.py ~/yh_eyetracking_model/eye_tracking_sample
```

---

## 요약: 추천 순서

1. **샘플 생성**  
   `python scripts/sample_aihub_to_folder.py "033.안구 움직임 영상 데이터 경로" -n 2`
2. **서버 업로드** (샘플을 **프로젝트 폴더 안**으로)  
   `scp -i KEY -r eye_tracking_sample USER@HOST:~/yh_eyetracking_model/`
3. (선택) 서버에서 `python3 scripts/inspect_aihub_format.py eye_tracking_sample` 로 샘플 구조 확인

이 순서대로 하면, 로컬에서 샘플링한 뒤 EC2로 올리는 과정을 한 번에 진행할 수 있습니다.
