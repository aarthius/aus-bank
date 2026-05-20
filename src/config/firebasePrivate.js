// src/config/firebasePrivate.js
import { initializeApp, getApps } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAuth } from "firebase/auth"
import { getStorage } from "firebase/storage"

const privateConfig = {
  apiKey:            process.env.REACT_APP_PRIVATE_API_KEY,
  authDomain:        process.env.REACT_APP_PRIVATE_AUTH_DOMAIN,
  projectId:         process.env.REACT_APP_PRIVATE_PROJECT_ID,
  storageBucket:     process.env.REACT_APP_PRIVATE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_PRIVATE_MESSAGING_SENDER_ID,
  appId:             process.env.REACT_APP_PRIVATE_APP_ID
}

const privateApp = getApps().find(a => a.name === "private")
  ?? initializeApp(privateConfig, "private")

// Second instance — only used for creating new staff users
// Prevents admin from being logged out during staff creation
const secondaryApp = getApps().find(a => a.name === "secondary")
  ?? initializeApp(privateConfig, "secondary")

export const db            = getFirestore(privateApp)
export const auth          = getAuth(privateApp)
export const storage       = getStorage(privateApp)
export const secondaryAuth = getAuth(secondaryApp)