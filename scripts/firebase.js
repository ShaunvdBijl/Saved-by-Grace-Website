// Replace with your Firebase project config when ready
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// eslint-disable-next-line no-unused-vars
function initFirebase() {
  if (!window.firebase) {
    console.warn("Firebase SDK not loaded yet.");
    return null;
  }
  return firebase.initializeApp(firebaseConfig);
}

