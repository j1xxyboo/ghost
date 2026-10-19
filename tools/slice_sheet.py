"""Slice a 4x3 magenta-background sprite sheet into keyed, normalized frames.

usage: python slice_sheet.py <sheet.png> <out_dir> <target_idle_height_px> [dilation] [pose,list] [rows]
Writes <out_dir>/<pose>.png and <out_dir>/meta.json (anchor = feet center).
"""
import json, os, sys
from collections import deque
from PIL import Image

POSES = ["idle", "walk", "punch", "kick",
         "jump", "crouch", "block", "hit",
         "ko", "special", "uppercut", "win"]
CELL = 6


def is_bg(r, g, b):
    return r > 110 and b > 110 and abs(r - b) < 80 and g < 0.55 * min(r, b)


def key(img):
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if is_bg(r, g, b):
                px[x, y] = (0, 0, 0, 0)
            elif r - g > 40 and b - g > 40 and abs(r - b) < 70:
                # magenta fringe: pull towards neutral dark
                m = (r + b) // 2
                px[x, y] = (min(r, g + 30), g, min(b, g + 40), 255 if m < 160 else 140)
    return img


def components(img):
    w, h = img.size
    gw, gh = (w + CELL - 1) // CELL, (h + CELL - 1) // CELL
    alpha = img.getchannel("A").load()
    cnt = [[0] * gw for _ in range(gh)]
    for y in range(h):
        row = cnt[y // CELL]
        for x in range(w):
            if alpha[x, y] > 0:
                row[x // CELL] += 1
    fg = [[cnt[j][i] > 4 for i in range(gw)] for j in range(gh)]
    # dilate by 2 cells so limbs/outlines join their body
    D = int(sys.argv[4]) if len(sys.argv) > 4 else 2
    dil = [[False] * gw for _ in range(gh)]
    for j in range(gh):
        for i in range(gw):
            if fg[j][i]:
                for dj in range(-D, D + 1):
                    for di in range(-D, D + 1):
                        jj, ii = j + dj, i + di
                        if 0 <= jj < gh and 0 <= ii < gw:
                            dil[jj][ii] = True
    lab = [[-1] * gw for _ in range(gh)]
    comps = []
    for j in range(gh):
        for i in range(gw):
            if dil[j][i] and lab[j][i] < 0:
                k = len(comps)
                q = deque([(j, i)]); lab[j][i] = k
                cells = []
                while q:
                    cj, ci = q.popleft(); cells.append((cj, ci))
                    for nj, ni in ((cj+1, ci), (cj-1, ci), (cj, ci+1), (cj, ci-1)):
                        if 0 <= nj < gh and 0 <= ni < gw and dil[nj][ni] and lab[nj][ni] < 0:
                            lab[nj][ni] = k; q.append((nj, ni))
                comps.append(cells)
    out = []
    for k, cells in enumerate(comps):
        real = [(j, i) for j, i in cells if fg[j][i]]
        if len(real) < 150:
            continue
        js = [c[0] for c in real]; is_ = [c[1] for c in real]
        out.append({"k": k, "box": (min(is_) * CELL, min(js) * CELL,
                                    (max(is_) + 1) * CELL, (max(js) + 1) * CELL)})
    return out, lab


def main():
    global POSES
    src, out_dir, target = sys.argv[1], sys.argv[2], int(sys.argv[3])
    if len(sys.argv) > 5:
        POSES = sys.argv[5].split(",")
    rows = int(sys.argv[6]) if len(sys.argv) > 6 else 3
    os.makedirs(out_dir, exist_ok=True)
    img = key(Image.open(src))
    W, H = img.size
    comps, lab = components(img)
    if len(comps) > len(POSES):  # drop stray mini-sprites, keep the biggest
        area = lambda c: (c["box"][2] - c["box"][0]) * (c["box"][3] - c["box"][1])
        comps = sorted(comps, key=area, reverse=True)[:len(POSES)]
    if len(comps) != len(POSES):
        print(f"WARNING: found {len(comps)} sprites (expected {len(POSES)})")
    for c in comps:
        x0, y0, x1, y1 = c["box"]
        c["row"] = min(rows - 1, int(((y0 + y1) / 2) / (H / rows)))
        c["cx"] = (x0 + x1) / 2
    comps.sort(key=lambda c: (c["row"], c["cx"]))

    frames = []
    for c in comps:
        x0, y0, x1, y1 = c["box"]
        crop = img.crop((x0, y0, x1, y1))
        px = crop.load()
        for y in range(crop.size[1]):
            for x in range(crop.size[0]):
                if lab[(y + y0) // CELL][(x + x0) // CELL] != c["k"]:
                    px[x, y] = (0, 0, 0, 0)
        bb = crop.getbbox()
        crop = crop.crop(bb)
        frames.append(crop)

    idle_h = frames[0].size[1]
    scale = target / idle_h
    meta = {"scale": scale, "frames": {}}
    for name, fr in zip(POSES, frames):
        w, h = fr.size
        nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
        small = fr.resize((nw, nh), Image.LANCZOS)
        # harden alpha for crisp pixel edges
        a = small.getchannel("A").point(lambda v: 255 if v > 110 else 0)
        small.putalpha(a)
        # anchor x: centroid of the top 18% (the head) unless lying down
        sp = small.load()
        if name == "ko":
            ax = nw / 2
        else:
            xs = [x for y in range(int(nh * 0.18)) for x in range(nw) if sp[x, y][3]]
            ax = sum(xs) / len(xs) if xs else nw / 2
        small.save(os.path.join(out_dir, f"{name}.png"))
        meta["frames"][name] = {"w": nw, "h": nh, "ax": round(ax, 1)}
    path = os.path.join(out_dir, "meta.json")
    if os.path.exists(path) and len(sys.argv) > 5:  # extra poses: merge into existing meta
        old = json.load(open(path))
        old["frames"].update(meta["frames"])
        meta = old
    with open(path, "w") as f:
        json.dump(meta, f, indent=1)
    print(out_dir, len(frames), "frames, scale", round(scale, 3))


if __name__ == "__main__":
    main()
