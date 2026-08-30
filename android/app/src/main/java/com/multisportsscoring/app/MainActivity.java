package com.multisportsscoring.app;

import android.os.Bundle;
import android.content.Intent;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PlayBillingPlugin.class);
        registerPlugin(InlineAdMobPlugin.class);
        registerPlugin(NativeJsonExportPlugin.class);
        registerPlugin(AwenaVoicePlugin.class);
        registerPlugin(AwenaSpeechRecognitionPlugin.class);
        registerPlugin(AwenaTranslationPlugin.class);
        registerPlugin(ActivityTrackingPlugin.class);
        registerPlugin(HealthConnectPlugin.class);
        registerPlugin(SocialAuthPlugin.class);
        registerPlugin(KeepAwakePlugin.class);
        super.onCreate(savedInstanceState);

        // Background navigation music must be able to start immediately after
        // the intro without waiting for a tap on the Android WebView.
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
            }
        } catch (Throwable ignored) {}

        KeepAwakePlugin.applyToActivity(this, KeepAwakePlugin.getStoredEnabled(this));
    }

    @Override
    public void onResume() {
        super.onResume();
        KeepAwakePlugin.applyToActivity(this, KeepAwakePlugin.getStoredEnabled(this));
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // launchMode=singleTask : conserve le dernier deep link OAuth pour le bridge JS.
        setIntent(intent);
    }

}
