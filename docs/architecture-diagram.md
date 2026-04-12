# Architecture Diagram

> Replace this file with `architecture-diagram.png` exported from
> [excalidraw.com](https://excalidraw.com). The README links to the PNG.

## What to draw

```
+----------------+      pinned TLS       +-------------------+
|                |  ───────────────────► |                   |
|  Mobile app    |                       |  Reverse proxy    |
|  (RN + TS)     |   X-Signature         |  (TLS terminates) |
|                |   X-Timestamp         |                   |
|  ┌──────────┐  |                       +---------+---------+
|  │ Native   │  |                                 │
|  │ pinning  │  |                                 │ HMAC-signed
|  │ (Swift / │  |                                 │ headers + body
|  │  Kotlin) │  |                                 ▼
|  └──────────┘  |                       +-------------------+
|  ┌──────────┐  |                       |                   |
|  │ HMAC     │  |                       |  Verify           |
|  │ signing  │  |                       |  signature        |
|  │ (CryptoJS│  |                       |  middleware       |
|  │  + KC)   │  |                       |                   |
|  └──────────┘  |                       +---------+---------+
+----------------+                                 │
                                                   ▼
                                          +-------------------+
                                          | /secure/echo      |
                                          | (only reached if  |
                                          |  signature valid) |
                                          +-------------------+
```

## Key points the diagram should make obvious

1. **Pinning is enforced at the TLS layer**, before any HTTP body is sent.
2. **Signing is at the HTTP layer**, on top of TLS. Both are independent
   defenses — breaking one does not break the other.
3. **The proxy / CDN terminates TLS** but cannot read the HMAC secret, so
   the signature is still verified at the application server.
4. The keychain icon next to the signing block makes it explicit that
   the secret lives in the OS secure enclave, not in JS-readable memory.

## Export instructions

1. Open https://excalidraw.com.
2. Reproduce the diagram above with shapes and arrows.
3. Add the color coding: green for pinning, blue for signing, red for the
   "without these, attacker wins" callouts.
4. Export as PNG, save as `docs/architecture-diagram.png`, then delete this
   placeholder Markdown file (or keep both — the README links to the PNG
   regardless).
