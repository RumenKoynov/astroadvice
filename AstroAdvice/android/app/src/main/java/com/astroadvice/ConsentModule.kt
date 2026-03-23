package com.astroadvice

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.android.ump.ConsentInformation
import com.google.android.ump.UserMessagingPlatform

class ConsentModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "UMPConsent"

  @ReactMethod
  fun getPrivacyOptionsRequirementStatus(promise: Promise) {
    try {
      val consentInformation = UserMessagingPlatform.getConsentInformation(reactApplicationContext)
      val status = when (consentInformation.privacyOptionsRequirementStatus) {
        ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED -> "REQUIRED"
        ConsentInformation.PrivacyOptionsRequirementStatus.NOT_REQUIRED -> "NOT_REQUIRED"
        ConsentInformation.PrivacyOptionsRequirementStatus.UNKNOWN -> "UNKNOWN"
        else -> "UNKNOWN"
      }
      promise.resolve(status)
    } catch (e: Exception) {
      promise.reject("UMP_STATUS_ERROR", e)
    }
  }

  @ReactMethod
  fun showPrivacyOptionsForm(promise: Promise) {
    val activity = currentActivity
    if (activity == null) {
      promise.reject("UMP_NO_ACTIVITY", "Activity is not available")
      return
    }

    activity.runOnUiThread {
      UserMessagingPlatform.showPrivacyOptionsForm(activity) { formError ->
        if (formError != null) {
          promise.reject("UMP_FORM_ERROR", formError.message)
        } else {
          promise.resolve(true)
        }
      }
    }
  }
}
