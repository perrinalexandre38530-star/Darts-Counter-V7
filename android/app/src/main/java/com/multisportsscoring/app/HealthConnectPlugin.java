package com.multisportsscoring.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;

import androidx.activity.result.ActivityResult;
import androidx.activity.result.contract.ActivityResultContract;
import androidx.health.connect.client.HealthConnectClient;
import androidx.health.connect.client.PermissionController;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Set;

/** Health Connect capability / permission bridge for RUNNING PERFORMANCE. */
@CapacitorPlugin(name = "HealthConnect")
public class HealthConnectPlugin extends Plugin {
    private static final String PROVIDER = "com.google.android.apps.healthdata";
    private static final Set<String> WORKOUT_PERMISSIONS = new LinkedHashSet<>(Arrays.asList(
        "android.permission.health.READ_EXERCISE",
        "android.permission.health.WRITE_EXERCISE",
        "android.permission.health.WRITE_EXERCISE_ROUTE",
        "android.permission.health.READ_HEART_RATE",
        "android.permission.health.WRITE_HEART_RATE",
        "android.permission.health.READ_DISTANCE",
        "android.permission.health.WRITE_DISTANCE",
        "android.permission.health.READ_SPEED",
        "android.permission.health.WRITE_SPEED",
        "android.permission.health.READ_ELEVATION_GAINED",
        "android.permission.health.WRITE_ELEVATION_GAINED",
        "android.permission.health.READ_STEPS",
        "android.permission.health.WRITE_STEPS"
    ));

    private int sdkStatus() {
        try { return HealthConnectClient.getSdkStatus(getContext(), PROVIDER); }
        catch (Throwable ignored) { return HealthConnectClient.SDK_UNAVAILABLE; }
    }

    private HealthConnectClient clientOrNull() {
        try {
            if (sdkStatus() != HealthConnectClient.SDK_AVAILABLE) return null;
            return HealthConnectClient.getOrCreate(getContext(), PROVIDER);
        } catch (Throwable ignored) { return null; }
    }

    private Set<String> granted() {
        try {
            HealthConnectClient client = clientOrNull();
            return client == null ? new LinkedHashSet<>() : client.getPermissionController().getGrantedPermissions();
        } catch (Throwable ignored) { return new LinkedHashSet<>(); }
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        int status = sdkStatus();
        Set<String> granted = granted();
        JSObject out = new JSObject();
        out.put("available", status == HealthConnectClient.SDK_AVAILABLE);
        out.put("status", status == HealthConnectClient.SDK_AVAILABLE ? "available" : status == HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED ? "update-required" : "unavailable");
        out.put("provider", PROVIDER);
        out.put("permissionsGranted", granted.containsAll(WORKOUT_PERMISSIONS));
        JSArray rows = new JSArray();
        for (String permission : granted) rows.put(permission);
        out.put("grantedPermissions", rows);
        call.resolve(out);
    }

    @PluginMethod
    public void requestWorkoutPermissions(PluginCall call) {
        if (sdkStatus() != HealthConnectClient.SDK_AVAILABLE) {
            call.reject("Health Connect unavailable", "HEALTH_CONNECT_UNAVAILABLE"); return;
        }
        try {
            ActivityResultContract<Set<String>, Set<String>> contract = PermissionController.createRequestPermissionResultContract(PROVIDER);
            Intent intent = contract.createIntent(getContext(), WORKOUT_PERMISSIONS);
            startActivityForResult(call, intent, "healthPermissionsResult");
        } catch (Throwable error) {
            call.reject("Unable to request Health Connect permissions: " + error.getMessage(), error);
        }
    }

    @ActivityCallback
    private void healthPermissionsResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        try {
            ActivityResultContract<Set<String>, Set<String>> contract = PermissionController.createRequestPermissionResultContract(PROVIDER);
            Set<String> permissions = contract.parseResult(result == null ? Activity.RESULT_CANCELED : result.getResultCode(), result == null ? null : result.getData());
            JSObject out = new JSObject();
            out.put("granted", permissions != null && permissions.containsAll(WORKOUT_PERMISSIONS));
            JSArray rows = new JSArray();
            if (permissions != null) for (String permission : permissions) rows.put(permission);
            out.put("permissions", rows);
            call.resolve(out);
        } catch (Throwable error) {
            call.reject("Unable to read Health Connect permission result: " + error.getMessage(), error);
        }
    }

    @PluginMethod
    public void openHealthConnect(PluginCall call) {
        try {
            int status = sdkStatus();
            if (status == HealthConnectClient.SDK_AVAILABLE) {
                Intent intent = HealthConnectClient.getHealthConnectManageDataIntent(getContext(), PROVIDER);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                call.resolve(); return;
            }
            Intent market = new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + PROVIDER + "&url=healthconnect%3A%2F%2Fonboarding"));
            market.setPackage("com.android.vending");
            market.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(market);
            call.resolve();
        } catch (Throwable error) {
            call.reject("Unable to open Health Connect: " + error.getMessage(), error);
        }
    }
}
