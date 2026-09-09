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
import androidx.health.connect.client.units.Velocity;
import androidx.health.connect.client.records.metadata.Metadata;
import androidx.health.connect.client.request.ReadRecordsRequest;
import androidx.health.connect.client.response.ReadRecordsResponse;
import androidx.health.connect.client.response.InsertRecordsResponse;
import androidx.health.connect.client.units.Length;
import androidx.health.connect.client.time.TimeRangeFilter;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import kotlin.ResultKt;
import kotlin.coroutines.Continuation;
import kotlin.coroutines.CoroutineContext;
import kotlin.coroutines.EmptyCoroutineContext;
import kotlin.coroutines.intrinsics.IntrinsicsKt;
import kotlin.jvm.JvmClassMappingKt;

/** Health Connect workout bridge for RUNNING PERFORMANCE.
 * V15 adds real workout reads (session + route when available + HR/distance/speed/cadence/elevation).
 */
@CapacitorPlugin(name = "HealthConnect")
public class HealthConnectPlugin extends Plugin {
    private static final String PROVIDER = "com.google.android.apps.healthdata";
    private static final String READ_ROUTES = "android.permission.health.READ_EXERCISE_ROUTES";
    private static final String WRITE_ROUTES = "android.permission.health.WRITE_EXERCISE_ROUTE";

    // Google Play / Health Connect compliance:
    // - import only asks for data the app reads;
    // - export only asks for data the app really writes;
    // - optional metrics are skipped safely if the user denies one permission.
    private static final Set<String> IMPORT_CORE_PERMISSIONS = new LinkedHashSet<>(Arrays.asList(
        "android.permission.health.READ_EXERCISE"
    ));
    private static final Set<String> EXPORT_CORE_PERMISSIONS = new LinkedHashSet<>(Arrays.asList(
        "android.permission.health.WRITE_EXERCISE"
    ));
    private static final Set<String> IMPORT_WORKOUT_PERMISSIONS = new LinkedHashSet<>(Arrays.asList(
        "android.permission.health.READ_EXERCISE",
        "android.permission.health.READ_EXERCISE_ROUTES",
        "android.permission.health.READ_HEART_RATE",
        "android.permission.health.READ_DISTANCE",
        "android.permission.health.READ_SPEED",
        "android.permission.health.READ_ELEVATION_GAINED",
        "android.permission.health.READ_STEPS"
    ));
    private static final Set<String> EXPORT_WORKOUT_PERMISSIONS = new LinkedHashSet<>(Arrays.asList(
        "android.permission.health.WRITE_EXERCISE",
        "android.permission.health.WRITE_EXERCISE_ROUTE",
        "android.permission.health.WRITE_HEART_RATE",
        "android.permission.health.WRITE_DISTANCE",
        "android.permission.health.WRITE_SPEED",
        "android.permission.health.WRITE_ELEVATION_GAINED",
        "android.permission.health.WRITE_STEPS"
    ));
    private final ExecutorService io = Executors.newSingleThreadExecutor();

    /**
     * AndroidX Health Connect exposes several operations as Kotlin suspend functions.
     * Java sees those methods with an extra Continuation parameter, so calling them
     * directly without that parameter does not compile. This tiny bridge executes a
     * suspend call from the plugin's worker thread and waits for its completion.
     */
    @FunctionalInterface
    private interface SuspendCall<T> {
        Object invoke(Continuation<? super T> continuation) throws Exception;
    }

    @SuppressWarnings("unchecked")
    private <T> T awaitSuspend(SuspendCall<T> call) throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<T> value = new AtomicReference<>();
        AtomicReference<Throwable> failure = new AtomicReference<>();

        Continuation<T> continuation = new Continuation<T>() {
            @Override
            public CoroutineContext getContext() {
                return EmptyCoroutineContext.INSTANCE;
            }

            @Override
            public void resumeWith(Object result) {
                try {
                    ResultKt.throwOnFailure(result);
                    value.set((T) result);
                } catch (Throwable error) {
                    failure.set(error);
                } finally {
                    latch.countDown();
                }
            }
        };

        Object immediate;
        try {
            immediate = call.invoke(continuation);
        } catch (Throwable error) {
            if (error instanceof Exception) throw (Exception) error;
            throw new RuntimeException(error);
        }

        if (immediate != IntrinsicsKt.getCOROUTINE_SUSPENDED()) {
            ResultKt.throwOnFailure(immediate);
            return (T) immediate;
        }

        if (!latch.await(30, TimeUnit.SECONDS)) {
            throw new IllegalStateException("Health Connect operation timed out");
        }

        Throwable error = failure.get();
        if (error != null) {
            if (error instanceof Exception) throw (Exception) error;
            throw new RuntimeException(error);
        }
        return value.get();
    }

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
            if (client == null) return new LinkedHashSet<>();
            Set<String> result = awaitSuspend(continuation ->
                client.getPermissionController().getGrantedPermissions(continuation)
            );
            return result == null ? new LinkedHashSet<>() : result;
        } catch (Throwable ignored) {
            return new LinkedHashSet<>();
        }
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        // getGrantedPermissions() is a suspend operation: keep it off the UI thread.
        io.execute(() -> {
            int status = sdkStatus();
            Set<String> granted = granted();
            JSObject out = new JSObject();
            out.put("available", status == HealthConnectClient.SDK_AVAILABLE);
            out.put("status", status == HealthConnectClient.SDK_AVAILABLE ? "available" : status == HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED ? "update-required" : "unavailable");
            out.put("provider", PROVIDER);
            boolean importCoreGranted = granted.containsAll(IMPORT_CORE_PERMISSIONS);
            boolean exportCoreGranted = granted.containsAll(EXPORT_CORE_PERMISSIONS);
            out.put("permissionsGranted", importCoreGranted || exportCoreGranted); // legacy compatibility
            out.put("importPermissionsGranted", importCoreGranted);
            out.put("importAllPermissionsGranted", granted.containsAll(IMPORT_WORKOUT_PERMISSIONS));
            out.put("exportPermissionsGranted", exportCoreGranted);
            out.put("exportAllPermissionsGranted", granted.containsAll(EXPORT_WORKOUT_PERMISSIONS));
            out.put("exerciseRouteWriteGranted", granted.contains(WRITE_ROUTES));
            out.put("exerciseRoutesGranted", granted.contains(READ_ROUTES));
            JSArray rows = new JSArray();
            for (String permission : granted) rows.put(permission);
            out.put("grantedPermissions", rows);
            call.resolve(out);
        });
    }

    @PluginMethod
    public void requestWorkoutPermissions(PluginCall call) {
        if (sdkStatus() != HealthConnectClient.SDK_AVAILABLE) {
            call.reject("Health Connect unavailable", "HEALTH_CONNECT_UNAVAILABLE"); return;
        }
        try {
            String mode = call.getString("mode", "import");
            Set<String> requested = "export".equalsIgnoreCase(mode) ? EXPORT_WORKOUT_PERMISSIONS : IMPORT_WORKOUT_PERMISSIONS;
            ActivityResultContract<Set<String>, Set<String>> contract = PermissionController.createRequestPermissionResultContract(PROVIDER);
            Intent intent = contract.createIntent(getContext(), requested);
            startActivityForResult(call, intent, "healthPermissionsResult");
        } catch (Exception error) {
            call.reject("Unable to request Health Connect permissions: " + error.getMessage(), error);
        }
    }

    @ActivityCallback
    private void healthPermissionsResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        try {
            ActivityResultContract<Set<String>, Set<String>> contract = PermissionController.createRequestPermissionResultContract(PROVIDER);
            Set<String> permissions = contract.parseResult(result == null ? Activity.RESULT_CANCELED : result.getResultCode(), result == null ? null : result.getData());
            String mode = call.getString("mode", "import");
            Set<String> core = "export".equalsIgnoreCase(mode) ? EXPORT_CORE_PERMISSIONS : IMPORT_CORE_PERMISSIONS;
            JSObject out = new JSObject();
            out.put("mode", "export".equalsIgnoreCase(mode) ? "export" : "import");
            out.put("granted", permissions != null && permissions.containsAll(core));
            JSArray rows = new JSArray();
            if (permissions != null) for (String permission : permissions) rows.put(permission);
            out.put("permissions", rows);
            call.resolve(out);
        } catch (Exception error) {
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
                Set<String> permissions = awaitSuspend(continuation ->
                    client.getPermissionController().getGrantedPermissions(continuation)
                );
                if (!permissions.contains("android.permission.health.READ_EXERCISE")) {
                    throw new SecurityException("READ_EXERCISE permission is required");
                }
                Instant end = Instant.now().plus(1, ChronoUnit.MINUTES);
                Instant start = end.minus(days, ChronoUnit.DAYS);
                List<ExerciseSessionRecord> sessions = read(client, ExerciseSessionRecord.class, start, end, false, 250);
                JSArray out = new JSArray();
                for (ExerciseSessionRecord session : sessions) {
                    if (!isOutdoorPerformanceType(session.getExerciseType())) continue;
                    out.put(sessionToJson(client, session, permissions));
                }
                JSObject result = new JSObject();
                result.put("days", days);
                result.put("exerciseRoutesGranted", permissions.contains(READ_ROUTES));
                result.put("sessions", out);
                call.resolve(result);
            } catch (Exception error) {
                call.reject("Unable to read Health Connect workouts: " + safeMessage(error), error);
            }
        });
    }

    @PluginMethod
    public void writeWorkoutSession(PluginCall call) {
        if (sdkStatus() != HealthConnectClient.SDK_AVAILABLE) {
            call.reject("Health Connect unavailable", "HEALTH_CONNECT_UNAVAILABLE"); return;
        }
        final String clientRecordId = call.getString("clientRecordId", "");
        final String sport = call.getString("sport", "running");
        final String title = call.getString("title", "MULTISPORTS SCORING");
        final String notes = call.getString("notes", "");
        final Long startedAt = call.getLong("startedAt");
        final Long endedAt = call.getLong("endedAt");
        final Double distanceM = call.getDouble("distanceM", 0.0);
        final Double elevationGainM = call.getDouble("elevationGainM", 0.0);
        final JSArray routeInput = call.getArray("route", new JSArray());
        final JSArray sensorInput = call.getArray("sensorSamples", new JSArray());
        if (clientRecordId == null || clientRecordId.trim().isEmpty() || startedAt == null || endedAt == null || endedAt <= startedAt) {
            call.reject("Invalid workout payload"); return;
        }

        io.execute(() -> {
            try {
                HealthConnectClient client = clientOrNull();
                if (client == null) throw new IllegalStateException("Health Connect unavailable");
                Set<String> permissions = awaitSuspend(continuation -> client.getPermissionController().getGrantedPermissions(continuation));
                if (!permissions.contains("android.permission.health.WRITE_EXERCISE")) throw new SecurityException("WRITE_EXERCISE permission is required");

                Instant start = Instant.ofEpochMilli(startedAt);
                Instant end = Instant.ofEpochMilli(endedAt);
                ZoneOffset startOffset = ZoneId.systemDefault().getRules().getOffset(start);
                ZoneOffset endOffset = ZoneId.systemDefault().getRules().getOffset(end);
                Metadata sessionMetadata = Metadata.manualEntry(clientRecordId);
                ExerciseRoute exerciseRoute = null;

                if (routeInput != null && routeInput.length() >= 2 && permissions.contains(WRITE_ROUTES)) {
                    List<ExerciseRoute.Location> locations = new ArrayList<>();
                    for (int i = 0; i < routeInput.length(); i++) {
                        JSONObject point = routeInput.getJSONObject(i);
                        double lat = point.optDouble("lat", Double.NaN);
                        double lon = point.optDouble("lon", Double.NaN);
                        long timestamp = point.optLong("timestamp", 0L);
                        if (!Double.isFinite(lat) || !Double.isFinite(lon) || timestamp < startedAt || timestamp >= endedAt) continue;
                        Double accuracy = point.has("accuracy") ? point.optDouble("accuracy") : null;
                        Double altitude = point.has("altitude") ? point.optDouble("altitude") : null;
                        locations.add(new ExerciseRoute.Location(
                            Instant.ofEpochMilli(timestamp), lat, lon,
                            accuracy != null && Double.isFinite(accuracy) ? Length.meters(Math.max(0, accuracy)) : null,
                            null,
                            altitude != null && Double.isFinite(altitude) ? Length.meters(altitude) : null
                        ));
                    }
                    if (locations.size() >= 2) exerciseRoute = new ExerciseRoute(locations);
                }

                ExerciseSessionRecord session = new ExerciseSessionRecord(
                    start, startOffset, end, endOffset, sessionMetadata, exerciseTypeForSport(sport),
                    title, notes == null || notes.trim().isEmpty() ? null : notes,
                    Collections.emptyList(), Collections.emptyList(), exerciseRoute
                );
                List<Record> records = new ArrayList<>();
                records.add(session);
                if (distanceM != null && distanceM > 0 && permissions.contains("android.permission.health.WRITE_DISTANCE")) {
                    records.add(new DistanceRecord(start, startOffset, end, endOffset, Length.meters(distanceM), Metadata.manualEntry(clientRecordId + ":distance")));
                }
                if (elevationGainM != null && elevationGainM > 0 && permissions.contains("android.permission.health.WRITE_ELEVATION_GAINED")) {
                    records.add(new ElevationGainedRecord(start, startOffset, end, endOffset, Length.meters(elevationGainM), Metadata.manualEntry(clientRecordId + ":elevation")));
                }

                // Real metric export: only values actually recorded by MULTISPORTS SCORING
                // (BLE heart-rate strap, footpod/FTMS cadence+speed, or GPS-computed speed)
                // are written. No synthetic heart-rate/cadence values are invented.
                List<HeartRateRecord.Sample> heartRateSamples = new ArrayList<>();
                List<SpeedRecord.Sample> speedSamples = new ArrayList<>();
                List<StepsCadenceRecord.Sample> cadenceSamples = new ArrayList<>();
                long lastHrTs = Long.MIN_VALUE, lastSpeedTs = Long.MIN_VALUE, lastCadenceTs = Long.MIN_VALUE;

                if (sensorInput != null) {
                    for (int i = 0; i < sensorInput.length(); i++) {
                        JSONObject sample = sensorInput.optJSONObject(i);
                        if (sample == null) continue;
                        long timestamp = sample.optLong("timestamp", 0L);
                        if (timestamp < startedAt || timestamp >= endedAt) continue;
                        Instant sampleTime = Instant.ofEpochMilli(timestamp);

                        if (permissions.contains("android.permission.health.WRITE_HEART_RATE") && sample.has("heartRateBpm")) {
                            double raw = sample.optDouble("heartRateBpm", Double.NaN);
                            long bpm = Math.round(raw);
                            if (Double.isFinite(raw) && bpm >= 1 && bpm <= 300 && timestamp != lastHrTs) {
                                heartRateSamples.add(new HeartRateRecord.Sample(sampleTime, bpm));
                                lastHrTs = timestamp;
                            }
                        }
                        if (permissions.contains("android.permission.health.WRITE_SPEED") && sample.has("sensorSpeedMps")) {
                            double speed = sample.optDouble("sensorSpeedMps", Double.NaN);
                            if (Double.isFinite(speed) && speed >= 0 && speed <= 100 && timestamp != lastSpeedTs) {
                                speedSamples.add(new SpeedRecord.Sample(sampleTime, Velocity.metersPerSecond(speed)));
                                lastSpeedTs = timestamp;
                            }
                        }
                        if (permissions.contains("android.permission.health.WRITE_STEPS") && sample.has("cadenceSpm")) {
                            double cadence = sample.optDouble("cadenceSpm", Double.NaN);
                            if (Double.isFinite(cadence) && cadence >= 0 && cadence <= 1000 && timestamp != lastCadenceTs) {
                                cadenceSamples.add(new StepsCadenceRecord.Sample(sampleTime, cadence));
                                lastCadenceTs = timestamp;
                            }
                        }
                    }
                }

                heartRateSamples.sort(Comparator.comparing(HeartRateRecord.Sample::getTime));
                speedSamples.sort(Comparator.comparing(SpeedRecord.Sample::getTime));
                cadenceSamples.sort(Comparator.comparing(StepsCadenceRecord.Sample::getTime));

                if (!heartRateSamples.isEmpty()) {
                    records.add(new HeartRateRecord(start, startOffset, end, endOffset, heartRateSamples, Metadata.manualEntry(clientRecordId + ":heart-rate")));
                }
                if (!speedSamples.isEmpty()) {
                    records.add(new SpeedRecord(start, startOffset, end, endOffset, speedSamples, Metadata.manualEntry(clientRecordId + ":speed")));
                }
                if (!cadenceSamples.isEmpty()) {
                    records.add(new StepsCadenceRecord(start, startOffset, end, endOffset, cadenceSamples, Metadata.manualEntry(clientRecordId + ":cadence")));
                }

                InsertRecordsResponse inserted = awaitSuspend(continuation -> client.insertRecords(records, continuation));
                JSObject result = new JSObject();
                result.put("clientRecordId", clientRecordId);
                JSArray recordIds = new JSArray();
                for (String id : inserted.getRecordIdsList()) recordIds.put(id);
                result.put("recordIds", recordIds);
                result.put("routeWritten", exerciseRoute != null);
                result.put("heartRateSamplesWritten", heartRateSamples.size());
                result.put("speedSamplesWritten", speedSamples.size());
                result.put("cadenceSamplesWritten", cadenceSamples.size());
                call.resolve(result);
            } catch (Exception error) {
                call.reject("Unable to write Health Connect workout: " + safeMessage(error), error);
            }
        });
    }

    private int exerciseTypeForSport(String sport) {
        String value = sport == null ? "" : sport.trim().toLowerCase();
        if ("treadmill".equals(value)) return ExerciseSessionRecord.EXERCISE_TYPE_RUNNING_TREADMILL;
        if ("hiking".equals(value)) return ExerciseSessionRecord.EXERCISE_TYPE_HIKING;
        if ("walking".equals(value) || "nordic-walking".equals(value)) return ExerciseSessionRecord.EXERCISE_TYPE_WALKING;
        return ExerciseSessionRecord.EXERCISE_TYPE_RUNNING;
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
        } catch (Exception error) {
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
        } catch (Exception error) {
            call.reject("Unable to read exercise route result: " + safeMessage(error), error);
        }
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private <T extends Record> List<T> read(HealthConnectClient client, Class<T> type, Instant start, Instant end, boolean ascending, int pageSize) throws Exception {
        ReadRecordsRequest<T> request = new ReadRecordsRequest(
            JvmClassMappingKt.getKotlinClass(type),
            TimeRangeFilter.between(start, end),
            Collections.emptySet(),
            ascending,
            pageSize,
            null
        );
        ReadRecordsResponse<T> response = this.<ReadRecordsResponse<T>>awaitSuspend(continuation ->
            client.readRecords(request, continuation)
        );
        return response.getRecords();
    }

    private JSObject sessionToJson(HealthConnectClient client, ExerciseSessionRecord session, Set<String> permissions) throws Exception {
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
        if (permissions.contains("android.permission.health.READ_DISTANCE")) {
            for (DistanceRecord record : read(client, DistanceRecord.class, start, end, true, 1000)) {
                if (!sameOrigin(record, originPackage)) continue;
                distanceM += record.getDistance().getMeters();
            }
        }
        row.put("distanceM", distanceM);

        double elevationM = 0;
        if (permissions.contains("android.permission.health.READ_ELEVATION_GAINED")) {
            for (ElevationGainedRecord record : read(client, ElevationGainedRecord.class, start, end, true, 1000)) {
                if (!sameOrigin(record, originPackage)) continue;
                elevationM += record.getElevation().getMeters();
            }
        }
        row.put("elevationGainM", elevationM);

        JSArray hr = new JSArray();
        if (permissions.contains("android.permission.health.READ_HEART_RATE")) {
            for (HeartRateRecord record : read(client, HeartRateRecord.class, start, end, true, 1000)) {
                if (!sameOrigin(record, originPackage)) continue;
                for (HeartRateRecord.Sample sample : record.getSamples()) {
                    JSObject sampleJson = new JSObject();
                    sampleJson.put("timestamp", sample.getTime().toEpochMilli());
                    sampleJson.put("heartRateBpm", sample.getBeatsPerMinute());
                    hr.put(sampleJson);
                }
            }
        }
        row.put("heartRate", hr);

        JSArray speed = new JSArray();
        if (permissions.contains("android.permission.health.READ_SPEED")) {
            for (SpeedRecord record : read(client, SpeedRecord.class, start, end, true, 1000)) {
                if (!sameOrigin(record, originPackage)) continue;
                for (SpeedRecord.Sample sample : record.getSamples()) {
                    JSObject sampleJson = new JSObject();
                    sampleJson.put("timestamp", sample.getTime().toEpochMilli());
                    sampleJson.put("sensorSpeedMps", sample.getSpeed().getMetersPerSecond());
                    speed.put(sampleJson);
                }
            }
        }
        row.put("speed", speed);

        JSArray cadence = new JSArray();
        if (permissions.contains("android.permission.health.READ_STEPS")) {
            for (StepsCadenceRecord record : read(client, StepsCadenceRecord.class, start, end, true, 1000)) {
                if (!sameOrigin(record, originPackage)) continue;
                for (StepsCadenceRecord.Sample sample : record.getSamples()) {
                    JSObject sampleJson = new JSObject();
                    sampleJson.put("timestamp", sample.getTime().toEpochMilli());
                    sampleJson.put("cadenceSpm", sample.getRate());
                    cadence.put(sampleJson);
                }
            }
        }
        row.put("cadence", cadence);

        ExerciseRouteResult routeResult = session.getExerciseRouteResult();
        if (routeResult instanceof ExerciseRouteResult.Data) {
            row.put("route", routeToJson(((ExerciseRouteResult.Data) routeResult).getExerciseRoute()));
            row.put("routeStatus", "data");
        } else if (routeResult instanceof ExerciseRouteResult.ConsentRequired) {
            row.put("route", new JSArray());
            row.put("routeStatus", permissions.contains(READ_ROUTES) ? "consent-required" : "permission-required");
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
        } catch (Exception error) {
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
