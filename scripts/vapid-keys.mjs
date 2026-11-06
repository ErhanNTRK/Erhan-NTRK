/* Web Push için VAPID anahtar çifti üretir.  Kullanım:  node scripts/vapid-keys.mjs
   Çıktıdaki değerleri Cloudflare Worker ayarlarına gir (docs/PUSH-KURULUM.md).
   PRIVATE değeri gizli tut; repoya/sohbete yapıştırma. */
import { webcrypto as crypto } from 'node:crypto';

const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
const b64u = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

console.log('VAPID_PUBLIC (Text):');
console.log(b64u(raw));
console.log('\nVAPID_PRIVATE_JWK (Secret):');
console.log(JSON.stringify(jwk));
