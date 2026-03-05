# src/roi_cv2.py
import cv2
import numpy as np

def _clip_bbox(x, y, w, h, W, H):
    x = max(0, min(x, W-1))
    y = max(0, min(y, H-1))
    w = max(1, min(w, W-x))
    h = max(1, min(h, H-y))
    return x, y, w, h

def _smooth_bbox(prev, cur, alpha=0.7):
    """alpha 높을수록 이전값 유지(더 부드러움)"""
    if prev is None:
        return cur
    px, py, pw, ph = prev
    cx, cy, cw, ch = cur
    x = int(alpha*px + (1-alpha)*cx)
    y = int(alpha*py + (1-alpha)*cy)
    w = int(alpha*pw + (1-alpha)*cw)
    h = int(alpha*ph + (1-alpha)*ch)
    return (x, y, w, h)

class FaceEyeROI:
    def __init__(self):
        face_xml = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        eye_xml  = cv2.data.haarcascades + "haarcascade_eye_tree_eyeglasses.xml"
        self.face_c = cv2.CascadeClassifier(face_xml)
        self.eye_c  = cv2.CascadeClassifier(eye_xml)
        self.face_bbox = None
        self.left_eye_bbox = None
        self.right_eye_bbox = None
        self.frame_i = 0

    def update(self, frame_bgr, detect_every=3):
        """return: (face_bbox, left_eye_bbox, right_eye_bbox) in absolute coords"""
        self.frame_i += 1
        H, W = frame_bgr.shape[:2]

        # detection 주기적으로만 (CPU 부담 줄임)
        if self.face_bbox is None or (self.frame_i % detect_every == 0):
            gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
            faces = self.face_c.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(120,120))
            if len(faces) > 0:
                # 가장 큰 얼굴
                faces = sorted(faces, key=lambda b: b[2]*b[3], reverse=True)
                fx, fy, fw, fh = faces[0]
                fx, fy, fw, fh = _clip_bbox(fx, fy, fw, fh, W, H)
                self.face_bbox = _smooth_bbox(self.face_bbox, (fx, fy, fw, fh), alpha=0.7)

                # 눈 검출은 얼굴 상단부에서만
                fx, fy, fw, fh = self.face_bbox
                top = frame_bgr[fy:fy+int(fh*0.6), fx:fx+fw]
                top_gray = cv2.cvtColor(top, cv2.COLOR_BGR2GRAY)
                eyes = self.eye_c.detectMultiScale(top_gray, scaleFactor=1.1, minNeighbors=5, minSize=(30,30))

                # left/right 분리 (x 기준)
                left = None
                right = None
                for (ex, ey, ew, eh) in eyes:
                    ax, ay = fx + ex, fy + ey
                    bbox = _clip_bbox(ax, ay, ew, eh, W, H)
                    cx = bbox[0] + bbox[2]//2
                    if cx < fx + fw//2:
                        if left is None or bbox[2]*bbox[3] > left[2]*left[3]:
                            left = bbox
                    else:
                        if right is None or bbox[2]*bbox[3] > right[2]*right[3]:
                            right = bbox

                self.left_eye_bbox  = _smooth_bbox(self.left_eye_bbox, left,  alpha=0.7) if left else self.left_eye_bbox
                self.right_eye_bbox = _smooth_bbox(self.right_eye_bbox, right, alpha=0.7) if right else self.right_eye_bbox

        return self.face_bbox, self.left_eye_bbox, self.right_eye_bbox