package com.vendormobile

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class OrderAlertModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var activeMediaPlayer: MediaPlayer? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var stopRunnable: Runnable? = null

    companion object {
        const val PREFS_NAME = "VendorMobilePrefs"
        const val KEY_VENDOR_ID = "vendor_id"
        const val KEY_AUTH_TOKEN = "auth_token"
        const val KEY_API_URL = "api_url"
        const val KEY_BUSINESS_IDS = "business_ids"

        const val PRIMARY_CHANNEL_ID = "vendor_order_alerts_v2"
        const val PRIMARY_CHANNEL_NAME = "Vendor Order & Booking Alerts"

        const val UPDATES_CHANNEL_ID = "vendor_updates_v1"
        const val UPDATES_CHANNEL_NAME = "Vendor Status Updates"

        private const val MAX_SOUND_BURST_MS = 2800L

        private var instance: OrderAlertModule? = null
        var initialNotificationData: WritableMap? = null

        fun getCustomSoundUri(context: Context): Uri {
            return try {
                val resId = context.resources.getIdentifier("vendor_alert", "raw", context.packageName)
                if (resId != 0) {
                    Uri.parse("android.resource://${context.packageName}/$resId")
                } else {
                    val notifResId = context.resources.getIdentifier("notification_sound", "raw", context.packageName)
                    if (notifResId != 0) {
                        Uri.parse("android.resource://${context.packageName}/$notifResId")
                    } else {
                        RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                    }
                }
            } catch (e: Exception) {
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            }
        }

        fun initNotificationChannels(context: Context) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                try {
                    val notificationManager =
                        context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

                    val soundUri = getCustomSoundUri(context)
                    val audioAttributes = AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()

                    val primaryChannel = NotificationChannel(
                        PRIMARY_CHANNEL_ID,
                        PRIMARY_CHANNEL_NAME,
                        NotificationManager.IMPORTANCE_HIGH
                    ).apply {
                        description = "High-priority notifications for new orders, bookings, and job applications"
                        enableVibration(true)
                        vibrationPattern = longArrayOf(0, 400, 200, 400)
                        setSound(soundUri, audioAttributes)
                        lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
                        setShowBadge(true)
                    }

                    val updatesChannel = NotificationChannel(
                        UPDATES_CHANNEL_ID,
                        UPDATES_CHANNEL_NAME,
                        NotificationManager.IMPORTANCE_HIGH
                    ).apply {
                        description = "Real-time updates for order status, payment confirmations, and booking changes"
                        enableVibration(true)
                        vibrationPattern = longArrayOf(0, 300, 150, 300)
                        setSound(soundUri, audioAttributes)
                        lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
                        setShowBadge(true)
                    }

                    notificationManager.createNotificationChannel(primaryChannel)
                    notificationManager.createNotificationChannel(updatesChannel)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }

        fun postSystemNotification(
            context: Context,
            title: String,
            message: String,
            targetId: String,
            category: String,
            segment: String
        ) {
            try {
                initNotificationChannels(context)

                val notificationManager =
                    context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

                val isStatusUpdate = title.contains("Status", true) || title.contains("Updated", true)
                val channelId = if (isStatusUpdate) UPDATES_CHANNEL_ID else PRIMARY_CHANNEL_ID

                val launchIntent = Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                    putExtra("targetId", targetId)
                    putExtra("orderId", targetId)
                    putExtra("category", category)
                    putExtra("segment", segment)
                    action = "OPEN_NOTIFICATION"
                }

                val requestCode = ((System.currentTimeMillis() + targetId.hashCode()) % 100000).toInt().let { if (it < 0) -it else it }
                val pendingIntent = PendingIntent.getActivity(
                    context,
                    requestCode,
                    launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
                )

                // Resolve robust valid application icon
                val smallIconResId = context.applicationInfo.icon.let {
                    if (it != 0) it else R.mipmap.ic_launcher
                }

                val soundUri = getCustomSoundUri(context)

                val builder = NotificationCompat.Builder(context, channelId)
                    .setSmallIcon(smallIconResId)
                    .setContentTitle(title)
                    .setContentText(message)
                    .setStyle(NotificationCompat.BigTextStyle().bigText(message))
                    .setPriority(NotificationCompat.PRIORITY_MAX)
                    .setCategory(NotificationCompat.CATEGORY_EVENT)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setAutoCancel(true)
                    .setSound(soundUri)
                    .setContentIntent(pendingIntent)
                    .setVibrate(longArrayOf(0, 400, 200, 400))
                    .setDefaults(NotificationCompat.DEFAULT_LIGHTS or NotificationCompat.DEFAULT_VIBRATE)

                val stableKey = if (targetId.isNotBlank()) targetId.trim() else title.trim()
                val notificationId = Math.abs(stableKey.hashCode() % 90000) + 10000
                notificationManager.notify(notificationId, builder.build())

                // Mark order handled to prevent duplicate background notifications
                VendorKeepAliveService.markOrderHandledWithContext(context, targetId)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        fun handleNotificationIntent(intent: Intent?) {
            if (intent == null) return
            val targetId = intent.getStringExtra("targetId")
                ?: intent.getStringExtra("orderId")
                ?: intent.getStringExtra("id")
                ?: intent.getStringExtra("applicationId")
                ?: intent.getStringExtra("bookingId")
                ?: intent.extras?.getString("targetId")
                ?: intent.extras?.getString("orderId")
                ?: intent.extras?.getString("id")
                ?: return

            val category = intent.getStringExtra("category") ?: intent.extras?.getString("category") ?: "Orders"
            val segment = intent.getStringExtra("segment") ?: intent.extras?.getString("segment") ?: "Orders"

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
                        e.printStackTrace()
                    }
                }
            }
        }
    }

    init {
        instance = this
        try {
            initNotificationChannels(reactContext)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun getName(): String = "OrderAlertModule"

    private fun getCustomSoundUri(): Uri = getCustomSoundUri(reactContext)

    private fun initNotificationChannels() = initNotificationChannels(reactContext)

    @ReactMethod
    fun initializeChannels(promise: Promise) {
        try {
            initNotificationChannels()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun playAlertSound() {
        mainHandler.post {
            try {
                stopAlertSoundInternal()

                val audioManager = reactContext.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
                val ringerMode = audioManager?.ringerMode ?: AudioManager.RINGER_MODE_NORMAL

                // Respect Silent and Vibrate device modes
                if (ringerMode == AudioManager.RINGER_MODE_SILENT) {
                    return@post
                }

                // Trigger vibration
                triggerHapticVibration()

                if (ringerMode == AudioManager.RINGER_MODE_VIBRATE) {
                    return@post
                }

                // Play custom sound
                var mp: MediaPlayer? = null
                try {
                    val resId = reactContext.resources.getIdentifier("vendor_alert", "raw", reactContext.packageName)
                    if (resId != 0) {
                        mp = MediaPlayer.create(reactContext, resId)
                    }
                } catch (e: Exception) {
                    // Fallback
                }

                if (mp == null) {
                    val defaultUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                    mp = MediaPlayer.create(reactContext, defaultUri)
                }

                if (mp != null) {
                    activeMediaPlayer = mp
                    mp.setOnCompletionListener {
                        stopAlertSoundInternal()
                    }
                    mp.start()

                    stopRunnable = Runnable {
                        stopAlertSoundInternal()
                    }
                    stopRunnable?.let { mainHandler.postDelayed(it, MAX_SOUND_BURST_MS) }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun triggerHapticVibration() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = reactContext.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                val vibrator = vibratorManager?.defaultVibrator
                vibrator?.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 400, 200, 400), -1))
            } else {
                @Suppress("DEPRECATION")
                val vibrator = reactContext.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator?.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 400, 200, 400), -1))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator?.vibrate(longArrayOf(0, 400, 200, 400), -1)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun stopAlertSound() {
        mainHandler.post {
            stopAlertSoundInternal()
        }
    }

    private fun stopAlertSoundInternal() {
        try {
            stopRunnable?.let {
                mainHandler.removeCallbacks(it)
                stopRunnable = null
            }
            activeMediaPlayer?.let { mp ->
                if (mp.isPlaying) {
                    mp.stop()
                }
                mp.release()
            }
            activeMediaPlayer = null
        } catch (e: Exception) {
            e.printStackTrace()
            activeMediaPlayer = null
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
        postSystemNotification(reactContext, title, message, targetId, category, segment)
    }

    @ReactMethod
    fun syncVendorSession(vendorId: String, token: String, apiUrl: String, businessIdsJson: String?) {
        try {
            val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().apply {
                putString(KEY_VENDOR_ID, vendorId)
                putString(KEY_AUTH_TOKEN, token)
                putString(KEY_API_URL, apiUrl)
                if (businessIdsJson != null) {
                    putString(KEY_BUSINESS_IDS, businessIdsJson)
                }
                apply()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun clearVendorSession() {
        try {
            val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().clear().apply()
            VendorKeepAliveService.knownOrderIds.clear()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun markOrderHandled(orderId: String) {
        VendorKeepAliveService.markOrderHandledWithContext(reactContext, orderId)
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
    fun checkNotificationPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= 33) {
                val permission = ContextCompat.checkSelfPermission(
                    reactContext,
                    "android.permission.POST_NOTIFICATIONS"
                )
                promise.resolve(permission == android.content.pm.PackageManager.PERMISSION_GRANTED)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun startKeepAliveService() {
        try {
            VendorKeepAliveService.start(reactContext)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun stopKeepAliveService() {
        try {
            VendorKeepAliveService.stop(reactContext)
        } catch (e: Exception) {
            e.printStackTrace()
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
