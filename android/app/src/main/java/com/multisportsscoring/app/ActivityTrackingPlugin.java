package com.multisportsscoring.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

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
        call.resolve(result);
    }

    @PluginMethod
    public void startTracking(PluginCall call) {
        if (!hasLocationPermission()) {
            call.reject("Location permission required", "LOCATION_DENIED"); return;
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
