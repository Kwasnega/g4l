
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getDatabase, type Database } from 'firebase/database';
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Database | undefined;
let storage: FirebaseStorage | undefined;

const hasValidConfig = !!(
    firebaseConfig.apiKey && 
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.databaseURL &&
    firebaseConfig.databaseURL.startsWith('https://') &&
    (firebaseConfig.databaseURL.endsWith('.firebaseio.com') || firebaseConfig.databaseURL.endsWith('.firebasedatabase.app'))
);

export const isFirebaseConfigured = hasValidConfig;

if (isFirebaseConfigured) {
    try {
        app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        auth = getAuth(app);
        db = getDatabase(app);
        storage = getStorage(app);
    } catch (e) {
        console.error("Firebase initialization failed even with valid config. This should not happen.", e);
        app = undefined;
        auth = undefined;
        db = undefined;
        storage = undefined;
    }
} else if (typeof window !== 'undefined' || process.env.NODE_ENV === 'development') {
    console.warn(
        "Firebase config is missing or invalid in your .env file. Please check all NEXT_PUBLIC_FIREBASE_* variables, especially NEXT_PUBLIC_FIREBASE_DATABASE_URL and NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET. Firebase features will be disabled."
    );
}


export { app, db, auth, storage };
