// AstroAdvice/src/utils/nav.js
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  } else {
    console.warn(
      '[nav] Navigation not ready. Tried to navigate to:',
      name,
      params
    );
  }
}

export function goBackOrHome() {
  if (!navigationRef.isReady()) {
    console.warn('[nav] Navigation not ready. Tried to go back or home.');
    return;
  }
  if (navigationRef.canGoBack()) {
    navigationRef.goBack();
    return;
  }
  navigationRef.navigate('Home');
}
