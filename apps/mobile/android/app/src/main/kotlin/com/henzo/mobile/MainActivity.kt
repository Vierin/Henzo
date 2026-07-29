package com.henzo.mobile

import com.android.installreferrer.api.InstallReferrerClient
import com.android.installreferrer.api.InstallReferrerStateListener
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.util.concurrent.atomic.AtomicReference

class MainActivity : FlutterActivity() {
    private val channelName = "com.henzo.mobile/install_referrer"
    private val cachedReferrer = AtomicReference<String?>(null)

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName)
            .setMethodCallHandler { call, result ->
                if (call.method != "getReferrer") {
                    result.notImplemented()
                    return@setMethodCallHandler
                }
                val cached = cachedReferrer.get()
                if (cached != null) {
                    result.success(cached)
                    return@setMethodCallHandler
                }
                fetchInstallReferrer(result)
            }
    }

    private fun fetchInstallReferrer(result: MethodChannel.Result) {
        val client = InstallReferrerClient.newBuilder(this).build()
        client.startConnection(
            object : InstallReferrerStateListener {
                override fun onInstallReferrerSetupFinished(responseCode: Int) {
                    try {
                        if (responseCode == InstallReferrerClient.InstallReferrerResponse.OK) {
                            val referrer = client.installReferrer?.installReferrer.orEmpty()
                            cachedReferrer.set(referrer)
                            result.success(referrer)
                        } else {
                            result.success("")
                        }
                    } catch (e: Exception) {
                        result.success("")
                    } finally {
                        try {
                            client.endConnection()
                        } catch (_: Exception) {
                        }
                    }
                }

                override fun onInstallReferrerServiceDisconnected() {
                    // no-op
                }
            },
        )
    }
}
