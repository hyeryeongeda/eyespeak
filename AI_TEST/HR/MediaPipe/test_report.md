# 📝 Eye-tracking Baseline Test Report: CVAT XML (Iris centers) → (x,y) Regression

**작성일**: 2026-03-04  
**테스트 담당자**: HR  

---

## 1. 테스트 개요
- **모델 타입**: Iris center 기반 **(x,y) 회귀 베이스라인**
- **입력(feature)**: 64×64 grayscale로 다운샘플(4096-d)
- **라벨(GT)**: CVAT XML의 `left_center`, `right_center` 평균 → (mid_x, mid_y) **0~1 정규화**
- **목적**: 웹캠/센서 기반 시선 추정 전 단계로, “동공 중심점 좌표” 예측 가능성 및 파이프라인 검증

---

## 2. 데이터/전처리
- **이미지 수**: 58,368
- **유효 라벨 수**: 48,474 (centers 누락 9,894)
- **labels 범위**:
  - x: 0.293 ~ 0.638
  - y: 0.228 ~ 0.790
  - (라벨 분포가 중앙 구간에 집중됨)

---

## 3. 성능 평가(Validation)
- **MAE (normalized)**:
  - x: 0.01145549
  - y: 0.01345299
  - mean: 0.01245424
- **MAE (px 환산)**:
  - 이미지 크기(W×H) = __ × __ 기준
  - x: __ px, y: __ px

---

## 4. 정성 평가
- GT(초록) vs Pred(빨강) 오버레이 샘플 캡처 첨부  
- 중앙 부근에서는 안정적이나, 분포가 제한적이라 화면 전역 generalization은 추가 검증 필요

---

## 5. 산출물
- `features.npy`, `labels.npy`, `paths.txt`
- `model.onnx` (ONNX export 확인 완료)
- 캡처: cache shape/range, MAE, overlay