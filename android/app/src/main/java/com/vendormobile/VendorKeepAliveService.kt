package com.vendormobile

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Collections
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean

class VendorKeepAliveService : Service() {

    private var wakeLock: PowerManager.WakeLock? = null
    private var pollerThread: Thread? = null
    private val isServiceActive = AtomicBoolean(false)
    private val seededEndpoints: MutableSet<String> = Collections.newSetFromMap(ConcurrentHashMap())
    private var pollCycleCount = 0
    private val serviceStartTime = System.currentTimeMillis()
    private var isExplicitlyStopped = false

    companion object {
        const val CHANNEL_ID = "vendor_keepalive_service_channel"
        const val CHANNEL_NAME = "Vendor Active Service"
        const val NOTIFICATION_ID = 99991

        const val ACTION_START = "ACTION_START_KEEPALIVE"
        const val ACTION_STOP = "ACTION_STOP_KEEPALIVE"

        const val KEY_HANDLED_ORDERS = "handled_order_ids_csv"

        var isRunning = false

        // Thread-safe set of known order IDs to prevent duplicate system alerts
        val knownOrderIds: MutableSet<String> = Collections.newSetFromMap(ConcurrentHashMap())

        fun loadHandledOrders(context: Context) {
            try {
                val prefs = context.getSharedPreferences(OrderAlertModule.PREFS_NAME, Context.MODE_PRIVATE)
                val csv = prefs.getString(KEY_HANDLED_ORDERS, "") ?: ""
                if (csv.isNotBlank()) {
                    csv.split(",").forEach { id ->
                        val trimmed = id.trim()
                        if (trimmed.isNotEmpty()) {
                            knownOrderIds.add(trimmed)
                        }
                    }
                }
            } catch (e: Exception) {
                // Non-blocking
            }
        }

        fun persistHandledOrders(context: Context) {
            try {
                val prefs = context.getSharedPreferences(OrderAlertModule.PREFS_NAME, Context.MODE_PRIVATE)
                val list = knownOrderIds.toList()
                val recent = if (list.size > 500) list.takeLast(500) else list
                val csv = recent.joinToString(",")
                prefs.edit().putString(KEY_HANDLED_ORDERS, csv).apply()
            } catch (e: Exception) {
                // Non-blocking
            }
        }

        fun start(context: Context) {
            try {
                val intent = Intent(context, VendorKeepAliveService::class.java).apply {
                    action = ACTION_START
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        fun stop(context: Context) {
            try {
                val intent = Intent(context, VendorKeepAliveService::class.java).apply {
                    action = ACTION_STOP
                }
                context.startService(intent)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        fun markOrderHandled(orderId: String?) {
            if (!orderId.isNullOrBlank()) {
                knownOrderIds.add(orderId.trim())
            }
        }

        fun markOrderHandledWithContext(context: Context?, orderId: String?) {
            if (!orderId.isNullOrBlank()) {
                val trimmed = orderId.trim()
                knownOrderIds.add(trimmed)
                if (context != null) {
                    persistHandledOrders(context)
                }
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        loadHandledOrders(this)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            isExplicitlyStopped = true
            stopForegroundService()
            return START_NOT_STICKY
        }

        isExplicitlyStopped = false
        startForegroundServiceInternal()
        return START_STICKY
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        try {
            if (!isExplicitlyStopped) {
                val restartIntent = Intent(applicationContext, this.javaClass).apply {
                    setPackage(packageName)
                    action = ACTION_START
                }
                val pendingIntent = PendingIntent.getService(
                    applicationContext,
                    1,
                    restartIntent,
                    PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
                )
                val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
                val triggerAt = System.currentTimeMillis() + 1500L
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        triggerAt,
                        pendingIntent
                    )
                } else {
                    alarmManager.set(
                        AlarmManager.RTC_WAKEUP,
                        triggerAt,
                        pendingIntent
                    )
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        super.onTaskRemoved(rootIntent)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps vendor app ready to receive instant background order alerts"
                setShowBadge(false)
                enableVibration(false)
                setSound(null, null)
            }
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun startForegroundServiceInternal() {
        try {
            val launchIntent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                this,
                0,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
            )

            val smallIconResId = applicationInfo.icon.let {
                if (it != 0) it else R.mipmap.ic_launcher
            }

            val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Vendor Online & Active")
                .setContentText("Listening for incoming orders, bookings, and updates")
                .setSmallIcon(smallIconResId)
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOngoing(true)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .build()

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                )
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
            isRunning = true

            // Acquire light partial wake lock for network persistence in background
            try {
                val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
                wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "VendorMobile::KeepAliveWakeLock").apply {
                    setReferenceCounted(false)
                    acquire(10 * 60 * 1000L) // Refreshed periodically
                }
            } catch (e: Exception) {}

            // Start autonomous background polling thread
            startPollerThread()

        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun startPollerThread() {
        if (isServiceActive.getAndSet(true)) {
            return // Poller thread is already running
        }

        pollerThread = Thread {
            while (isServiceActive.get()) {
                try {
                    val prefs = getSharedPreferences(OrderAlertModule.PREFS_NAME, Context.MODE_PRIVATE)
                    val vendorId = prefs.getString(OrderAlertModule.KEY_VENDOR_ID, "") ?: ""
                    val authToken = prefs.getString(OrderAlertModule.KEY_AUTH_TOKEN, "") ?: ""
                    val apiUrl = prefs.getString(OrderAlertModule.KEY_API_URL, "https://vendor.ficapp.in/api") ?: "https://vendor.ficapp.in/api"

                    if (vendorId.isNotBlank() && authToken.isNotBlank()) {
                        pollCycleCount++

                        // 1. Always poll transactional orders
                        pollEndpoint(apiUrl, authToken, vendorId, "/vendor/orders", isBooking = false, isJob = false)

                        // 2. Alternate polling for bookings (every 2nd tick)
                        if (pollCycleCount % 2 == 0) {
                            pollEndpoint(apiUrl, authToken, vendorId, "/vendor/bookings", isBooking = true, isJob = false)
                        }

                        // 3. Alternate polling for applications (every 3rd tick)
                        if (pollCycleCount % 3 == 0) {
                            pollEndpoint(apiUrl, authToken, vendorId, "/vendor/applications", isBooking = false, isJob = true)
                        }
                    }
                } catch (e: Exception) {
                    // Non-blocking background catch
                }

                try {
                    Thread.sleep(4500)
                } catch (ie: InterruptedException) {
                    break
                }
            }
        }.apply {
            isDaemon = true
            name = "VendorBackgroundOrderPoller"
            start()
        }
    }

    private fun parseTimestamp(timeStr: String): Long {
        if (timeStr.isBlank()) return 0L
        return try {
            if (timeStr.contains("T")) {
                val clean = if (timeStr.endsWith("Z")) timeStr.substring(0, timeStr.length - 1) + "+0000" else timeStr
                val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }
                sdf.parse(clean.take(19))?.time ?: 0L
            } else {
                timeStr.toLongOrNull() ?: 0L
            }
        } catch (e: Exception) {
            0L
        }
    }

    private fun pollEndpoint(
        baseUrl: String,
        token: String,
        vendorId: String,
        endpointPath: String,
        isBooking: Boolean,
        isJob: Boolean
    ) {
        var connection: HttpURLConnection? = null
        try {
            val cleanBase = baseUrl.trimEnd('/')
            val fullUrl = "$cleanBase$endpointPath"
            val url = URL(fullUrl)

            connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 7000
                readTimeout = 7000
                setRequestProperty("Authorization", "Bearer $token")
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Accept", "application/json")
                setRequestProperty("x-vendor-id", vendorId)
            }

            val responseCode = connection.responseCode
            if (responseCode in 200..299) {
                val reader = BufferedReader(InputStreamReader(connection.inputStream))
                val sb = StringBuilder()
                var line: String?
                while (reader.readLine().also { line = it } != null) {
                    sb.append(line)
                }
                reader.close()

                val rootObj = JSONObject(sb.toString())
                val dataArray: JSONArray = rootObj.optJSONArray("data") ?: JSONArray()

                // On first poll for this endpoint, seed historical items older than 3 minutes to suppress old notifications
                if (!seededEndpoints.contains(endpointPath)) {
                    val historicalThreshold = serviceStartTime - 180_000L
                    for (i in 0 until dataArray.length()) {
                        val item = dataArray.optJSONObject(i) ?: continue
                        val createdAtStr = item.optString("createdAt").ifBlank {
                            item.optString("created_at").ifBlank {
                                item.optString("date").ifBlank {
                                    item.optString("order_date")
                                }
                            }
                        }
                        val itemTimestamp = parseTimestamp(createdAtStr)
                        val oid = item.optString("order_number").ifBlank {
                            item.optString("id").ifBlank {
                                item.optString("_id").ifBlank {
                                    item.optString("applicationId")
                                }
                            }
                        }
                        if (oid.isNotBlank() && (itemTimestamp == 0L || itemTimestamp < historicalThreshold)) {
                            knownOrderIds.add(oid.trim())
                        }
                    }
                    seededEndpoints.add(endpointPath)
                    persistHandledOrders(this@VendorKeepAliveService)
                }

                // Check for new, unseen incoming items
                for (i in 0 until dataArray.length()) {
                    val item = dataArray.optJSONObject(i) ?: continue
                    val orderNumber = item.optString("order_number").trim()
                    val orderId = item.optString("id").ifBlank {
                        item.optString("_id").ifBlank {
                            item.optString("applicationId").ifBlank { orderNumber }
                        }
                    }.trim()

                    val primaryKey = if (orderNumber.isNotBlank()) orderNumber else orderId
                    if (primaryKey.isBlank()) continue

                    // Deduplication check: if seen by socket or previous poll, skip
                    if (knownOrderIds.contains(primaryKey) || (orderId.isNotBlank() && knownOrderIds.contains(orderId))) {
                        continue
                    }

                    // Strict historical timestamp verification: items created before service started are historical
                    val createdAtStr = item.optString("createdAt").ifBlank {
                        item.optString("created_at").ifBlank {
                            item.optString("date").ifBlank {
                                item.optString("order_date")
                            }
                        }
                    }
                    val itemTimestamp = parseTimestamp(createdAtStr)
                    if (itemTimestamp > 0 && itemTimestamp < (serviceStartTime - 30_000L)) {
                        // Historical record: mark as known so it is never alerted, but do not show notification
                        knownOrderIds.add(primaryKey)
                        if (orderId.isNotBlank()) knownOrderIds.add(orderId)
                        continue
                    }

                    // Genuinely new incoming item: record and post notification
                    knownOrderIds.add(primaryKey)
                    if (orderId.isNotBlank()) knownOrderIds.add(orderId)
                    persistHandledOrders(this@VendorKeepAliveService)

                    // Extract transaction details
                    val custName = item.optString("customer_name").ifBlank {
                        item.optString("memberName").ifBlank {
                            item.optString("candidateName", "Customer")
                        }
                    }
                    val amount = item.optDouble("totalAmount", item.optDouble("amount", item.optDouble("finalAmount", 0.0)))
                    val rawCategory = item.optString("category").ifBlank {
                        item.optString("type", if (isJob) "Jobs" else if (isBooking) "Bookings" else "Orders")
                    }

                    val segment = if (isJob || rawCategory.contains("Job", true)) {
                        "Jobs"
                    } else if (isBooking || rawCategory.contains("Booking", true) || rawCategory.contains("Stay", true) || rawCategory.contains("Travel", true) || rawCategory.contains("Service", true)) {
                        "Bookings"
                    } else {
                        "Orders"
                    }

                    var itemSummary = if (isJob) "Job Application" else if (isBooking) "Service Booking" else "Order Item"
                    val itemsArr = item.optJSONArray("items")
                    if (itemsArr != null && itemsArr.length() > 0) {
                        val firstIt = itemsArr.optJSONObject(0)
                        val itName = firstIt?.optString("name", "Item") ?: "Item"
                        val itQty = firstIt?.optInt("quantity", 1) ?: 1
                        itemSummary = "${itQty}x $itName"
                    } else {
                        val prodDetails = item.optString("product_details").ifBlank {
                            item.optString("serviceName").ifBlank {
                                item.optString("jobTitle")
                            }
                        }
                        if (prodDetails.isNotBlank()) {
                            itemSummary = prodDetails
                        }
                    }

                    val displayId = if (orderNumber.isNotBlank()) orderNumber else orderId
                    val titlePrefix = if (isJob) "Job Application" else if (isBooking) "Booking" else "Order"
                    val title = "New $titlePrefix (#$displayId)"
                    val amountStr = if (amount > 0) " • ₹${String.format("%.0f", amount)}" else ""
                    val body = "$custName placed a new $titlePrefix$amountStr • $itemSummary"

                    // Trigger native Android System Notification
                    OrderAlertModule.postSystemNotification(
                        this@VendorKeepAliveService,
                        title,
                        body,
                        orderId,
                        rawCategory,
                        segment
                    )
                }
            }
        } catch (e: Exception) {
            // Background network attempt error: silent retry on next tick
        } finally {
            connection?.disconnect()
        }
    }

    private fun stopForegroundService() {
        isRunning = false
        isServiceActive.set(false)
        pollerThread?.interrupt()
        pollerThread = null

        try {
            wakeLock?.let {
                if (it.isHeld) it.release()
            }
        } catch (e: Exception) {}

        try {
            stopForeground(true)
            stopSelf()
        } catch (e: Exception) {}
    }

    override fun onDestroy() {
        if (!isExplicitlyStopped) {
            try {
                val restartIntent = Intent(applicationContext, this.javaClass).apply {
                    setPackage(packageName)
                    action = ACTION_START
                }
                val pendingIntent = PendingIntent.getService(
                    applicationContext,
                    2,
                    restartIntent,
                    PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
                )
                val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
                alarmManager.set(
                    AlarmManager.RTC_WAKEUP,
                    System.currentTimeMillis() + 2000L,
                    pendingIntent
                )
            } catch (e: Exception) {}
        }
        stopForegroundService()
        super.onDestroy()
    }
}
