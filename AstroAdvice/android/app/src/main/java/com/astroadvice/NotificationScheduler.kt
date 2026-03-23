package com.astroadvice

import android.content.Context
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.time.Duration
import java.time.ZonedDateTime
import java.util.concurrent.TimeUnit

object NotificationScheduler {
  private const val UNIQUE_WORK_NAME = "daily_astroadvice"

  fun scheduleDaily(context: Context) {
    val initialDelay = computeInitialDelayMillis()
    val request =
        PeriodicWorkRequestBuilder<DailyNotificationWorker>(1, TimeUnit.DAYS)
            .setInitialDelay(initialDelay, TimeUnit.MILLISECONDS)
            .build()

    WorkManager.getInstance(context).enqueueUniquePeriodicWork(
        UNIQUE_WORK_NAME,
        ExistingPeriodicWorkPolicy.UPDATE,
        request
    )
  }

  private fun computeInitialDelayMillis(): Long {
    val now = ZonedDateTime.now()
    var next = now
        .withHour(9)
        .withMinute(0)
        .withSecond(0)
        .withNano(0)
    if (!next.isAfter(now)) {
      next = next.plusDays(1)
    }
    return Duration.between(now, next).toMillis()
  }
}
