// src/pages/admin/AdminDashboard.js
import { hubDb } from "../../config/firebaseHub"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { Button, Snackbar } from "@mui/material"
import SyncIcon from "@mui/icons-material/Sync"
import { useAuth } from "../../context/AuthContext"
import Layout from "../../components/layout/Layout"
import { useEffect, useState } from "react"
import { db } from "../../config/firebasePrivate"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import {
  Box, Typography, Grid, Paper, CircularProgress
} from "@mui/material"
import PeopleIcon         from "@mui/icons-material/People"
import AccountBalanceIcon from "@mui/icons-material/AccountBalance"
import SendIcon           from "@mui/icons-material/Send"
import PendingIcon        from "@mui/icons-material/Pending"

function StatCard({ title, value, icon, color, loading }) {
  return (
    <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography variant="body2" color="text.secondary">{title}</Typography>
          <Typography variant="h4" fontWeight="bold" mt={1}>
            {loading ? <CircularProgress size={24} /> : value}
          </Typography>
        </Box>
        <Box sx={{ backgroundColor: color + "20", borderRadius: "50%", p: 1.5 }}>
          <Box sx={{ color }}>{icon}</Box>
        </Box>
      </Box>
    </Paper>
  )
}

export default function AdminDashboard() {
  const { staff } = useAuth()

  const [stats, setStats] = useState({
    totalCustomers:   0,
    totalAccounts:    0,
    transfersToday:   0,
    pendingRequests:  0
  })
  const [loading, setLoading] = useState(true)
  const [recentTxns, setRecentTxns] = useState([])

  useEffect(() => {
    // Listen to customers collection
    const unsubCustomers = onSnapshot(
      collection(db, "customers"),
      (snap) => {
        setStats(prev => ({ ...prev, totalCustomers: snap.size }))
        setLoading(false)
      }
    )

    // Listen to accounts collection
    const unsubAccounts = onSnapshot(
      collection(db, "accounts"),
      (snap) => {
        setStats(prev => ({ ...prev, totalAccounts: snap.size }))
      }
    )

    // Listen to pending requests
    const unsubPending = onSnapshot(
      query(collection(db, "customer_requests"),
        where("status", "==", "pending")),
      (snap) => {
        setStats(prev => ({ ...prev, pendingRequests: snap.size }))
      }
    )

    // Listen to transactions
    const unsubTxns = onSnapshot(
      collection(db, "transactions"),
      (snap) => {
        // Count today's transfers
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayTxns = snap.docs.filter(d => {
          const ts = d.data().createdAt?.toDate()
          return ts && ts >= today
        })
        setStats(prev => ({ ...prev, transfersToday: todayTxns.length }))

        // Recent 5 transactions
        const all = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)
          .slice(0, 5)
        setRecentTxns(all)
      }
    )

    return () => {
      unsubCustomers()
      unsubAccounts()
      unsubPending()
      unsubTxns()
    }
  }, [])
  const [syncing, setSyncing]   = useState(false)
const [snackbar, setSnackbar] = useState("")

const syncBankToHub = async () => {
  setSyncing(true)
  try {
    await setDoc(doc(hubDb, "banks", process.env.REACT_APP_BANK_ID), {
      bankId:     process.env.REACT_APP_BANK_ID,
      bankName:   process.env.REACT_APP_BANK_NAME,
      ifscPrefix: process.env.REACT_APP_IFSC_CODE.slice(0, 4),
      isActive:   true,
      updatedAt:  serverTimestamp()
    })
    setSnackbar("AUS Bank synced to hub successfully!")
  } catch (err) {
    setSnackbar("Sync failed: " + err.message)
  } finally {
    setSyncing(false)
  }
}

  return (
    <Layout>
      <Typography variant="h4" fontWeight="bold" mb={1}>
        Welcome back, {staff?.name} 👋
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={4}>
        {process.env.REACT_APP_BANK_NAME} — Admin Portal
      </Typography>
        <Box sx={{ mb: 3 }}>
  <Button
    variant="outlined"
    startIcon={syncing ? <CircularProgress size={16} /> : <SyncIcon />}
    onClick={syncBankToHub}
    disabled={syncing}
  >
    {syncing ? "Syncing..." : "Sync Bank to Hub"}
  </Button>
</Box>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Customers"
            value={stats.totalCustomers}
            icon={<PeopleIcon />}
            color="#1a237e"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Accounts"
            value={stats.totalAccounts}
            icon={<AccountBalanceIcon />}
            color="#00897b"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Transfers Today"
            value={stats.transfersToday}
            icon={<SendIcon />}
            color="#f57c00"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Requests"
            value={stats.pendingRequests}
            icon={<PendingIcon />}
            color="#c62828"
            loading={loading}
          />
        </Grid>
      </Grid>

      {/* Recent Activity */}
      <Box mt={4}>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          Recent Activity
        </Typography>
        <Paper elevation={1} sx={{ p: 3, borderRadius: 3 }}>
          {recentTxns.length === 0 ? (
            <Typography color="text.secondary" textAlign="center">
              No recent activity yet.
            </Typography>
          ) : (
            recentTxns.map((txn) => (
              <Box key={txn.id} sx={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", py: 1.5,
                borderBottom: "1px solid #f0f0f0"
              }}>
                <Box>
                  <Typography variant="body2" fontWeight="500">
                    {txn.direction === "debit" ? "↑ Sent" : "↓ Received"} —{" "}
                    {txn.fromAccountId} → {txn.toAccountId}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {txn.createdAt?.toDate().toLocaleDateString()}
                  </Typography>
                </Box>
                <Typography
                  fontWeight="bold"
                  color={txn.direction === "debit" ? "error" : "success.main"}
                >
                  {txn.direction === "debit" ? "-" : "+"}
                  ₹{(txn.amount / 100).toLocaleString("en-IN")}
                </Typography>
              </Box>
            ))
          )}
        </Paper>
      </Box>
      <Snackbar
  open={!!snackbar}
  autoHideDuration={4000}
  onClose={() => setSnackbar("")}
  message={snackbar}
/>
    </Layout>
  )
}