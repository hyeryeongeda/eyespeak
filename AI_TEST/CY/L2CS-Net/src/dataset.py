"""
==========================================================
[데이터셋 모듈] MPIIGaze Normalized 데이터 로더
==========================================================
MPIIGaze 데이터셋의 .mat 파일에서 눈 이미지와 시선(gaze) 벡터를 읽어오고,
PyTorch가 학습에 사용할 수 있는 Dataset/DataLoader 형태로 변환합니다.

처리 흐름:
  .mat 파일 로드
      ↓
  눈 이미지 (36×60 흑백) + 3D 시선 벡터 추출
      ↓
  3D 벡터 → Yaw(수평)/Pitch(수직) 각도 변환 (라디안 → 도)
      ↓
  연속 각도 → 이산 bin 인덱스 변환 (분류 레이블 생성)
      ↓
  이미지 전처리 (리사이즈, 3채널 변환, 정규화)
      ↓
  PyTorch DataLoader로 배치(batch) 단위 공급
"""

import os
import numpy as np
import scipy.io
import torch
from torch.utils.data import Dataset, DataLoader, random_split
from torchvision import transforms

import config


# ==========================================================
#  유틸리티 함수: 시선 벡터 ↔ 각도 변환
# ==========================================================

def gaze_vector_to_angles(gaze_vectors):
    """
    3D 시선 벡터(gaze vector)를 Yaw(수평)와 Pitch(수직) 각도로 변환합니다.

    MPIIGaze 좌표계:
        - x축: 수평 (양수 = 오른쪽)
        - y축: 수직 (양수 = 아래쪽)
        - z축: 깊이 (음수 = 카메라 방향, 즉 화면을 바라보는 방향)

    변환 공식:
        Yaw (수평 회전)  = arctan2(-x, -z)
        Pitch (수직 회전) = arcsin(-y)

    예시:
        정면 응시: (0, 0, -1) → Yaw=0°, Pitch=0°
        오른쪽:   (0.17, 0, -0.98) → Yaw≈10°
        아래쪽:   (0, 0.17, -0.98) → Pitch≈-10°

    Args:
        gaze_vectors: (N, 3) numpy 배열 - N개의 3D 시선 단위 벡터

    Returns:
        yaw:   (N,) numpy 배열 - 수평 각도 (라디안)
        pitch: (N,) numpy 배열 - 수직 각도 (라디안)
    """
    x = gaze_vectors[:, 0]
    y = gaze_vectors[:, 1]
    z = gaze_vectors[:, 2]

    yaw = np.arctan2(-x, -z)
    pitch = np.arcsin(-y)

    return yaw, pitch


def angle_to_bin(angle_deg, num_bins=config.NUM_BINS,
                 bin_width=config.BIN_WIDTH, angle_min=config.ANGLE_MIN):
    """
    연속적인 각도(degree)를 이산적인 bin 인덱스로 변환합니다.

    L2CS-Net은 각도를 여러 구간(bin)으로 나누어 분류 문제로 학습합니다.
    이 함수는 실수 각도를 해당하는 bin 번호(정수)로 매핑합니다.

    매핑 규칙 (기본 설정: 90 bins, 4도 간격, -180도 시작):
        -180.0도 → bin 0
        -176.0도 → bin 1
          ...
        +176.0도 → bin 89

    Args:
        angle_deg: (N,) numpy 배열 - 각도 값 (도, degree)
        num_bins:  int - 전체 bin 개수 (기본: 90)
        bin_width: float - bin 하나의 각도 범위 (기본: 4도)
        angle_min: float - 각도 범위의 최소값 (기본: -180도)

    Returns:
        bin_idx: (N,) numpy 배열 (int64) - bin 인덱스 (0 ~ num_bins-1)
    """
    # 각도를 bin 인덱스로 변환 (소수점 이하는 버림 = 해당 구간의 floor)
    bin_idx = (angle_deg - angle_min) / bin_width

    # 범위를 벗어나는 값은 양 끝 bin으로 클리핑 (안전장치)
    bin_idx = np.clip(bin_idx, 0, num_bins - 1).astype(np.int64)

    return bin_idx


# ==========================================================
#  MPIIGaze Dataset 클래스
# ==========================================================

class MPIIGazeDataset(Dataset):
    """
    MPIIGaze Normalized 데이터셋을 위한 PyTorch Dataset 클래스.

    하나의 피험자(예: p00) 폴더 안의 모든 .mat 파일을 로드하여
    학습에 필요한 형태로 변환합니다.

    각 샘플이 반환하는 데이터:
        image     : (3, 224, 224) float 텐서  - 전처리된 눈 이미지
        yaw_bin   : int (long 텐서)           - Yaw bin 인덱스 (분류 레이블)
        pitch_bin : int (long 텐서)           - Pitch bin 인덱스 (분류 레이블)
        yaw_deg   : float 텐서               - Yaw 각도 (도, 회귀 타겟)
        pitch_deg : float 텐서               - Pitch 각도 (도, 회귀 타겟)
    """

    def __init__(self, dataset_dir=config.DATASET_DIR,
                 use_both_eyes=config.USE_BOTH_EYES, transform=None):
        """
        Args:
            dataset_dir:   .mat 파일들이 있는 디렉토리 경로
            use_both_eyes: True면 양쪽 눈 사용 (우안은 좌우반전)
            transform:     커스텀 이미지 전처리 (None이면 기본 전처리 사용)
        """
        super().__init__()
        self.transform = transform or self._default_transform()

        # 데이터를 담을 리스트 (나중에 numpy 배열로 합침)
        all_images = []
        all_yaw_bins = []
        all_pitch_bins = []
        all_yaw_degs = []
        all_pitch_degs = []

        # ── .mat 파일 순회하며 데이터 로드 ──
        mat_files = sorted([
            f for f in os.listdir(dataset_dir) if f.endswith(".mat")
        ])

        if len(mat_files) == 0:
            raise FileNotFoundError(
                f"[오류] '{dataset_dir}' 경로에서 .mat 파일을 찾을 수 없습니다."
            )

        for mat_file in mat_files:
            mat_path = os.path.join(dataset_dir, mat_file)
            mat_data = scipy.io.loadmat(mat_path)

            # 왼쪽 눈 데이터 추출 (항상 사용)
            imgs, yb, pb, yd, pd = self._extract_eye_data(
                mat_data, eye="left", flip=False
            )
            all_images.append(imgs)
            all_yaw_bins.append(yb)
            all_pitch_bins.append(pb)
            all_yaw_degs.append(yd)
            all_pitch_degs.append(pd)

            # 오른쪽 눈 데이터 추출 (이미지를 좌우 반전하여 왼쪽 눈 기준으로 통일)
            if use_both_eyes:
                imgs, yb, pb, yd, pd = self._extract_eye_data(
                    mat_data, eye="right", flip=True
                )
                all_images.append(imgs)
                all_yaw_bins.append(yb)
                all_pitch_bins.append(pb)
                all_yaw_degs.append(yd)
                all_pitch_degs.append(pd)

        # ── 리스트 → 하나의 numpy 배열로 합치기 ──
        self.images = np.concatenate(all_images, axis=0)       # (전체N, 36, 60)
        self.yaw_bins = np.concatenate(all_yaw_bins, axis=0)   # (전체N,)
        self.pitch_bins = np.concatenate(all_pitch_bins, axis=0)
        self.yaw_degs = np.concatenate(all_yaw_degs, axis=0).astype(np.float32)
        self.pitch_degs = np.concatenate(all_pitch_degs, axis=0).astype(np.float32)

        print(f"[데이터 로드 완료] 총 {len(self.images)}개 샘플")
        print(f"  이미지 shape: {self.images.shape}")
        print(f"  Yaw 범위:  [{self.yaw_degs.min():.1f}°, {self.yaw_degs.max():.1f}°]")
        print(f"  Pitch 범위: [{self.pitch_degs.min():.1f}°, {self.pitch_degs.max():.1f}°]")

    def _default_transform(self):
        """
        기본 이미지 전처리 파이프라인을 생성합니다.

        처리 순서:
            1. numpy 배열(36×60) → PIL 이미지로 변환
            2. 224×224로 리사이즈 (ResNet50 입력 크기)
            3. 흑백 1채널 → RGB 3채널로 복제 (ResNet50은 3채널 입력 필요)
            4. [0,255] 정수 → [0,1] 실수 텐서로 변환
            5. ImageNet 통계값으로 정규화 (사전학습 가중치와 호환)
        """
        return transforms.Compose([
            transforms.ToPILImage(),                          # numpy → PIL
            transforms.Resize((config.IMAGE_SIZE, config.IMAGE_SIZE)),  # 224×224
            transforms.Grayscale(num_output_channels=3),      # 1ch → 3ch
            transforms.ToTensor(),                            # [0,1] 텐서
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],  # ImageNet 평균
                std=[0.229, 0.224, 0.225]    # ImageNet 표준편차
            ),
        ])

    def _extract_eye_data(self, mat_data, eye="left", flip=False):
        """
        하나의 .mat 파일에서 특정 눈(left 또는 right)의 데이터를 추출합니다.

        .mat 파일 내부 구조:
            data
             ├── left
             │    ├── image  (N, 36, 60)  uint8  - 왼쪽 눈 이미지
             │    ├── gaze   (N, 3)       float  - 3D 시선 벡터
             │    └── pose   (N, 3)       float  - 머리 자세
             └── right
                  ├── image  (N, 36, 60)
                  ├── gaze   (N, 3)
                  └── pose   (N, 3)

        Args:
            mat_data:  scipy.io.loadmat()으로 읽은 딕셔너리
            eye:       "left" 또는 "right"
            flip:      True면 이미지를 좌우 반전하고 Yaw 부호를 반전

        Returns:
            images:     (N, 36, 60) numpy 배열
            yaw_bins:   (N,) numpy 배열 (int64)
            pitch_bins: (N,) numpy 배열 (int64)
            yaw_degs:   (N,) numpy 배열 (float)
            pitch_degs: (N,) numpy 배열 (float)
        """
        # .mat 파일에서 해당 눈 데이터 접근
        eye_data = mat_data["data"][0, 0][eye][0, 0]

        images = eye_data["image"]            # (N, 36, 60) uint8
        gaze_vectors = eye_data["gaze"].copy()  # (N, 3) float64 (.copy()로 원본 보호)

        if flip:
            # ── 오른쪽 눈 처리: 좌우 반전 ──
            # 이미지를 좌우 반전하면 수평 방향이 뒤집히므로,
            # 시선 벡터의 x 성분(수평)도 부호를 반전해야 일관성이 유지됩니다.
            images = images[:, :, ::-1].copy()  # 모든 이미지 좌우 반전
            gaze_vectors[:, 0] = -gaze_vectors[:, 0]  # x 성분 부호 반전

        # ── 3D 시선 벡터 → Yaw, Pitch 각도 변환 ──
        yaw_rad, pitch_rad = gaze_vector_to_angles(gaze_vectors)

        # 라디안(radian) → 도(degree) 변환
        yaw_deg = np.degrees(yaw_rad)
        pitch_deg = np.degrees(pitch_rad)

        # ── 연속 각도 → 이산 bin 인덱스 변환 (분류 레이블) ──
        yaw_bins = angle_to_bin(yaw_deg)
        pitch_bins = angle_to_bin(pitch_deg)

        return images, yaw_bins, pitch_bins, yaw_deg, pitch_deg

    def __len__(self):
        """데이터셋의 전체 샘플 수를 반환합니다."""
        return len(self.images)

    def __getitem__(self, idx):
        """
        인덱스에 해당하는 하나의 샘플을 반환합니다.

        DataLoader가 이 메서드를 반복 호출하여 배치(batch)를 구성합니다.

        Returns:
            image:     (3, 224, 224) float 텐서 - 전처리된 이미지
            yaw_bin:   long 텐서 (스칼라)       - Yaw bin 인덱스
            pitch_bin: long 텐서 (스칼라)       - Pitch bin 인덱스
            yaw_deg:   float 텐서 (스칼라)      - Yaw 실제 각도 (도)
            pitch_deg: float 텐서 (스칼라)      - Pitch 실제 각도 (도)
        """
        # 원본 데이터 가져오기
        image = self.images[idx]           # (36, 60) uint8
        yaw_bin = self.yaw_bins[idx]       # int64
        pitch_bin = self.pitch_bins[idx]   # int64
        yaw_deg = self.yaw_degs[idx]       # float32
        pitch_deg = self.pitch_degs[idx]   # float32

        # 이미지 전처리 적용 (리사이즈 → 3채널 → 텐서 → 정규화)
        image = self.transform(image)

        return (
            image,
            torch.tensor(yaw_bin, dtype=torch.long),
            torch.tensor(pitch_bin, dtype=torch.long),
            torch.tensor(yaw_deg, dtype=torch.float32),
            torch.tensor(pitch_deg, dtype=torch.float32),
        )


# ==========================================================
#  DataLoader 생성 함수
# ==========================================================

def create_dataloaders(batch_size=config.BATCH_SIZE,
                       train_ratio=config.TRAIN_RATIO):
    """
    학습용/검증용 DataLoader를 생성합니다.

    전체 데이터를 train_ratio 비율로 랜덤 분할합니다.
    (재현성을 위해 시드 42 고정)

    Args:
        batch_size:  미니배치 크기 (기본: 64)
        train_ratio: 학습 데이터 비율 (기본: 0.8 = 80%)

    Returns:
        train_loader: 학습용 DataLoader (셔플 활성화)
        val_loader:   검증용 DataLoader (셔플 비활성화)
    """
    # 전체 데이터셋 로드
    dataset = MPIIGazeDataset()

    # 학습/검증 분할 크기 계산
    train_size = int(len(dataset) * train_ratio)
    val_size = len(dataset) - train_size

    # 랜덤 분할 (시드 고정으로 재현 가능)
    train_dataset, val_dataset = random_split(
        dataset,
        [train_size, val_size],
        generator=torch.Generator().manual_seed(42),
    )

    # DataLoader 생성
    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,        # 학습 데이터는 매 에폭마다 섞기
        num_workers=0,       # Windows에서 멀티프로세싱 deadlock 방지
        pin_memory=True,     # GPU 전송 속도 향상
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,       # 검증 데이터는 섞지 않음 (일관된 평가)
        num_workers=0,
        pin_memory=True,
    )

    print(f"[DataLoader 생성 완료] 학습: {train_size}개 / 검증: {val_size}개")
    return train_loader, val_loader
