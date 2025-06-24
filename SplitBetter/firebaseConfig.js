// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "@firebase/app";
import { getAnalytics } from "firebase/analytics";

import {initializeAuth, getReactNativePersistence, getAuth} from 'firebase/auth';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore, collection } from 'firebase/firestore'; 
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDAHYfAcz521s2PehytJAB9XoKTSOu_sh4",
  authDomain: "splitbetter-b55d6.firebaseapp.com",
  projectId: "splitbetter-b55d6",
  storageBucket: "splitbetter-b55d6.firebasestorage.app",
  messagingSenderId: "68980325962",
  appId: "1:68980325962:web:1571ee4ec7e1419f2830b3",
  measurementId: "G-SJ7SBGES7E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
}); 


export const db = getFirestore(app);

export const userRef = collection(db, 'users');

