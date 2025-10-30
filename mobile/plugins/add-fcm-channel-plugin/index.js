const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo config plugin to add FCM default notification channel meta-data
 * and ensure tools:replace is set so manifest merger won't fail.
 */
module.exports = function withFcmChannel(config) {
  return withAndroidManifest(config, (config) => {
    const modResults = config.modResults;

    // Ensure tools namespace on manifest root
    modResults.manifest = modResults.manifest || {};
    modResults.manifest.$ = modResults.manifest.$ || {};
    modResults.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    const application = (modResults.manifest.application = modResults.manifest.application || []);
    // Use the first application node
    const appNode = application[0] || {};
    appNode['meta-data'] = appNode['meta-data'] || [];

    const metaName = 'com.google.firebase.messaging.default_notification_channel_id';

    // Find existing meta-data
    const existing = appNode['meta-data'].find((m) => m.$ && m.$['android:name'] === metaName);
    if (existing) {
      existing.$['android:value'] = 'default';
      existing.$['tools:replace'] = 'android:value';
    } else {
      appNode['meta-data'].push({
        $: {
          'android:name': metaName,
          'android:value': 'default',
          'tools:replace': 'android:value',
        },
      });
    }

    // Make sure the application node is set back
    modResults.manifest.application[0] = appNode;
    config.modResults = modResults;
    return config;
  });
};

module.exports.default = module.exports;
