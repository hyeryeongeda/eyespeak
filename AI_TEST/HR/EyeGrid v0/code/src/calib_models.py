# src/calib_models.py
import numpy as np

def poly2_expand(v: np.ndarray) -> np.ndarray:
    """
    v: (D,) base features
    return: (1 + D + D + D*(D-1)/2,) = [1, v, v^2, v_i*v_j(i<j)]
    """
    v = v.astype(np.float32).reshape(-1)
    D = v.shape[0]
    ones = np.array([1.0], dtype=np.float32)
    sq = v * v
    cross = []
    for i in range(D):
        for j in range(i + 1, D):
            cross.append(v[i] * v[j])
    if cross:
        cross = np.array(cross, dtype=np.float32)
        out = np.concatenate([ones, v, sq, cross], axis=0)
    else:
        out = np.concatenate([ones, v, sq], axis=0)
    return out

def poly2_expand_batch(X: np.ndarray) -> np.ndarray:
    """
    X: (N,D)
    return: (N,F) poly2 features
    """
    X = X.astype(np.float32)
    feats = [poly2_expand(X[i]) for i in range(X.shape[0])]
    return np.stack(feats, axis=0)

class Poly2RidgeCalib2D:
    """
    base feature vector -> poly2 -> ridge regression -> (x,y) in [0,1]
    """
    def __init__(self, base_dim: int, reg: float = 1e-3):
        self.base_dim = int(base_dim)
        self.reg = float(reg)
        self.W = None
        self.ready = False

    def fit(self, base_feats: np.ndarray, xy: np.ndarray):
        base_feats = np.asarray(base_feats, dtype=np.float32)
        xy = np.asarray(xy, dtype=np.float32)

        assert base_feats.ndim == 2 and base_feats.shape[1] == self.base_dim
        assert xy.ndim == 2 and xy.shape[1] == 2

        X = poly2_expand_batch(base_feats)  # (N,F)
        Y = xy

        A = X.T @ X + self.reg * np.eye(X.shape[1], dtype=np.float32)
        B = X.T @ Y
        self.W = np.linalg.solve(A, B)  # (F,2)
        self.ready = True

        pred = X @ self.W
        mae = np.abs(pred - Y).mean()
        return float(mae)

    def predict(self, base_feat: np.ndarray):
        assert self.ready
        base_feat = np.asarray(base_feat, dtype=np.float32).reshape(-1)
        assert base_feat.shape[0] == self.base_dim
        x = poly2_expand(base_feat)  # (F,)
        out = x @ self.W
        out = np.clip(out, 0.0, 1.0)
        return float(out[0]), float(out[1])