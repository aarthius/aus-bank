// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "../config/firebasePrivate"
import { hubAuth } from "../config/firebaseHub"

const AuthContext = createContext()

const HUB_EMAIL    = process.env.REACT_APP_HUB_BANK_EMAIL
const HUB_PASSWORD = process.env.REACT_APP_HUB_BANK_PASSWORD

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)  // Firebase auth user
  const [staff, setStaff]     = useState(null)  // staff doc from Firestore
  const [loading, setLoading] = useState(true)

  // Sign into hub Firebase in background
  const signInToHub = async () => {
    try {
      await signInWithEmailAndPassword(hubAuth, HUB_EMAIL, HUB_PASSWORD)
      console.log("[HUB AUTH] Signed in successfully")
    } catch (err) {
      console.warn("[HUB AUTH] Failed:", err.message)
    }
  }

  // Login function called from Login page
  const login = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password)
    await signInToHub()  // sign into hub right after private login
    return result
  }

  // Logout function
  const logout = async () => {
    await signOut(auth)
    await signOut(hubAuth)
    setUser(null)
    setStaff(null)
  }

  // Listen for auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        // fetch staff document using UID
        const snap = await getDoc(doc(db, "staff", firebaseUser.uid))
        if (snap.exists()) {
          setStaff(snap.data())
        } else {
          setStaff(null)
        }
      } else {
        setUser(null)
        setStaff(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  return (
    <AuthContext.Provider value={{ user, staff, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
export default AuthContext