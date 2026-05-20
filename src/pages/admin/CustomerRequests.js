// src/pages/admin/CustomerRequests.js
import { useState, useEffect } from "react"
import { db, secondaryAuth } from "../../config/firebasePrivate"
import { hubDb } from "../../config/firebaseHub"
import {
  collection, onSnapshot, doc, setDoc,
  updateDoc, addDoc, serverTimestamp
} from "firebase/firestore"
import { createUserWithEmailAndPassword } from "firebase/auth"
import Layout from "../../components/layout/Layout"
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, CircularProgress, Alert, Grid
} from "@mui/material"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import CancelIcon      from "@mui/icons-material/Cancel"
import PauseCircleIcon from "@mui/icons-material/PauseCircle"

const statusColor = {
  pending:  "warning",
  approved: "success",
  rejected: "error",
  hold:     "info"
}

export default function CustomerRequests() {
  const [requests, setRequests] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)
  const [action,   setAction]   = useState("")
  const [reason,   setReason]   = useState("")
  const [acting,   setActing]   = useState(false)
  const [success,  setSuccess]  = useState("")
  const [error,    setError]    = useState("")

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "customer_requests"),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        data.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)
        setRequests(data)
        setLoading(false)
      }
    )
    return unsub
  }, [])

  const handleAction = async () => {
    if (!selected || !action) return
    setActing(true)
    try {
      await updateDoc(doc(db, "customer_requests", selected.id), {
        status:     action,
        reason:     reason,
        reviewedAt: serverTimestamp()
      })

      if (action === "approved") {
        const bankCode = process.env.REACT_APP_BANK_ID.replace(/\D/g, "").slice(0, 4).padStart(4, "0")
        const accountNumber = bankCode + Date.now().toString().slice(-8)

        const defaultPassword = "Customer@123"
        const customerCred = await createUserWithEmailAndPassword(
          secondaryAuth,
          selected.email,
          defaultPassword
        )
        const customerUid = customerCred.user.uid

        const customerRef = await addDoc(collection(db, "customers"), {
          uid:          customerUid,
          fullName:     selected.fullName,
          email:        selected.email,
          phone:        selected.phone,
          dateOfBirth:  selected.dateOfBirth,
          address:      selected.address,
          PAN:          selected.PAN,
          aadhaarLast4: selected.aadhaarLast4,
          bankId:       process.env.REACT_APP_BANK_ID,
          status:       "active",
          createdAt:    serverTimestamp()
        })

        const accountRef = await addDoc(collection(db, "accounts"), {
          customerId:    customerRef.id,
          accountNumber: accountNumber,
          accountType:   selected.accountType,
          bankId:        process.env.REACT_APP_BANK_ID,
          ifscCode:      process.env.REACT_APP_IFSC_CODE,
          balance:       100000,
          status:        "active",
          createdAt:     serverTimestamp()
        })

        await setDoc(doc(db, "staff", customerUid), {
          uid:       customerUid,
          name:      selected.fullName,
          email:     selected.email,
          role:      "customer",
          bankId:    process.env.REACT_APP_BANK_ID,
          isActive:  true,
          createdAt: serverTimestamp()
        })

        await setDoc(doc(hubDb, "public_accounts", accountRef.id), {
          accountId:           accountRef.id,
          bankId:              process.env.REACT_APP_BANK_ID,
          maskedAccountNumber: "••••" + accountNumber.slice(-4),
          ifscCode:            process.env.REACT_APP_IFSC_CODE,
          isActive:            true,
          registeredAt:        serverTimestamp()
        })
      }

      setSuccess(`Request ${action} successfully!`)
      setSelected(null)
      setAction("")
      setReason("")
    } catch (err) {
      console.error(err)
      setError("Something went wrong: " + err.message)
    } finally {
      setActing(false)
    }
  }

  const openDialog = (request, actionType) => {
    setSelected(request)
    setAction(actionType)
    setReason("")
  }

  return (
    <Layout>
      <Typography variant="h5" fontWeight="bold" mb={1}>
        Customer Requests
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Review and manage new account applications
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}
          onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}
          onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ textAlign: "center", mt: 8 }}>
          <CircularProgress />
        </Box>
      ) : requests.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
          <Typography color="text.secondary">
            No customer requests yet.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
              <TableRow>
                <TableCell><b>Name</b></TableCell>
                <TableCell><b>Email</b></TableCell>
                <TableCell><b>Phone</b></TableCell>
                <TableCell><b>Account Type</b></TableCell>
                <TableCell><b>Status</b></TableCell>
                <TableCell><b>Actions</b></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id} hover>
                  <TableCell>{req.fullName}</TableCell>
                  <TableCell>{req.email}</TableCell>
                  <TableCell>{req.phone}</TableCell>
                  <TableCell sx={{ textTransform: "capitalize" }}>
                    {req.accountType}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={req.status}
                      color={statusColor[req.status]}
                      size="small"
                      sx={{ textTransform: "capitalize" }}
                    />
                  </TableCell>
                  <TableCell>
                    {req.status === "pending" && (
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                          size="small" variant="contained"
                          color="success" startIcon={<CheckCircleIcon />}
                          onClick={() => openDialog(req, "approved")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small" variant="outlined"
                          color="info" startIcon={<PauseCircleIcon />}
                          onClick={() => openDialog(req, "hold")}
                        >
                          Hold
                        </Button>
                        <Button
                          size="small" variant="outlined"
                          color="error" startIcon={<CancelIcon />}
                          onClick={() => openDialog(req, "rejected")}
                        >
                          Reject
                        </Button>
                      </Box>
                    )}
                    {req.status !== "pending" && (
                      <Typography variant="caption" color="text.secondary">
                        {req.reason || "—"}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={!!selected} onClose={() => setSelected(null)}
        maxWidth="sm" fullWidth>
        <DialogTitle sx={{ textTransform: "capitalize" }}>
          {action} Request — {selected?.fullName}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={1} sx={{ mb: 2, mt: 0.5 }}>
            {selected && [
              ["Email",         selected.email],
              ["Phone",         selected.phone],
              ["PAN",           selected.PAN],
              ["Aadhaar Last 4",selected.aadhaarLast4],
              ["Account Type",  selected.accountType],
              ["Address",       selected.address],
            ].map(([label, value]) => (
              <Grid item xs={6} key={label}>
                <Typography variant="caption" color="text.secondary">
                  {label}
                </Typography>
                <Typography variant="body2" fontWeight="500">
                  {value}
                </Typography>
              </Grid>
            ))}
          </Grid>
          <TextField
            label={action === "approved"
              ? "Note (optional)"
              : "Reason (required for hold/reject)"}
            fullWidth multiline rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelected(null)}>Cancel</Button>
          <Button
            variant="contained"
            color={
              action === "approved" ? "success" :
              action === "hold"     ? "info"    : "error"
            }
            onClick={handleAction}
            disabled={acting}
          >
            {acting
              ? <CircularProgress size={20} color="inherit" />
              : `Confirm ${action}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}