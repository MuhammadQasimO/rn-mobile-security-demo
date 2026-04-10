package com.rnsecuredemo

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import okhttp3.CertificatePinner
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.net.URL
import javax.net.ssl.SSLPeerUnverifiedException

class SSLPinningModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "SSLPinningModule"

    @ReactMethod
    fun request(options: ReadableMap, promise: Promise) {
        val urlString = options.getString("url")
        if (urlString.isNullOrEmpty()) {
            promise.reject("invalid_url", "missing url")
            return
        }

        val host = try {
            URL(urlString).host
        } catch (e: Exception) {
            promise.reject("invalid_url", e.message, e)
            return
        }

        val pinner = CertificatePinner.Builder()
            // Compute pins with:
            // openssl s_client -connect host:443 -servername host < /dev/null \
            //   | openssl x509 -pubkey -noout \
            //   | openssl pkey -pubin -outform der \
            //   | openssl dgst -sha256 -binary | base64
            .add(host, "sha256/REPLACE_WITH_BASE64_SPKI_PIN")
            .add(host, "sha256/REPLACE_WITH_BACKUP_PIN")
            .build()

        val client = OkHttpClient.Builder()
            .certificatePinner(pinner)
            .build()

        val method = options.getString("method") ?: "GET"
        val builder = Request.Builder().url(urlString)

        options.getMap("headers")?.let { headers ->
            val iter = headers.keySetIterator()
            while (iter.hasNextKey()) {
                val key = iter.nextKey()
                headers.getString(key)?.let { builder.addHeader(key, it) }
            }
        }

        val body = options.getString("body")
        val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
        when (method.uppercase()) {
            "GET" -> builder.get()
            "DELETE" -> builder.delete(body?.toRequestBody(mediaType))
            else -> builder.method(method.uppercase(), (body ?: "").toRequestBody(mediaType))
        }

        Thread {
            try {
                client.newCall(builder.build()).execute().use { response ->
                    val payload = Arguments.createMap().apply {
                        putInt("status", response.code)
                        putString("body", response.body?.string() ?: "")
                    }
                    promise.resolve(payload)
                }
            } catch (e: SSLPeerUnverifiedException) {
                promise.reject("pinning_failed", e.message ?: "TLS pin mismatch", e)
            } catch (e: Exception) {
                promise.reject("network_error", e.message ?: "unknown", e)
            }
        }.start()
    }
}
