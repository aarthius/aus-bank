import { useEffect } from "react"
import { hubDb } from "../config/firebaseHub"
import { db } from "../config/firebasePrivate"
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, getDocs, runTransaction, serverTimestamp
} from "firebase/firestore"

const BANK_ID = process.env.REACT_APP_BANK_ID

export function useInterbankListener() {
  useEffect(() => {
    // Listen to hub for pending transfers meant for THIS bank
    const q = query(
      collection(hubDb, "interbank_transfers"),
      where("toBankId", "==", BANK_ID),
      where("status", "==", "pending")
    )

    const unsub = onSnapshot(q, async (snap) => {
      for (const transferDoc of snap.docs) {
        const transfer = transferDoc.data()

        try {
          // Find the recipient account in this bank's private DB
          const accountSnap = await getDocs(
            query(
              collection(db, "accounts"),
              where("accountNumber", "==", transfer.toAccountId)
            )
          )

          if (accountSnap.empty) {
            // Account not found — mark failed
            await updateDoc(doc(hubDb, "interbank_transfers", transferDoc.id), {
              status:        "failed",
              failureReason: "Recipient account not found",
              completedAt:   serverTimestamp()
            })
            continue
          }

          const recipientRef = doc(db, "accounts", accountSnap.docs[0].id)
          const recipientId  = accountSnap.docs[0].id

          // Credit the recipient atomically
          await runTransaction(db, async (txn) => {
            const recipientDoc = await txn.get(recipientRef)
            if (!recipientDoc.exists()) throw new Error("Account missing")

            txn.update(recipientRef, {
              balance:   recipientDoc.data().balance + transfer.amount,
              updatedAt: serverTimestamp()
            })
          })

          // Write credit transaction to this bank's private DB
          await getDocs(collection(db, "transactions")).then(async () => {
            const { addDoc } = await import("firebase/firestore")
            await addDoc(collection(db, "transactions"), {
              type:          "interbank",
              direction:     "credit",
              fromAccountId: transfer.fromAccountId,
              toAccountId:   recipientId,
              fromBankId:    transfer.fromBankId,
              toBankId:      BANK_ID,
              amount:        transfer.amount,
              currency:      "INR",
              mode:          transfer.mode,
              status:        "completed",
              note:          transfer.note || "",
              createdAt:     transfer.createdAt,
              completedAt:   serverTimestamp()
            })
          })

          // Mark transfer as completed in hub
          await updateDoc(doc(hubDb, "interbank_transfers", transferDoc.id), {
            status:      "completed",
            completedAt: serverTimestamp()
          })

          // Also update the sender's transaction in their bank — 
          // we can't access their private DB, but we can update hub status
          console.log(`[INTERBANK] ✅ Credited ₹${transfer.amount / 100} to ${transfer.toAccountId}`)

        } catch (err) {
          console.error("[INTERBANK] ❌ Failed to process transfer:", err.message)

          // Mark as failed in hub
          await updateDoc(doc(hubDb, "interbank_transfers", transferDoc.id), {
            status:        "failed",
            failureReason: err.message,
            completedAt:   serverTimestamp()
          })
        }
      }
    })

    return () => unsub()
  }, [])
}