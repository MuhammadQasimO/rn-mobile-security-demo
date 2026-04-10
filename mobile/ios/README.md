# iOS Native Module — SSLPinningModule

Two files make up the bridge:

- `SSLPinningModule.swift` — Swift implementation with a `URLSessionDelegate`
  that pins on SPKI SHA-256.
- `SSLPinningModule.m` — Objective-C declaration using `RCT_EXTERN_MODULE`
  so React Native sees `request(options, resolver, rejecter)`.

## Adding to your Xcode project

1. Drag both files into the iOS app target group in Xcode (do NOT copy —
   add as references).
2. When prompted, accept the bridging header creation if the target does
   not already have one.
3. Ensure both files have the app target checked in the File Inspector.
4. Compute the SPKI pin for your server and replace the placeholder
   constants in `SSLPinningModule.swift`:

   ```
   openssl s_client -connect api.example.com:443 -servername api.example.com < /dev/null \
     | openssl x509 -pubkey -noout \
     | openssl pkey -pubin -outform der \
     | openssl dgst -sha256 -binary | base64
   ```

5. Always ship at least one backup pin — when the primary cert rotates
   without the app being updated, the backup keeps the app usable until
   the next release.

## Verification (macOS only)

This Windows working copy contains the code but is not built here. On
a macOS machine with Xcode 15+:

```
cd mobile/ios
pod install
xcodebuild -workspace rnMobileSecurityDemo.xcworkspace -scheme rnMobileSecurityDemo -configuration Debug -sdk iphonesimulator -derivedDataPath build
```

Or just `npx react-native run-ios` from the `mobile/` directory.
