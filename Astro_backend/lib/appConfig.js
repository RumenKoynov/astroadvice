const DEFAULT_ANDROID_VERSION = '1.1.3';
const DEFAULT_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.astroadvice';

function getAppConfig() {
  const latestVersionAndroid = process.env.ANDROID_LATEST_VERSION || DEFAULT_ANDROID_VERSION;
  return {
    latestVersionAndroid,
    minVersionAndroid: latestVersionAndroid,
    playStoreUrlAndroid: process.env.PLAY_STORE_URL_ANDROID || DEFAULT_PLAY_STORE_URL,
  };
}

module.exports = { getAppConfig };

