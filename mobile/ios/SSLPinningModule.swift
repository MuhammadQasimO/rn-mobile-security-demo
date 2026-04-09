import Foundation
import CommonCrypto
import React

/// SHA-256 of the server certificate's Subject Public Key Info (SPKI), base64-encoded.
/// Compute for your server with:
///   openssl s_client -connect host:443 -servername host < /dev/null \
///     | openssl x509 -pubkey -noout \
///     | openssl pkey -pubin -outform der \
///     | openssl dgst -sha256 -binary | base64
private let pinnedSpkiSha256: Set<String> = [
  "REPLACE_WITH_BASE64_SPKI_PIN",
  "REPLACE_WITH_BACKUP_PIN"
]

@objc(SSLPinningModule)
final class SSLPinningModule: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc(request:resolver:rejecter:)
  func request(_ options: NSDictionary,
               resolver resolve: @escaping RCTPromiseResolveBlock,
               rejecter reject: @escaping RCTPromiseRejectBlock) {

    guard let urlString = options["url"] as? String, let url = URL(string: urlString) else {
      reject("invalid_url", "missing or invalid url", nil)
      return
    }

    var req = URLRequest(url: url)
    req.httpMethod = (options["method"] as? String) ?? "GET"
    if let headers = options["headers"] as? [String: String] {
      for (k, v) in headers { req.setValue(v, forHTTPHeaderField: k) }
    }
    if let body = options["body"] as? String { req.httpBody = body.data(using: .utf8) }

    let delegate = PinnedSessionDelegate()
    let session = URLSession(configuration: .ephemeral, delegate: delegate, delegateQueue: nil)
    let task = session.dataTask(with: req) { data, response, error in
      session.finishTasksAndInvalidate()
      if let error = error as NSError? {
        if error.code == NSURLErrorCancelled {
          reject("pinning_failed", "TLS pin mismatch", error)
        } else {
          reject("network_error", error.localizedDescription, error)
        }
        return
      }
      let http = response as? HTTPURLResponse
      let body = data.flatMap { String(data: $0, encoding: .utf8) } ?? ""
      resolve([
        "status": http?.statusCode ?? 0,
        "body": body
      ])
    }
    task.resume()
  }
}

private final class PinnedSessionDelegate: NSObject, URLSessionDelegate {

  func urlSession(_ session: URLSession,
                  didReceive challenge: URLAuthenticationChallenge,
                  completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {

    guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
          let serverTrust = challenge.protectionSpace.serverTrust else {
      completionHandler(.cancelAuthenticationChallenge, nil)
      return
    }

    var error: CFError?
    let trusted = SecTrustEvaluateWithError(serverTrust, &error)
    guard trusted else {
      completionHandler(.cancelAuthenticationChallenge, nil)
      return
    }

    let count = SecTrustGetCertificateCount(serverTrust)
    for i in 0..<count {
      guard let cert = SecTrustGetCertificateAtIndex(serverTrust, i),
            let publicKey = SecCertificateCopyKey(cert),
            let publicKeyData = SecKeyCopyExternalRepresentation(publicKey, nil) as Data? else {
        continue
      }
      let pin = sha256Base64(publicKeyData)
      if pinnedSpkiSha256.contains(pin) {
        completionHandler(.useCredential, URLCredential(trust: serverTrust))
        return
      }
    }

    completionHandler(.cancelAuthenticationChallenge, nil)
  }

  private func sha256Base64(_ data: Data) -> String {
    var hash = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
    data.withUnsafeBytes { _ = CC_SHA256($0.baseAddress, CC_LONG(data.count), &hash) }
    return Data(hash).base64EncodedString()
  }
}
