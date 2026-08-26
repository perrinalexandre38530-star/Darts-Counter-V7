package com.multisportsscoring.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;

import androidx.core.content.ContextCompat;

import java.util.concurrent.atomic.AtomicBoolean;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "ActivityTracking",
    permissions = {
        @Permission(alias = "location", strings = { Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION }),
        @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
    }
)
public class ActivityTrackingPlugin extends Plugin implements ActivityTrackingService.Listener {

    @Override public void load() {
        super.load();
        ActivityTrackingService.addListener(this);
    }

    @Override protected void handleOnDestroy() {
        ActivityTrackingService.removeListener(this);
        super.handleOnDestroy();
    }

    @Override public void onSnapshot(JSObject snapshot) {
        notifyListeners("trackingState", snapshot, true);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject result = ActivityTrackingService.snapshot(false);
        result.put("available", true);
        result.put("platform", "android-native");
        result.put("locationPermission", hasFineLocationPermission() ? "granted" : hasLocationPermission() ? "approximate" : "prompt");
        result.put("notificationPermission", Build.VERSION.SDK_INT < 33 || getPermissionState("notifications") == PermissionState.GRANTED ? "granted" : "prompt");
        result.put("locationServicesEnabled", isLocationServicesEnabled());
        result.put("settingsRequired", !hasLocationPermission());
        call.resolve(result);
    }

    @PluginMethod
    public void requestTrackingPermissions(PluginCall call) {
        if (!hasFineLocationPermission()) {
            requestPermissionForAlias("location", call, "locationPermissionCallback");
            return;
        }
        requestNotificationsIfNeeded(call);
    }

    @PermissionCallback
    private void locationPermissionCallback(PluginCall call) {
        if (!hasLocationPermission()) {
            JSObject result = new JSObject(); result.put("granted", false); result.put("location", false); result.put("precise", false); result.put("settingsRequired", true); call.resolve(result); return;
        }
        requestNotificationsIfNeeded(call);
    }

    private void requestNotificationsIfNeeded(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "notificationPermissionCallback");
            return;
        }
        resolvePermissions(call);
    }

    @PermissionCallback
    private void notificationPermissionCallback(PluginCall call) { resolvePermissions(call); }

    private void resolvePermissions(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", hasFineLocationPermission());
        result.put("location", hasLocationPermission());
        result.put("precise", hasFineLocationPermission());
        result.put("notifications", Build.VERSION.SDK_INT < 33 || getPermissionState("notifications") == PermissionState.GRANTED);
        result.put("locationServicesEnabled", isLocationServicesEnabled());
        call.resolve(result);
    }

    @PluginMethod
    public void startTracking(PluginCall call) {
        if (!hasFineLocationPermission()) {
            call.reject("Precise location permission required", "PRECISE_LOCATION_REQUIRED"); return;
        }
        if (!isLocationServicesEnabled()) {
            call.reject("Android location services are disabled", "LOCATION_SERVICES_DISABLED"); return;
        }
        String sport = call.getString("sport", "running");
        Intent intent = new Intent(getContext(), ActivityTrackingService.class);
        intent.setAction(ActivityTrackingService.ACTION_START);
        intent.putExtra(ActivityTrackingService.EXTRA_SPORT, sport);
        ContextCompat.startForegroundService(getContext(), intent);
        JSObject out = new JSObject(); out.put("started", true); out.put("sport", sport); call.resolve(out);
    }


    @PluginMethod
    public void getCurrentPosition(PluginCall call) {
        if (!hasFineLocationPermission()) {
            call.reject("Precise location permission required", "PRECISE_LOCATION_REQUIRED");
            return;
        }
        if (!isLocationServicesEnabled()) {
            call.reject("Android location services are disabled", "LOCATION_SERVICES_DISABLED");
            return;
        }
        final LocationManager manager = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
        if (manager == null) {
            call.reject("Android LocationManager unavailable", "LOCATION_UNAVAILABLE");
            return;
        }
        final long requestedTimeout = call.getLong("timeoutMs", 15000L);
        final long timeoutMs = Math.max(3000L, Math.min(30000L, requestedTimeout));
        final AtomicBoolean resolved = new AtomicBoolean(false);
        final Handler handler = new Handler(Looper.getMainLooper());
        final Location[] best = new Location[] { bestLastKnownLocation(manager) };

        final LocationListener listener = new LocationListener() {
            private void accept(Location location, boolean force) {
                if (location == null || resolved.get()) return;
                best[0] = betterLocation(best[0], location);
                boolean accurate = !location.hasAccuracy() || location.getAccuracy() <= 55f;
                if (!force && !accurate) return;
                if (!resolved.compareAndSet(false, true)) return;
                try { manager.removeUpdates(this); } catch (Exception ignored) {}
                handler.removeCallbacksAndMessages(null);
                resolveCurrentPosition(call, best[0] != null ? best[0] : location);
            }
            @Override public void onLocationChanged(Location location) { accept(location, false); }
            @Override public void onProviderEnabled(String provider) {}
            @Override public void onProviderDisabled(String provider) {}
            @Override public void onStatusChanged(String provider, int status, Bundle extras) {}
        };

        Location cached = best[0];
        if (isRecentLocation(cached, 12000L) && (!cached.hasAccuracy() || cached.getAccuracy() <= 45f)) {
            resolved.set(true);
            resolveCurrentPosition(call, cached);
            return;
        }

        handler.postDelayed(() -> {
            if (!resolved.compareAndSet(false, true)) return;
            try { manager.removeUpdates(listener); } catch (Exception ignored) {}
            Location fallback = best[0];
            if (fallback != null && isRecentLocation(fallback, 60000L)) resolveCurrentPosition(call, fallback);
            else call.reject("No GPS fix available", "GPS_TIMEOUT");
        }, timeoutMs);

        try {
            if (manager.isProviderEnabled(LocationManager.GPS_PROVIDER))
                manager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 0L, 0f, listener, Looper.getMainLooper());
            if (manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER))
                manager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 0L, 0f, listener, Looper.getMainLooper());
        } catch (SecurityException error) {
            if (resolved.compareAndSet(false, true)) {
                handler.removeCallbacksAndMessages(null);
                call.reject("Location permission unavailable", "LOCATION_DENIED", error);
            }
        } catch (Exception error) {
            if (resolved.compareAndSet(false, true)) {
                handler.removeCallbacksAndMessages(null);
                call.reject("Unable to request current location", error);
            }
        }
    }

    private Location bestLastKnownLocation(LocationManager manager) {
        Location best = null;
        try { if (manager.isProviderEnabled(LocationManager.GPS_PROVIDER)) best = betterLocation(best, manager.getLastKnownLocation(LocationManager.GPS_PROVIDER)); } catch (Exception ignored) {}
        try { if (manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) best = betterLocation(best, manager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)); } catch (Exception ignored) {}
        return best;
    }

    private Location betterLocation(Location current, Location candidate) {
        if (candidate == null) return current;
        if (current == null) return candidate;
        long timeDelta = candidate.getTime() - current.getTime();
        if (timeDelta > 8000L) return candidate;
        if (timeDelta < -8000L) return current;
        float currentAccuracy = current.hasAccuracy() ? current.getAccuracy() : 9999f;
        float candidateAccuracy = candidate.hasAccuracy() ? candidate.getAccuracy() : 9999f;
        return candidateAccuracy <= currentAccuracy ? candidate : current;
    }

    private boolean isRecentLocation(Location location, long maxAgeMs) {
        return location != null && Math.max(0L, System.currentTimeMillis() - location.getTime()) <= maxAgeMs;
    }

    private void resolveCurrentPosition(PluginCall call, Location location) {
        if (location == null) { call.reject("No GPS fix available", "GPS_TIMEOUT"); return; }
        JSObject point = new JSObject();
        point.put("lat", location.getLatitude());
        point.put("lon", location.getLongitude());
        point.put("timestamp", location.getTime() > 0 ? location.getTime() : System.currentTimeMillis());
        if (location.hasAccuracy()) point.put("accuracy", location.getAccuracy());
        if (location.hasAltitude()) point.put("altitude", location.getAltitude());
        if (location.hasSpeed()) point.put("speed", location.getSpeed());
        JSObject out = new JSObject();
        out.put("point", point);
        out.put("locationServicesEnabled", isLocationServicesEnabled());
        out.put("precise", hasFineLocationPermission());
        call.resolve(out);
    }

    @PluginMethod public void pauseTracking(PluginCall call) { sendAction(ActivityTrackingService.ACTION_PAUSE); call.resolve(ActivityTrackingService.snapshot(false)); }
    @PluginMethod public void resumeTracking(PluginCall call) { sendAction(ActivityTrackingService.ACTION_RESUME); call.resolve(ActivityTrackingService.snapshot(false)); }

    @PluginMethod
    public void stopTracking(PluginCall call) {
        JSObject snapshot = ActivityTrackingService.snapshot(true);
        sendAction(ActivityTrackingService.ACTION_STOP);
        snapshot.put("stopped", true);
        call.resolve(snapshot);
    }

    @PluginMethod public void getTrack(PluginCall call) { call.resolve(ActivityTrackingService.snapshot(true)); }


    @PluginMethod
    public void openAppLocationPermissionSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject out = new JSObject();
            out.put("opened", true);
            call.resolve(out);
        } catch (Exception error) {
            call.reject("Unable to open Android app permission settings", error);
        }
    }

    @PluginMethod
    public void openLocationSettings(PluginCall call) {
        try {
            Intent intent;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                intent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
            } else {
                intent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject out = new JSObject(); out.put("opened", true); call.resolve(out);
        } catch (Exception first) {
            try {
                Intent fallback = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(fallback);
                JSObject out = new JSObject(); out.put("opened", true); call.resolve(out);
            } catch (Exception second) {
                call.reject("Unable to open Android location settings", second);
            }
        }
    }

    private boolean isLocationServicesEnabled() {
        try {
            LocationManager manager = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
            if (manager == null) return false;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) return manager.isLocationEnabled();
            return manager.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
                manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
        } catch (Exception ignored) {
            return false;
        }
    }

    private boolean hasFineLocationPermission() {
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean hasLocationPermission() {
        return hasFineLocationPermission() ||
            ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private void sendAction(String action) {
        Intent intent = new Intent(getContext(), ActivityTrackingService.class);
        intent.setAction(action);
        try { getContext().startService(intent); } catch (Exception ignored) {}
    }
}
