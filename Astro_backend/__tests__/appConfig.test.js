const test = require('node:test');
const assert = require('node:assert/strict');
const { getAppConfig } = require('../lib/appConfig');

test('app config enforces minVersionAndroid == latestVersionAndroid', () => {
  process.env.ANDROID_LATEST_VERSION = '9.9.9';
  const cfg = getAppConfig();
  assert.equal(cfg.latestVersionAndroid, '9.9.9');
  assert.equal(cfg.minVersionAndroid, '9.9.9');
});

