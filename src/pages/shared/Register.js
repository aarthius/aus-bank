// src/pages/shared/Register.js
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { db } from "../../config/firebasePrivate"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import {
  Container, Box, Paper, Typography, TextField,
  Button, Alert, CircularProgress, Grid, MenuItem, Stepper,
  Step, StepLabel
} from "@mui/material"
import AccountBalanceIcon from "@mui/icons-material/AccountBalance"

const steps = ["Personal Details", "Document Details", "Review & Submit"]

export default function Register() {
  const navigate  = useNavigate()
  const [step,    setStep]    = useState(0)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    // Personal details
    fullName:     "",
    email:        "",
    phone:        "",
    dateOfBirth:  "",
    address:      "",
    // Document details
    PAN:          "",
    aadhaarLast4: "",
    accountType:  "savings",
    // Initial deposit always 1000
    initialDeposit: 1000
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleNext = () => {
    setError("")
    // Validate step 0
    if (step === 0) {
      if (!form.fullName || !form.email || !form.phone || !form.dateOfBirth || !form.address) {
        setError("Please fill in all personal details.")
        return
      }
    }
    // Validate step 1
    if (step === 1) {
      if (!form.PAN || !form.aadhaarLast4) {
        setError("Please fill in all document details.")
        return
      }
      if (form.aadhaarLast4.length !== 4) {
        setError("Aadhaar must be last 4 digits only.")
        return
      }
      if (form.PAN.length !== 10) {
        setError("PAN must be 10 characters.")
        return
      }
    }
    setStep(step + 1)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError("")
    try {
      await addDoc(collection(db, "customer_requests"), {
        ...form,
        bankId:    process.env.REACT_APP_BANK_ID,
        status:    "pending",
        createdAt: serverTimestamp()
      })
      setSuccess(true)
    } catch (err) {
      setError("Submission failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ minHeight: "100vh", display: "flex",
          alignItems: "center", justifyContent: "center" }}>
          <Paper elevation={4} sx={{ p: 5, borderRadius: 3, textAlign: "center" }}>
            <AccountBalanceIcon sx={{ fontSize: 56, color: "success.main" }} />
            <Typography variant="h5" fontWeight="bold" mt={2}>
              Application Submitted!
            </Typography>
            <Typography color="text.secondary" mt={1} mb={3}>
              Your account request has been submitted to AUS Bank.
              You will receive an email once it is reviewed.
            </Typography>
            <Button variant="contained" onClick={() => navigate("/login")}>
              Back to Login
            </Button>
          </Paper>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ minHeight: "100vh", display: "flex",
        alignItems: "center", justifyContent: "center", py: 4 }}>
        <Paper elevation={4} sx={{ p: 5, width: "100%", borderRadius: 3 }}>

          {/* Header */}
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <AccountBalanceIcon sx={{ fontSize: 48, color: "primary.main" }} />
            <Typography variant="h5" fontWeight="bold" color="primary">
              Open an Account
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {process.env.REACT_APP_BANK_NAME}
            </Typography>
          </Box>

          {/* Stepper */}
          <Stepper activeStep={step} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {/* Step 0 — Personal Details */}
          {step === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField label="Full Name" name="fullName"
                  fullWidth value={form.fullName} onChange={handleChange} />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Email Address" name="email" type="email"
                  fullWidth value={form.email} onChange={handleChange} />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Phone Number" name="phone"
                  fullWidth value={form.phone} onChange={handleChange} />
              </Grid>
              <Grid item xs={12}>
                <TextField name="dateOfBirth"
                  type="date" fullWidth value={form.dateOfBirth}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Address" name="address" multiline rows={2}
                  fullWidth value={form.address} onChange={handleChange} />
              </Grid>
            </Grid>
          )}

          {/* Step 1 — Document Details */}
          {step === 1 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField label="PAN Number" name="PAN"
                  fullWidth value={form.PAN}
                  onChange={(e) => setForm({
                    ...form, PAN: e.target.value.toUpperCase()
                  })}
                  inputProps={{ maxLength: 10 }}
                  helperText="10 character PAN e.g. ABCDE1234F" />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Last 4 digits of Aadhaar"
                  name="aadhaarLast4" fullWidth
                  value={form.aadhaarLast4} onChange={handleChange}
                  inputProps={{ maxLength: 4 }}
                  helperText="Only last 4 digits stored for security" />
              </Grid>
              <Grid item xs={12}>
                <TextField select label="Account Type" name="accountType"
                  fullWidth value={form.accountType} onChange={handleChange}>
                  <MenuItem value="savings">Savings Account</MenuItem>
                  <MenuItem value="current">Current Account</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField label="Initial Deposit (₹)" fullWidth
                  value="₹1,000 (fixed)" disabled
                  helperText="Minimum initial deposit as per bank policy" />
              </Grid>
            </Grid>
          )}

          {/* Step 2 — Review */}
          {step === 2 && (
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" mb={2}>
                Review your details
              </Typography>
              {[
                ["Full Name",    form.fullName],
                ["Email",        form.email],
                ["Phone",        form.phone],
                ["Date of Birth",form.dateOfBirth],
                ["Address",      form.address],
                ["PAN",          form.PAN],
                ["Aadhaar Last 4",form.aadhaarLast4],
                ["Account Type", form.accountType],
                ["Initial Deposit","₹1,000"],
              ].map(([label, value]) => (
                <Box key={label} sx={{ display: "flex",
                  justifyContent: "space-between", py: 0.5,
                  borderBottom: "1px solid #eee" }}>
                  <Typography variant="body2" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography variant="body2" fontWeight="500">
                    {value}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {/* Buttons */}
          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
            {step > 0 ? (
              <Button onClick={() => setStep(step - 1)} disabled={loading}>
                Back
              </Button>
            ) : (
              <Button onClick={() => navigate("/login")}>
                Back to Login
              </Button>
            )}

            {step < 2 ? (
              <Button variant="contained" onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button variant="contained" onClick={handleSubmit}
                disabled={loading}>
                {loading
                  ? <CircularProgress size={20} color="inherit" />
                  : "Submit Application"}
              </Button>
            )}
          </Box>

        </Paper>
      </Box>
    </Container>
  )
}