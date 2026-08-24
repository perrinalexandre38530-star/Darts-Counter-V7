package com.multisportsscoring.app;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Health Connect permission-rationale entry point.
 *
 * Shows the same public privacy policy exposed from Settings so the Android
 * Health Connect permission flow does not reuse MainActivity as a rationale
 * screen. JavaScript and DOM storage are intentionally disabled.
 */
public class PermissionsRationaleActivity extends Activity {
    private static final String PRIVACY_POLICY_URL = "https://multisports-scoring.pages.dev/privacy-policy";
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setTitle("MULTISPORTS SCORING — Confidentialité");

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(7, 10, 14));

        TextView header = new TextView(this);
        header.setText("RUNNING PERFORMANCE · DONNÉES & CONFIDENTIALITÉ");
        header.setTextColor(Color.WHITE);
        header.setTextSize(15f);
        header.setPadding(32, 28, 32, 24);
        root.addView(header, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ));

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(false);
        settings.setDomStorageEnabled(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        webView.setBackgroundColor(Color.rgb(7, 10, 14));
        webView.setWebViewClient(new WebViewClient());
        webView.loadUrl(PRIVACY_POLICY_URL);

        root.addView(webView, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            0,
            1f
        ));
        setContentView(root);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
