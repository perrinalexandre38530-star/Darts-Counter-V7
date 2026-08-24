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
        super.onCreate(savedInstanceState);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // launchMode=singleTask : conserve le dernier deep link OAuth pour le bridge JS.
        setIntent(intent);
    }

}
