// Makes a VAPID key pair for the push server. Run once:  node scripts/gen-vapid.mjs
import { generateVapidKeys } from '../src/webpush.js';

const { publicKey, privateJwk } = await generateVapidKeys();
console.log('VAPID_PUBLIC_KEY (public, safe to share):\n' + publicKey + '\n');
console.log('VAPID_PRIVATE_JWK (SECRET — paste into `npx wrangler secret put VAPID_PRIVATE_JWK`):\n' + JSON.stringify(privateJwk));
