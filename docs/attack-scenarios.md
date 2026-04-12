# Attack Scenarios

Three concrete attacks, what the attacker does, and how this stack
defeats them. The AttackScreen in the app exercises each one against
the local server.

## 1. MITM with a custom CA (proxy interception)

**Attacker setup.** Install mitmproxy or Burp Suite. Trust their CA on
the device. Configure the device proxy to route through the tool.

**Without pinning.** The proxy presents a cert signed by its trusted CA.
The OS trust store validates it. The app sees plaintext requests and
responses. Game over.

**With native pinning.** The TLS handshake reaches `urlSession(_:didReceive:)`
on iOS or OkHttp's `CertificatePinner` on Android. Both compute the SHA-256
of the server's public key (SPKI) and compare against pins compiled into
the binary. The proxy's cert chains to a different key, the hash mismatches,
the handshake fails. The app never sends the request.

**What if the attacker also disables pinning?** On a jailbroken device with
Frida, they can patch the pin check out. This is where HMAC signing kicks
in: even with plaintext on the wire, any modification to the body breaks
the signature, and any replay outside the 60-second window is rejected.

## 2. Replay attack

**Attacker setup.** Capture a request the user sent earlier (e.g., a
"transfer $100" payload). The HMAC is valid. The body is valid. The
attacker re-fires the same packet later.

**Without timestamp window.** The server accepts. The attacker has just
replayed the transfer.

**With timestamp window.** Each signature is computed over a `timestamp`
header. The server checks `|now - timestamp| < 60_000ms`. A captured
request older than 60 seconds is rejected with `stale_timestamp`. The
window is configurable — tighter for higher-stakes operations.

**Why not also use a nonce?** A nonce + replay-cache would catch replays
inside the 60-second window too. This repo doesn't ship that — the
timestamp window plus short window size is the 80/20 defense. For very
high-value actions (account closure, high-value transfers) add a nonce
and a 5-minute server-side cache.

## 3. Body tampering

**Attacker setup.** The attacker has compromised the network path
(scenario 1) AND defeated TLS pinning somehow. They want to modify the
request body — for example, change `amount: 100` to `amount: 999999`.

**Without HMAC.** TLS gives them no help — the modified body simply gets
encrypted with the attacker's session keys. The server sees the modified
body and processes it.

**With HMAC.** The signature covers `sha256(body)`. Any change to the body,
even a single byte, makes the recomputed hash differ. The server's
`timingSafeEqual` compare fails. Response is `401 bad_signature`. The
attacker can't forge a valid signature because they don't have the secret.

## Trying the attacks against this stack

```bash
cd server && npm install && npm run dev
# in another terminal:
cd mobile && npm install && npx react-native run-android
```

In the app, switch to the **Attack** tab. Each button triggers one of the
attacks against the running server. The ResultCard renders the 401 and
the exact server error code so you can see which check fired.

For a more realistic test, run the server behind mitmproxy on a real
device and try to intercept. The pinning check should kill the handshake
before any request payload is sent.
