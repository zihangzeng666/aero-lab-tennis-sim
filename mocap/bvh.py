import numpy as np, re

def rot(axis, deg):
    a = np.radians(deg); c, s = np.cos(a), np.sin(a)
    if axis == 'X': return np.array([[1,0,0],[0,c,-s],[0,s,c]])
    if axis == 'Y': return np.array([[c,0,s],[0,1,0],[-s,0,c]])
    return np.array([[c,-s,0],[s,c,0],[0,0,1]])

def load(path):
    txt = open(path).read()
    hier, motion = txt.split('MOTION')
    tokens = hier.split()
    joints = []  # dict(name, parent, offset, channels)
    stack = []; i = 0; current = None
    while i < len(tokens):
        t = tokens[i]
        if t in ('ROOT', 'JOINT'):
            name = tokens[i+1]; parent = stack[-1] if stack else None
            joints.append({'name': name, 'parent': parent, 'offset': None, 'channels': [], 'end': None})
            current = len(joints) - 1; i += 2; continue
        if t == 'End':
            joints[stack[-1]]['end_pending'] = True; current = 'end'; i += 2; continue
        if t == '{':
            if current == 'end': stack.append('end')
            else: stack.append(current)
            i += 1; continue
        if t == '}':
            stack.pop(); i += 1; continue
        if t == 'OFFSET':
            off = np.array([float(x) for x in tokens[i+1:i+4]])
            if stack[-1] == 'end': joints[stack[-2]]['end'] = off
            else: joints[stack[-1]]['offset'] = off
            i += 4; continue
        if t == 'CHANNELS':
            n = int(tokens[i+1]); joints[stack[-1]]['channels'] = tokens[i+2:i+2+n]; i += 2 + n; continue
        i += 1
    lines = motion.strip().split('\n')
    nframes = int(lines[0].split()[1]); ft = float(lines[1].split()[2])
    data = np.array([[float(x) for x in l.split()] for l in lines[2:2+nframes]])
    return joints, data, ft

def fk(joints, data):
    """World positions (frames x joints x 3) and rotation matrices (frames x joints x 3 x 3)."""
    n = data.shape[0]; J = len(joints)
    pos = np.zeros((n, J, 3)); R = np.zeros((n, J, 3, 3))
    col = 0; chan_cols = []
    for j in joints:
        chan_cols.append(list(range(col, col + len(j['channels'])))); col += len(j['channels'])
    for f in range(n):
        row = data[f]
        for ji, j in enumerate(joints):
            local_R = np.eye(3); local_T = j['offset'].copy()
            for c, ci in zip(j['channels'], chan_cols[ji]):
                if c.endswith('position'): local_T[{'X':0,'Y':1,'Z':2}[c[0]]] = row[ci] + (0 if j['parent'] is not None else 0)
                else: local_R = local_R @ rot(c[0], row[ci])
            if j['parent'] is None:
                R[f, ji] = local_R; pos[f, ji] = local_T
            else:
                p = j['parent']
                R[f, ji] = R[f, p] @ local_R
                pos[f, ji] = pos[f, p] + R[f, p] @ local_T
    return pos, R
