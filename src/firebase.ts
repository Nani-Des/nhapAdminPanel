// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from 'firebase/storage';
import { getAuth } from "firebase/auth";
import { getRemoteConfig } from "firebase/remote-config";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {
  apiKey: "AIzaSyCqip6Jq2lugr1KvkBQMvA1enCffUNwH-E",
  authDomain: "mhealth-6191e.firebaseapp.com",
  databaseURL: "https://mhealth-6191e-default-rtdb.firebaseio.com",
  projectId: "mhealth-6191e",
  storageBucket: "mhealth-6191e.appspot.com",
  messagingSenderId: "346868082875",
  appId: "1:346868082875:web:502fac14c68d4ba8c7e19e",
  measurementId: "G-75BPJD6QVY"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app); // Add auth export

/** Remote Config (e.g. `google_ai_studio_api` for the diagnostic tool). */
export const remoteConfig = getRemoteConfig(app);
remoteConfig.settings.minimumFetchIntervalMillis = import.meta.env.DEV ? 0 : 3_600_000;
remoteConfig.defaultConfig = {
  google_ai_studio_api: "",
};

