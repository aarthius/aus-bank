// src/pages/customer/Portfolio.js
import { useState, useEffect } from "react"
import { db } from "../../config/firebasePrivate"
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore"
import { useAuth } from "../../context/AuthContext"
import CustomerLayout from "../../components/layout/CustomerLayout"
import {
  Box, Typography, Paper, Grid,
  CircularProgress, Divider, LinearProgress
} from "@mui/material"
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet"
import TrendingUpIcon           from "@mui/icons-material/TrendingUp"
import TrendingDownIcon         from "@mui/icons-material/TrendingDown"
import SwapHorizIcon            from "@mui/icons-material/SwapHoriz"

export default function Portfolio() {
  const { staff }       = useAuth()
  const [account,       setAccount]      = useState(null)
  const [transactions,  setTransactions] = useState([])
  const [loading,       setLoading]      = useState(true)

  useEffect(() => {
    if (!staff) return
    const fetch = async () => {
      const customerSnap = await getDocs(
        query(collection(db, "customers"),
          where("uid", "==", staff.uid))
      )
      if (customerSnap.empty) return
      const customerDoc = customerSnap.docs[0]

      // Listen to account
      onSnapshot(
        query(collection(db, "accounts"),
          where("customerId", "==", customerDoc.id)),
        (snap) => {
          if (!snap.empty) {
            setAccount({ id: snap.docs[0].id, ...snap.docs[0].data() })
          }
        }
      )

      // Get all transactions
      const debitSnap = await getDocs(
        query(collection(db, "transactions"),
          where("fromAccountId", "==",
            (await getDocs(query(collection(db, "accounts"),
              where("customerId", "==", customerDoc.id))))
            .docs[0]?.id))
      )
      const creditSnap = await getDocs(
        query(collection(db, "transactions"),
          where("toAccountId", "==",
            (await getDocs(query(collection(db, "accounts"),
              where("customerId", "==", customerDoc.id))))
            .docs[0]?.id))
      )

      const all = [
        ...debitSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        ...creditSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      ]
      setTransactions(all)
      setLoading(false)
    }
    fetch()
  }, [staff])

  // Calculate stats
  const totalCredits = transactions
    .filter(t => t.direction === "credit" && t.status === "completed")
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  const totalDebits = transactions
    .filter(t => t.direction === "debit" && t.status === "completed")
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  const interbankCount = transactions
    .filter(t => t.type === "interbank").length

  const intrabankCount = transactions
    .filter(t => t.type === "intrabank").length

  const totalTxns = transactions.length
  const interbankPct = totalTxns > 0
    ? Math.round((interbankCount / totalTxns) * 100) : 0

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
      <Typography variant="h5" fontWeight="bold" mb={1}>
        Portfolio
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={4}>
        Your account summary and financial overview
      </Typography>

      <Grid container spacing={3}>
        {/* Balance */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3,
            background: "linear-gradient(135deg, #00695c, #00897b)",
            color: "white" }}>
            <AccountBalanceWalletIcon sx={{ mb: 1 }} />
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Current Balance
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              ₹{((account?.balance || 0) / 100).toLocaleString("en-IN")}
            </Typography>
            <Divider sx={{ borderColor: "rgba(255,255,255,0.3)", my: 1.5 }} />
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              {account?.accountNumber}
            </Typography>
            <br />
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              {account?.accountType} • {account?.ifscCode}
            </Typography>
          </Paper>
        </Grid>

        {/* Total Credits */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Money In
                </Typography>
                <Typography variant="h5" fontWeight="bold"
                  color="success.main" mt={1}>
                  +₹{(totalCredits / 100).toLocaleString("en-IN")}
                </Typography>
              </Box>
              <Box sx={{ backgroundColor: "#e8f5e9",
                borderRadius: "50%", p: 1.5, height: "fit-content" }}>
                <TrendingUpIcon sx={{ color: "success.main" }} />
              </Box>
            </Box>
            <Typography variant="caption" color="text.secondary" mt={1}>
              {transactions.filter(t => t.direction === "credit").length} credit transactions
            </Typography>
          </Paper>
        </Grid>

        {/* Total Debits */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Money Out
                </Typography>
                <Typography variant="h5" fontWeight="bold"
                  color="error.main" mt={1}>
                  -₹{(totalDebits / 100).toLocaleString("en-IN")}
                </Typography>
              </Box>
              <Box sx={{ backgroundColor: "#ffebee",
                borderRadius: "50%", p: 1.5, height: "fit-content" }}>
                <TrendingDownIcon sx={{ color: "error.main" }} />
              </Box>
            </Box>
            <Typography variant="caption" color="text.secondary" mt={1}>
              {transactions.filter(t => t.direction === "debit").length} debit transactions
            </Typography>
          </Paper>
        </Grid>

        {/* Transaction Breakdown */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight="bold" mb={3}>
              Transaction Breakdown
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "space-between",
              mb: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <SwapHorizIcon color="primary" fontSize="small" />
                <Typography variant="body2">Interbank Transfers</Typography>
              </Box>
              <Typography variant="body2" fontWeight="bold">
                {interbankCount} ({interbankPct}%)
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={interbankPct}
              sx={{ mb: 2, borderRadius: 2, height: 8 }}
            />
            <Box sx={{ display: "flex", justifyContent: "space-between",
              mb: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <SwapHorizIcon color="success" fontSize="small" />
                <Typography variant="body2">Intrabank Transfers</Typography>
              </Box>
              <Typography variant="body2" fontWeight="bold">
                {intrabankCount} ({100 - interbankPct}%)
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={100 - interbankPct}
              color="success"
              sx={{ borderRadius: 2, height: 8 }}
            />
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Total Transactions: <b>{totalTxns}</b>
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </CustomerLayout>
  )
}