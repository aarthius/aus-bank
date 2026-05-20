// src/pages/admin/TransactionHistory.js
import { useState, useEffect } from "react"
import { db } from "../../config/firebasePrivate"
import { collection, onSnapshot } from "firebase/firestore"
import Layout from "../../components/layout/Layout"
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip,
  TextField, InputAdornment, MenuItem
} from "@mui/material"
import SearchIcon from "@mui/icons-material/Search"
import ArrowUpwardIcon   from "@mui/icons-material/ArrowUpward"
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward"

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState("")
  const [filter,       setFilter]       = useState("all")

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "transactions"),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        data.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)
        setTransactions(data)
        setLoading(false)
      }
    )
    return unsub
  }, [])

  // Apply filter and search
  const filtered = transactions.filter(txn => {
    const matchSearch =
      txn.fromAccountId?.toLowerCase().includes(search.toLowerCase()) ||
      txn.toAccountId?.toLowerCase().includes(search.toLowerCase()) ||
      txn.transactionId?.toLowerCase().includes(search.toLowerCase())

    const matchFilter =
      filter === "all"        ? true :
      filter === "credit"     ? txn.direction === "credit" :
      filter === "debit"      ? txn.direction === "debit" :
      filter === "pending"    ? txn.status === "pending" :
      filter === "failed"     ? txn.status === "failed" :
      filter === "interbank"  ? txn.type === "interbank" :
      filter === "intrabank"  ? txn.type === "intrabank" : true

    return matchSearch && matchFilter
  })

  const statusColor = {
    completed:  "success",
    pending:    "warning",
    failed:     "error",
    processing: "info"
  }

  return (
    <Layout>
      <Typography variant="h5" fontWeight="bold" mb={1}>
        Transaction History
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        All transactions across AUS Bank
      </Typography>

      {/* Search and Filter */}
      <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
        <TextField
          placeholder="Search by account or transaction ID..."
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
          <MenuItem value="intrabank">Intrabank</MenuItem>
        </TextField>
      </Box>

      {loading ? (
        <Typography textAlign="center" mt={8}>Loading...</Typography>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
          <Typography color="text.secondary">
            No transactions found.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
              <TableRow>
                <TableCell><b>Type</b></TableCell>
                <TableCell><b>From Account</b></TableCell>
                <TableCell><b>To Account</b></TableCell>
                <TableCell><b>To Bank</b></TableCell>
                <TableCell><b>Amount</b></TableCell>
                <TableCell><b>Mode</b></TableCell>
                <TableCell><b>Status</b></TableCell>
                <TableCell><b>Date</b></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((txn) => (
                <TableRow key={txn.id} hover>
                  <TableCell>
                    {txn.direction === "debit" ? (
                      <Box sx={{ display: "flex", alignItems: "center",
                        gap: 0.5, color: "error.main" }}>
                        <ArrowUpwardIcon fontSize="small" />
                        <Typography variant="body2">Debit</Typography>
                      </Box>
                    ) : (
                      <Box sx={{ display: "flex", alignItems: "center",
                        gap: 0.5, color: "success.main" }}>
                        <ArrowDownwardIcon fontSize="small" />
                        <Typography variant="body2">Credit</Typography>
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {txn.fromAccountId || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {txn.toAccountId || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={txn.toBankId === process.env.REACT_APP_BANK_ID
                        ? "Internal" : txn.toBankId || "—"}
                      size="small"
                      color={txn.toBankId === process.env.REACT_APP_BANK_ID
                        ? "default" : "primary"}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography
                      fontWeight="bold"
                      color={txn.direction === "debit"
                        ? "error.main" : "success.main"}
                    >
                      {txn.direction === "debit" ? "−" : "+"}
                      ₹{((txn.amount || 0) / 100).toLocaleString("en-IN")}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={txn.mode || "internal"}
                      size="small"
                      sx={{ textTransform: "uppercase" }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={txn.status}
                      color={statusColor[txn.status] || "default"}
                      size="small"
                      sx={{ textTransform: "capitalize" }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {txn.createdAt?.toDate().toLocaleDateString("en-IN", {
                        day:   "2-digit",
                        month: "short",
                        year:  "numeric"
                      })}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Layout>
  )
}