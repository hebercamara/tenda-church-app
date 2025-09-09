// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Sua configuração, que já está correta.
export const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

// Inicialize o Firebase
const app = initializeApp(firebaseConfig);

// Crie e EXPORTE as instâncias do Firestore e do Auth
export const db = getFirestore(app);
export const auth = getAuth(app);
export const appId = firebaseConfig.projectId; // Exportando o ID também, pois você usa

// Opcional: exportar o app também pode ser útil
export default app;
