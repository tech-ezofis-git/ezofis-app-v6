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
def build_dex():
    CLS = 'Lcom/ezofis/mobile/MainActivity;'
    ACTV = 'Landroid/app/Activity;'
    WV = 'Landroid/webkit/WebView;'
    WS = 'Landroid/webkit/WebSettings;'
    WIN = 'Landroid/view/Window;'
    # protos: (return, (params...))
    protos_needed = {
        'V': ('V', ()), 'V_Bundle': ('V', ('Landroid/os/Bundle;',)), 'V_View': ('V', ('Landroid/view/View;',)),
        'Window': (WIN, ()), 'V_I': ('V', ('I',)), 'V_Context': ('V', ('Landroid/content/Context;',)),
        'WS': (WS, ()), 'V_String': ('V', ('Ljava/lang/String;',)), 'Z': ('Z', ()), 'V_Z': ('V', ('Z',)),
    }
    methods_needed = {
        'act_init': (ACTV, '<init>', 'V'), 'act_back': (ACTV, 'onBackPressed', 'V'), 'act_create': (ACTV, 'onCreate', 'V_Bundle'),
        'act_setcv': (ACTV, 'setContentView', 'V_View'), 'act_win': (ACTV, 'getWindow', 'Window'),
        'win_sbc': (WIN, 'setStatusBarColor', 'V_I'),
        'wv_init': (WV, '<init>', 'V_Context'), 'wv_settings': (WV, 'getSettings', 'WS'), 'wv_load': (WV, 'loadUrl', 'V_String'),
        'wv_can': (WV, 'canGoBack', 'Z'), 'wv_back': (WV, 'goBack', 'V'),
        'ws_js': (WS, 'setJavaScriptEnabled', 'V_Z'), 'ws_dom': (WS, 'setDomStorageEnabled', 'V_Z'), 'ws_file': (WS, 'setAllowFileAccess', 'V_Z'), 'ws_univ': (WS, 'setAllowUniversalAccessFromFileURLs', 'V_Z'),
        'me_init': (CLS, '<init>', 'V'), 'me_back': (CLS, 'onBackPressed', 'V'), 'me_create': (CLS, 'onCreate', 'V_Bundle'),
    }
    field = (CLS, 'web', WV)
    url = 'file:///android_asset/index.html'

    shorty = lambda r, ps: ''.join('L' if t.startswith('L') or t.startswith('[') else t for t in (r,) + ps)
    types = set([CLS, ACTV, field[2]])
    for r, ps in protos_needed.values():
        types.add(r); types.update(ps)
    for c, n, p in methods_needed.values():
        types.add(c)
    strings = set(types) | {url, field[1]}
    for r, ps in protos_needed.values():
        strings.add(shorty(r, ps))
    for c, n, p in methods_needed.values():
        strings.add(n)
    strings = sorted(strings, key=lambda s: s.encode('utf-16-be'))
    sidx = {s: i for i, s in enumerate(strings)}
    types = sorted(types, key=lambda t: sidx[t])
    tidx = {t: i for i, t in enumerate(types)}
    proto_list = sorted(set(protos_needed.values()), key=lambda p: (tidx[p[0]], [tidx[x] for x in p[1]]))
    pidx = {p: i for i, p in enumerate(proto_list)}
    pkey = {k: pidx[v] for k, v in protos_needed.items()}
    meth_list = sorted(set(methods_needed.values()), key=lambda m: (tidx[m[0]], sidx[m[1]], pkey[m[2]]))
    midx = {m: i for i, m in enumerate(meth_list)}
    M = {k: midx[v] for k, v in methods_needed.items()}
    FIELD = 0

    def u(*units):
        return list(units)
    # --- bytecode (code units)
    init_code = u(0x1070, M['act_init'], 0x0000, 0x000e)
    create_code = (
        u(0x206f, M['act_create'], 0x0043)            # invoke-super {p0,p1} Activity.onCreate
        + u(0x0022, tidx[WV])                          # new-instance v0, WebView
        + u(0x2070, M['wv_init'], 0x0030)             # invoke-direct {v0,p0} WebView.<init>(Context)
        + u(0x305b, FIELD)                             # iput-object v0, p0, web
        + u(0x106e, M['wv_settings'], 0x0000)          # invoke-virtual {v0} getSettings
        + u(0x010c)                                    # move-result-object v1
        + u(0x1212)                                    # const/4 v2, 1
        + u(0x206e, M['ws_js'], 0x0021)               # setJavaScriptEnabled(true)
        + u(0x206e, M['ws_dom'], 0x0021)              # setDomStorageEnabled(true)
        + u(0x206e, M['ws_file'], 0x0021)             # setAllowFileAccess(true)
        + u(0x206e, M['ws_univ'], 0x0021)             # setAllowUniversalAccessFromFileURLs(true): lets the bundled page call cloud.ezofis.com
        + u(0x011a, sidx[url])                         # const-string v1, url
        + u(0x206e, M['wv_load'], 0x0010)             # loadUrl(v1)
        + u(0x206e, M['act_setcv'], 0x0003)           # setContentView(v0)
        + u(0x106e, M['act_win'], 0x0003)             # getWindow()
        + u(0x010c)                                    # move-result-object v1
        + u(0x0214, STATUS_BAR & 0xFFFF, STATUS_BAR >> 16)  # const v2, color
        + u(0x206e, M['win_sbc'], 0x0021)             # setStatusBarColor(v2)
        + u(0x000e)                                    # return-void
    )
    back_code = (
        u(0x2054, FIELD)                               # iget-object v0, p0, web
        + u(0x106e, M['wv_can'], 0x0000)               # canGoBack
        + u(0x010a)                                    # move-result v1
        + u(0x0138, 6)                                 # if-eqz v1, +6
        + u(0x106e, M['wv_back'], 0x0000)              # goBack
        + u(0x000e)                                    # return-void
        + u(0x106f, M['act_back'], 0x0002)             # invoke-super {p0} onBackPressed
        + u(0x000e)
    )
    codes = {  # method key -> (registers, ins, outs, units)
        'me_init': (1, 1, 1, init_code),
        'me_create': (5, 2, 2, create_code),
        'me_back': (3, 1, 1, back_code),
    }

    # --- layout
    HEADER = 0x70
    n_str, n_type, n_proto, n_field, n_meth, n_class = len(strings), len(types), len(proto_list), 1, len(meth_list), 1
    off = HEADER
    string_ids_off = off; off += 4 * n_str
    type_ids_off = off; off += 4 * n_type
    proto_ids_off = off; off += 12 * n_proto
    field_ids_off = off; off += 8 * n_field
    method_ids_off = off; off += 8 * n_meth
    class_defs_off = off; off += 32 * n_class
    data_off = off

    data = bytearray()
    def here():
        return data_off + len(data)

    # type lists
    typelist_off = {}
    tl_start = None
    for p in proto_list:
        if p[1] and p[1] not in typelist_off:
            align(data)
            if tl_start is None:
                tl_start = here()
            typelist_off[p[1]] = here()
            data += struct.pack('<I', len(p[1]))
            for t in p[1]:
                data += struct.pack('<H', tidx[t])
    n_typelists = len(typelist_off)
    # code items
    align(data)
    code_start = here()
    code_off = {}
    for key in ('me_init', 'me_create', 'me_back'):
        align(data)
        regs, ins, outs, units = codes[key]
        code_off[key] = here()
        data += struct.pack('<HHHHII', regs, ins, outs, 0, 0, len(units))
        for un in units:
            data += struct.pack('<H', un)
    # string data
    str_data_start = here()
    str_data_off = []
    for s in strings:
        str_data_off.append(here())
        data += uleb(len(s)) + mutf8(s) + b'\x00'
    # class data
    class_data_off = here()
    me_create, me_back, me_init = M['me_create'], M['me_back'], M['me_init']
    virtual = sorted([(me_back, 0x1, code_off['me_back']), (me_create, 0x4, code_off['me_create'])])
    cd = bytearray()
    cd += uleb(0) + uleb(1) + uleb(1) + uleb(len(virtual))
    cd += uleb(FIELD) + uleb(0x2)                               # private WebView web
    cd += uleb(me_init) + uleb(0x10001) + uleb(code_off['me_init'])  # public constructor <init>
    prev = 0
    for i, (mi, acc, co) in enumerate(virtual):
        cd += uleb(mi - prev if i else mi) + uleb(acc) + uleb(co)
        prev = mi
    data += cd
    # map list
    align(data)
    map_off = here()
    items = [
        (0x0000, 1, 0), (0x0001, n_str, string_ids_off), (0x0002, n_type, type_ids_off), (0x0003, n_proto, proto_ids_off),
        (0x0004, n_field, field_ids_off), (0x0005, n_meth, method_ids_off), (0x0006, n_class, class_defs_off),
    ]
    if n_typelists:
        items.append((0x1001, n_typelists, tl_start))
    items += [(0x2001, 3, code_start), (0x2002, n_str, str_data_start), (0x2000, 1, class_data_off)]
    items.append((0x1000, 1, map_off))
    items.sort(key=lambda x: x[2])
    data += struct.pack('<I', len(items))
    for t, sz, o in items:
        data += struct.pack('<HHII', t, 0, sz, o)

    # --- index sections
    idx = bytearray()
    for o in str_data_off:
        idx += struct.pack('<I', o)
    for t in types:
        idx += struct.pack('<I', sidx[t])
    for p in proto_list:
        idx += struct.pack('<III', sidx[shorty(*p)], tidx[p[0]], typelist_off.get(p[1], 0) if p[1] else 0)
    idx += struct.pack('<HHI', tidx[field[0]], tidx[field[2]], sidx[field[1]])
    for c, n, p in meth_list:
        idx += struct.pack('<HHI', tidx[c], pkey[p], sidx[n])
    idx += struct.pack('<IIIIIIII', tidx[CLS], 0x1, tidx[ACTV], 0, 0xFFFFFFFF, 0, class_data_off, 0)
    assert HEADER + len(idx) == data_off

    file_size = data_off + len(data)
    hdr = bytearray(b'dex\n035\x00')
    hdr += b'\x00' * 4 + b'\x00' * 20
    hdr += struct.pack('<IIIIII', file_size, HEADER, 0x12345678, 0, 0, map_off)
    hdr += struct.pack('<II', n_str, string_ids_off) + struct.pack('<II', n_type, type_ids_off)
    hdr += struct.pack('<II', n_proto, proto_ids_off) + struct.pack('<II', n_field, field_ids_off)
    hdr += struct.pack('<II', n_meth, method_ids_off) + struct.pack('<II', n_class, class_defs_off)
    hdr += struct.pack('<II', len(data), data_off)
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
    tree = ('manifest', [(None, 'package', S, PKG), ('a', 'versionCode', I, 15), ('a', 'versionName', S, '0.4.0')], [
        ('uses-sdk', [('a', 'minSdkVersion', I, 24), ('a', 'targetSdkVersion', I, 34)], []),
        ('uses-permission', [('a', 'name', S, 'android.permission.INTERNET')], []),
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
