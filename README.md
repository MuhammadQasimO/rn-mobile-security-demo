# Mobile Security Demo (React Native)

Production-grade mobile security patterns most React Native apps skip:
native SSL pinning on iOS and Android, HMAC-signed API requests with
timestamp-based replay protection, and a companion verification server.

Built as a reference implementation of the security stack I shipped on
a production fintech mobile app.

## What this demonstrates

- **Custom native SSL pinning** on iOS (Swift) and Android (Kotlin) via
  bridge modules — not a third-party library wrapper, the real thing.
- **HMAC request signing** with timestamp + body — every API request
  carries a cryptographic signature that the server validates before
  trusting the payload.
- **Replay attack prevention** — timestamps outside a tight window get
  rejected, so captured requests can't be re-fired later.
- **Defense in depth** — `react-native-ssl-pinning` runs at the JS layer
  as a fallback in case native pinning is bypassed.
- **Server-side verification** — Node.js + Express middleware that
  validates signatures, timestamps, and body integrity on every request.

## Threat model

This repo defends against:

| Threat | Defense |
|---|---|
| MITM via fake CA on rooted device | Native SSL pinning rejects untrusted certs |
| MITM via rooted device with hooks (Frida, Objection) | HMAC signing — even with TLS intercepted, body tampering breaks the signature |
| Request replay (capture and re-fire) | Timestamp window validation (default 60s) |
| Body tampering | HMAC covers full body — any change invalidates signature |
| Compromised CA / cert pinning bypass | Defense-in-depth: signing happens on top of TLS, so even broken TLS doesn't leak intent |

Out of scope: device-level malware with full root access (no client-side
security defends against an attacker who owns the device).

Full attacker-tier mapping in [`docs/threat-model.md`](docs/threat-model.md).
Concrete attack walkthroughs in [`docs/attack-scenarios.md`](docs/attack-scenarios.md).

## Quick start

```bash
# Run the server
cd server
npm install
npm run dev   # starts on http://localhost:3000

# Run the mobile app (in a separate terminal)
cd mobile
npm install
cd ios && pod install && cd ..    # macOS only
npx react-native run-android      # or run-ios on macOS
```

Try the **Attack** tab in the app to simulate tampering — the server
rejects the request and the app surfaces the rejection reason.

## How HMAC signing works here

Every outgoing request from the app:

1. Builds a canonical string: `timestamp \n method \n path \n sha256(body)`
2. Computes HMAC-SHA256 with the shared secret loaded from the keychain
3. Sends headers: `X-Signature`, `X-Timestamp`

Server middleware:

1. Reads `X-Signature` and `X-Timestamp`
2. Rejects if timestamp is more than 60 seconds off server clock (`stale_timestamp`)
3. Recomputes the canonical string from the actual request body
4. Compares HMACs in constant time (prevents timing attacks)
5. Rejects on mismatch (`bad_signature`)

Implementation:
- [`server/src/middleware/verifySignature.ts`](server/src/middleware/verifySignature.ts)
- [`mobile/src/api/signing.ts`](mobile/src/api/signing.ts)

## How native SSL pinning works here

### iOS (Swift)

[`SSLPinningModule.swift`](mobile/ios/SSLPinningModule.swift) bridges a
native `URLSession` delegate to JS. The delegate intercepts every TLS
handshake, walks the cert chain, computes SPKI SHA-256, and compares
against a pinned hash set bundled with the app binary. Mismatched certs
fail the handshake hard — the request never reaches the application
layer.

### Android (Kotlin)

[`SSLPinningModule.kt`](mobile/android/app/src/main/java/com/rnsecuredemo/SSLPinningModule.kt)
bridges OkHttp's `CertificatePinner` to JS. Same model: pinned hashes
are baked into the build, OkHttp's TLS layer rejects unpinned certs
before any HTTP work happens.

The JS layer falls back to `react-native-ssl-pinning` for requests that
need to go through `fetch` rather than the native bridge, giving
defense in depth. See
[`mobile/src/api/pinning.ts`](mobile/src/api/pinning.ts).

## Repo layout

```
rn-mobile-security-demo/
├── mobile/                          # React Native app
│   ├── ios/SSLPinningModule.swift
│   ├── android/.../SSLPinningModule.kt
│   ├── src/api/                    # signing, client, secret bootstrap, pinning
│   ├── src/screens/                # Home + Attack demo screens
│   └── App.tsx
├── server/                          # Verification backend
│   ├── src/middleware/verifySignature.ts
│   ├── src/routes/secure.ts
│   └── src/__tests__/
├── docs/
│   ├── threat-model.md
│   ├── attack-scenarios.md
│   └── architecture-diagram.md      # replace with PNG from excalidraw
└── docker-compose.yml
```

## Notes on production deployment

Things this repo does not cover that you'd need in production:

- **Key rotation** — shared HMAC secrets should rotate. Add a key-ID
  header and a server-side keystore.
- **Asymmetric signing for higher trust** — for very sensitive requests,
  use Ed25519 signatures with the public key embedded server-side.
  HMAC is fine for symmetric integrity; signatures give non-repudiation.
- **Certificate rotation** — pinned certs expire. Ship a backup pin and
  a remote kill-switch mechanism for emergency rotation.
- **Secret provisioning** — the demo seeds a dev secret on first launch
  and stores it in the keychain. Production should bootstrap a
  per-install secret via device attestation, not ship the secret in the
  binary at all.
- **Server clock drift** — use NTP, and consider widening the timestamp
  window during rollout.

## Verification notes

- Server tests: `cd server && npm test` — exercises the middleware with
  legit, missing-header, stale-timestamp, tampered-body, and malformed
  cases.
- Android: runnable from the included scaffolding; pins need to be
  computed against your actual server cert.
- iOS: code-complete; build and run verified on macOS separately (this
  repo was authored on Windows).

## Stack

`React Native` · `TypeScript` · `Swift` · `Kotlin` · `Node.js` · `Express` · `HMAC-SHA256`

## License

MIT — use it, learn from it, adapt it.
