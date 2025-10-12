// src/utils/nav.js
export function goBackOrHome(navigation) {
  if (navigation?.canGoBack?.()) navigation.goBack();
  else navigation.navigate('Home');
}
