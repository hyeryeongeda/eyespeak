# One-Euro Filter (시선 스무딩)

속도 적응형 1차 저역통과 필터입니다. 느린 움직임에서는 강하게 스무딩해 떨림을 줄이고, 빠른 시선 이동(saccade)에서는 cutoff를 높여 지연을 최소화합니다.

## 파라미터

| 파라미터 | 환경변수 | 기본값 | 설명 |
|----------|----------|--------|------|
| min_cutoff | ONE_EURO_MIN_CUTOFF | 1.0 | 최소 cutoff 주파수(Hz). 낮을수록 저속 시 더 스무딩(지터 감소, 지연 증가). |
| beta | ONE_EURO_BETA | 0.007 | 속도 민감도. 높을수록 고속에서 cutoff가 빨리 올라가 지연 감소. |

## 선택

- **REFINER_TYPE=one_euro** (기본): One-Euro Filter 사용.
- **REFINER_TYPE=ema**: 기존 EMA 스무딩 사용. GAZE_REFINER_ALPHA(기본 0.3) 적용.

## 튜닝

- 저속 지터가 크면: `ONE_EURO_MIN_CUTOFF`를 낮춤 (예: 0.5).
- 고속에서 지연이 크면: `ONE_EURO_BETA`를 올림 (예: 0.01, 0.02). 데이터 단위(각도)에 따라 0.001~0.01 범위로 조정.

## 구현 위치

- `iris_gaze_refine.OneEuroRefiner`, `_OneEuroAxis`
- `pipeline.GazePipeline`: REFINER_TYPE에 따라 OneEuroRefiner 또는 GazeRefiner 사용
- 참고: [1€ Filter (Casiez et al., CHI 2012)](https://gery.casiez.net/1euro/)
