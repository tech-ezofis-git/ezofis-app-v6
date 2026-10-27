#!/usr/bin/env python3
"""Sign an APK with APK Signature Scheme v2 (RSA 2048, SHA-256). Usage: sign_v2.py in.apk out.apk keydir"""
import datetime, hashlib, os, struct, sys
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.x509.oid import NameOID

ALG_RSA_PKCS1_SHA256 = 0x0103
V2_ID = 0x7109871A
MAGIC = b'APK Sig Block 42'

def lp(b):
    return struct.pack('<I', len(b)) + b

def load_or_make_key(d):
    kp, cp = os.path.join(d, 'ezofis-test-key.pem'), os.path.join(d, 'ezofis-test-cert.der')
    if os.path.exists(kp) and os.path.exists(cp):
        key = serialization.load_pem_private_key(open(kp, 'rb').read(), None)
        return key, open(cp, 'rb').read()
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, 'EZOFIS Mobile Test'), x509.NameAttribute(NameOID.ORGANIZATION_NAME, 'EZOFIS Inc.'), x509.NameAttribute(NameOID.COUNTRY_NAME, 'CA')])
    now = datetime.datetime(2026, 10, 1, tzinfo=datetime.timezone.utc)
    cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key())
            .serial_number(x509.random_serial_number()).not_valid_before(now).not_valid_after(now + datetime.timedelta(days=9000))
            .sign(key, hashes.SHA256()))
    open(kp, 'wb').write(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
    der = cert.public_bytes(serialization.Encoding.DER)
    open(cp, 'wb').write(der)
    return key, der

def find_eocd(data):
    i = data.rfind(b'PK\x05\x06')
    if i < 0:
        raise SystemExit('no EOCD')
    return i

def chunk_digest(sections):
    chunks = []
    for sec in sections:
        for i in range(0, len(sec), 1 << 20):
            c = sec[i:i + (1 << 20)]
            chunks.append(hashlib.sha256(b'\xa5' + struct.pack('<I', len(c)) + c).digest())
    return hashlib.sha256(b'\x5a' + struct.pack('<I', len(chunks)) + b''.join(chunks)).digest()

def main(src, dst, keydir):
    data = open(src, 'rb').read()
    eocd_off = find_eocd(data)
    cd_size, cd_off = struct.unpack('<II', data[eocd_off + 12:eocd_off + 20])
    entries, cd, eocd = data[:cd_off], data[cd_off:cd_off + cd_size], data[eocd_off:]
    digest = chunk_digest([entries, cd, eocd])  # EOCD's CD offset already equals the signing block offset
    key, cert = load_or_make_key(keydir)
    pub = key.public_key().public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
    digests = lp(lp(struct.pack('<I', ALG_RSA_PKCS1_SHA256) + lp(digest)))
    signed_data = digests + lp(lp(cert)) + lp(b'')
    sig = key.sign(signed_data, padding.PKCS1v15(), hashes.SHA256())
    signer = lp(signed_data) + lp(lp(struct.pack('<I', ALG_RSA_PKCS1_SHA256) + lp(sig))) + lp(pub)
    value = lp(lp(signer))
    pair = struct.pack('<Q', 4 + len(value)) + struct.pack('<I', V2_ID) + value
    block_size = len(pair) + 8 + 16
    block = struct.pack('<Q', block_size) + pair + struct.pack('<Q', block_size) + MAGIC
    new_eocd = bytearray(eocd)
    struct.pack_into('<I', new_eocd, 16, cd_off + len(block))
    open(dst, 'wb').write(entries + block + cd + bytes(new_eocd))
    print('signed', dst, 'block', len(block))

if __name__ == '__main__':
    main(*sys.argv[1:4])
