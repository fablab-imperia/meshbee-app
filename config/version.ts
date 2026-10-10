import Constants from 'expo-constants';

export const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';

export const APP_BUILD = String(
  Constants.expoConfig?.android?.versionCode ??
    Constants.expoConfig?.ios?.buildNumber ??
    ''
);

export const APP_VERSION_LABEL = APP_BUILD
  ? `Versione ${APP_VERSION} (${APP_BUILD})`
  : `Versione ${APP_VERSION}`;
