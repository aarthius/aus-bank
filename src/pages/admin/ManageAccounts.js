// src/pages/admin/ManageAccounts.js
import { useState, useEffect } from "react"
import { db } from "../../config/firebasePrivate"
import {
  collection, onSnapshot, doc, updateDoc, serverTimestamp
} from "firebase/firestore"
import Layout from "../../components/layout/Layout"
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, CircularProgress, Alert, InputAdornment
} from "@mui/material"
import SearchIcon  from "@mui/icons-material/Search"
import LockIcon    from "@mui/icons-material/Lock"
import LockOpenIcon from "@mui/icons-material/LockOpen"
import EditIcon    from "@mui/icons-material/Edit"

export default function ManageAccounts() {
  const [accounts,  setAccounts]  = useState([])
  const [customers, setCustomers] = useState({})
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState("")
  const [selected,  setSelected]  = useState(null)
  const [limitDialog, setLimitDialog] = useState(false)
  const [newLimit,  setNewLimit]  = useState("")
  const [acting,    setActing]    = useState(false)
  const [success,   setSuccess]   = useState("")
  const [error,     setError]     = useState("")

  // Fetch accounts in real time
  useEffect(() => {
    const unsubAccounts = onSnapshot(
      collection(db, "accounts"),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        data.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)
        setAccounts(data)
        setLoading(false)
      }
    )

    // Fetch customers for name lookup
    const unsubCustomers = onSnapshot(
      collection(db, "customers"),
      (snap) => {
        const map = {}
        snap.docs.forEach(d => { map[d.id] = d.data() })
        setCustomers(map)
      }
    )

    return () => { unsubAccounts(); unsubCustomers() }
  }, [])

  // Freeze or unfreeze account
  const handleFreezeToggle = async (account) => {
    setActing(true)
    try {
      const newStatus = account.status === "active" ? "frozen" : "active"
      await updateDoc(doc(db, "accounts", account.id), {
        status:    newStatus,
        updatedAt: serverTimestamp()
      })
      setSuccess(`Account ${newStatus === "active" ? "unfrozen" : "frozen"} successfully!`)
    } catch (err) {
      setError("Failed to update account status.")
    } finally {
      setActing(false)
    }
  }

  // Set transfer limit
  const handleSetLimit = async () => {
    if (!newLimit || isNaN(newLimit) || Number(newLimit) < 0) {
      setError("Please enter a valid limit amount.")
      return
    }
    setActing(true)
    try {
      await updateDoc(doc(db, "accounts", selected.id), {
        transferLimit: Number(newLimit) * 100, // store in paise
        updatedAt:     serverTimestamp()
      })
      setSuccess("Transfer limit updated successfully!")
      setLimitDialog(false)
      setSelected(null)
      setNewLimit("")
    } catch (err) {
      setError("Failed to update transfer limit.")
    } finally {
      setActing(false)
    }
  }

  // Filter accounts by search
  const filtered = accounts.filter(acc => {
    const customer = customers[acc.customerId]
    const name     = customer?.fullName?.toLowerCase() || ""
    const accNum   = acc.accountNumber?.toLowerCase() || ""
    const term     = search.toLowerCase()
    return name.includes(term) || accNum.includes(term)
  })

  return (
    <Layout>
      <Typography variant="h5" fontWeight="bold" mb={1}>
        Manage Accounts
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        View, freeze, and manage customer accounts
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Search */}
      <TextField
        placeholder="Search by name or account number..."
        fullWidth
        sx={{ mb: 3 }}
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

      {loading ? (
        <Box sx={{ textAlign: "center", mt: 8 }}>
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
          <Typography color="text.secondary">
            No accounts found.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
              <TableRow>
                <TableCell><b>Customer Name</b></TableCell>
                <TableCell><b>Account Number</b></TableCell>
                <TableCell><b>Type</b></TableCell>
                <TableCell><b>Balance</b></TableCell>
                <TableCell><b>Transfer Limit</b></TableCell>
                <TableCell><b>Status</b></TableCell>
                <TableCell><b>Actions</b></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((acc) => {
                const customer = customers[acc.customerId]
                return (
                  <TableRow key={acc.id} hover>
                    <TableCell>
                      {customer?.fullName || "—"}
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {acc.accountNumber}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textTransform: "capitalize" }}>
                      {acc.accountType}
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight="bold" color="success.main">
                        ₹{((acc.balance || 0) / 100).toLocaleString("en-IN")}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {acc.transferLimit
                        ? `₹${(acc.transferLimit / 100).toLocaleString("en-IN")}`
                        : <Chip label="No limit" size="small" />}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={acc.status}
                        color={acc.status === "active" ? "success" : "error"}
                        size="small"
                        sx={{ textTransform: "capitalize" }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          color={acc.status === "active" ? "error" : "success"}
                          startIcon={acc.status === "active"
                            ? <LockIcon /> : <LockOpenIcon />}
                          onClick={() => handleFreezeToggle(acc)}
                          disabled={acting}
                        >
                          {acc.status === "active" ? "Freeze" : "Unfreeze"}
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          startIcon={<EditIcon />}
                          onClick={() => {
                            setSelected(acc)
                            setNewLimit(
                              acc.transferLimit
                                ? (acc.transferLimit / 100).toString()
                                : ""
                            )
                            setLimitDialog(true)
                          }}
                        >
                          Set Limit
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Transfer Limit Dialog */}
      <Dialog
        open={limitDialog}
        onClose={() => setLimitDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          Set Transfer Limit — {customers[selected?.customerId]?.fullName}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Account: {selected?.accountNumber}
          </Typography>
          <TextField
            label="Transfer Limit (₹)"
            fullWidth
            type="number"
            value={newLimit}
            onChange={(e) => setNewLimit(e.target.value)}
            helperText="Maximum amount allowed per transfer. Leave 0 for no limit."
            InputProps={{
              startAdornment:
                <InputAdornment position="start">₹</InputAdornment>
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setLimitDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSetLimit}
            disabled={acting}
          >
            {acting
              ? <CircularProgress size={20} color="inherit" />
              : "Save Limit"}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}