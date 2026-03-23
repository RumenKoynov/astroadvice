package com.astroadvice

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters

class DailyNotificationWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : Worker(appContext, workerParams) {

  override fun doWork(): Result {
    NotificationHelper.showDailyNotification(applicationContext)
    return Result.success()
  }
}
