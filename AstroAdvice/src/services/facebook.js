import { AppEventsLogger } from 'react-native-fbsdk-next';

const normalizeParamValue = (value) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  return String(value);
};

const normalizeParams = (params = {}) => {
  const out = {};
  Object.entries(params).forEach(([key, value]) => {
    const next = normalizeParamValue(value);
    if (next !== undefined) out[key] = next;
  });
  return out;
};

export function fbLogEvent(name, params) {
  try {
    if (!name) return;
    const normalized = params ? normalizeParams(params) : undefined;
    if (normalized) AppEventsLogger.logEvent(String(name), normalized);
    else AppEventsLogger.logEvent(String(name));
  } catch {
    // no-op
  }
}

export function fbLogViewedContent({ contentType, contentId, extraParams } = {}) {
  try {
    AppEventsLogger.logEvent(AppEventsLogger.AppEvents.ViewedContent, {
      ...(contentType ? { [AppEventsLogger.AppEventParams.ContentType]: String(contentType) } : null),
      ...(contentId ? { [AppEventsLogger.AppEventParams.ContentID]: String(contentId) } : null),
      ...(extraParams ? normalizeParams(extraParams) : null),
    });
  } catch {
    // no-op
  }
}

