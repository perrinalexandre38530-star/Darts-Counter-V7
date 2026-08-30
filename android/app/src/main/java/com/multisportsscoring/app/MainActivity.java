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
        KeepAwakePlugin.applyToActivity(this, KeepAwakePlugin.getStoredEnabled(this));
    }

    @Override
    protected void onResume() {
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
