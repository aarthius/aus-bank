import { useState, useEffect } from "react"
import { db } from "../../config/firebasePrivate"
import {
  collection, onSnapshot, doc, updateDoc,
  getDocs, query, where, runTransaction,
  addDoc, serverTimestamp
} from "firebase/firestore"
import Layout from "../../components/layout/Layout"
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, CircularProgress, Alert, Grid
} from "@mui/material"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import CancelIcon      from "@mui/icons-material/Cancel"

const loanTypes = [
  { value: "personal",  label: "Personal Loan" },
  { value: "home",      label: "Home Loan"     },
  { value: "car",       label: "Car Loan"      },
  { value: "education", label: "Education Loan"},
]

const statusColor = {
  pending:  "warning",
  approved: "success",
  rejected: "error",
  active:   "info",
  closed:   "default"
}

export default function ManageLoans() {
  const [loans,     setLoans]     = useState([])
  const [customers, setCustomers] = useState({})
  const [loading,   setLoading]   = useState(true)
  const [selected,  setSelected]  = useState(null)
  const [action,    setAction]    = useState("")
  const [reason,    setReason]    = useState("")
  const [acting,    setActing]    = useState(false)
  const [success,   setSuccess]   = useState("")
  const [error,     setError]     = useState("")

  useEffect(() => {
    // Listen to all loans
    const unsubLoans = onSnapshot(
      collection(db, "loans"),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        data.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)
        setLoans(data)
        setLoading(false)
      }
    )

    // Listen to customers for name lookup
    const unsubCustomers = onSnapshot(
      collection(db, "customers"),
      (snap) => {
        const map = {}
        snap.docs.forEach(d => { map[d.id] = d.data() })
        setCustomers(map)
      }
    )

    return () => { unsubLoans(); unsubCustomers() }
  }, [])

  const handleAction = async () => {
    if (!selected || !action) return
    setActing(true)
    setError("")

    try {
      if (action === "approved") {
        // Find customer's account
        const accountSnap = await getDocs(
          query(collection(db, "accounts"),
            where("customerId", "==", selected.customerId))
        )

        if (accountSnap.empty) {
          setError("Customer account not found.")
          setActing(false)
          return
        }

        const accountRef = doc(db, "accounts", accountSnap.docs[0].id)
        const accountId  = accountSnap.docs[0].id

        // Credit loan amount to customer's balance atomically
        await runTransaction(db, async (txn) => {
          const accountDoc = await txn.get(accountRef)
          if (!accountDoc.exists()) throw new Error("Account not found")

          txn.update(accountRef, {
            balance:   accountDoc.data().balance + selected.amount,
            updatedAt: serverTimestamp()
          })
        })

        // Record as a transaction
        await addDoc(collection(db, "transactions"), {
          type:          "loan_disbursement",
          direction:     "credit",
          fromAccountId: "BANK",
          toAccountId:   accountId,
          fromBankId:    process.env.REACT_APP_BANK_ID,
          toBankId:      process.env.REACT_APP_BANK_ID,
          amount:        selected.amount,
          currency:      "INR",
          mode:          "internal",
          status:        "completed",
          note:          `Loan disbursement — ${selected.loanType} loan`,
          createdAt:     serverTimestamp(),
          completedAt:   serverTimestamp()
        })

        // Update loan status
        await updateDoc(doc(db, "loans", selected.id), {
          status:     "active",
          approvedAt: serverTimestamp(),
          reason:     reason || ""
        })

        setSuccess(`Loan approved! ₹${(selected.amount / 100).toLocaleString("en-IN")} credited to customer.`)

      } else {
        // Rejected
        await updateDoc(doc(db, "loans", selected.id), {
          status:     "rejected",
          rejectedAt: serverTimestamp(),
          reason:     reason
        })

        setSuccess("Loan rejected successfully.")
      }

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

  const openDialog = (loan, actionType) => {
    setSelected(loan)
    setAction(actionType)
    setReason("")
  }

  return (
    <Layout>
      <Typography variant="h5" fontWeight="bold" mb={1}>
        Manage Loans
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Review and approve customer loan applications
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
      ) : loans.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
          <Typography color="text.secondary">
            No loan applications yet.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
              <TableRow>
                <TableCell><b>Customer</b></TableCell>
                <TableCell><b>Loan Type</b></TableCell>
                <TableCell><b>Amount</b></TableCell>
                <TableCell><b>EMI</b></TableCell>
                <TableCell><b>Tenure</b></TableCell>
                <TableCell><b>Purpose</b></TableCell>
                <TableCell><b>Status</b></TableCell>
                <TableCell><b>Actions</b></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loans.map((loan) => {
                const customer = customers[loan.customerId]
                const loanInfo = loanTypes.find(l => l.value === loan.loanType)
                return (
                  <TableRow key={loan.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="500">
                        {customer?.fullName || "—"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {customer?.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {loanInfo?.label || loan.loanType}
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight="bold" color="primary">
                        ₹{(loan.amount / 100).toLocaleString("en-IN")}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      ₹{(loan.emi / 100).toLocaleString("en-IN")}/mo
                    </TableCell>
                    <TableCell>
                      {loan.tenure} months
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2"
                        sx={{ maxWidth: 150 }} noWrap>
                        {loan.purpose}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={loan.status}
                        color={statusColor[loan.status]}
                        size="small"
                        sx={{ textTransform: "capitalize" }}
                      />
                    </TableCell>
                    <TableCell>
                      {loan.status === "pending" && (
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<CheckCircleIcon />}
                            onClick={() => openDialog(loan, "approved")}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<CancelIcon />}
                            onClick={() => openDialog(loan, "rejected")}
                          >
                            Reject
                          </Button>
                        </Box>
                      )}
                      {loan.status !== "pending" && (
                        <Typography variant="caption" color="text.secondary">
                          {loan.reason || "—"}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Confirm Dialog */}
      <Dialog open={!!selected} onClose={() => setSelected(null)}
        maxWidth="sm" fullWidth>
        <DialogTitle sx={{ textTransform: "capitalize" }}>
          {action} Loan — {customers[selected?.customerId]?.fullName}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={1} sx={{ mb: 2, mt: 0.5 }}>
            {selected && [
              ["Loan Type",  loanTypes.find(l => l.value === selected.loanType)?.label],
              ["Amount",     `₹${(selected.amount / 100).toLocaleString("en-IN")}`],
              ["EMI",        `₹${(selected.emi / 100).toLocaleString("en-IN")}/month`],
              ["Tenure",     `${selected.tenure} months`],
              ["Interest",   `${selected.interestRate}% p.a.`],
              ["Purpose",    selected.purpose],
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

          {action === "approved" && (
            <Alert severity="info" sx={{ mb: 2 }}>
              ₹{((selected?.amount || 0) / 100).toLocaleString("en-IN")} will
              be credited to the customer's account immediately.
            </Alert>
          )}

          <TextField
            label={action === "approved"
              ? "Note (optional)" : "Reason for rejection"}
            fullWidth multiline rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelected(null)}>Cancel</Button>
          <Button
            variant="contained"
            color={action === "approved" ? "success" : "error"}
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