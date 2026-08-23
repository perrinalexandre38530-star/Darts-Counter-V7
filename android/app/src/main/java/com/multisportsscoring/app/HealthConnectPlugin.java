package com.multisportsscoring.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;

import androidx.activity.result.ActivityResult;
import androidx.activity.result.contract.ActivityResultContract;
import androidx.health.connect.client.HealthConnectClient;
import androidx.health.connect.client.PermissionController;
import androidx.health.connect.client.contracts.ExerciseRouteRequestContract;
import androidx.health.connect.client.records.DistanceRecord;
import androidx.health.connect.client.records.ElevationGainedRecord;
import androidx.health.connect.client.records.ExerciseRoute;
import androidx.health.connect.client.records.ExerciseRouteResult;
import androidx.health.connect.client.records.ExerciseSessionRecord;
import androidx.health.connect.client.records.HeartRateRecord;
import androidx.health.connect.client.records.Record;
import androidx.health.connect.client.records.SpeedRecord;
import androidx.health.connect.client.records.StepsCadenceRecord;
import androidx.health.connect.client.records.metadata.Metadata;
import androidx.health.connect.client.request.ReadRecordsRequest;
import androidx.health.connect.client.response.ReadRecordsResponse;
import androidx.health.connect.client.time.TimeRangeFilter;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import kotlin.jvm.JvmClassMappingKt;

/** Health Connect workout bridge for RUNNING PERFORMANCE.
 * V15 adds real workout reads (session + route when available + HR/distance/speed/cadence/elevation).
 */
@CapacitorPlugin(name = "HealthConnect")
public class HealthConnectPlugin extends Plugin {
    private static final String PROVIDER = "com.google.android.apps.healthdata";
    private static final String READ_ROUTES = "android.permission.health.READ_EXERCISE_ROUTES";
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
    private final ExecutorService io = Executors.newSingleThreadExecutor();

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
        out.put("exerciseRoutesGranted", granted.contains(READ_ROUTES));
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
    public void readWorkoutSessions(PluginCall call) {
        if (sdkStatus() != HealthConnectClient.SDK_AVAILABLE) {
            call.reject("Health Connect unavailable", "HEALTH_CONNECT_UNAVAILABLE"); return;
        }
        int requestedDays = call.getInt("days", 30);
        final int days = Math.max(1, Math.min(30, requestedDays));
        io.execute(() -> {
            try {
                HealthConnectClient client = clientOrNull();
                if (client == null) throw new IllegalStateException("Health Connect unavailable");
                Set<String> permissions = client.getPermissionController().getGrantedPermissions();
                if (!permissions.contains("android.permission.health.READ_EXERCISE")) {
                    throw new SecurityException("READ_EXERCISE permission is required");
                }
                Instant end = Instant.now().plus(1, ChronoUnit.MINUTES);
                Instant start = end.minus(days, ChronoUnit.DAYS);
                List<ExerciseSessionRecord> sessions = read(client, ExerciseSessionRecord.class, start, end, false, 250);
                JSArray out = new JSArray();
                for (ExerciseSessionRecord session : sessions) {
                    if (!isOutdoorPerformanceType(session.getExerciseType())) continue;
                    out.put(sessionToJson(client, session, permissions.contains(READ_ROUTES)));
                }
                JSObject result = new JSObject();
                result.put("days", days);
                result.put("exerciseRoutesGranted", permissions.contains(READ_ROUTES));
                result.put("sessions", out);
                call.resolve(result);
            } catch (Throwable error) {
                call.reject("Unable to read Health Connect workouts: " + safeMessage(error), error);
            }
        });
    }

    @PluginMethod
    public void requestExerciseRoute(PluginCall call) {
        String sessionId = call.getString("sessionId", "");
        if (sessionId == null || sessionId.trim().isEmpty()) {
            call.reject("sessionId required"); return;
        }
        try {
            ExerciseRouteRequestContract contract = new ExerciseRouteRequestContract();
            Intent intent = contract.createIntent(getContext(), sessionId);
            startActivityForResult(call, intent, "exerciseRouteResult");
        } catch (Throwable error) {
            call.reject("Unable to request exercise route: " + safeMessage(error), error);
        }
    }

    @ActivityCallback
    private void exerciseRouteResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        try {
            ExerciseRouteRequestContract contract = new ExerciseRouteRequestContract();
            ExerciseRoute route = contract.parseResult(result == null ? Activity.RESULT_CANCELED : result.getResultCode(), result == null ? null : result.getData());
            JSObject out = new JSObject();
            out.put("route", route == null ? new JSArray() : routeToJson(route));
            out.put("granted", route != null);
            call.resolve(out);
        } catch (Throwable error) {
            call.reject("Unable to read exercise route result: " + safeMessage(error), error);
        }
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private <T extends Record> List<T> read(HealthConnectClient client, Class<T> type, Instant start, Instant end, boolean ascending, int pageSize) {
        ReadRecordsRequest<T> request = new ReadRecordsRequest(
            JvmClassMappingKt.getKotlinClass(type),
            TimeRangeFilter.between(start, end),
            Collections.emptySet(),
            ascending,
            pageSize,
            null
        );
        ReadRecordsResponse<T> response = client.readRecords(request);
        return response.getRecords();
    }

    private JSObject sessionToJson(HealthConnectClient client, ExerciseSessionRecord session, boolean routesGranted) {
        Instant start = session.getStartTime();
        Instant end = session.getEndTime();
        Metadata metadata = session.getMetadata();
        JSObject row = new JSObject();
        row.put("recordId", metadata.getId());
        row.put("clientRecordId", metadata.getClientRecordId());
        row.put("originPackage", metadata.getDataOrigin().getPackageName());
        row.put("exerciseType", session.getExerciseType());
        row.put("title", session.getTitle());
        row.put("notes", session.getNotes());
        row.put("startedAt", start.toEpochMilli());
        row.put("endedAt", end.toEpochMilli());

        String originPackage = metadata.getDataOrigin().getPackageName();

        double distanceM = 0;
        for (DistanceRecord record : read(client, DistanceRecord.class, start, end, true, 1000)) {
            if (!sameOrigin(record, originPackage)) continue;
            distanceM += record.getDistance().getMeters();
        }
        row.put("distanceM", distanceM);

        double elevationM = 0;
        for (ElevationGainedRecord record : read(client, ElevationGainedRecord.class, start, end, true, 1000)) {
            if (!sameOrigin(record, originPackage)) continue;
            elevationM += record.getElevation().getMeters();
        }
        row.put("elevationGainM", elevationM);

        JSArray hr = new JSArray();
        for (HeartRateRecord record : read(client, HeartRateRecord.class, start, end, true, 1000)) {
            if (!sameOrigin(record, originPackage)) continue;
            for (HeartRateRecord.Sample sample : record.getSamples()) {
                JSObject sampleJson = new JSObject();
                sampleJson.put("timestamp", sample.getTime().toEpochMilli());
                sampleJson.put("heartRateBpm", sample.getBeatsPerMinute());
                hr.put(sampleJson);
            }
        }
        row.put("heartRate", hr);

        JSArray speed = new JSArray();
        for (SpeedRecord record : read(client, SpeedRecord.class, start, end, true, 1000)) {
            if (!sameOrigin(record, originPackage)) continue;
            for (SpeedRecord.Sample sample : record.getSamples()) {
                JSObject sampleJson = new JSObject();
                sampleJson.put("timestamp", sample.getTime().toEpochMilli());
                sampleJson.put("sensorSpeedMps", sample.getSpeed().getMetersPerSecond());
                speed.put(sampleJson);
            }
        }
        row.put("speed", speed);

        JSArray cadence = new JSArray();
        for (StepsCadenceRecord record : read(client, StepsCadenceRecord.class, start, end, true, 1000)) {
            if (!sameOrigin(record, originPackage)) continue;
            for (StepsCadenceRecord.Sample sample : record.getSamples()) {
                JSObject sampleJson = new JSObject();
                sampleJson.put("timestamp", sample.getTime().toEpochMilli());
                sampleJson.put("cadenceSpm", sample.getRate());
                cadence.put(sampleJson);
            }
        }
        row.put("cadence", cadence);

        ExerciseRouteResult routeResult = session.getExerciseRouteResult();
        if (routeResult instanceof ExerciseRouteResult.Data) {
            row.put("route", routeToJson(((ExerciseRouteResult.Data) routeResult).getExerciseRoute()));
            row.put("routeStatus", "data");
        } else if (routeResult instanceof ExerciseRouteResult.ConsentRequired) {
            row.put("route", new JSArray());
            row.put("routeStatus", routesGranted ? "consent-required" : "permission-required");
        } else {
            row.put("route", new JSArray());
            row.put("routeStatus", "none");
        }
        return row;
    }

    private boolean sameOrigin(Record record, String packageName) {
        if (record == null || packageName == null || packageName.trim().isEmpty()) return true;
        try {
            String origin = record.getMetadata().getDataOrigin().getPackageName();
            return packageName.equals(origin);
        } catch (Throwable ignored) { return true; }
    }

    private JSArray routeToJson(ExerciseRoute route) {
        JSArray result = new JSArray();
        if (route == null) return result;
        List<ExerciseRoute.Location> points = new ArrayList<>(route.getRoute());
        points.sort(Comparator.comparing(ExerciseRoute.Location::getTime));
        for (ExerciseRoute.Location point : points) {
            JSObject p = new JSObject();
            p.put("lat", point.getLatitude());
            p.put("lon", point.getLongitude());
            p.put("timestamp", point.getTime().toEpochMilli());
            if (point.getAltitude() != null) p.put("altitude", point.getAltitude().getMeters());
            if (point.getHorizontalAccuracy() != null) p.put("accuracy", point.getHorizontalAccuracy().getMeters());
            result.put(p);
        }
        return result;
    }

    private boolean isOutdoorPerformanceType(int type) {
        return type == ExerciseSessionRecord.EXERCISE_TYPE_RUNNING
            || type == ExerciseSessionRecord.EXERCISE_TYPE_RUNNING_TREADMILL
            || type == ExerciseSessionRecord.EXERCISE_TYPE_HIKING
            || type == ExerciseSessionRecord.EXERCISE_TYPE_WALKING;
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
            call.reject("Unable to open Health Connect: " + safeMessage(error), error);
        }
    }

    private static String safeMessage(Throwable error) {
        if (error == null) return "unknown error";
        String message = error.getMessage();
        return message == null || message.trim().isEmpty() ? error.getClass().getSimpleName() : message;
    }

    @Override
    protected void handleOnDestroy() {
        try { io.shutdownNow(); } catch (Throwable ignored) {}
        super.handleOnDestroy();
    }
}
