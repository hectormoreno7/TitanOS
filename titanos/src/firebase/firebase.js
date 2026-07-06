import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDLKw8MREJZu1yiv1UQuXxZ6UDrFnDHzUs",
  authDomain: "titanos-app.firebaseapp.com",
  projectId: "titanos-app",
  storageBucket: "titanos-app.firebasestorage.app",
  messagingSenderId: "33649990802",
  appId: "1:33649990802:web:e43ebaf832631240079a4b",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);