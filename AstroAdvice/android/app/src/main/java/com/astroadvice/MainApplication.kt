package com.astroadvice

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import com.tiktok.TikTokBusinessSdk

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              // add(MyReactNativePackage())
              add(ConsentPackage())
              add(TikTokSdkPackage())
            }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, OpenSourceMergedSoMapping)

    if (BuildConfig.TIKTOK_TT_APP_ID.isNotBlank() && BuildConfig.TIKTOK_APP_SECRET.isNotBlank()) {
      val ttConfig =
          TikTokBusinessSdk.TTConfig(this, BuildConfig.TIKTOK_APP_SECRET)
              .setAppId(BuildConfig.APPLICATION_ID)
              .setTTAppId(BuildConfig.TIKTOK_TT_APP_ID)

      if (BuildConfig.DEBUG) {
        ttConfig.setLogLevel(TikTokBusinessSdk.LogLevel.DEBUG)
      }

      TikTokBusinessSdk.initializeSdk(ttConfig)
      TikTokBusinessSdk.registerEDPLifecycleCallback(this)
    }

    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
    }
  }
}
