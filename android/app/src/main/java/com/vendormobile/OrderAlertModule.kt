package com.vendormobile

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.Ringtone
import android.media.RingtoneManager
import android.media.ToneGenerator
import android.os.Build
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class OrderAlertModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var activeRingtone: Ringtone? = null
    private val CHANNEL_ID = "incoming_order_alerts"
    private val CHANNEL_NAME = "Incoming Order Alerts"

    init {
        instance = this
    }

    companion object {
        private var instance: OrderAlertModule? = null
        var initialNotificationData: WritableMap? = null

        fun handleNotificationIntent(intent: Intent?) {
            if (intent == null) return
            val targetId = intent.getStringExtra("targetId") ?: intent.getStringExtra("orderId") ?: return
            val category = intent.getStringExtra("category") ?: "Orders"
            val segment = intent.getStringExtra("segment") ?: "Orders"

            val map = Arguments.createMap().apply {
                putString("targetId", targetId)
                putString("orderId", targetId)
                putString("category", category)
                putString("segment", segment)
            }

            initialNotificationData = map

            instance?.reactContext?.let { ctx ->
                if (ctx.hasActiveReactInstance()) {
                    try {
                        ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                            ?.emit("onNotificationTapped", map)
                    } catch (e: Exception) {
                        // Context not ready yet, data saved in initialNotificationData
                    }
                }
            }
        }
    }

    override fun getName(): String = "OrderAlertModule"

    @ReactMethod
    fun playAlertSound() {
        try {
            stopAlertSound()
            val notificationUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            val ringtone = RingtoneManager.getRingtone(reactContext, notificationUri)
            if (ringtone != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    ringtone.audioAttributes = AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                }
                activeRingtone = ringtone
                ringtone.play()
            } else {
                val toneGen = ToneGenerator(AudioManager.STREAM_NOTIFICATION, 100)
                toneGen.startTone(ToneGenerator.TONE_PROP_BEEP2, 1000)
            }
        } catch (e: Exception) {
            try {
                val toneGen = ToneGenerator(AudioManager.STREAM_NOTIFICATION, 100)
                toneGen.startTone(ToneGenerator.TONE_PROP_BEEP2, 800)
            } catch (ignored: Exception) {
            }
        }
    }

    @ReactMethod
    fun stopAlertSound() {
        try {
            activeRingtone?.let {
                if (it.isPlaying) {
                    it.stop()
                }
            }
            activeRingtone = null
        } catch (e: Exception) {
            // Ignore
        }
    }

    @ReactMethod
    fun showNotification(title: String, message: String, orderId: String) {
        showSystemNotification(title, message, orderId, "Orders", "Orders")
    }

    @ReactMethod
    fun showSystemNotification(
        title: String,
        message: String,
        targetId: String,
        category: String,
        segment: String
    ) {
        try {
            val notificationManager =
                reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Notifications for vendor business events"
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 500, 200, 500)
                }
                notificationManager.createNotificationChannel(channel)
            }

            val launchIntent = Intent(reactContext, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("targetId", targetId)
                putExtra("orderId", targetId)
                putExtra("category", category)
                putExtra("segment", segment)
                action = "OPEN_NOTIFICATION"
            }

            val pendingIntent = PendingIntent.getActivity(
                reactContext,
                (targetId + category).hashCode(),
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
            )

            val notification = NotificationCompat.Builder(reactContext, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(message)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setVibrate(longArrayOf(0, 500, 200, 500))
                .build()

            val notifId = (System.currentTimeMillis() % 100000).toInt()
            notificationManager.notify(notifId, notification)
        } catch (e: Exception) {
            // Ignore
        }
    }

    @ReactMethod
    fun getInitialNotification(promise: Promise) {
        try {
            val data = initialNotificationData
            initialNotificationData = null
            promise.resolve(data)
        } catch (e: Exception) {
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for React Native built-in Event Emitter Calls
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for React Native built-in Event Emitter Calls
    }
}
