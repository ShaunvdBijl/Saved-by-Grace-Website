// Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyD5CfxfVL7Q1RhUqmZdlMGZ0V8No1754no",
  authDomain: "saved-by-grace.firebaseapp.com",
  projectId: "saved-by-grace",
  storageBucket: "saved-by-grace.firebasestorage.app",
  messagingSenderId: "900401870748",
  appId: "1:900401870748:web:c4f0d49b84f43edb95fa59",
  measurementId: "G-7G0M2YXHLW"
};

// Firebase instances (initialized in auth.html)
// These will be set by the initialization script
export let app = null;
export let analytics = null;
export let auth = null;
export let db = null;

// Function to set Firebase instances after initialization
export function setFirebaseInstances(firebaseApp, firebaseAnalytics, firebaseAuth, firebaseDb) {
  app = firebaseApp;
  analytics = firebaseAnalytics;
  auth = firebaseAuth;
  db = firebaseDb;
}



