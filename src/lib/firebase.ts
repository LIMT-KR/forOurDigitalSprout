import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const provider = new GoogleAuthProvider();
// Add the spreadsheets.readonly scope
provider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');
// We can also add userinfo scopes for profile pictures
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
provider.addScope('https://www.googleapis.com/auth/userinfo.email');

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let isRedirectResultHandled = false;

// Initialize auth state listener.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  let isUnsubscribed = false;

  // Helper to handle success
  const handleSuccess = (user: User, token: string) => {
    if (isUnsubscribed) return;
    cachedAccessToken = token;
    localStorage.setItem('oauth_access_token', token);
    if (onAuthSuccess) onAuthSuccess(user, token);
  };

  // Helper to handle failure
  const handleFailure = () => {
    if (isUnsubscribed) return;
    cachedAccessToken = null;
    localStorage.removeItem('oauth_access_token');
    if (onAuthFailure) onAuthFailure();
  };

  // 1. Handle redirect result
  getRedirectResult(auth)
    .then((result) => {
      isRedirectResultHandled = true;
      if (isUnsubscribed) return;
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          handleSuccess(result.user, credential.accessToken);
          return;
        }
      }
      
      // If getRedirectResult finished but returned no credentials, check current auth state
      const currentUser = auth.currentUser;
      if (currentUser) {
        const savedToken = cachedAccessToken || localStorage.getItem('oauth_access_token');
        if (savedToken) {
          handleSuccess(currentUser, savedToken);
        } else {
          if (!isSigningIn) {
            handleFailure();
          }
        }
      }
    })
    .catch((error) => {
      isRedirectResultHandled = true;
      console.error('Redirect sign-in error:', error);
      if (isUnsubscribed) return;
      if (!isSigningIn) {
        handleFailure();
      }
    });
  
  // 2. Listen to auth state changes
  const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
    if (isUnsubscribed) return;
    if (user) {
      const savedToken = cachedAccessToken || localStorage.getItem('oauth_access_token');
      if (savedToken) {
        handleSuccess(user, savedToken);
      } else {
        if (isSigningIn) {
          // Currently in the middle of a sign-in flow, let that flow handle it
          return;
        }
        // If redirect result is still being processed, wait for it
        if (!isRedirectResultHandled) {
          return;
        }
        // If redirect result is already handled and we still don't have a token, we fail
        handleFailure();
      }
    } else {
      if (isSigningIn) {
        return;
      }
      handleFailure();
    }
  });

  return () => {
    isUnsubscribed = true;
    unsubscribe();
  };
};

// Must be called from a button click
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    localStorage.setItem('oauth_access_token', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Start a redirect sign in flow
export const googleSignInWithRedirect = async (): Promise<void> => {
  isSigningIn = true;
  await signInWithRedirect(auth, provider);
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken || localStorage.getItem('oauth_access_token');
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  localStorage.removeItem('oauth_access_token');
};
