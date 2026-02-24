import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAReakAETFjRiYGEJPM3tYNXjG5sCK3I1c",
  authDomain: "edge-journal-be0bc.firebaseapp.com",
  projectId: "edge-journal-be0bc",
  storageBucket: "edge-journal-be0bc.firebasestorage.app",
  messagingSenderId: "143323695182",
  appId: "1:143323695182:web:da05f03f3286e34e0d1b1f",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signOutUser = () => signOut(auth);
export { onAuthStateChanged };
