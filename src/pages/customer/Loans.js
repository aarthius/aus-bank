import { useState, useEffect } from "react"
import { db } from "../../config/firebasePrivate"
import {
  collection, query, where, onSnapshot,
  addDoc, serverTimestamp, getDocs
} from "firebase/firestore"
import { useAuth } from "../../context/AuthContext"
import CustomerLayout from "../../components/layout/CustomerLayout"
import {
  Box, Typography, Paper, Button, Grid,
  TextField, MenuItem, CircularProgress,
  Alert, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, LinearProgress
} from "@mui/material"
import CreditScoreIcon from "@mui/icons-material/CreditScore"
import AddIcon         from "@mui/icons-material/Add"
import DownloadIcon    from "@mui/icons-material/Download"
import { generateLoanReceipt, generateLoanApprovalLetter } from "../../utils/generatePDF"

const loanTypes = [
  { value: "personal",  label: "Personal Loan",  maxAmount: 500000,  rate: 12 },
  { value: "home",      label: "Home Loan",      maxAmount: 5000000, rate: 8  },
  { value: "car",       label: "Car Loan",       maxAmount: 1000000, rate: 10 },
  { value: "education", label: "Education Loan", maxAmount: 2000000, rate: 7  },
]

export default function Loans() {
  const { staff }      = useAuth()
  const [loans,        setLoans]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [dialog,       setDialog]       = useState(false)
  const [applying,     setApplying]     = useState(false)
  const [success,      setSuccess]      = useState("")
  const [error,        setError]        = useState("")
  const [customerId,   setCustomerId]   = useState(null)
  const [customerData, setCustomerData] = useState(null)
  const [accountData,  setAccountData]  = useState(null)

  const [form, setForm] = useState({
    loanType: "personal",
    amount:   "",
    tenure:   "12",
    purpose:  ""
  })

  useEffect(() => {
    if (!staff) return
    const fetch = async () => {
      const customerSnap = await getDocs(
        query(collection(db, "customers"),
          where("uid", "==", staff.uid))
      )
      if (customerSnap.empty) return
      const cId         = customerSnap.docs[0].id
      const customerDoc = customerSnap.docs[0]
      setCustomerId(cId)
      setCustomerData(customerDoc.data())

      // Fetch account data
      const accountSnap = await getDocs(
        query(collection(db, "accounts"),
          where("customerId", "==", cId))
      )
      if (!accountSnap.empty) {
        setAccountData(accountSnap.docs[0].data())
      }

      const unsub = onSnapshot(
        query(collection(db, "loans"),
          where("customerId", "==", cId)),
        (snap) => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          data.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)
          setLoans(data)
          setLoading(false)
        }
      )
      return unsub
    }
    fetch()
  }, [staff])

  const selectedLoanType = loanTypes.find(l => l.value === form.loanType)

  const calculateEMI = () => {
    const P = parseFloat(form.amount) || 0
    const r = (selectedLoanType?.rate || 12) / 12 / 100
    const n = parseInt(form.tenure) || 12
    if (P <= 0) return 0
    const emi = (P * r * Math.pow(1 + r, n)) /
      (Math.pow(1 + r, n) - 1)
    return Math.round(emi)
  }

  const handleApply = async () => {
    if (!form.amount || !form.purpose) {
      setError("Please fill in all fields.")
      return
    }
    const amount = parseFloat(form.amount)
    if (amount <= 0 || amount > selectedLoanType.maxAmount) {
      setError(`Amount must be between ₹1 and ₹${selectedLoanType.maxAmount.toLocaleString("en-IN")}`)
      return
    }
    setApplying(true)
    setError("")
    try {
      await addDoc(collection(db, "loans"), {
        customerId:   customerId,
        bankId:       process.env.REACT_APP_BANK_ID,
        loanType:     form.loanType,
        amount:       amount * 100,
        tenure:       parseInt(form.tenure),
        purpose:      form.purpose,
        emi:          calculateEMI() * 100,
        interestRate: selectedLoanType.rate,
        status:       "pending",
        createdAt:    serverTimestamp()
      })
      setSuccess("Loan application submitted successfully!")
      setDialog(false)
      setForm({ loanType: "personal", amount: "", tenure: "12", purpose: "" })
    } catch (err) {
      setError("Application failed: " + err.message)
    } finally {
      setApplying(false)
    }
  }

  const statusColor = {
    pending:  "warning",
    approved: "success",
    rejected: "error",
    active:   "info",
    closed:   "default"
  }

  return (
    <CustomerLayout>
      <Box sx={{ display: "flex", justifyContent: "space-between",
        alignItems: "center", mb: 1 }}>
        <Typography variant="h5" fontWeight="bold">
          Loans
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialog(true)}
          sx={{ backgroundColor: "#00695c" }}
        >
          Apply for Loan
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Manage your loan applications
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}
          onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ textAlign: "center", mt: 8 }}>
          <CircularProgress />
        </Box>
      ) : loans.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: "center", borderRadius: 3 }}>
          <CreditScoreIcon sx={{ fontSize: 64, color: "#ccc" }} />
          <Typography variant="h6" color="text.secondary" mt={2}>
            No loan applications yet
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Apply for a personal, home, car, or education loan
          </Typography>
          <Button variant="contained"
            onClick={() => setDialog(true)}
            sx={{ backgroundColor: "#00695c" }}>
            Apply Now
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {loans.map((loan) => {
            const loanInfo = loanTypes.find(l => l.value === loan.loanType)
            const paid     = loan.paidAmount || 0
            const total    = loan.amount     || 0
            const pct      = total > 0 ? Math.round((paid / total) * 100) : 0
            return (
              <Grid item xs={12} md={6} key={loan.id}>
                <Paper sx={{ p: 3, borderRadius: 3 }}>
                  <Box sx={{ display: "flex",
                    justifyContent: "space-between", mb: 2 }}>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        {loanInfo?.label || loan.loanType}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {loan.tenure} months • {loan.interestRate}% p.a.
                      </Typography>
                    </Box>
                    <Chip
                      label={loan.status}
                      color={statusColor[loan.status]}
                      sx={{ textTransform: "capitalize" }}
                    />
                  </Box>

                  <Box sx={{ display: "flex",
                    justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Loan Amount
                    </Typography>
                    <Typography fontWeight="bold">
                      ₹{(loan.amount / 100).toLocaleString("en-IN")}
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex",
                    justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Monthly EMI
                    </Typography>
                    <Typography fontWeight="bold" color="primary">
                      ₹{(loan.emi / 100).toLocaleString("en-IN")}
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex",
                    justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Purpose
                    </Typography>
                    <Typography variant="body2">
                      {loan.purpose}
                    </Typography>
                  </Box>

                  {loan.status === "active" && (
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ display: "flex",
                        justifyContent: "space-between", mb: 0.5 }}>
                        <Typography variant="caption">
                          Repayment Progress
                        </Typography>
                        <Typography variant="caption">{pct}%</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate" value={pct}
                        sx={{ borderRadius: 2, height: 8 }}
                      />
                    </Box>
                  )}

                  <Typography variant="caption"
                    color="text.secondary" display="block" mt={1}>
                    Applied:{" "}
                    {loan.createdAt?.toDate().toLocaleDateString("en-IN")}
                  </Typography>

                  {/* Download buttons — only for active loans */}
                  {loan.status === "active" && (
                    <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={() =>
                          generateLoanReceipt(loan, customerData, accountData)}
                      >
                        Receipt
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<DownloadIcon />}
                        onClick={() =>
                          generateLoanApprovalLetter(loan, customerData, accountData)}
                        sx={{ backgroundColor: "#00695c" }}
                      >
                        Approval Letter
                      </Button>
                    </Box>
                  )}
                </Paper>
              </Grid>
            )
          })}
        </Grid>
      )}

      {/* Apply Loan Dialog */}
      <Dialog open={dialog} onClose={() => setDialog(false)}
        maxWidth="sm" fullWidth>
        <DialogTitle>Apply for a Loan</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                select label="Loan Type" fullWidth
                value={form.loanType}
                onChange={(e) => setForm({ ...form, loanType: e.target.value })}
              >
                {loanTypes.map((lt) => (
                  <MenuItem key={lt.value} value={lt.value}>
                    {lt.label} — {lt.rate}% p.a. (max ₹
                    {lt.maxAmount.toLocaleString("en-IN")})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Loan Amount (₹)" fullWidth type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                helperText={`Max: ₹${selectedLoanType?.maxAmount
                  .toLocaleString("en-IN")}`}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select label="Tenure" fullWidth
                value={form.tenure}
                onChange={(e) => setForm({ ...form, tenure: e.target.value })}
              >
                {["6","12","24","36","48","60"].map(t => (
                  <MenuItem key={t} value={t}>{t} months</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Purpose" fullWidth multiline rows={2}
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              />
            </Grid>
            {form.amount && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2, backgroundColor: "#e0f2f1",
                  borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Estimated Monthly EMI
                  </Typography>
                  <Typography variant="h5" fontWeight="bold"
                    color="#00695c">
                    ₹{calculateEMI().toLocaleString("en-IN")}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    at {selectedLoanType?.rate}% p.a. for {form.tenure} months
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleApply}
            disabled={applying}
            sx={{ backgroundColor: "#00695c" }}
          >
            {applying
              ? <CircularProgress size={20} color="inherit" />
              : "Submit Application"}
          </Button>
        </DialogActions>
      </Dialog>
    </CustomerLayout>
  )
}