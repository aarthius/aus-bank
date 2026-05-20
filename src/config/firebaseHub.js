//src/config/firebaseHub.js
import { initializeApp, getApps } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAuth } from "firebase/auth"

const hubConfig = {
  apiKey:            process.env.REACT_APP_HUB_API_KEY,
  authDomain:        process.env.REACT_APP_HUB_AUTH_DOMAIN,
  projectId:         process.env.REACT_APP_HUB_PROJECT_ID,
  storageBucket:     process.env.REACT_APP_HUB_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_HUB_MESSAGING_SENDER_ID,
  appId:             process.env.REACT_APP_HUB_APP_ID
}

const hubApp = getApps().find(a => a.name === "hub")
  ?? initializeApp(hubConfig, "hub")

export const hubDb   = getFirestore(hubApp)
export const hubAuth = getAuth(hubApp)