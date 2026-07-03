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
  // 1. Handle redirect result
  getRedirectResult(auth)
    .then((result) => {
      isRedirectResultHandled = true;
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          cachedAccessToken = credential.accessToken;
          sessionStorage.setItem('oauth_access_token', cachedAccessToken);
          if (result.user && onAuthSuccess) {
            onAuthSuccess(result.user, cachedAccessToken);
          }
        }
      }
    })
    .catch((error) => {
      isRedirectResultHandled = true;
      console.error('Redirect sign-in error:', error);
    });
  
  // 2. Listen to auth state changes
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      const savedToken = cachedAccessToken || sessionStorage.getItem('oauth_access_token');
      if (savedToken) {
        cachedAccessToken = savedToken;
        if (onAuthSuccess) onAuthSuccess(user, savedToken);
      } else {
        // Wait a brief moment to see if getRedirectResult finishes resolving
        setTimeout(() => {
          const updatedToken = cachedAccessToken || sessionStorage.getItem('oauth_access_token');
          if (updatedToken) {
            cachedAccessToken = updatedToken;
            if (onAuthSuccess) onAuthSuccess(user, updatedToken);
          } else {
            if (onAuthFailure) onAuthFailure();
          }
        }, 1200);
      }
    } else {
      cachedAccessToken = null;
      sessionStorage.removeItem('oauth_access_token');
      if (onAuthFailure) onAuthFailure();
    }
  });
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
    sessionStorage.setItem('oauth_access_token', cachedAccessToken);
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
  return cachedAccessToken;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  sessionStorage.removeItem('oauth_access_token');
};
