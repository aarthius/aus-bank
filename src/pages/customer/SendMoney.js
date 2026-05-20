// src/pages/customer/SendMoney.js
import { useState, useEffect } from "react"
import { db } from "../../config/firebasePrivate"
import { hubDb } from "../../config/firebaseHub"
import {
  collection, query, where, getDocs,
  doc, runTransaction,
  addDoc, serverTimestamp
} from "firebase/firestore"
import { useAuth } from "../../context/AuthContext"
import CustomerLayout from "../../components/layout/CustomerLayout"
import {
  Box, Typography, Paper, TextField, Button,
  MenuItem, CircularProgress, Alert, Stepper,
  Step, StepLabel, Divider, Chip
} from "@mui/material"
import SendIcon       from "@mui/icons-material/Send"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"

const BANK_ID = process.env.REACT_APP_BANK_ID

export default function SendMoney() {
  const { staff } = useAuth()

  const [senderAccount,  setSenderAccount]  = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [sending,        setSending]        = useState(false)
  const [error,          setError]          = useState("")
  const [success,        setSuccess]        = useState(false)
  const [step,           setStep]           = useState(0)
  const [transferType,   setTransferType]   = useState("")

  const [form, setForm] = useState({
    toAccountNumber: "",
    toBankId:        "",
    amount:          "",
    mode:            "imps",
    note:            ""
  })

  const [banks,          setBanks]          = useState([])
  const [verifying,      setVerifying]      = useState(false)
  const [verified,       setVerified]       = useState(false)
  const [recipientInfo,  setRecipientInfo]  = useState(null)

  // Fetch sender's account
  useEffect(() => {
    if (!staff) return
    const fetchAccount = async () => {
      const customerSnap = await getDocs(
        query(collection(db, "customers"),
          where("uid", "==", staff.uid))
      )
      if (customerSnap.empty) return
      const customerDoc = customerSnap.docs[0]

      const accountSnap = await getDocs(
        query(collection(db, "accounts"),
          where("customerId", "==", customerDoc.id))
      )
      if (!accountSnap.empty) {
        setSenderAccount({
          id: accountSnap.docs[0].id,
          customerId: customerDoc.id,
          ...accountSnap.docs[0].data()
        })
      }
      setLoading(false)
    }
    fetchAccount()
  }, [staff])

  // Fetch banks from hub
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const snap = await getDocs(collection(hubDb, "banks"))
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        setBanks(data)
      } catch (err) {
        console.warn("Could not fetch banks:", err.message)
        // Fallback — add own bank for intrabank
        setBanks([{
          bankId:   BANK_ID,
          bankName: process.env.REACT_APP_BANK_NAME
        }])
      }
    }
    fetchBanks()
  }, [])

  // Verify recipient account
  const verifyAccount = async () => {
    if (!form.toAccountNumber || !form.toBankId) {
      setError("Please enter account number and select bank.")
      return
    }
    setVerifying(true)
    setError("")
    setVerified(false)
    setRecipientInfo(null)

    try {
      if (form.toBankId === BANK_ID) {
        // Intrabank — check own private DB
        setTransferType("intrabank")
        const snap = await getDocs(
          query(collection(db, "accounts"),
            where("accountNumber", "==", form.toAccountNumber))
        )
        if (snap.empty) {
          setError("Account not found in AUS Bank.")
          return
        }
        const accData = snap.docs[0].data()
        if (accData.status !== "active") {
          setError("This account is not active.")
          return
        }
        if (form.toAccountNumber === senderAccount?.accountNumber) {
          setError("Cannot transfer to your own account.")
          return
        }
        setRecipientInfo({
          maskedAccount: "••••" + form.toAccountNumber.slice(-4),
          bankName: process.env.REACT_APP_BANK_NAME,
          type: "intrabank"
        })
        setVerified(true)
      } else {
        // Interbank — check hub public_accounts
        setTransferType("interbank")
        const snap = await getDocs(
          query(collection(hubDb, "public_accounts"),
            where("bankId", "==", form.toBankId))
        )
        const match = snap.docs.find(d =>
          d.data().maskedAccountNumber?.slice(-4) ===
          form.toAccountNumber.slice(-4)
        )
        if (!match) {
          setError("Account not found in selected bank.")
          return
        }
        if (!match.data().isActive) {
          setError("This account is not active.")
          return
        }
        const bank = banks.find(b => b.bankId === form.toBankId)
        setRecipientInfo({
          maskedAccount: match.data().maskedAccountNumber,
          bankName: bank?.bankName || form.toBankId,
          accountDocId: match.id,
          type: "interbank"
        })
        setVerified(true)
      }
    } catch (err) {
      setError("Verification failed: " + err.message)
    } finally {
      setVerifying(false)
    }
  }

  // Execute transfer
  const handleTransfer = async () => {
    if (!verified || !form.amount) return
    const amountPaise = Math.round(parseFloat(form.amount) * 100)

    if (amountPaise <= 0) {
      setError("Please enter a valid amount.")
      return
    }
    if (amountPaise > senderAccount.balance) {
      setError("Insufficient balance.")
      return
    }
    // Check transfer limit
    if (senderAccount.transferLimit &&
        amountPaise > senderAccount.transferLimit) {
      setError(`Transfer limit is ₹${senderAccount.transferLimit / 100}.`)
      return
    }

    setSending(true)
    setError("")

    try {
      if (transferType === "intrabank") {
        // Intrabank — single runTransaction
        const toSnap = await getDocs(
          query(collection(db, "accounts"),
            where("accountNumber", "==", form.toAccountNumber))
        )
        const toRef   = doc(db, "accounts", toSnap.docs[0].id)
        const fromRef = doc(db, "accounts", senderAccount.id)

        await runTransaction(db, async (txn) => {
          const fromDoc = await txn.get(fromRef)
          const toDoc   = await txn.get(toRef)

          if (fromDoc.data().balance < amountPaise) {
            throw new Error("Insufficient balance.")
          }

          txn.update(fromRef, {
            balance:   fromDoc.data().balance - amountPaise,
            updatedAt: serverTimestamp()
          })
          txn.update(toRef, {
            balance:   toDoc.data().balance + amountPaise,
            updatedAt: serverTimestamp()
          })
        })

        // Write debit transaction
        await addDoc(collection(db, "transactions"), {
          type:          "intrabank",
          direction:     "debit",
          fromAccountId: senderAccount.id,
          toAccountId:   toSnap.docs[0].id,
          fromBankId:    BANK_ID,
          toBankId:      BANK_ID,
          amount:        amountPaise,
          currency:      "INR",
          mode:          "internal",
          status:        "completed",
          note:          form.note,
          createdAt:     serverTimestamp(),
          completedAt:   serverTimestamp()
        })

        // Write credit transaction
        await addDoc(collection(db, "transactions"), {
          type:          "intrabank",
          direction:     "credit",
          fromAccountId: senderAccount.id,
          toAccountId:   toSnap.docs[0].id,
          fromBankId:    BANK_ID,
          toBankId:      BANK_ID,
          amount:        amountPaise,
          currency:      "INR",
          mode:          "internal",
          status:        "completed",
          note:          form.note,
          createdAt:     serverTimestamp(),
          completedAt:   serverTimestamp()
        })

        setSuccess(true)
      } else {
        // Interbank — two phase
        const transferRef = doc(collection(db, "transactions"))
        const transferId  = transferRef.id
        const fromRef     = doc(db, "accounts", senderAccount.id)

        // Phase 1 — deduct from sender
        await runTransaction(db, async (txn) => {
          const fromDoc = await txn.get(fromRef)
          if (fromDoc.data().balance < amountPaise) {
            throw new Error("Insufficient balance.")
          }
          txn.update(fromRef, {
            balance:   fromDoc.data().balance - amountPaise,
            updatedAt: serverTimestamp()
          })
          txn.set(transferRef, {
            transactionId: transferId,
            type:          "interbank",
            direction:     "debit",
            fromAccountId: senderAccount.id,
            toAccountId:   form.toAccountNumber,
            fromBankId:    BANK_ID,
            toBankId:      form.toBankId,
            amount:        amountPaise,
            currency:      "INR",
            mode:          form.mode,
            status:        "pending",
            note:          form.note,
            createdAt:     serverTimestamp()
          })
        })

        // Phase 2 — write to hub
        const { setDoc: setHubDoc, doc: hubDocRef } =
          await import("firebase/firestore")
        const { hubDb: hub } = await import("../../config/firebaseHub")

        await setHubDoc(hubDocRef(hub, "interbank_transfers", transferId), {
          transferId,
          fromBankId:    BANK_ID,
          toBankId:      form.toBankId,
          fromAccountId: senderAccount.id,
          toAccountId:   form.toAccountNumber,
          amount:        amountPaise,
          currency:      "INR",
          mode:          form.mode,
          status:        "pending",
          createdAt:     serverTimestamp(),
          completedAt:   null,
          failureReason: null
        })

        setSuccess(true)
      }
    } catch (err) {
      setError("Transfer failed: " + err.message)
    } finally {
      setSending(false)
    }
  }

  const resetForm = () => {
    setForm({ toAccountNumber: "", toBankId: "",
      amount: "", mode: "imps", note: "" })
    setVerified(false)
    setRecipientInfo(null)
    setSuccess(false)
    setStep(0)
    setError("")
    setTransferType("")
  }

  if (loading) {
    return (
      <CustomerLayout>
        <Box sx={{ textAlign: "center", mt: 8 }}>
          <CircularProgress />
        </Box>
      </CustomerLayout>
    )
  }

  if (success) {
    return (
      <CustomerLayout>
        <Box sx={{ maxWidth: 500, mx: "auto", textAlign: "center", mt: 8 }}>
          <Paper sx={{ p: 5, borderRadius: 3 }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: "success.main" }} />
            <Typography variant="h5" fontWeight="bold" mt={2}>
              {transferType === "intrabank"
                ? "Transfer Successful!" : "Transfer Initiated!"}
            </Typography>
            <Typography color="text.secondary" mt={1} mb={1}>
              ₹{parseFloat(form.amount).toLocaleString("en-IN")} 
              {transferType === "intrabank"
                ? " transferred successfully."
                : " sent to hub. Awaiting destination bank."}
            </Typography>
            <Chip
              label={transferType === "intrabank" ? "Completed" : "Pending"}
              color={transferType === "intrabank" ? "success" : "warning"}
              sx={{ mb: 3 }}
            />
            <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
              <Button variant="contained" onClick={resetForm}
                sx={{ backgroundColor: "#00695c" }}>
                New Transfer
              </Button>
              <Button variant="outlined" onClick={() =>
                window.location.href = "/customer/dashboard"}>
                Go to Dashboard
              </Button>
            </Box>
          </Paper>
        </Box>
      </CustomerLayout>
    )
  }

  return (
    <CustomerLayout>
      <Typography variant="h5" fontWeight="bold" mb={1}>
        Send Money
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={4}>
        Transfer funds to any account
      </Typography>

      <Box sx={{ maxWidth: 600, mx: "auto" }}>
        {/* Sender Info */}
        <Paper sx={{ p: 3, borderRadius: 3, mb: 3,
          backgroundColor: "#e0f2f1" }}>
          <Typography variant="body2" color="text.secondary">
            Sending from
          </Typography>
          <Typography variant="h6" fontWeight="bold">
            {senderAccount?.accountNumber}
          </Typography>
          <Typography variant="body2" color="success.main" fontWeight="bold">
            Balance: ₹{((senderAccount?.balance || 0) / 100)
              .toLocaleString("en-IN")}
          </Typography>
          {senderAccount?.transferLimit && (
            <Typography variant="caption" color="text.secondary">
              Transfer limit: ₹{(senderAccount.transferLimit / 100)
                .toLocaleString("en-IN")}
            </Typography>
          )}
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}
            onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        <Paper sx={{ p: 4, borderRadius: 3 }}>
          <Stepper activeStep={step} sx={{ mb: 4 }}>
            <Step><StepLabel>Recipient</StepLabel></Step>
            <Step><StepLabel>Amount</StepLabel></Step>
            <Step><StepLabel>Confirm</StepLabel></Step>
          </Stepper>

          {/* Step 0 — Recipient */}
          {step === 0 && (
            <Box>
              <TextField
                select label="Destination Bank" fullWidth sx={{ mb: 2 }}
                value={form.toBankId}
                onChange={(e) => {
                  setForm({ ...form, toBankId: e.target.value })
                  setVerified(false)
                  setRecipientInfo(null)
                }}
              >
                {banks.map((bank) => (
                  <MenuItem key={bank.bankId} value={bank.bankId}>
                    {bank.bankName}
                    {bank.bankId === BANK_ID ? " (Same Bank)" : ""}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Recipient Account Number" fullWidth sx={{ mb: 3 }}
                value={form.toAccountNumber}
                onChange={(e) => {
                  setForm({ ...form, toAccountNumber: e.target.value })
                  setVerified(false)
                  setRecipientInfo(null)
                }}
              />

              {verified && recipientInfo && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  ✓ Account verified — {recipientInfo.maskedAccount}{" "}
                  at {recipientInfo.bankName}
                  {" "}({recipientInfo.type})
                </Alert>
              )}

              <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                  variant="outlined" fullWidth
                  onClick={verifyAccount}
                  disabled={verifying}
                >
                  {verifying
                    ? <CircularProgress size={20} />
                    : "Verify Account"}
                </Button>
                <Button
                  variant="contained" fullWidth
                  onClick={() => setStep(1)}
                  disabled={!verified}
                  sx={{ backgroundColor: "#00695c" }}
                >
                  Next
                </Button>
              </Box>
            </Box>
          )}

          {/* Step 1 — Amount */}
          {step === 1 && (
            <Box>
              <TextField
                label="Amount (₹)" fullWidth sx={{ mb: 2 }}
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                helperText={`Available: ₹${((senderAccount?.balance || 0) / 100)
                  .toLocaleString("en-IN")}`}
              />
              {transferType === "interbank" && (
                <TextField
                  select label="Transfer Mode" fullWidth sx={{ mb: 2 }}
                  value={form.mode}
                  onChange={(e) => setForm({ ...form, mode: e.target.value })}
                >
                  <MenuItem value="imps">IMPS — Instant</MenuItem>
                  <MenuItem value="neft">NEFT — Standard</MenuItem>
                </TextField>
              )}
              <TextField
                label="Note (optional)" fullWidth sx={{ mb: 3 }}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
              <Box sx={{ display: "flex", gap: 2 }}>
                <Button variant="outlined" fullWidth
                  onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button
                  variant="contained" fullWidth
                  onClick={() => {
                    if (!form.amount || parseFloat(form.amount) <= 0) {
                      setError("Enter a valid amount.")
                      return
                    }
                    setStep(2)
                  }}
                  sx={{ backgroundColor: "#00695c" }}
                >
                  Next
                </Button>
              </Box>
            </Box>
          )}

          {/* Step 2 — Confirm */}
          {step === 2 && (
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" mb={2}>
                Confirm Transfer
              </Typography>
              {[
                ["From",     senderAccount?.accountNumber],
                ["To",       recipientInfo?.maskedAccount],
                ["Bank",     recipientInfo?.bankName],
                ["Amount",   `₹${parseFloat(form.amount).toLocaleString("en-IN")}`],
                ["Mode",     transferType === "intrabank" ? "Internal" : form.mode.toUpperCase()],
                ["Note",     form.note || "—"],
              ].map(([label, value]) => (
                <Box key={label} sx={{
                  display: "flex", justifyContent: "space-between",
                  py: 1, borderBottom: "1px solid #f0f0f0"
                }}>
                  <Typography variant="body2" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {value}
                  </Typography>
                </Box>
              ))}

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                <Button variant="outlined" fullWidth
                  onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  variant="contained" fullWidth
                  startIcon={sending
                    ? <CircularProgress size={18} color="inherit" />
                    : <SendIcon />}
                  onClick={handleTransfer}
                  disabled={sending}
                  sx={{ backgroundColor: "#00695c" }}
                >
                  {sending ? "Sending..." : "Send Money"}
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
    </CustomerLayout>
  )
}