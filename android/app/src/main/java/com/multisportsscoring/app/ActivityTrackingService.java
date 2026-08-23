package com.multisportsscoring.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;
import android.os.VibrationEffect;
import android.os.Vibrator;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Foreground GPS recorder used by RUNNING PERFORMANCE.
 * The route continues to be sampled while the WebView is paused / screen is locked.
 * V19 also applies the selected battery profile and long-distance reminders natively.
 * RUNNING PERFORMANCE remains hidden from Android Store V1 until manual validation.
 */
public class ActivityTrackingService extends Service implements LocationListener {
    public static final String ACTION_START = "com.multisportsscoring.app.activity.START";
    public static final String ACTION_PAUSE = "com.multisportsscoring.app.activity.PAUSE";
    public static final String ACTION_RESUME = "com.multisportsscoring.app.activity.RESUME";
    public static final String ACTION_STOP = "com.multisportsscoring.app.activity.STOP";
    public static final String EXTRA_SPORT = "sport";
    public static final String EXTRA_BATTERY_MODE = "batteryMode";
    public static final String EXTRA_HYDRATION_MIN = "hydrationReminderMin";
    public static final String EXTRA_FUEL_MIN = "fuelReminderMin";

    private static final String CHANNEL_ID = "running_performance_tracking";
    private static final String REMINDER_CHANNEL_ID = "running_performance_reminders";
    private static final int NOTIFICATION_ID = 24014;
    private static final int HYDRATION_NOTIFICATION_ID = 24015;
    private static final int FUEL_NOTIFICATION_ID = 24016;
    private static final Object LOCK = new Object();
    private static final List<TrackPoint> ROUTE = new ArrayList<>();
    private static final CopyOnWriteArrayList<Listener> LISTENERS = new CopyOnWriteArrayList<>();
    private static boolean running = false;
    private static boolean paused = false;
    private static String sport = "running";
    private static String batteryMode = "normal";
    private static int hydrationReminderMin = 0;
    private static int fuelReminderMin = 0;
    private static long nextHydrationElapsedMs = Long.MAX_VALUE;
    private static long nextFuelElapsedMs = Long.MAX_VALUE;
    private static long reminderSeq = 0L;
    private static String lastReminderKind = null;
    private static long lastReminderAtElapsedMs = 0L;
    private static long startedWallMs = 0L;
    private static long startedRealtimeMs = 0L;
    private static long pausedStartedRealtimeMs = 0L;
    private static long pausedTotalMs = 0L;

    private LocationManager locationManager;
    private Handler reminderHandler;

    private final Runnable reminderRunnable = new Runnable() {
        @Override public void run() {
            checkReminders();
            if (reminderHandler != null && running) reminderHandler.postDelayed(this, 15000L);
        }
    };

    public interface Listener { void onSnapshot(JSObject snapshot); }

    private static final class TrackPoint {
        final double lat;
        final double lon;
        final long timestamp;
        final long elapsedMs;
        final Float accuracy;
        final Double altitude;
        final Float speed;

        TrackPoint(Location location, long elapsedMs) {
            lat = location.getLatitude();
            lon = location.getLongitude();
            timestamp = location.getTime() > 0 ? location.getTime() : System.currentTimeMillis();
            this.elapsedMs = elapsedMs;
            accuracy = location.hasAccuracy() ? location.getAccuracy() : null;
            altitude = location.hasAltitude() ? location.getAltitude() : null;
            speed = location.hasSpeed() ? location.getSpeed() : null;
        }

        JSObject toJs() {
            JSObject item = new JSObject();
            item.put("lat", lat);
            item.put("lon", lon);
            item.put("timestamp", timestamp);
            item.put("elapsedMs", elapsedMs);
            if (accuracy != null) item.put("accuracy", accuracy);
            if (altitude != null) item.put("altitude", altitude);
            if (speed != null) item.put("speed", speed);
            return item;
        }
    }

    public static void addListener(Listener listener) { if (listener != null) LISTENERS.addIfAbsent(listener); }
    public static void removeListener(Listener listener) { if (listener != null) LISTENERS.remove(listener); }

    public static JSObject snapshot(boolean includeRoute) {
        JSObject out = new JSObject();
        synchronized (LOCK) {
            out.put("running", running);
            out.put("paused", paused);
            out.put("sport", sport);
            out.put("batteryMode", batteryMode);
            out.put("gpsIntervalMs", gpsIntervalMsForMode(batteryMode));
            out.put("hydrationReminderMin", hydrationReminderMin);
            out.put("fuelReminderMin", fuelReminderMin);
            out.put("reminderSeq", reminderSeq);
            if (lastReminderKind != null) out.put("lastReminderKind", lastReminderKind);
            out.put("lastReminderAtElapsedMs", lastReminderAtElapsedMs);
            out.put("startedAt", startedWallMs);
            out.put("elapsedMs", activeElapsedNow());
            out.put("pointCount", ROUTE.size());
            if (includeRoute) {
                JSArray points = new JSArray();
                for (TrackPoint point : ROUTE) points.put(point.toJs());
                out.put("route", points);
            } else if (!ROUTE.isEmpty()) {
                out.put("lastPoint", ROUTE.get(ROUTE.size() - 1).toJs());
            }
        }
        return out;
    }

    private static long activeElapsedNow() {
        if (!running || startedRealtimeMs <= 0L) return 0L;
        long now = SystemClock.elapsedRealtime();
        long currentPause = paused && pausedStartedRealtimeMs > 0L ? now - pausedStartedRealtimeMs : 0L;
        return Math.max(0L, now - startedRealtimeMs - pausedTotalMs - currentPause);
    }

    private static void emit() {
        JSObject snap = snapshot(false);
        for (Listener listener : LISTENERS) {
            try { listener.onSnapshot(snap); } catch (Exception ignored) {}
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createChannels();
        locationManager = (LocationManager) getSystemService(LOCATION_SERVICE);
        reminderHandler = new Handler(Looper.getMainLooper());
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? ACTION_START : intent.getAction();
        if (ACTION_PAUSE.equals(action)) {
            pauseSession();
            return START_STICKY;
        }
        if (ACTION_RESUME.equals(action)) {
            resumeSession();
            return START_STICKY;
        }
        if (ACTION_STOP.equals(action)) {
            stopSession();
            stopSelf();
            return START_NOT_STICKY;
        }
        startSession(intent);
        return START_STICKY;
    }

    private void startSession(Intent intent) {
        String nextSport = intent == null ? null : intent.getStringExtra(EXTRA_SPORT);
        String nextBatteryMode = normalizeBatteryMode(intent == null ? null : intent.getStringExtra(EXTRA_BATTERY_MODE));
        int nextHydrationMin = sanitizeReminderMinutes(intent == null ? 0 : intent.getIntExtra(EXTRA_HYDRATION_MIN, 0));
        int nextFuelMin = sanitizeReminderMinutes(intent == null ? 0 : intent.getIntExtra(EXTRA_FUEL_MIN, 0));
        synchronized (LOCK) {
            ROUTE.clear();
            running = true;
            paused = false;
            sport = nextSport == null || nextSport.trim().isEmpty() ? "running" : nextSport.trim();
            batteryMode = nextBatteryMode;
            hydrationReminderMin = nextHydrationMin;
            fuelReminderMin = nextFuelMin;
            nextHydrationElapsedMs = reminderTargetMs(hydrationReminderMin);
            nextFuelElapsedMs = reminderTargetMs(fuelReminderMin);
            reminderSeq = 0L;
            lastReminderKind = null;
            lastReminderAtElapsedMs = 0L;
            startedWallMs = System.currentTimeMillis();
            startedRealtimeMs = SystemClock.elapsedRealtime();
            pausedStartedRealtimeMs = 0L;
            pausedTotalMs = 0L;
        }
        Notification notification = buildNotification("Suivi GPS · " + batteryModeLabel(batteryMode) + " · ~" + Math.max(1L, gpsIntervalMsForMode(batteryMode) / 1000L) + " s");
        try {
            ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } catch (Exception error) {
            startForeground(NOTIFICATION_ID, notification);
        }
        requestLocationUpdates();
        scheduleReminderLoop();
        emit();
    }

    private void pauseSession() {
        synchronized (LOCK) {
            if (!running || paused) return;
            paused = true;
            pausedStartedRealtimeMs = SystemClock.elapsedRealtime();
        }
        updateNotification("Activité en pause");
        emit();
    }

    private void resumeSession() {
        synchronized (LOCK) {
            if (!running || !paused) return;
            long now = SystemClock.elapsedRealtime();
            if (pausedStartedRealtimeMs > 0L) pausedTotalMs += Math.max(0L, now - pausedStartedRealtimeMs);
            pausedStartedRealtimeMs = 0L;
            paused = false;
        }
        updateNotification("Suivi GPS · " + batteryModeLabel(batteryMode));
        emit();
    }

    private void stopSession() {
        removeLocationUpdates();
        stopReminderLoop();
        synchronized (LOCK) {
            if (paused && pausedStartedRealtimeMs > 0L) pausedTotalMs += Math.max(0L, SystemClock.elapsedRealtime() - pausedStartedRealtimeMs);
            running = false;
            paused = false;
            pausedStartedRealtimeMs = 0L;
        }
        emit();
        try { ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE); } catch (Exception ignored) {}
    }

    private static String normalizeBatteryMode(String value) {
        if ("eco".equalsIgnoreCase(value)) return "eco";
        if ("ultra".equalsIgnoreCase(value)) return "ultra";
        return "normal";
    }

    private static String batteryModeLabel(String value) {
        if ("ultra".equals(value)) return "ULTRA";
        if ("eco".equals(value)) return "ÉCO";
        return "NORMAL";
    }

    private static int sanitizeReminderMinutes(int value) {
        return Math.max(0, Math.min(240, value));
    }

    private static long reminderTargetMs(int minutes) {
        return minutes > 0 ? minutes * 60000L : Long.MAX_VALUE;
    }

    private static long gpsIntervalMsForMode(String mode) {
        if ("ultra".equals(mode)) return 10000L;
        if ("eco".equals(mode)) return 5000L;
        return 1000L;
    }

    private static float gpsMinDistanceMForMode(String mode) {
        if ("ultra".equals(mode)) return 6.0f;
        if ("eco".equals(mode)) return 3.0f;
        return 0.5f;
    }

    private static long networkIntervalMsForMode(String mode) {
        if ("ultra".equals(mode)) return 30000L;
        if ("eco".equals(mode)) return 10000L;
        return 2500L;
    }

    private static float networkMinDistanceMForMode(String mode) {
        if ("ultra".equals(mode)) return 15.0f;
        if ("eco".equals(mode)) return 8.0f;
        return 2.0f;
    }

    private void requestLocationUpdates() {
        if (locationManager == null) return;
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) return;
        try {
            Location freshest = null;
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, gpsIntervalMsForMode(batteryMode), gpsMinDistanceMForMode(batteryMode), this);
                freshest = fresherLocation(freshest, locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER));
            }
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, networkIntervalMsForMode(batteryMode), networkMinDistanceMForMode(batteryMode), this);
                freshest = fresherLocation(freshest, locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER));
            }
            // A very recent cached fix avoids displaying 0 GPS for several seconds when
            // Android already has a valid position from Maps / the system location stack.
            if (isFreshUsableLocation(freshest)) onLocationChanged(freshest);
        } catch (Exception ignored) {}
    }

    private Location fresherLocation(Location current, Location candidate) {
        if (candidate == null) return current;
        if (current == null) return candidate;
        return candidate.getTime() > current.getTime() ? candidate : current;
    }

    private boolean isFreshUsableLocation(Location location) {
        if (location == null) return false;
        long ageMs = Math.max(0L, System.currentTimeMillis() - location.getTime());
        if (ageMs > 15000L) return false;
        return !location.hasAccuracy() || location.getAccuracy() <= 80f;
    }

    private void removeLocationUpdates() {
        if (locationManager == null) return;
        try { locationManager.removeUpdates(this); } catch (Exception ignored) {}
    }

    private void scheduleReminderLoop() {
        if (reminderHandler == null) return;
        reminderHandler.removeCallbacks(reminderRunnable);
        if (hydrationReminderMin <= 0 && fuelReminderMin <= 0) return;
        reminderHandler.postDelayed(reminderRunnable, 15000L);
    }

    private void stopReminderLoop() {
        if (reminderHandler != null) reminderHandler.removeCallbacks(reminderRunnable);
    }

    private void checkReminders() {
        String dueKind = null;
        long elapsed = 0L;
        synchronized (LOCK) {
            if (!running || paused) return;
            elapsed = activeElapsedNow();
            if (hydrationReminderMin > 0 && elapsed >= nextHydrationElapsedMs) {
                dueKind = "hydration";
                nextHydrationElapsedMs += hydrationReminderMin * 60000L;
            } else if (fuelReminderMin > 0 && elapsed >= nextFuelElapsedMs) {
                dueKind = "fuel";
                nextFuelElapsedMs += fuelReminderMin * 60000L;
            }
            if (dueKind != null) {
                reminderSeq += 1L;
                lastReminderKind = dueKind;
                lastReminderAtElapsedMs = elapsed;
            }
        }
        if (dueKind != null) {
            postReminderNotification(dueKind);
            vibrateReminder();
            emit();
        }
    }

    private void postReminderNotification(String kind) {
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (manager == null) return;
        String title = "hydration".equals(kind) ? "RUNNING PERFORMANCE · HYDRATATION" : "RUNNING PERFORMANCE · RAVITAILLEMENT";
        String text = "hydration".equals(kind) ? "Pense à boire quelques gorgées." : "Pense à ton ravitaillement et reste régulier.";
        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        android.app.PendingIntent pending = null;
        if (open != null) {
            int flags = android.app.PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= android.app.PendingIntent.FLAG_IMMUTABLE;
            pending = android.app.PendingIntent.getActivity(this, "hydration".equals(kind) ? HYDRATION_NOTIFICATION_ID : FUEL_NOTIFICATION_ID, open, flags);
        }
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, REMINDER_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_running_performance)
            .setContentTitle(title)
            .setContentText(text)
            .setAutoCancel(true)
            .setCategory(Notification.CATEGORY_REMINDER)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(Notification.DEFAULT_VIBRATE);
        if (pending != null) builder.setContentIntent(pending);
        manager.notify("hydration".equals(kind) ? HYDRATION_NOTIFICATION_ID : FUEL_NOTIFICATION_ID, builder.build());
    }

    private void vibrateReminder() {
        try {
            Vibrator vibrator = (Vibrator) getSystemService(VIBRATOR_SERVICE);
            if (vibrator == null || !vibrator.hasVibrator()) return;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) vibrator.vibrate(VibrationEffect.createOneShot(260L, VibrationEffect.DEFAULT_AMPLITUDE));
            else vibrator.vibrate(260L);
        } catch (Exception ignored) {}
    }

    @Override
    public void onLocationChanged(Location location) {
        synchronized (LOCK) {
            if (!running || paused || location == null) return;
            long elapsed = activeElapsedNow();
            TrackPoint previous = ROUTE.isEmpty() ? null : ROUTE.get(ROUTE.size() - 1);
            if (location.hasAccuracy() && location.getAccuracy() > 100f) return;
            if (previous != null) {
                float[] distance = new float[1];
                Location.distanceBetween(previous.lat, previous.lon, location.getLatitude(), location.getLongitude(), distance);
                long dt = Math.max(1L, elapsed - previous.elapsedMs);
                double speed = distance[0] / (dt / 1000.0);
                if (speed > 20.0) return;
            }
            ROUTE.add(new TrackPoint(location, elapsed));
            if (ROUTE.size() > 25000) ROUTE.remove(0);
        }
        emit();
    }

    @Override public void onProviderEnabled(String provider) {}
    @Override public void onProviderDisabled(String provider) {}
    @Override public void onStatusChanged(String provider, int status, Bundle extras) {}

    private void createChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (manager == null) return;
        NotificationChannel tracking = new NotificationChannel(CHANNEL_ID, "Running Performance", NotificationManager.IMPORTANCE_LOW);
        tracking.setDescription("Suivi d'activité GPS en arrière-plan");
        manager.createNotificationChannel(tracking);
        NotificationChannel reminders = new NotificationChannel(REMINDER_CHANNEL_ID, "Running Performance · Rappels", NotificationManager.IMPORTANCE_DEFAULT);
        reminders.setDescription("Rappels hydratation et ravitaillement pendant les sorties longues");
        reminders.enableVibration(true);
        manager.createNotificationChannel(reminders);
    }

    private Notification buildNotification(String text) {
        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        android.app.PendingIntent pending = null;
        if (open != null) {
            int flags = android.app.PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= android.app.PendingIntent.FLAG_IMMUTABLE;
            pending = android.app.PendingIntent.getActivity(this, 24014, open, flags);
        }
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_running_performance)
            .setContentTitle("RUNNING PERFORMANCE")
            .setContentText(text)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW);
        if (pending != null) builder.setContentIntent(pending);
        return builder.build();
    }

    private void updateNotification(String text) {
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (manager != null) manager.notify(NOTIFICATION_ID, buildNotification(text));
    }

    @Nullable
    @Override public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onDestroy() {
        removeLocationUpdates();
        stopReminderLoop();
        super.onDestroy();
    }
}
