package com.multisportsscoring.app;

import android.os.Bundle;
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
        super.onCreate(savedInstanceState);
    }
}
