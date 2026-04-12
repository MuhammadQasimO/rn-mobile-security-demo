# Threat Model

This document enumerates the threats the app defends against, the
defenses in place, and the threats explicitly considered out of scope.

## Attacker capability tiers

| Tier | Capability | Real-world example |
|---|---|---|
| 1 | Passive network observer | Coffee-shop Wi-Fi sniffer |
| 2 | Active MITM with valid CA-signed cert for the target host | Compromised intermediate CA, hostile corporate proxy |
| 3 | Active MITM with a user-installed custom CA on the device | Burp Suite / mitmproxy with the CA trusted by the user |
| 4 | Rooted/jailbroken device, no instrumentation hooks | Bypass-tool kits, factory-flashed images |
| 5 | Rooted device + runtime instrumentation (Frida, Objection) | Targeted reverse-engineering attack |
| 6 | Full device compromise (malware with root, kernel exploits) | State-level adversary |

## Threats and defenses

| Threat | Tier | Defense in this repo |
|---|---|---|
| Eavesdropping plaintext requests | 1 | TLS (standard) |
| MITM with valid public CA cert | 2 | **Native SSL pinning** rejects any cert whose SPKI hash is not in the bundled allowlist |
| MITM with user-installed CA | 3 | **Native SSL pinning** — same mechanism, doesn't trust the OS trust store |
| Stripping signature headers in transit | 2–3 | Server rejects any request without `X-Signature` / `X-Timestamp` |
| Body tampering after capture | 2–3 | **HMAC signature** covers timestamp + method + path + body hash; any change invalidates it |
| Request replay (capture and re-fire) | 1–3 | **Timestamp window** (default 60s) — old timestamps rejected even with valid signatures |
| Pin bypass via SSL library hook on a jailbroken device | 5 | Native pinning broken → request reaches server but **HMAC still required**; signing is defense in depth over TLS |
| Stolen secret from a compromised device | 5–6 | Out of scope at the client level — covered by short-lived per-install secrets and server-side device revocation in production |
| Static binary analysis recovering the dev seed secret | 4 | Out of scope for this demo. README documents the production pattern: ship without a baked-in secret, enroll the device at first launch, store the per-install secret in Keychain/Keystore |

## Out of scope

These are real concerns that **this repository does not try to defend against**:

- **Device-level malware with root.** No client-side measure can fully protect
  against a compromised OS. Strong defenses move to the server (anomaly
  detection, per-device behavioral models, step-up authentication on risky
  actions).
- **Targeted RE/instrumentation by a determined attacker.** Frida and similar
  tools can patch out any client-side check given enough time. The mitigation
  is making the attack expensive and recoverable, not impossible — short
  secret lifetimes, attestation, server-side fraud monitoring.
- **Phishing / social engineering.** Out of band of the network layer
  entirely.

## Why both pinning AND signing?

A senior reviewer's first instinct is: "TLS already gives you integrity —
why HMAC on top?" Two reasons:

1. **Pinning bypass on rooted devices is a real, frequent attack.** If the
   pin check is the only defense and an attacker hooks `SecTrustEvaluate`
   (iOS) or installs a system CA after root (Android), they see plaintext.
   With HMAC on top, the body is still tamper-evident on the server.
2. **TLS is point-to-point; signing is end-to-end.** Any reverse proxy, CDN,
   or service mesh in the path terminates and re-issues TLS. The HMAC
   travels with the request and is verified by the application that finally
   handles it. This matters when integrity claims are needed past the edge.
