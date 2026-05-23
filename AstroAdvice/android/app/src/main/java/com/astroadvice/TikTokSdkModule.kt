package com.astroadvice

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.ReadableArray
import com.tiktok.TikTokBusinessSdk
import com.tiktok.appevents.base.EventName
import com.tiktok.appevents.base.TTBaseEvent
import org.json.JSONArray
import org.json.JSONObject

class TikTokSdkModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "TikTokSdk"

  @ReactMethod
  fun identify(
      externalId: String?,
      externalUserName: String?,
      phoneNumber: String?,
      email: String?
  ) {
    try {
      TikTokBusinessSdk.identify(
          externalId.orEmpty(),
          externalUserName.orEmpty(),
          phoneNumber.orEmpty(),
          email.orEmpty()
      )
    } catch (_: Throwable) {
      // no-op
    }
  }

  @ReactMethod
  fun logout() {
    try {
      TikTokBusinessSdk.logout()
    } catch (_: Throwable) {
      // no-op
    }
  }

  @ReactMethod
  fun trackEvent(name: String?, params: ReadableMap?) {
    if (name.isNullOrBlank()) return
    try {
      if (params == null) {
        TikTokBusinessSdk.trackEvent(name)
        return
      }
      TikTokBusinessSdk.trackEvent(name, readableMapToJson(params))
    } catch (_: Throwable) {
      // no-op
    }
  }

  @ReactMethod
  fun trackTTEvent(name: String?, params: ReadableMap?, eventId: String?) {
    if (name.isNullOrBlank()) return
    try {
      val properties = if (params == null) JSONObject() else readableMapToJson(params)
      val ttEvent = TTBaseEvent(name, properties, eventId.orEmpty())
      TikTokBusinessSdk.trackTTEvent(ttEvent)
    } catch (_: Throwable) {
      // no-op
    }
  }

  @ReactMethod
  fun trackStandardEvent(name: String?, eventId: String?) {
    if (name.isNullOrBlank()) return
    try {
      val event = EventName.valueOf(name)
      if (eventId.isNullOrBlank()) {
        TikTokBusinessSdk.trackTTEvent(event)
      } else {
        TikTokBusinessSdk.trackTTEvent(event, eventId)
      }
    } catch (_: Throwable) {
      // no-op
    }
  }

  @ReactMethod
  fun enableDebugMode() {
    try {
      TikTokBusinessSdk.enableDebugMode()
    } catch (_: Throwable) {
      // no-op
    }
  }

  @ReactMethod
  fun disableDebugMode() {
    try {
      TikTokBusinessSdk.disableDebugMode()
    } catch (_: Throwable) {
      // no-op
    }
  }

  private fun readableMapToJson(map: ReadableMap): JSONObject {
    val json = JSONObject()
    val iterator = map.keySetIterator()
    while (iterator.hasNextKey()) {
      val key = iterator.nextKey()
      when (map.getType(key)) {
        ReadableType.Null -> json.put(key, JSONObject.NULL)
        ReadableType.Boolean -> json.put(key, map.getBoolean(key))
        ReadableType.Number -> json.put(key, map.getDouble(key))
        ReadableType.String -> json.put(key, map.getString(key))
        ReadableType.Map -> {
          val child = map.getMap(key)
          json.put(key, if (child == null) JSONObject.NULL else readableMapToJson(child))
        }
        ReadableType.Array -> {
          val array = map.getArray(key)
          json.put(key, if (array == null) JSONObject.NULL else readableArrayToJson(array))
        }
      }
    }
    return json
  }

  private fun readableArrayToJson(array: ReadableArray): JSONArray {
    val json = JSONArray()
    for (i in 0 until array.size()) {
      when (array.getType(i)) {
        ReadableType.Null -> json.put(JSONObject.NULL)
        ReadableType.Boolean -> json.put(array.getBoolean(i))
        ReadableType.Number -> json.put(array.getDouble(i))
        ReadableType.String -> json.put(array.getString(i))
        ReadableType.Map -> {
          val child = array.getMap(i)
          json.put(if (child == null) JSONObject.NULL else readableMapToJson(child))
        }
        ReadableType.Array -> {
          val child = array.getArray(i)
          json.put(if (child == null) JSONObject.NULL else readableArrayToJson(child))
        }
      }
    }
    return json
  }
}
