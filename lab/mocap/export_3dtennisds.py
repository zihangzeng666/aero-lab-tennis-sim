"""Export 3DTennisDS (Lublin University of Technology) trials to compact stroke clips.

Output frame (matches the simulator's contact pivot): origin = racket head centre at
impact, x = horizontal direction of racket-head velocity at impact, y = up,
z = x cross y-up-ish (the hitter's right). Units: metres. Time: seconds from impact.
"""
import sys, glob, os, json, c3d, numpy as np

RATE_OUT = 50.0
T0, T1 = -0.40, 0.44

def load(path):
    with open(path, 'rb') as h:
        r = c3d.Reader(h)
        labels = [l.strip().split(':')[-1].strip() for l in r.point_labels]
        rate = r.point_rate
        arr = np.array([p[:, :3].copy() for _, p, _ in r.read_frames()]) / 1000.0
    return (lambda n: arr[:, labels.index(n), :]), rate, arr.shape[0]

def unit(v):
    return v / np.linalg.norm(v)

def quat_from_basis(X, Y, Z):
    m = np.array([X, Y, Z]).T  # columns
    t = np.trace(m)
    if t > 0:
        s = np.sqrt(t + 1.0) * 2
        w = 0.25 * s; x = (m[2,1] - m[1,2]) / s; y = (m[0,2] - m[2,0]) / s; z = (m[1,0] - m[0,1]) / s
    elif m[0,0] > m[1,1] and m[0,0] > m[2,2]:
        s = np.sqrt(1.0 + m[0,0] - m[1,1] - m[2,2]) * 2
        w = (m[2,1] - m[1,2]) / s; x = 0.25 * s; y = (m[0,1] + m[1,0]) / s; z = (m[0,2] + m[2,0]) / s
    elif m[1,1] > m[2,2]:
        s = np.sqrt(1.0 + m[1,1] - m[0,0] - m[2,2]) * 2
        w = (m[0,2] - m[2,0]) / s; x = (m[0,1] + m[1,0]) / s; y = 0.25 * s; z = (m[1,2] + m[2,1]) / s
    else:
        s = np.sqrt(1.0 + m[2,2] - m[0,0] - m[1,1]) * 2
        w = (m[1,0] - m[0,1]) / s; x = (m[0,2] + m[2,0]) / s; y = (m[1,2] + m[2,1]) / s; z = 0.25 * s
    q = np.array([x, y, z, w]); return q / np.linalg.norm(q)

def export(path, stroke):
    g, rate, n = load(path)
    head = np.mean([g(f'RH{i}') for i in range(1, 6)], axis=0)
    butt = g('RH7')
    v = np.gradient(head, 1 / rate, axis=0)
    spd = np.linalg.norm(v, axis=1)
    k = int(np.argmax(spd))
    C = head[k].copy()
    fwd = v[k].copy(); fwd[2] = 0; fwd = unit(fwd)
    up = np.array([0, 0, 1.0])
    right = np.cross(fwd, up)
    toLocal = lambda P: np.stack([(P - C) @ fwd, (P - C) @ up, (P - C) @ right], axis=-1)

    joints = {
        'lhip': g('LFEP'), 'rhip': g('RFEP'), 'lkne': g('LFEO'), 'rkne': g('RFEO'),
        'lank': g('LTIO'), 'rank': g('RTIO'), 'ltoe': g('LTOE'), 'rtoe': g('RTOE'),
        'lsho': g('LCLO'), 'rsho': g('RCLO'), 'lelb': g('LHUO'), 'relb': g('RHUO'),
        'lwri': g('LRAO'), 'rwri': g('RRAO'), 'head': g('HEDO'), 'headF': g('HEDA'),
    }
    # Racket frame per frame
    quats, rpos = [], []
    hoop = np.stack([g(f'RH{i}') for i in range(1, 6)], axis=1)
    for f in range(n):
        Z = unit(head[f] - butt[f])
        P = hoop[f] - hoop[f].mean(0)
        _, _, vt = np.linalg.svd(P)
        nrm = vt[2] - (vt[2] @ Z) * Z; nrm = unit(nrm)
        quats.append((Z, nrm))
    # orient normals consistently with the impact frame (face toward target at impact)
    Zk, nk = quats[k]
    sign_k = 1 if nk @ fwd > 0 else -1
    prev = nk * sign_k
    fixed = []
    for f in range(n):
        Z, nrm = quats[f]
        if nrm @ prev < 0: nrm = -nrm
        fixed.append((Z, nrm)); prev = nrm
    # walk backward from k for frames before k as well
    prev = nk * sign_k
    for f in range(k, -1, -1):
        Z, nrm = quats[f]
        if nrm @ prev < 0: nrm = -nrm
        fixed[f] = (Z, nrm); prev = nrm
    prev = nk * sign_k
    for f in range(k, n):
        Z, nrm = quats[f]
        if nrm @ prev < 0: nrm = -nrm
        fixed[f] = (Z, nrm); prev = nrm

    tgrid = np.arange(T0, T1 + 1e-9, 1 / RATE_OUT)
    tsrc = (np.arange(n) - k) / rate
    def resample(arr):
        out = np.empty((len(tgrid), arr.shape[1]))
        for j in range(arr.shape[1]):
            out[:, j] = np.interp(tgrid, tsrc, arr[:, j])  # holds end values outside the capture
        return out

    frames = {}
    for name, P in joints.items():
        frames[name] = np.round(resample(toLocal(P)), 3).tolist()
    # racket: sweet spot placed on the recorded hoop centre (so the ball meets the strings) + quaternion
    sweet = []
    qs = []
    for f in range(n):
        Z, nrm = fixed[f]
        Zl = np.array([Z @ fwd, Z @ up, Z @ right]); Xl = np.array([nrm @ fwd, nrm @ up, nrm @ right])
        Zl = unit(Zl); Xl = unit(Xl - (Xl @ Zl) * Zl); Yl = np.cross(Zl, Xl)
        qs.append(quat_from_basis(Xl, Yl, Zl))
        sweet.append(toLocal(head[f]))
    qs = np.array(qs)
    for f in range(1, n):  # keep quaternion hemisphere continuous before interpolating
        if qs[f] @ qs[f - 1] < 0: qs[f] = -qs[f]
    q_rs = resample(qs); q_rs /= np.linalg.norm(q_rs, axis=1, keepdims=True)
    frames['racketPos'] = np.round(resample(np.array(sweet)), 3).tolist()
    frames['racketQuat'] = np.round(q_rs, 4).tolist()

    vel = v[k]; swing = float(np.degrees(np.arctan2(vel[2], np.linalg.norm(vel[:2]))))
    nl = fixed[k][1]; face = float(np.degrees(np.arcsin(np.clip(nl @ up, -1, 1))))
    return {
        'id': os.path.basename(path).replace('.c3d', ''),
        'stroke': stroke,
        'rate': RATE_OUT,
        't0': T0,
        'impactHeight': round(float(C[2]), 3),
        'groundY': round(float(-C[2]), 3),
        'swingDeg': round(swing, 1),
        'faceDeg': round(face, 1),
        'headSpeed': round(float(spd[k]), 1),
        'captured': [round(float(tsrc[0]), 2), round(float(tsrc[-1]), 2)],
        'frames': frames,
    }

root = sys.argv[1]; out = sys.argv[2]
KEEP = set(sys.argv[3].split(',')) if len(sys.argv) > 3 else None
clips = []
for pat, stroke in [('tp2_fhb', 'fh'), ('tp2_bhb', 'bh2')]:
    for p in sorted(glob.glob(os.path.join(root, pat, 's*', pat + '_s*.c3d'))):
        if KEEP and os.path.basename(p)[:-4] not in KEEP:
            continue
        c = export(p, stroke)
        print(c['id'], c['stroke'], 'h', c['impactHeight'], 'swing', c['swingDeg'], 'face', c['faceDeg'], 'v', c['headSpeed'], 'cap', c['captured'])
        clips.append(c)
json.dump({
    'source': '3DTennisDS, Lublin University of Technology, https://tennisdb.cs.pollub.pl (player tp2, Vicon Plug-in Gait + 7-marker racket, 100 Hz)',
    'terms': 'Used with attribution as required by the dataset terms of use. Converted by mocap/export_3dtennisds.py.',
    'frame': 'origin = racket head centre at impact; x = horizontal racket-head velocity at impact; y = up; z = hitter right; metres; t in s from impact; 50 Hz',
    'clips': clips,
}, open(out, 'w'), separators=(',', ':'))
print('bytes', os.path.getsize(out))
