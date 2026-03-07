# src/make_rtbene_index.py
from pathlib import Path
import pandas as pd

def guess_split_column(df: pd.DataFrame):
    # 흔한 컬럼명 후보들
    cand = ["split", "set", "subset", "partition", "fold"]
    cols = {c.lower(): c for c in df.columns}
    for k in cand:
        if k in cols:
            return cols[k]
    return None

def main():
    root = Path("data/rtbene")
    subj_csv = root / "rt_bene_subjects.csv"
    if not subj_csv.exists():
        raise FileNotFoundError(f"not found: {subj_csv}")

    subj = pd.read_csv(subj_csv)
    split_col = guess_split_column(subj)

    # split 정보가 파일에 없을 수도 있어서, 없으면 마지막 3명을 val로 둠(안전한 기본값)
    if split_col is None:
        all_subjects = sorted([p.stem.split("_")[0] for p in root.glob("s*_blink_labels.csv")])
        val_subjects = set(all_subjects[-3:])
        train_subjects = set(all_subjects[:-3])
    else:
        # split 컬럼 값에서 train/val을 추정 (값 표기가 제각각이라 유연하게 처리)
        def norm(x): return str(x).strip().lower()
        subj["_split"] = subj[split_col].map(norm)

        # subject id 컬럼도 파일마다 다를 수 있어서 's000' 형태를 포함한 컬럼을 찾음
        sid_col = None
        for c in subj.columns:
            if subj[c].astype(str).str.contains(r"s\d{3}", regex=True).any():
                sid_col = c
                break
        if sid_col is None:
            raise RuntimeError("rt_bene_subjects.csv에서 subject id(s000 형태) 컬럼을 못 찾았어요.")

        subj["_sid"] = subj[sid_col].astype(str).str.extract(r"(s\d{3})", expand=False)
        train_subjects = set(subj[subj["_split"].str.contains("train")]["_sid"].dropna().tolist())
        val_subjects   = set(subj[subj["_split"].str.contains("val|test")]["_sid"].dropna().tolist())

        if not train_subjects or not val_subjects:
            # 그래도 못 나누면 fallback
            all_subjects = sorted([p.stem.split("_")[0] for p in root.glob("s*_blink_labels.csv")])
            val_subjects = set(all_subjects[-3:])
            train_subjects = set(all_subjects[:-3])

    def load_one(subject_id: str):
        f = root / f"{subject_id}_blink_labels.csv"
        df = pd.read_csv(f)

        df = df.rename(columns={df.columns[0]: "fname", df.columns[1]: "label"})
        df = df[df["label"] != 0.5].copy()

        # ✅ 유저 구조: sXXX_noglasses (또는 sXXX_noglasses_eyes가 있으면 그걸 우선)
        subj_dir = root / f"{subject_id}_noglasses_eyes"
        if not subj_dir.exists():
            subj_dir = root / f"{subject_id}_noglasses"

        # ✅ natural 폴더가 있으면 그 안을 루트로 사용
        if (subj_dir / "natural").exists():
            subj_dir = subj_dir / "natural"

        base_rel = subj_dir.relative_to(root).as_posix()  # e.g. "s000_noglasses/natural"

        def fix_path(fname: str):
            just = str(fname).replace("\\", "/").split("/")[-1]
            if just.startswith("left_"):
                rel = f"{base_rel}/left/{just}"
            elif just.startswith("right_"):
                rel = f"{base_rel}/right/{just}"
            else:
                rel = f"{base_rel}/{just}"
            return rel

        df["fname"] = df["fname"].apply(fix_path)
        return df[["fname", "label"]]

    train_rows = []
    val_rows = []

    all_subjects = sorted([p.stem.split("_")[0] for p in root.glob("s*_blink_labels.csv")])
    for sid in all_subjects:
        df = load_one(sid)
        if sid in val_subjects:
            val_rows.append(df)
        else:
            train_rows.append(df)

    train_df = pd.concat(train_rows, ignore_index=True)
    val_df = pd.concat(val_rows, ignore_index=True)

    train_df.to_csv(root / "train_blink_labels.csv", index=False)
    val_df.to_csv(root / "val_blink_labels.csv", index=False)

    print("✅ done")
    print("train:", len(train_df), "->", root / "train_blink_labels.csv")
    print("val  :", len(val_df), "->", root / "val_blink_labels.csv")
    print("val subjects:", sorted(list(val_subjects))[:10])

if __name__ == "__main__":
    main()