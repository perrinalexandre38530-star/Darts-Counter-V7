package com.multisportsscoring.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.ContextCompat;

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
            JSObject result = new JSObject(); result.put("granted", false); result.put("location", false); result.put("precise", false); call.resolve(result); return;
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
        result.put("granted", hasLocationPermission());
        result.put("location", hasLocationPermission());
        result.put("precise", hasFineLocationPermission());
        result.put("notifications", Build.VERSION.SDK_INT < 33 || getPermissionState("notifications") == PermissionState.GRANTED);
        result.put("locationServicesEnabled", isLocationServicesEnabled());
        call.resolve(result);
    }

    @PluginMethod
    public void startTracking(PluginCall call) {
        if (!hasLocationPermission()) {
            call.reject("Location permission required", "LOCATION_DENIED"); return;
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
    public void openLocationSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
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
