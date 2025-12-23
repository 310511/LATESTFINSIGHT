// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBpYEMNlNaNLBZYHqVbU2boaVh2CfwZEuU",
  // IMPORTANT: authDomain MUST be the Firebase app domain (projectId.firebaseapp.com)
  // Do NOT use a custom domain here (e.g., finsight.analytx4t.com)
  // Firebase handles OAuth redirects internally using this domain
  authDomain: "inner-doodad-461919-n6.firebaseapp.com",
  projectId: "inner-doodad-461919-n6",
  storageBucket: "inner-doodad-461919-n6.firebasestorage.app",
  messagingSenderId: "877048953120",
  appId: "1:877048953120:web:9749d9d01dd7c1bed17f45",
  measurementId: "G-2E7GC7T7EC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (only if in browser environment)
let analytics = null;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

export { app, analytics };
export default app;



