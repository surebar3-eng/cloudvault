import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// This will be replaced with real config once you click "Accept" in the Firebase UI
// For now, it's a fallback to keep the app running
const firebaseConfig = {
  apiKey: "demo-api-key",
  authDomain: "demo.firebaseapp.com",
  projectId: "demo-project",
  storageBucket: "demo.appspot.com",
  messagingSenderId: "12345",
  appId: "1:12345:web:demo"
};

let app, auth, db;

try {
  // Try to load the real config if it was created
  // import firebaseRealConfig from './firebase-applet-config.json';
  // app = initializeApp(firebaseRealConfig);
  app = initializeApp(firebaseConfig);
} catch (e) {
  app = initializeApp(firebaseConfig);
}

auth = getAuth(app);
db = getFirestore(app);

export { auth, db };
