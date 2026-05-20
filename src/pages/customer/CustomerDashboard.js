// src/pages/customer/CustomerDashboard.js
import { useState, useEffect } from "react"
import { db } from "../../config/firebasePrivate"
import {
  collection, query, where, onSnapshot, getDocs
} from "firebase/firestore"
import { useAuth } from "../../context/AuthContext"
import CustomerLayout from "../../components/layout/CustomerLayout"
import {
  Box, Typography, Paper, Grid, Chip,
  CircularProgress, Button, Divider
} from "@mui/material"
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet"
import SendIcon                 from "@mui/icons-material/Send"
import HistoryIcon              from "@mui/icons-material/History"
import ArrowUpwardIcon          from "@mui/icons-material/ArrowUpward"
import ArrowDownwardIcon        from "@mui/icons-material/ArrowDownward"
import ContentCopyIcon          from "@mui/icons-material/ContentCopy"
import { useNavigate }          from "react-router-dom"

export default function CustomerDashboard() {
  const { staff }     = useAuth()
  const navigate      = useNavigate()
  const [account,     setAccount]     = useState(null)
  const [transactions,setTransactions]= useState([])
  const [loading,     setLoading]     = useState(true)
  const [copied,      setCopied]      = useState(false)

  useEffect(() => {
    if (!staff) return

    // Fetch customer's account
    const fetchAccount = async () => {
      const customerSnap = await getDocs(
        query(collection(db, "customers"),
          where("uid", "==", staff.uid))
      )
      if (customerSnap.empty) return

      const customerDoc = customerSnap.docs[0]

      // Listen to account
      const unsubAccount = onSnapshot(
        query(collection(db, "accounts"),
          where("customerId", "==", customerDoc.id)),
        (snap) => {
          if (!snap.empty) {
            setAccount({ id: snap.docs[0].id, ...snap.docs[0].data() })
          }
          setLoading(false)
        }
      )

      // Listen to transactions
      const unsubTxns = onSnapshot(
        query(collection(db, "transactions"),
          where("fromAccountId", "==", customerDoc.id)),
        (snap) => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          data.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)
          setTransactions(data.slice(0, 5))
        }
      )

      return () => { unsubAccount(); unsubTxns() }
    }

    fetchAccount()
  }, [staff])

  const copyAccountNumber = () => {
    navigator.clipboard.writeText(account?.accountNumber || "")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

  return (
    <CustomerLayout>
      <Typography variant="h4" fontWeight="bold" mb={1}>
        Welcome, {staff?.name} 👋
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={4}>
        {process.env.REACT_APP_BANK_NAME} — Customer Portal
      </Typography>

      <Grid container spacing={3}>
        {/* Balance Card */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{
            p: 4, borderRadius: 3,
            background: "linear-gradient(135deg, #00695c, #00897b)",
            color: "white"
          }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <AccountBalanceWalletIcon />
              <Typography variant="body2">Available Balance</Typography>
            </Box>
            <Typography variant="h3" fontWeight="bold">
              ₹{((account?.balance || 0) / 100).toLocaleString("en-IN")}
            </Typography>
            <Divider sx={{ borderColor: "rgba(255,255,255,0.3)", my: 2 }} />
            <Box sx={{ display: "flex", justifyContent: "space-between",
              alignItems: "center" }}>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  Account Number
                </Typography>
                <Typography variant="body2" fontFamily="monospace" fontWeight="bold">
                  {account?.accountNumber || "—"}
                </Typography>
              </Box>
              <Button
                size="small"
                startIcon={<ContentCopyIcon />}
                onClick={copyAccountNumber}
                sx={{ color: "white", borderColor: "rgba(255,255,255,0.5)",
                  border: 1, borderRadius: 2 }}
              >
                {copied ? "Copied!" : "Copy"}
              </Button>
            </Box>
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                IFSC: {account?.ifscCode} • {account?.accountType} account
              </Typography>
            </Box>
            <Chip
              label={account?.status}
              size="small"
              sx={{
                mt: 1,
                backgroundColor: account?.status === "active"
                  ? "rgba(255,255,255,0.2)" : "rgba(255,0,0,0.3)",
                color: "white",
                textTransform: "capitalize"
              }}
            />
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3, height: "100%" }}>
            <Typography variant="h6" fontWeight="bold" mb={3}>
              Quick Actions
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<SendIcon />}
                onClick={() => navigate("/customer/send")}
                sx={{ borderRadius: 2, py: 1.5,
                  backgroundColor: "#00695c" }}
                disabled={account?.status !== "active"}
              >
                Send Money
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<HistoryIcon />}
                onClick={() => navigate("/customer/transactions")}
                sx={{ borderRadius: 2, py: 1.5,
                  borderColor: "#00695c", color: "#00695c" }}
              >
                View Transactions
              </Button>
            </Box>
            {account?.status !== "active" && (
              <Typography variant="caption" color="error" mt={2} display="block">
                Your account is {account?.status}. Contact bank for assistance.
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Recent Transactions */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight="bold" mb={2}>
              Recent Transactions
            </Typography>
            {transactions.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={3}>
                No transactions yet.
              </Typography>
            ) : (
              transactions.map((txn) => (
                <Box key={txn.id} sx={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", py: 1.5,
                  borderBottom: "1px solid #f0f0f0"
                }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box sx={{
                      p: 1, borderRadius: "50%",
                      backgroundColor: txn.direction === "debit"
                        ? "#ffebee" : "#e8f5e9"
                    }}>
                      {txn.direction === "debit"
                        ? <ArrowUpwardIcon fontSize="small"
                            sx={{ color: "error.main" }} />
                        : <ArrowDownwardIcon fontSize="small"
                            sx={{ color: "success.main" }} />}
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight="500">
                        {txn.direction === "debit" ? "Sent to " : "Received from "}
                        {txn.direction === "debit"
                          ? txn.toAccountId : txn.fromAccountId}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {txn.createdAt?.toDate().toLocaleDateString("en-IN")}
                        {" • "}{txn.mode || "internal"}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography
                      fontWeight="bold"
                      color={txn.direction === "debit"
                        ? "error.main" : "success.main"}
                    >
                      {txn.direction === "debit" ? "−" : "+"}
                      ₹{((txn.amount || 0) / 100).toLocaleString("en-IN")}
                    </Typography>
                    <Chip
                      label={txn.status}
                      size="small"
                      color={txn.status === "completed" ? "success" :
                             txn.status === "pending"   ? "warning" : "error"}
                      sx={{ textTransform: "capitalize" }}
                    />
                  </Box>
                </Box>
              ))
            )}
          </Paper>
        </Grid>
      </Grid>
    </CustomerLayout>
  )
}