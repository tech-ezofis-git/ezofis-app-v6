#!/usr/bin/env python3
"""Assemble a minimal Android APK (WebView shell) without the Android SDK.

Writes classes.dex, a binary AndroidManifest.xml and resources.arsc by hand, bundles the
single-file web build as assets/index.html, and is signed with APK Signature Scheme v2 by sign_v2.py (targetSdk 34).
Usage: build_apk.py <index.html> <icon.png> <out-unsigned.apk>
"""
import hashlib, struct, sys, zipfile, zlib

PKG = 'com.ezofis.mobile'
ACT = PKG + '.MainActivity'
STATUS_BAR = 0xFF643094

# ----------------------------------------------------------------- helpers
def uleb(n):
    out = bytearray()
    while True:
        b = n & 0x7F
        n >>= 7
        if n:
            out.append(b | 0x80)
        else:
            out.append(b)
            return bytes(out)

def align(buf, n=4):
    while len(buf) % n:
        buf.append(0)

def mutf8(s):
    return s.encode('utf-8')  # ASCII-only strings here, identical to MUTF-8

# ----------------------------------------------------------------- DEX
# A tiny DEX assembler: classes, fields and methods are declared symbolically and bytecode is written with
# helpers that resolve string / type / field / method indices after the pools are sorted.
MAIN = 'Lcom/ezofis/mobile/MainActivity;'
CLIENT = 'Lcom/ezofis/mobile/FileChooserClient;'
ACTV = 'Landroid/app/Activity;'
WV = 'Landroid/webkit/WebView;'
WS = 'Landroid/webkit/WebSettings;'
WIN = 'Landroid/view/Window;'
WCC = 'Landroid/webkit/WebChromeClient;'
FCP = 'Landroid/webkit/WebChromeClient$FileChooserParams;'
VCB = 'Landroid/webkit/ValueCallback;'
INTENT = 'Landroid/content/Intent;'
STR = 'Ljava/lang/String;'
OBJ = 'Ljava/lang/Object;'
URL = 'file:///android_asset/index.html'

def shorty(ret, params):
    return ''.join('L' if t[0] in 'L[' else t for t in (ret,) + tuple(params))

class Asm:
    """Collects references, then emits code units once indices are known."""
    def __init__(self):
        self.strings, self.types, self.protos, self.fields, self.methods = set(), set(), set(), set(), set()
    def t(self, ty): self.types.add(ty); self.strings.add(ty); return ('T', ty)
    def s(self, st): self.strings.add(st); return ('S', st)
    def f(self, cls, name, ty): self.t(cls); self.t(ty); self.strings.add(name); self.fields.add((cls, name, ty)); return ('F', (cls, name, ty))
    def m(self, cls, name, ret, params=()):
        params = tuple(params); self.t(cls); self.t(ret); [self.t(x) for x in params]; self.strings.add(name)
        self.strings.add(shorty(ret, params)); self.protos.add((ret, params)); self.methods.add((cls, name, (ret, params)))
        return ('M', (cls, name, (ret, params)))

def build_dex():
    A = Asm()
    # ---- references used by the code below
    act_init = A.m(ACTV, '<init>', 'V'); act_create = A.m(ACTV, 'onCreate', 'V', [ 'Landroid/os/Bundle;' ]); act_back = A.m(ACTV, 'onBackPressed', 'V')
    act_setcv = A.m(ACTV, 'setContentView', 'V', ['Landroid/view/View;']); act_win = A.m(ACTV, 'getWindow', WIN)
    act_sfr = A.m(ACTV, 'startActivityForResult', 'V', [INTENT, 'I'])
    win_sbc = A.m(WIN, 'setStatusBarColor', 'V', ['I'])
    wv_init = A.m(WV, '<init>', 'V', ['Landroid/content/Context;']); wv_settings = A.m(WV, 'getSettings', WS); wv_load = A.m(WV, 'loadUrl', 'V', [STR])
    wv_can = A.m(WV, 'canGoBack', 'Z'); wv_back = A.m(WV, 'goBack', 'V'); wv_wcc = A.m(WV, 'setWebChromeClient', 'V', [WCC])
    ws_js = A.m(WS, 'setJavaScriptEnabled', 'V', ['Z']); ws_dom = A.m(WS, 'setDomStorageEnabled', 'V', ['Z'])
    ws_file = A.m(WS, 'setAllowFileAccess', 'V', ['Z']); ws_univ = A.m(WS, 'setAllowUniversalAccessFromFileURLs', 'V', ['Z'])
    wcc_init = A.m(WCC, '<init>', 'V')
    fcp_parse = A.m(FCP, 'parseResult', '[Landroid/net/Uri;', ['I', INTENT])
    vcb_recv = A.m(VCB, 'onReceiveValue', 'V', [OBJ])
    int_init = A.m(INTENT, '<init>', 'V', [STR]); int_cat = A.m(INTENT, 'addCategory', INTENT, [STR]); int_type = A.m(INTENT, 'setType', INTENT, [STR])
    f_web = A.f(MAIN, 'web', WV); f_cb = A.f(MAIN, 'cb', VCB); f_act = A.f(CLIENT, 'act', MAIN)
    T_WV = A.t(WV); T_CLIENT = A.t(CLIENT); T_INTENT = A.t(INTENT)
    S_URL = A.s(URL); S_GET = A.s('android.intent.action.GET_CONTENT'); S_OPEN = A.s('android.intent.category.OPENABLE'); S_ANY = A.s('*/*')
    # own methods
    me_init = A.m(MAIN, '<init>', 'V'); me_create = A.m(MAIN, 'onCreate', 'V', ['Landroid/os/Bundle;']); me_back = A.m(MAIN, 'onBackPressed', 'V')
    me_result = A.m(MAIN, 'onActivityResult', 'V', ['I', 'I', INTENT])
    cl_init = A.m(CLIENT, '<init>', 'V', [MAIN]); cl_show = A.m(CLIENT, 'onShowFileChooser', 'Z', [WV, VCB, FCP])
    A.t(ACTV); A.t(WCC)
    # ---- native bridge for phone notifications: JS calls prompt('ezofis:notify' | 'ezofis:perm', arg)
    JPR, NM, NCH, NB, NOTI, PI, CS, CTX = ('Landroid/webkit/JsPromptResult;', 'Landroid/app/NotificationManager;', 'Landroid/app/NotificationChannel;',
        'Landroid/app/Notification$Builder;', 'Landroid/app/Notification;', 'Landroid/app/PendingIntent;', 'Ljava/lang/CharSequence;', 'Landroid/content/Context;')
    cl_prompt = A.m(CLIENT, 'onJsPrompt', 'Z', [WV, STR, STR, STR, JPR])
    str_eq = A.m(STR, 'equals', 'Z', [OBJ]); str_idx = A.m(STR, 'indexOf', 'I', ['I']); str_hash = A.m(STR, 'hashCode', 'I')
    str_sub2 = A.m(STR, 'substring', STR, ['I', 'I']); str_sub1 = A.m(STR, 'substring', STR, ['I'])
    jpr_ok = A.m(JPR, 'confirm', 'V', [STR])
    f_sdk = A.f('Landroid/os/Build$VERSION;', 'SDK_INT', 'I')
    act_chk = A.m(ACTV, 'checkSelfPermission', 'I', [STR]); act_req = A.m(ACTV, 'requestPermissions', 'V', ['[' + STR, 'I'])
    act_sys = A.m(ACTV, 'getSystemService', OBJ, [STR])
    nch_init = A.m(NCH, '<init>', 'V', [STR, CS, 'I']); nm_chan = A.m(NM, 'createNotificationChannel', 'V', [NCH]); nm_notify = A.m(NM, 'notify', 'V', ['I', NOTI])
    nb_init2 = A.m(NB, '<init>', 'V', [CTX, STR]); nb_init1 = A.m(NB, '<init>', 'V', [CTX])
    nb_icon = A.m(NB, 'setSmallIcon', NB, ['I']); nb_title = A.m(NB, 'setContentTitle', NB, [CS]); nb_text = A.m(NB, 'setContentText', NB, [CS])
    nb_auto = A.m(NB, 'setAutoCancel', NB, ['Z']); nb_pi = A.m(NB, 'setContentIntent', NB, [PI]); nb_build = A.m(NB, 'build', NOTI)
    int_init2 = A.m(INTENT, '<init>', 'V', [CTX, 'Ljava/lang/Class;']); pi_get = A.m(PI, 'getActivity', PI, [CTX, 'I', INTENT, 'I'])
    T_STRA = A.t('[' + STR); T_NM = A.t(NM); T_NCH = A.t(NCH); T_NB = A.t(NB); T_MAIN = A.t(MAIN)
    S_NOTIFY, S_PERM, S_PN, S_ASK, S_DEN, S_GR, S_NS, S_CH, S_CHN, S_OK = (A.s(x) for x in ('ezofis:notify', 'ezofis:perm', 'android.permission.POST_NOTIFICATIONS',
        'ask', 'denied', 'granted', 'notification', 'ezofis', 'Workflow updates', 'ok'))

    # ---- pools, sorted as the DEX format requires
    strings = sorted(A.strings, key=lambda x: x.encode('utf-16-be'))
    sidx = {x: i for i, x in enumerate(strings)}
    types = sorted(A.types, key=lambda x: sidx[x]); tidx = {x: i for i, x in enumerate(types)}
    protos = sorted(A.protos, key=lambda p: (tidx[p[0]], [tidx[x] for x in p[1]])); pidx = {x: i for i, x in enumerate(protos)}
    fields = sorted(A.fields, key=lambda f: (tidx[f[0]], sidx[f[1]], tidx[f[2]])); fidx = {x: i for i, x in enumerate(fields)}
    methods = sorted(A.methods, key=lambda m: (tidx[m[0]], sidx[m[1]], pidx[m[2]])); midx = {x: i for i, x in enumerate(methods)}
    I = lambda ref: {'T': tidx, 'S': sidx, 'F': fidx, 'M': midx}[ref[0]][ref[1]]

    # ---- instruction helpers (register numbers are absolute)
    def inv(op, ref, *regs):  # invoke-kind {regs}, method   (format 35c)
        r = list(regs) + [0] * (5 - len(regs))
        return [(len(regs) << 12) | (r[4] << 8) | op, I(ref), (r[3] << 12) | (r[2] << 8) | (r[1] << 4) | r[0]]
    VIRT, SUPER, DIRECT, STATIC, IFACE = 0x6e, 0x6f, 0x70, 0x71, 0x72
    new_inst = lambda a, ref: [(a << 8) | 0x22, I(ref)]
    const_str = lambda a, ref: [(a << 8) | 0x1a, I(ref)]
    const4 = lambda a, lit: [((lit & 0xF) << 12) | (a << 8) | 0x12]
    const32 = lambda a, lit: [(a << 8) | 0x14, lit & 0xFFFF, (lit >> 16) & 0xFFFF]
    iget_obj = lambda a, b, ref: [(b << 12) | (a << 8) | 0x54, I(ref)]
    iput_obj = lambda a, b, ref: [(b << 12) | (a << 8) | 0x5b, I(ref)]
    mres_obj = lambda a: [(a << 8) | 0x0c]
    mres = lambda a: [(a << 8) | 0x0a]
    if_eqz = lambda a, off: [(a << 8) | 0x38, off & 0xFFFF]
    sget = lambda a, ref: [(a << 8) | 0x60, I(ref)]
    const16 = lambda a, lit: [(a << 8) | 0x13, lit & 0xFFFF]
    new_arr = lambda a, size, ref: [(size << 12) | (a << 8) | 0x23, I(ref)]
    aput_obj = lambda v, arr, ix: [(v << 8) | 0x4d, (ix << 8) | arr]
    check_cast = lambda a, ref: [(a << 8) | 0x1f, I(ref)]
    const_cls = lambda a, ref: [(a << 8) | 0x1c, I(ref)]
    add_lit8 = lambda a, b, lit: [(a << 8) | 0xd8, ((lit & 0xFF) << 8) | b]
    def assemble(parts):
        # parts: code-unit lists, ('L', name), or branches ('nez'|'eqz', reg, L) / ('lt', a, b, L) / ('goto', L); all branches are 2 units
        pos, labels = 0, {}
        for x in parts:
            if isinstance(x, tuple) and x[0] == 'L': labels[x[1]] = pos
            elif isinstance(x, tuple): pos += 2
            else: pos += len(x)
        out = []
        for x in parts:
            if isinstance(x, tuple) and x[0] == 'L': continue
            if isinstance(x, tuple):
                off = (labels[x[-1]] - len(out)) & 0xFFFF
                if x[0] == 'nez': out += [(x[1] << 8) | 0x39, off]
                elif x[0] == 'eqz': out += [(x[1] << 8) | 0x38, off]
                elif x[0] == 'lt': out += [(x[2] << 12) | (x[1] << 8) | 0x34, off]
                elif x[0] == 'goto': out += [0x29, off]
            else: out += x
        return out
    ret_void = [0x000e]
    ret = lambda a: [(a << 8) | 0x0f]

    # ---- MainActivity
    # <init>: regs 1 (p0=v0)
    c_init = inv(DIRECT, act_init, 0) + ret_void
    # onCreate(Bundle): v0 web, v1 tmp, v2 tmp; p0=v3 this, p1=v4 bundle
    c_create = (inv(SUPER, act_create, 3, 4) + new_inst(0, T_WV) + inv(DIRECT, wv_init, 0, 3) + iput_obj(0, 3, f_web)
                + new_inst(1, T_CLIENT) + inv(DIRECT, cl_init, 1, 3) + inv(VIRT, wv_wcc, 0, 1)      # file picker support
                + inv(VIRT, wv_settings, 0) + mres_obj(1) + const4(2, 1)
                + inv(VIRT, ws_js, 1, 2) + inv(VIRT, ws_dom, 1, 2) + inv(VIRT, ws_file, 1, 2) + inv(VIRT, ws_univ, 1, 2)
                + const_str(1, S_URL) + inv(VIRT, wv_load, 0, 1) + inv(VIRT, act_setcv, 3, 0)
                + inv(VIRT, act_win, 3) + mres_obj(1) + const32(2, STATUS_BAR) + inv(VIRT, win_sbc, 1, 2) + ret_void)
    # onBackPressed: v0 web, v1 bool; p0=v2
    back_tail = inv(VIRT, wv_back, 0) + ret_void
    c_back = iget_obj(0, 2, f_web) + inv(VIRT, wv_can, 0) + mres(1) + if_eqz(1, 2 + len(back_tail)) + back_tail + inv(SUPER, act_back, 2) + ret_void
    # onActivityResult(int req, int res, Intent data): v0 cb, v1 uris; p0=v2 this, p1=v3, p2=v4, p3=v5
    body = inv(STATIC, fcp_parse, 4, 5) + mres_obj(1) + inv(IFACE, vcb_recv, 0, 1) + const4(1, 0) + iput_obj(1, 2, f_cb)
    c_result = iget_obj(0, 2, f_cb) + if_eqz(0, 2 + len(body)) + body + ret_void
    # ---- FileChooserClient
    # <init>(MainActivity): p0=v0 this, p1=v1 activity
    c_cl_init = inv(DIRECT, wcc_init, 0) + iput_obj(1, 0, f_act) + ret_void
    # onShowFileChooser(WebView, ValueCallback, FileChooserParams): v0 act, v1 tmp, v2 tmp, v3 ret; p0=v4, p1=v5, p2=v6, p3=v7
    cancel_prev = const4(2, 0) + inv(IFACE, vcb_recv, 1, 2)                  # a previous chooser left open gets null
    c_show = (iget_obj(0, 4, f_act) + iget_obj(1, 0, f_cb) + if_eqz(1, 2 + len(cancel_prev)) + cancel_prev
              + iput_obj(6, 0, f_cb)
              + new_inst(1, T_INTENT) + const_str(2, S_GET) + inv(DIRECT, int_init, 1, 2)
              + const_str(2, S_OPEN) + inv(VIRT, int_cat, 1, 2) + const_str(2, S_ANY) + inv(VIRT, int_type, 1, 2)
              + const4(2, 1) + inv(VIRT, act_sfr, 0, 1, 2) + const4(3, 1) + ret(3))

    # onJsPrompt(view, url, message, default, result): locals v0-v9; p0=v10 this, v11 view, v12 url, v13 message, v14 default, v15 result
    done = lambda sref: const_str(1, sref) + inv(VIRT, jpr_ok, 15, 1) + const4(1, 1) + ret(1)
    c_prompt = assemble([
        iget_obj(0, 10, f_act),
        const_str(1, S_NOTIFY) + inv(VIRT, str_eq, 13, 1) + mres(2), ('nez', 2, 'NOTIFY'),
        const_str(1, S_PERM) + inv(VIRT, str_eq, 13, 1) + mres(2), ('nez', 2, 'PERM'),
        const4(1, 0) + ret(1),
        ('L', 'PERM'),
        sget(1, f_sdk) + const16(2, 33), ('lt', 1, 2, 'GRANTED'),
        const_str(3, S_PN) + inv(VIRT, act_chk, 0, 3) + mres(2), ('eqz', 2, 'GRANTED'),
        const_str(4, S_ASK) + inv(VIRT, str_eq, 14, 4) + mres(5), ('eqz', 5, 'DENIED'),
        const4(4, 1) + new_arr(5, 4, T_STRA) + const4(4, 0) + aput_obj(3, 5, 4) + const4(4, 7) + inv(VIRT, act_req, 0, 5, 4),
        ('L', 'DENIED'), done(S_DEN),
        ('L', 'GRANTED'), done(S_GR),
        ('L', 'NOTIFY'),
        const16(1, 10) + inv(VIRT, str_idx, 14, 1) + mres(1),
        const4(2, 0) + inv(VIRT, str_sub2, 14, 2, 1) + mres_obj(6),
        add_lit8(1, 1, 1) + inv(VIRT, str_sub1, 14, 1) + mres_obj(7),
        const_str(1, S_NS) + inv(VIRT, act_sys, 0, 1) + mres_obj(8) + check_cast(8, T_NM),
        const_str(3, S_CH) + sget(1, f_sdk) + const16(2, 26), ('lt', 1, 2, 'OLD'),
        new_inst(4, T_NCH) + const_str(5, S_CHN) + const4(1, 4) + inv(DIRECT, nch_init, 4, 3, 5, 1) + inv(VIRT, nm_chan, 8, 4),
        new_inst(9, T_NB) + inv(DIRECT, nb_init2, 9, 0, 3), ('goto', 'BUILD'),
        ('L', 'OLD'), new_inst(9, T_NB) + inv(DIRECT, nb_init1, 9, 0),
        ('L', 'BUILD'),
        const32(1, 0x7F010000) + inv(VIRT, nb_icon, 9, 1) + inv(VIRT, nb_title, 9, 6) + inv(VIRT, nb_text, 9, 7) + const4(1, 1) + inv(VIRT, nb_auto, 9, 1),
        new_inst(4, T_INTENT) + const_cls(5, T_MAIN) + inv(DIRECT, int_init2, 4, 0, 5),
        const4(1, 0) + const32(2, 0x0C000000) + inv(STATIC, pi_get, 0, 1, 4, 2) + mres_obj(5) + inv(VIRT, nb_pi, 9, 5),
        inv(VIRT, nb_build, 9) + mres_obj(5) + inv(VIRT, str_hash, 14) + mres(1) + inv(VIRT, nm_notify, 8, 1, 5),
        done(S_OK),
    ])

    # class: (type, super, [ (field, access) ], [ (method, access, (regs, ins, outs, code)) ])
    classes = [
        (MAIN, ACTV, [(f_web, 0x2), (f_cb, 0x1)],
         [(me_init, 0x10001, (1, 1, 1, c_init)), (me_create, 0x4, (5, 2, 2, c_create)), (me_back, 0x1, (3, 1, 1, c_back)),
          (me_result, 0x4, (6, 4, 2, c_result))]),
        (CLIENT, WCC, [(f_act, 0x12)],
         [(cl_init, 0x10001, (2, 2, 1, c_cl_init)), (cl_show, 0x1, (8, 4, 3, c_show)), (cl_prompt, 0x1, (16, 6, 4, c_prompt))]),
    ]

    # ---- layout
    HEADER = 0x70
    n_str, n_type, n_proto, n_field, n_meth, n_class = len(strings), len(types), len(protos), len(fields), len(methods), len(classes)
    off = HEADER
    string_ids_off = off; off += 4 * n_str
    type_ids_off = off; off += 4 * n_type
    proto_ids_off = off; off += 12 * n_proto
    field_ids_off = off; off += 8 * n_field
    method_ids_off = off; off += 8 * n_meth
    class_defs_off = off; off += 32 * n_class
    data_off = off
    data = bytearray()
    here = lambda: data_off + len(data)

    typelist_off = {}; tl_start = None
    for p in protos:
        if p[1] and p[1] not in typelist_off:
            align(data)
            if tl_start is None: tl_start = here()
            typelist_off[p[1]] = here()
            data += struct.pack('<I', len(p[1])) + b''.join(struct.pack('<H', tidx[x]) for x in p[1])
    align(data)
    code_start = here(); code_off = {}; n_code = 0
    for _, _, _, meths in classes:
        for ref, _, (regs, ins, outs, units) in meths:
            align(data)
            code_off[ref] = here(); n_code += 1
            data += struct.pack('<HHHHII', regs, ins, outs, 0, 0, len(units)) + b''.join(struct.pack('<H', x) for x in units)
    str_data_start = here(); str_data_off = []
    for x in strings:
        str_data_off.append(here()); data += uleb(len(x)) + mutf8(x) + b'\x00'
    class_data_offs = []; cd_start = here()
    for _, _, flds, meths in classes:
        class_data_offs.append(here())
        direct = sorted([(I(r), a, code_off[r]) for r, a, _ in meths if r[1][1] == '<init>' or a & 0x8])
        virtual = sorted([(I(r), a, code_off[r]) for r, a, _ in meths if not (r[1][1] == '<init>' or a & 0x8)])
        inst = sorted([(I(r), a) for r, a in flds])
        cd = uleb(0) + uleb(len(inst)) + uleb(len(direct)) + uleb(len(virtual))
        prev = 0
        for k, (fi, a) in enumerate(inst): cd += uleb(fi - prev if k else fi) + uleb(a); prev = fi
        for group in (direct, virtual):
            prev = 0
            for k, (mi, a, co) in enumerate(group): cd += uleb(mi - prev if k else mi) + uleb(a) + uleb(co); prev = mi
        data += cd
    align(data)
    map_off = here()
    items = [(0x0000, 1, 0), (0x0001, n_str, string_ids_off), (0x0002, n_type, type_ids_off), (0x0003, n_proto, proto_ids_off),
             (0x0004, n_field, field_ids_off), (0x0005, n_meth, method_ids_off), (0x0006, n_class, class_defs_off)]
    if typelist_off: items.append((0x1001, len(typelist_off), tl_start))
    items += [(0x2001, n_code, code_start), (0x2002, n_str, str_data_start), (0x2000, n_class, cd_start), (0x1000, 1, map_off)]
    items.sort(key=lambda x: x[2])
    data += struct.pack('<I', len(items)) + b''.join(struct.pack('<HHII', t, 0, sz, o) for t, sz, o in items)

    idx = bytearray()
    for o in str_data_off: idx += struct.pack('<I', o)
    for x in types: idx += struct.pack('<I', sidx[x])
    for p in protos: idx += struct.pack('<III', sidx[shorty(*p)], tidx[p[0]], typelist_off.get(p[1], 0) if p[1] else 0)
    for c, n, ty in fields: idx += struct.pack('<HHI', tidx[c], tidx[ty], sidx[n])
    for c, n, p in methods: idx += struct.pack('<HHI', tidx[c], pidx[p], sidx[n])
    for (cls, sup, _, _), cdo in zip(classes, class_data_offs):
        idx += struct.pack('<IIIIIIII', tidx[cls], 0x1, tidx[sup], 0, 0xFFFFFFFF, 0, cdo, 0)
    assert HEADER + len(idx) == data_off

    file_size = data_off + len(data)
    hdr = bytearray(b'dex\n035\x00') + b'\x00' * 24
    hdr += struct.pack('<IIIIII', file_size, HEADER, 0x12345678, 0, 0, map_off)
    for n, o in ((n_str, string_ids_off), (n_type, type_ids_off), (n_proto, proto_ids_off), (n_field, field_ids_off), (n_meth, method_ids_off), (n_class, class_defs_off), (len(data), data_off)):
        hdr += struct.pack('<II', n, o)
    assert len(hdr) == HEADER
    dex = bytearray(hdr + idx + data)
    dex[12:32] = hashlib.sha1(dex[32:]).digest()
    dex[8:12] = struct.pack('<I', zlib.adler32(bytes(dex[12:])) & 0xFFFFFFFF)
    return bytes(dex)

# ----------------------------------------------------------------- string pool (UTF-16)
def string_pool(strings):
    offs, body = [], bytearray()
    for s in strings:
        offs.append(len(body))
        enc = s.encode('utf-16-le')
        body += struct.pack('<H', len(s)) + enc + b'\x00\x00'
    align(body)
    header_size = 28
    strings_start = header_size + 4 * len(strings)
    size = strings_start + len(body)
    out = struct.pack('<HHIIIIII', 0x0001, header_size, size, len(strings), 0, 0, strings_start, 0)
    out += b''.join(struct.pack('<I', o) for o in offs) + body
    return out

# ----------------------------------------------------------------- binary XML (manifest)
ANDROID_NS = 'http://schemas.android.com/apk/res/android'
ATTR_IDS = {
    'theme': 0x01010000, 'label': 0x01010001, 'icon': 0x01010002, 'name': 0x01010003, 'exported': 0x01010010,
    'launchMode': 0x0101001d, 'configChanges': 0x0101001f, 'minSdkVersion': 0x0101020c, 'versionCode': 0x0101021b,
    'versionName': 0x0101021c, 'windowSoftInputMode': 0x0101022b, 'targetSdkVersion': 0x01010270, 'allowBackup': 0x01010280,
    'hardwareAccelerated': 0x010102d3,
}
T_REF, T_STR, T_DEC, T_HEX, T_BOOL = 0x01, 0x03, 0x10, 0x11, 0x12

def manifest_xml(icon_id):
    S, I, H, B, R = T_STR, T_DEC, T_HEX, T_BOOL, T_REF
    tree = ('manifest', [(None, 'package', S, PKG), ('a', 'versionCode', I, 25), ('a', 'versionName', S, '0.5.0')], [
        ('uses-sdk', [('a', 'minSdkVersion', I, 24), ('a', 'targetSdkVersion', I, 34)], []),
        ('uses-permission', [('a', 'name', S, 'android.permission.INTERNET')], []),
        ('uses-permission', [('a', 'name', S, 'android.permission.POST_NOTIFICATIONS')], []),
        ('application', [('a', 'label', S, 'EZOFIS'), ('a', 'icon', R, icon_id), ('a', 'allowBackup', B, False), ('a', 'hardwareAccelerated', B, True)], [
            ('activity', [('a', 'name', S, ACT), ('a', 'exported', B, True), ('a', 'theme', R, 0x01030241), ('a', 'launchMode', I, 2),
                          ('a', 'configChanges', H, 0x0DA0 | 0x0200), ('a', 'windowSoftInputMode', H, 0x10)], [
                ('intent-filter', [], [
                    ('action', [('a', 'name', S, 'android.intent.action.MAIN')], []),
                    ('category', [('a', 'name', S, 'android.intent.category.LAUNCHER')], []),
                ]),
            ]),
        ]),
    ])
    # collect strings: attribute names with ids first
    attr_names, others = [], []
    def walk(node):
        tag, attrs, kids = node
        for ns, name, typ, val in attrs:
            if ns == 'a' and name not in attr_names:
                attr_names.append(name)
        for ns, name, typ, val in attrs:
            if ns is None and name not in others:
                others.append(name)
            if typ == T_STR and val not in others:
                others.append(val)
        if tag not in others:
            others.append(tag)
        for k in kids:
            walk(k)
    walk(tree)
    for s in ('android', ANDROID_NS):
        if s not in others:
            others.append(s)
    others = [s for s in others if s not in attr_names]
    strings = attr_names + others
    si = {s: i for i, s in enumerate(strings)}
    chunks = bytearray()
    line = [1]
    def node_hdr(typ, size):
        return struct.pack('<HHIII', typ, 0x10, size, line[0], 0xFFFFFFFF)
    chunks += node_hdr(0x0100, 0x18) + struct.pack('<II', si['android'], si[ANDROID_NS])
    def emit(node):
        tag, attrs, kids = node
        def key(a):
            return ATTR_IDS[a[1]] if a[0] == 'a' else 0xFFFFFFFF
        attrs = sorted(attrs, key=key)
        size = 0x24 + 20 * len(attrs)
        body = struct.pack('<IIHHHHHH', 0xFFFFFFFF, si[tag], 0x14, 0x14, len(attrs), 0, 0, 0)
        for ns, name, typ, val in attrs:
            nsi = si[ANDROID_NS] if ns == 'a' else 0xFFFFFFFF
            if typ == T_STR:
                raw, data = si[val], si[val]
            elif typ == T_BOOL:
                raw, data = 0xFFFFFFFF, 0xFFFFFFFF if val else 0
            else:
                raw, data = 0xFFFFFFFF, val
            body += struct.pack('<IIIHBBI', nsi, si[name], raw, 8, 0, typ, data)
        line[0] += 1
        chunks.extend(node_hdr(0x0102, size) + body)
        for k in kids:
            emit(k)
        line[0] += 1
        chunks.extend(node_hdr(0x0103, 0x18) + struct.pack('<II', 0xFFFFFFFF, si[tag]))
    emit(tree)
    chunks += node_hdr(0x0101, 0x18) + struct.pack('<II', si['android'], si[ANDROID_NS])
    pool = string_pool(strings)
    resmap = struct.pack('<HHI', 0x0180, 8, 8 + 4 * len(attr_names)) + b''.join(struct.pack('<I', ATTR_IDS[n]) for n in attr_names)
    body = pool + resmap + bytes(chunks)
    return struct.pack('<HHI', 0x0003, 8, 8 + len(body)) + body

# ----------------------------------------------------------------- resources.arsc (one drawable)
def resources_arsc(icon_path):
    gpool = string_pool([icon_path])
    type_pool = string_pool(['drawable'])
    key_pool = string_pool(['ic_launcher'])
    spec = struct.pack('<HHIBBHI', 0x0202, 16, 20, 1, 0, 0, 1) + struct.pack('<I', 0)
    config = bytearray(64)
    struct.pack_into('<I', config, 0, 64)
    struct.pack_into('<H', config, 14, 640)        # density xxxhdpi
    struct.pack_into('<H', config, 24, 4)          # sdkVersion v4 (offset 24; 26 is minorVersion)
    type_hdr_size = 20 + 64
    entries = struct.pack('<HHI', 8, 0, 0) + struct.pack('<HBBI', 8, 0, T_STR, 0)
    ttype = struct.pack('<HHIBBHII', 0x0201, type_hdr_size, type_hdr_size + 4 + len(entries), 1, 0, 0, 1, type_hdr_size + 4) + bytes(config) + struct.pack('<I', 0) + entries
    name = PKG.encode('utf-16-le').ljust(256, b'\x00')
    pkg_hdr_size = 288
    type_strings_off = pkg_hdr_size
    key_strings_off = pkg_hdr_size + len(type_pool)
    pkg_body = type_pool + key_pool + spec + ttype
    pkg = struct.pack('<HHII', 0x0200, pkg_hdr_size, pkg_hdr_size + len(pkg_body), 0x7F) + name + struct.pack('<IIIII', type_strings_off, 1, key_strings_off, 1, 0) + pkg_body
    body = gpool + pkg
    return struct.pack('<HHII', 0x0002, 12, 12 + len(body), 1) + body

# ----------------------------------------------------------------- APK
def main(index_html, icon_png, out_apk):
    icon_path = 'res/drawable-xxxhdpi-v4/ic_launcher.png'
    with zipfile.ZipFile(out_apk, 'w') as z:
        def put(name, data, compress=True):
            zi = zipfile.ZipInfo(name, date_time=(2026, 10, 26, 0, 0, 0))
            zi.compress_type = zipfile.ZIP_DEFLATED if compress else zipfile.ZIP_STORED
            if not compress:  # zipalign: stored data must start on a 4-byte boundary (required for targetSdk 30+)
                start = z.fp.tell() + 30 + len(name.encode())
                pad = (-start) % 4
                if pad:
                    pad += 4
                    zi.extra = struct.pack('<HH', 0xD935, pad - 4) + b'\x00' * (pad - 4)
            z.writestr(zi, data)
        put('AndroidManifest.xml', manifest_xml(0x7F010000))
        put('classes.dex', build_dex())
        put('resources.arsc', resources_arsc(icon_path), compress=False)
        put(icon_path, open(icon_png, 'rb').read(), compress=False)
        put('assets/index.html', open(index_html, 'rb').read())
    print('wrote', out_apk)

if __name__ == '__main__':
    main(*sys.argv[1:4])
