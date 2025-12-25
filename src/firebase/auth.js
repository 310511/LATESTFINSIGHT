import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile
} from "firebase/auth";
import { auth } from "./config";

// Google Auth Provider
// Note: Make sure Google Sign-In is enabled in Firebase Console:
// Authentication > Sign-in method > Google > Enable
const googleProvider = new GoogleAuthProvider();
// Optionally add additional scopes if needed
// googleProvider.addScope('profile');
// googleProvider.addScope('email');

// Sign in with email and password
export const signInWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    let errorMessage = error.message;
    
    // Handle specific error codes
    if (error.code === 'auth/operation-not-allowed') {
      errorMessage = 'Email/Password authentication is not enabled. Please contact support or enable it in Firebase Console.';
    } else if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email address.';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password. Please try again.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address format.';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many failed attempts. Please try again later.';
    }
    
    return { success: false, error: errorMessage };
  }
};

// Sign up with email and password
export const signUpWithEmail = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update the user's display name
    if (displayName) {
      await updateProfile(userCredential.user, {
        displayName: displayName
      });
    }
    
    return { success: true, user: userCredential.user };
  } catch (error) {
    let errorMessage = error.message;
    
    // Handle specific error codes
    if (error.code === 'auth/operation-not-allowed') {
      errorMessage = 'Email/Password authentication is not enabled. Please contact support or enable it in Firebase Console.';
    } else if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'An account with this email already exists. Please sign in instead.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address format.';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password is too weak. Please use at least 6 characters.';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many requests. Please try again later.';
    }
    
    return { success: false, error: errorMessage };
  }
};

// Sign in with Google using popup (more reliable than redirect)
export const signInWithGoogle = async () => {
  try {
    // Suppress console warnings related to Cross-Origin-Opener-Policy
    // This is a known Firebase limitation with popup authentication
    const originalWarn = console.warn;
    const warningsToSuppress = ['Cross-Origin-Opener-Policy'];
    
    console.warn = (...args) => {
      const message = args.join(' ');
      if (!warningsToSuppress.some(warning => message.includes(warning))) {
        originalWarn.apply(console, args);
      }
    };

    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.warn = originalWarn; // Restore original console.warn
      return { success: true, user: result.user };
    } catch (popupError) {
      console.warn = originalWarn; // Restore original console.warn
      throw popupError;
    }
  } catch (error) {
    // Handle specific error cases
    let errorMessage = error.message;
    if (error.code === 'auth/operation-not-allowed') {
      errorMessage = 'Google Sign-In is not enabled. Please enable it in Firebase Console: Authentication > Sign-in method > Google > Enable';
    } else if (error.code === 'auth/popup-closed-by-user') {
      errorMessage = 'Sign-in popup was closed. Please try again.';
    } else if (error.code === 'auth/popup-blocked') {
      errorMessage = 'Popup was blocked by browser. Please allow popups for this site.';
    } else if (error.code === 'auth/invalid-continue-uri') {
      errorMessage = 'OAuth configuration error. Please ensure localhost:5173 is added to authorized domains in Firebase Console.';
    } else if (error.code === 'auth/unauthorized-domain') {
      errorMessage = 'This domain is not authorized. Please add it to authorized domains in Firebase Console.';
    } else if (error.code === 'auth/account-exists-with-different-credential') {
      errorMessage = 'An account already exists with this email using a different sign-in method. Please use email/password sign-in.';
    }
    return { success: false, error: errorMessage };
  }
};

// Sign out
export const logOut = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Reset password
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    let errorMessage = error.message;
    if (error.code === 'auth/invalid-continue-uri') {
      errorMessage = 'Email configuration error. Please ensure authorized domains are configured in Firebase Console.';
    }
    return { success: false, error: errorMessage };
  }
};



// Updated: Thu Dec 25 17:21:33 IST 2025
