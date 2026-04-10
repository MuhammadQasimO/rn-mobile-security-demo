# Android Native Module — SSLPinningModule

Two files make up the bridge:

- `SSLPinningModule.kt` — Kotlin implementation backed by `OkHttpClient`
  with a `CertificatePinner`.
- `SSLPinningPackage.kt` — `ReactPackage` that exposes the module to JS.

## Wiring it into the app

In `MainApplication.kt` (or `MainApplication.java`) add `SSLPinningPackage()`
to the package list returned by `getPackages()`:

```kotlin
override fun getPackages(): List<ReactPackage> =
    PackageList(this).packages.apply {
        add(SSLPinningPackage())
    }
```

The OkHttp dependency comes from React Native by default (used internally
by the JS `fetch` polyfill), so no extra Gradle dependencies are required.

## Replacing the pins

Compute SPKI SHA-256 pins for your server and replace the placeholder
constants in `SSLPinningModule.kt`:

```
openssl s_client -connect api.example.com:443 -servername api.example.com < /dev/null \
  | openssl x509 -pubkey -noout \
  | openssl pkey -pubin -outform der \
  | openssl dgst -sha256 -binary | base64
```

Always ship a backup pin so a cert rotation does not brick the app.

## Verification

```
cd mobile
npx react-native run-android
```

Test against an emulator with the server reachable at `http://10.0.2.2:3000`
(the special host that maps to the host machine's `localhost`).
