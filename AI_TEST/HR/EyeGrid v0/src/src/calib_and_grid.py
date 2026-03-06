import numpy as np
from sklearn.linear_model import Ridge

class Calibrator2D:
    def __init__(self):
        self.mx = Ridge(alpha=1.0)
        self.my = Ridge(alpha=1.0)
        self.ready = False

    def fit(self, gaze_angles, screen_xy):
        """
        gaze_angles: (N,2) yaw,pitch
        screen_xy : (N,2) x,y in [0,1]
        """
        A = np.asarray(gaze_angles, dtype=np.float32)
        S = np.asarray(screen_xy, dtype=np.float32)
        self.mx.fit(A, S[:,0])
        self.my.fit(A, S[:,1])
        self.ready = True

    def predict(self, yaw_pitch):
        A = np.asarray(yaw_pitch, dtype=np.float32).reshape(1,2)
        x = float(self.mx.predict(A)[0])
        y = float(self.my.predict(A)[0])
        # clamp
        x = min(1.0, max(0.0, x))
        y = min(1.0, max(0.0, y))
        return x, y

def to_grid(x, y, mode="9"):
    """
    x,y in [0,1]
    returns (row,col,idx)
    """
    if mode == "4":
        cols = rows = 2
    else:
        cols = rows = 3
    col = min(cols-1, int(x * cols))
    row = min(rows-1, int(y * rows))
    idx = row * cols + col
    return row, col, idx