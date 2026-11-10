"""Convert Tennis-MoCap BVH strokes (jdpulgarin/Tennis-MoCap, CC BY-SA 3.0) to stroke clips.

Same output frame as mocap/export_3dtennisds.py: origin = racket head centre at
impact, x = horizontal head velocity at impact, y = up, z = hitter's right.
The BVH has no racket markers: the racket follows the recorded wrist rotation,
calibrated so that at impact it sits in the expected contact pose for the stroke.
"""
import sys, os, json, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bvh import load, fk

RATE_OUT = 50.0
T0, T1 = -0.40, 0.44
SWEET = 0.54  # wrist to racket head centre (m)

def unit(v): return v / np.linalg.norm(v)

def quat_from_basis(X, Y, Z):
    m = np.array([X, Y, Z]).T; t = np.trace(m)
    if t > 0:
        s = np.sqrt(t + 1.0) * 2; return np.array([(m[2,1]-m[1,2])/s, (m[0,2]-m[2,0])/s, (m[1,0]-m[0,1])/s, 0.25*s])
    if m[0,0] > m[1,1] and m[0,0] > m[2,2]:
        s = np.sqrt(1.0 + m[0,0] - m[1,1] - m[2,2]) * 2; return np.array([0.25*s, (m[0,1]+m[1,0])/s, (m[0,2]+m[2,0])/s, (m[2,1]-m[1,2])/s])
    if m[1,1] > m[2,2]:
        s = np.sqrt(1.0 + m[1,1] - m[0,0] - m[2,2]) * 2; return np.array([(m[0,1]+m[1,0])/s, 0.25*s, (m[1,2]+m[2,1])/s, (m[0,2]-m[2,0])/s])
    s = np.sqrt(1.0 + m[2,2] - m[0,0] - m[1,1]) * 2; return np.array([(m[0,2]+m[2,0])/s, (m[1,2]+m[2,1])/s, 0.25*s, (m[1,0]-m[0,1])/s])

def strokes(path):
    joints, data, ft = load(path)
    names = [j['name'] for j in joints]
    pos, R = fk(joints, data)
    pos = pos / 100.0  # cm -> m
    # BVH is Y-up; convert to Z-up lab frame (x, -z, y) so the rest matches the C3D exporter
    conv = np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]])
    P = pos @ conv.T
    Rz = np.einsum('ij,fkjl->fkil', conv, R)  # rotate frames into the new basis
    endpos = {}
    for ji, j in enumerate(joints):
        if j.get('end') is not None:
            e = pos[:, ji, :] + np.einsum('fij,j->fi', R[:, ji], j['end'] / 100.0)
            endpos[j['name']] = e @ conv.T
    g = lambda n: P[:, names.index(n), :]
    rate = 1 / ft
    rw = g('RightWrist')
    v = np.gradient(rw, ft, axis=0); spd = np.linalg.norm(v, axis=1)
    jump = np.max(np.linalg.norm(np.diff(P, axis=0), axis=2), axis=1)  # largest joint jump per frame
    thr = 0.55 * np.percentile(spd, 99.5)
    peaks = [i for i in range(60, len(spd) - 60) if spd[i] >= thr and spd[i] == spd[i - 50:i + 50].max()]
    out = []
    for k in peaks:
        lo, hi = k + int(T0 * rate) - 2, k + int(T1 * rate) + 2
        if lo < 0 or hi >= len(spd): continue
        clean = jump[lo:hi].max() < 0.12
        out.append((k, spd[k], clean))
    return dict(names=names, P=P, R=Rz, endpos=endpos, rate=rate, ft=ft, peaks=out, v=v)

def export(path, k, stroke, clip_id):
    d = strokes(path); names, P, Rw, rate = d['names'], d['P'], d['R'], d['rate']
    g = lambda n: P[:, names.index(n), :]
    rw = g('RightWrist'); v = d['v']
    fwd = v[k].copy(); fwd[2] = 0; fwd = unit(fwd)
    up = np.array([0, 0, 1.0]); right = np.cross(fwd, up)
    # expected racket pose at impact (lab frame)
    if stroke == 'serve':
        Zexp = unit(0.18 * fwd + 1.0 * up)
    else:  # one-handed backhand: shaft out to the hitter's left, slightly head-down
        Zexp = unit(-1.0 * right + 0.25 * fwd - 0.12 * up)
    Xexp = unit(fwd - (fwd @ Zexp) * Zexp)
    A0 = Rw[k, names.index('RightWrist')]
    u = A0.T @ Zexp; nloc = A0.T @ Xexp
    n = len(P)
    head = np.array([rw[f] + SWEET * unit(Rw[f, names.index('RightWrist')] @ u) for f in range(n)])
    C = head[k].copy()
    vh = np.gradient(head, d['ft'], axis=0)
    toLocal = lambda Q: np.stack([(Q - C) @ fwd, (Q - C) @ up, (Q - C) @ right], axis=-1)
    tsrc = (np.arange(n) - k) / rate
    tgrid = np.arange(T0, T1 + 1e-9, 1 / RATE_OUT)
    def resample(arr):
        o = np.empty((len(tgrid), arr.shape[1]))
        for j in range(arr.shape[1]): o[:, j] = np.interp(tgrid, tsrc, arr[:, j])
        return o
    hipsF = Rw[:, names.index('Head')]
    head_pos = g('Head')
    # gaze: head's local direction that points along fwd at impact
    gl = hipsF[k].T @ fwd
    headF = np.array([head_pos[f] + 0.2 * unit(hipsF[f] @ gl) for f in range(n)])
    ltoe = d['endpos'].get('LeftAnkle', g('LeftAnkle')); rtoe = d['endpos'].get('RightAnkle', g('RightAnkle'))
    joints = {
        'lhip': g('LeftHip'), 'rhip': g('RightHip'), 'lkne': g('LeftKnee'), 'rkne': g('RightKnee'),
        'lank': g('LeftAnkle'), 'rank': g('RightAnkle'), 'ltoe': ltoe, 'rtoe': rtoe,
        'lsho': g('LeftShoulder'), 'rsho': g('RightShoulder'), 'lelb': g('LeftElbow'), 'relb': g('RightElbow'),
        'lwri': g('LeftWrist'), 'rwri': rw, 'head': head_pos, 'headF': headF,
    }
    frames = {nm: np.round(resample(toLocal(Q)), 3).tolist() for nm, Q in joints.items()}
    qs = []
    for f in range(n):
        A = Rw[f, names.index('RightWrist')]
        Z = unit(A @ u); X = A @ nloc; X = unit(X - (X @ Z) * Z)
        Zl = unit(np.array([Z @ fwd, Z @ up, Z @ right])); Xl = np.array([X @ fwd, X @ up, X @ right])
        Xl = unit(Xl - (Xl @ Zl) * Zl); Yl = np.cross(Zl, Xl)
        qs.append(quat_from_basis(Xl, Yl, Zl))
    qs = np.array(qs)
    for f in range(1, n):
        if qs[f] @ qs[f - 1] < 0: qs[f] = -qs[f]
    q = resample(qs); q /= np.linalg.norm(q, axis=1, keepdims=True)
    frames['racketPos'] = np.round(resample(toLocal(head)), 3).tolist()
    frames['racketQuat'] = np.round(q, 4).tolist()
    # Ground: a planted foot (10th percentile of the lower ankle over the file) should land at the
    # rig's ankle height (0.068 m) after scaling to the rig.
    low = np.minimum(g('LeftAnkle')[:, 2], g('RightAnkle')[:, 2])
    leg = float(np.median(np.linalg.norm(g('LeftHip') - g('LeftKnee'), axis=1)) + np.median(np.linalg.norm(g('LeftKnee') - g('LeftAnkle'), axis=1)))
    ground = float(np.percentile(low, 10)) - 0.068 / (0.97 * 0.83 / leg)
    vel = vh[k]; swing = float(np.degrees(np.arctan2(vel[2], np.linalg.norm(vel[:2]))))
    seg = lambda a, b: float(np.median(np.linalg.norm(g(a) - g(b), axis=1)))
    return {
        'id': clip_id, 'stroke': stroke, 'rate': RATE_OUT, 't0': T0,
        'impactHeight': round(float(C[2] - ground), 3), 'groundY': round(float(ground - C[2]), 3),
        'swingDeg': round(swing, 1), 'faceDeg': 0.0, 'headSpeed': round(float(np.linalg.norm(vel)), 1),
        'bodyScale': round(0.83 / (seg('LeftHip', 'LeftKnee') + seg('LeftKnee', 'LeftAnkle')), 3),
        'frames': frames,
    }

if __name__ == '__main__':
    for path in sys.argv[1:]:
        d = strokes(path)
        nm = d['names']; P = d['P']
        seg = lambda a, b: np.median(np.linalg.norm(P[:, nm.index(a)] - P[:, nm.index(b)], axis=1))
        print(os.path.basename(path), 'thigh %.2f shin %.2f uarm %.2f farm %.2f' % (seg('LeftHip','LeftKnee'), seg('LeftKnee','LeftAnkle'), seg('RightShoulder','RightElbow'), seg('RightElbow','RightWrist')),
              [(k, round(float(s), 1), c) for k, s, c in d['peaks']])
