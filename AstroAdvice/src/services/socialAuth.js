// src/services/socialAuth.js
// One consolidated social auth helper file (Facebook + Google).
// Install & configure native SDKs separately per their docs:
//
// - Facebook: react-native-fbsdk-next
// - Google: @react-native-google-signin/google-signin
//
// These helpers expect you to call them from a component that has access
// to the AuthContext (e.g., const auth = useAuth()) and will call auth.login(res).

import { Platform } from 'react-native';
import { apiFetch } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Facebook SDK
import { LoginManager, AccessToken } from 'react-native-fbsdk-next';

// Google SDK
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Optional: call this once during app startup with your webClientId
export function configureGoogle({ webClientId }) {
  GoogleSignin.configure({ webClientId, offlineAccess: true });
}

// ---------------- Facebook login then server ----------------
export async function facebookSignInThenServerLogin(auth) {
  // auth: the object returned from useAuth() (has login() method)
  // 1) trigger FB login
  const result = await LoginManager.logInWithPermissions(['public_profile']);
  if (!result || result.isCancelled) {
    throw new Error('Facebook login cancelled');
  }

  // 2) get access token
  const data = await AccessToken.getCurrentAccessToken();
  if (!data || !data.accessToken) {
    throw new Error('Failed to obtain Facebook access token');
  }
  const fbToken = data.accessToken.toString();

  // 3) send to server
  const res = await apiFetch('/auth/facebook', 'POST', { accessToken: fbToken });
  // Server must return { token, refreshToken, user }
  if (!res || !res.token) {
    throw new Error(res?.error || 'Server failed to sign in with Facebook');
  }

  // 4) persist via AuthContext
  if (!auth || typeof auth.login !== 'function') {
    // fallback: store tokens manually (not recommended; prefer auth.login)
    await AsyncStorage.multiSet([
      ['token', res.token || ''],
      ['refreshToken', res.refreshToken || ''],
      ['user', JSON.stringify(res.user || null)],
    ]);
  } else {
    await auth.login(res);
  }

  return res;
}

// ---------------- Google login then server ----------------
export async function googleSignInThenServerLogin(auth) {
  // 1) Ensure GoogleSignin is configured (call configureGoogle in app init)
  // 2) Start sign-in
  const userInfo = await GoogleSignin.signIn();
  // userInfo often contains idToken; we try to get accessToken too
  let accessToken = null;
  try {
    const tokens = await GoogleSignin.getTokens();
    accessToken = tokens?.accessToken || null;
  } catch (e) {
    // ignore; we may still have idToken
  }

  const idToken = userInfo?.idToken || null;
  const tokenToSend = accessToken || idToken;
  if (!tokenToSend) {
    throw new Error('Failed to obtain Google token (idToken or accessToken required)');
  }

  // 3) send to server. The server code earlier accepts an "accessToken" field;
  //    if you send an idToken, ensure your server strategy accepts it.
  const res = await apiFetch('/auth/google', 'POST', { accessToken: tokenToSend });
  if (!res || !res.token) {
    throw new Error(res?.error || 'Server failed to sign in with Google');
  }

  // 4) persist via AuthContext
  if (!auth || typeof auth.login !== 'function') {
    await AsyncStorage.multiSet([
      ['token', res.token || ''],
      ['refreshToken', res.refreshToken || ''],
      ['user', JSON.stringify(res.user || null)],
    ]);
  } else {
    await auth.login(res);
  }

  return res;
}

// ---------------- Optional helper: sign-out from native SDKs ----------------
export async function socialSignOut() {
  try {
    // Google sign out
    const isSignedIn = await GoogleSignin.isSignedIn();
    if (isSignedIn) {
      await GoogleSignin.signOut();
    }
  } catch (_) {}
  try {
    // Facebook logout
    await LoginManager.logOut();
  } catch (_) {}
}

