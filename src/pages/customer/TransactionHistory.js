import { useState, useEffect } from "react"
import { db } from "../../config/firebasePrivate"
import {
  collection, query, where, onSnapshot
} from "firebase/firestore"
import { useAuth } from "../../context/AuthContext"
import CustomerLayout from "../../components/layout/CustomerLayout"
import {
  Box, Typography, Paper, Chip, TextField,
  MenuItem, CircularProgress, InputAdornment, Button
} from "@mui/material"
import SearchIcon        from "@mui/icons-material/Search"
import ArrowUpwardIcon   from "@mui/icons-material/ArrowUpward"
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward"
import DownloadIcon      from "@mui/icons-material/Download"
import { generateTransactionReceipt } from "../../utils/generatePDF"

export default function CustomerTransactionHistory() {
  const { staff }        = useAuth()
  const [transactions,   setTransactions] = useState([])
  const [loading,        setLoading]      = useState(true)
  const [filter,         setFilter]       = useState("all")
  const [search,         setSearch]       = useState("")
  const [accountNumber,  setAccountNumber] = useState("")

  useEffect(() => {
    if (!staff) return
    const fetchAndListen = async () => {
      const { getDocs } = await import("firebase/firestore")

      // Get customer doc
      const customerSnap = await getDocs(
        query(collection(db, "customers"),
          where("uid", "==", staff.uid))
      )
      if (customerSnap.empty) return
      const customerDoc = customerSnap.docs[0]

      // Get account
      const accountSnap = await getDocs(
        query(collection(db, "accounts"),
          where("customerId", "==", customerDoc.id))
      )
      if (accountSnap.empty) return
      const accId = accountSnap.docs[0].id
      setAccountNumber(accountSnap.docs[0].data().accountNumber)

      // Listen to all transactions involving this account
      const unsub = onSnapshot(
        query(collection(db, "transactions"),
          where("fromAccountId", "==", accId)),
        (snap) => {
          const debits = snap.docs.map(d => ({ id: d.id, ...d.data() }))

          onSnapshot(
            query(collection(db, "transactions"),
              where("toAccountId", "==", accId)),
            (creditSnap) => {
              const credits = creditSnap.docs.map(d => ({
                id: d.id, ...d.data()
              }))
              const all = [...debits, ...credits]
              all.sort((a, b) =>
                b.createdAt?.seconds - a.createdAt?.seconds)
              setTransactions(all)
              setLoading(false)
            }
          )
        }
      )
      return unsub
    }
    fetchAndListen()
  }, [staff])

  const filtered = transactions.filter(txn => {
    const matchFilter =
      filter === "all"       ? true :
      filter === "credit"    ? txn.direction === "credit" :
      filter === "debit"     ? txn.direction === "debit" :
      filter === "pending"   ? txn.status === "pending" :
      filter === "failed"    ? txn.status === "failed" :
      filter === "interbank" ? txn.type === "interbank" : true

    const matchSearch =
      txn.toAccountId?.includes(search) ||
      txn.fromAccountId?.includes(search) ||
      txn.id?.includes(search)

    return matchFilter && (search === "" || matchSearch)
  })

  const statusColor = {
    completed:  "success",
    pending:    "warning",
    failed:     "error",
    processing: "info"
  }

  return (
    <CustomerLayout>
      <Typography variant="h5" fontWeight="bold" mb={1}>
        Transaction History
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        All your transactions
      </Typography>

      {/* Search and Filter */}
      <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
        <TextField
          placeholder="Search by account or ID..."
          fullWidth
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
        />
        <TextField
          select label="Filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="credit">Credit</MenuItem>
          <MenuItem value="debit">Debit</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="failed">Failed</MenuItem>
          <MenuItem value="interbank">Interbank</MenuItem>
        </TextField>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: "center", mt: 8 }}>
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
          <Typography color="text.secondary">
            No transactions found.
          </Typography>
        </Paper>
      ) : (
        filtered.map((txn) => (
          <Paper key={txn.id} sx={{ p: 2.5, mb: 1.5, borderRadius: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between",
              alignItems: "center" }}>
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
                  <Typography variant="body2" fontWeight="600">
                    {txn.direction === "debit" ? "Sent to " : "Received from "}
                    <span style={{ fontFamily: "monospace" }}>
                      {txn.direction === "debit"
                        ? txn.toAccountId : txn.fromAccountId}
                    </span>
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {txn.createdAt?.toDate().toLocaleDateString("en-IN", {
                        day: "2-digit", month: "short", year: "numeric"
                      })}
                    </Typography>
                    <Chip
                      label={txn.mode || "internal"}
                      size="small"
                      sx={{ height: 18, fontSize: 10,
                        textTransform: "uppercase" }}
                    />
                    {txn.type === "interbank" && (
                      <Chip label="Interbank" size="small"
                        color="primary"
                        sx={{ height: 18, fontSize: 10 }} />
                    )}
                  </Box>
                  {txn.note && (
                    <Typography variant="caption" color="text.secondary">
                      Note: {txn.note}
                    </Typography>
                  )}
                </Box>
              </Box>

              <Box sx={{ textAlign: "right" }}>
                <Typography
                  variant="h6" fontWeight="bold"
                  color={txn.direction === "debit"
                    ? "error.main" : "success.main"}
                >
                  {txn.direction === "debit" ? "−" : "+"}
                  ₹{((txn.amount || 0) / 100).toLocaleString("en-IN")}
                </Typography>
                <Chip
                  label={txn.status}
                  size="small"
                  color={statusColor[txn.status] || "default"}
                  sx={{ textTransform: "capitalize" }}
                />
                {/* Download Receipt Button */}
                <Box sx={{ mt: 1 }}>
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<DownloadIcon />}
                    onClick={() =>
                      generateTransactionReceipt(txn, accountNumber)}
                    sx={{ fontSize: 11 }}
                  >
                    Receipt
                  </Button>
                </Box>
              </Box>
            </Box>
          </Paper>
        ))
      )}
    </CustomerLayout>
  )
}