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
import android.os.IBinder;
import android.os.SystemClock;

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
 * RUNNING PERFORMANCE remains hidden from Android Store V1 until manual validation.
 */
public class ActivityTrackingService extends Service implements LocationListener {
    public static final String ACTION_START = "com.multisportsscoring.app.activity.START";
    public static final String ACTION_PAUSE = "com.multisportsscoring.app.activity.PAUSE";
    public static final String ACTION_RESUME = "com.multisportsscoring.app.activity.RESUME";
    public static final String ACTION_STOP = "com.multisportsscoring.app.activity.STOP";
    public static final String EXTRA_SPORT = "sport";

    private static final String CHANNEL_ID = "running_performance_tracking";
    private static final int NOTIFICATION_ID = 24014;
    private static final Object LOCK = new Object();
    private static final List<TrackPoint> ROUTE = new ArrayList<>();
    private static final CopyOnWriteArrayList<Listener> LISTENERS = new CopyOnWriteArrayList<>();
    private static boolean running = false;
    private static boolean paused = false;
    private static String sport = "running";
    private static long startedWallMs = 0L;
    private static long startedRealtimeMs = 0L;
    private static long pausedStartedRealtimeMs = 0L;
    private static long pausedTotalMs = 0L;

    private LocationManager locationManager;

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
        createChannel();
        locationManager = (LocationManager) getSystemService(LOCATION_SERVICE);
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
        String nextSport = intent == null ? null : intent.getStringExtra(EXTRA_SPORT);
        startSession(nextSport);
        return START_STICKY;
    }

    private void startSession(String nextSport) {
        synchronized (LOCK) {
            ROUTE.clear();
            running = true;
            paused = false;
            sport = nextSport == null || nextSport.trim().isEmpty() ? "running" : nextSport.trim();
            startedWallMs = System.currentTimeMillis();
            startedRealtimeMs = SystemClock.elapsedRealtime();
            pausedStartedRealtimeMs = 0L;
            pausedTotalMs = 0L;
        }
        Notification notification = buildNotification("Suivi GPS en cours");
        try {
            ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } catch (Exception error) {
            startForeground(NOTIFICATION_ID, notification);
        }
        requestLocationUpdates();
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
        updateNotification("Suivi GPS en cours");
        emit();
    }

    private void stopSession() {
        removeLocationUpdates();
        synchronized (LOCK) {
            if (paused && pausedStartedRealtimeMs > 0L) pausedTotalMs += Math.max(0L, SystemClock.elapsedRealtime() - pausedStartedRealtimeMs);
            running = false;
            paused = false;
            pausedStartedRealtimeMs = 0L;
        }
        emit();
        try { ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE); } catch (Exception ignored) {}
    }

    private void requestLocationUpdates() {
        if (locationManager == null) return;
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) return;
        try {
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1500L, 1.0f, this);
            }
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 3500L, 4.0f, this);
            }
        } catch (Exception ignored) {}
    }

    private void removeLocationUpdates() {
        if (locationManager == null) return;
        try { locationManager.removeUpdates(this); } catch (Exception ignored) {}
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

    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (manager == null) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Running Performance", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("Suivi d'activité GPS en arrière-plan");
        manager.createNotificationChannel(channel);
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
        super.onDestroy();
    }
}
