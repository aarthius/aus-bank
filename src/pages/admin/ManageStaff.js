// src/pages/admin/ManageStaff.js
import { useState, useEffect } from "react"
import { db, secondaryAuth } from "../../config/firebasePrivate"
import {
  collection, onSnapshot, doc, updateDoc, setDoc, serverTimestamp
} from "firebase/firestore"
import { createUserWithEmailAndPassword } from "firebase/auth"
import Layout from "../../components/layout/Layout"
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, CircularProgress, Alert, Grid
} from "@mui/material"
import PersonAddIcon from "@mui/icons-material/PersonAdd"
import BlockIcon     from "@mui/icons-material/Block"
import CheckIcon     from "@mui/icons-material/Check"

export default function ManageStaff() {
  const [staffList, setStaffList] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [dialog,    setDialog]    = useState(false)
  const [acting,    setActing]    = useState(false)
  const [success,   setSuccess]   = useState("")
  const [error,     setError]     = useState("")

  const [form, setForm] = useState({
    name:     "",
    email:    "",
    password: "",
    role:     "teller"
  })

  // Real time staff list
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "staff"),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        data.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)
        setStaffList(data)
        setLoading(false)
      }
    )
    return unsub
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // Add new staff member
  const handleAddStaff = async () => {
    if (!form.name || !form.email || !form.password || !form.role) {
      setError("Please fill in all fields.")
      return
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }
    setActing(true)
    setError("")
    try {
      // Create Firebase Auth user
      const result = await createUserWithEmailAndPassword(
        secondaryAuth, form.email, form.password
    )
      const uid = result.user.uid

      // Create staff Firestore document
      await setDoc(doc(db, "staff", uid), {
        uid:       uid,
        name:      form.name,
        email:     form.email,
        role:      form.role,
        bankId:    process.env.REACT_APP_BANK_ID,
        isActive:  true,
        createdAt: serverTimestamp()
      })

      setSuccess(`${form.name} added as ${form.role} successfully!`)
      setDialog(false)
      setForm({ name: "", email: "", password: "", role: "teller" })
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered.")
      } else {
        setError("Failed to add staff: " + err.message)
      }
    } finally {
      setActing(false)
    }
  }

  // Toggle staff active status
  const handleToggleActive = async (member) => {
    try {
      await updateDoc(doc(db, "staff", member.id), {
        isActive:  !member.isActive,
        updatedAt: serverTimestamp()
      })
      setSuccess(`${member.name} ${!member.isActive ? "activated" : "deactivated"}!`)
    } catch (err) {
      setError("Failed to update staff status.")
    }
  }

  const roleColor = {
    admin:   "error",
    manager: "warning",
    teller:  "info"
  }

  return (
    <Layout>
      <Box sx={{ display: "flex", justifyContent: "space-between",
        alignItems: "center", mb: 1 }}>
        <Typography variant="h5" fontWeight="bold">
          Manage Staff
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => setDialog(true)}
        >
          Add Staff
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Add and manage bank staff members
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

      {loading ? (
        <Box sx={{ textAlign: "center", mt: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
              <TableRow>
                <TableCell><b>Name</b></TableCell>
                <TableCell><b>Email</b></TableCell>
                <TableCell><b>Role</b></TableCell>
                <TableCell><b>Status</b></TableCell>
                <TableCell><b>Actions</b></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {staffList.map((member) => (
                <TableRow key={member.id} hover>
                  <TableCell>{member.name}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={member.role}
                      color={roleColor[member.role] || "default"}
                      size="small"
                      sx={{ textTransform: "capitalize" }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={member.isActive ? "Active" : "Inactive"}
                      color={member.isActive ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {member.role !== "admin" && (
                      <Button
                        size="small"
                        variant="outlined"
                        color={member.isActive ? "error" : "success"}
                        startIcon={member.isActive
                          ? <BlockIcon /> : <CheckIcon />}
                        onClick={() => handleToggleActive(member)}
                      >
                        {member.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Staff Dialog */}
      <Dialog open={dialog} onClose={() => setDialog(false)}
        maxWidth="sm" fullWidth>
        <DialogTitle>Add New Staff Member</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                label="Full Name" name="name" fullWidth
                value={form.name} onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Email Address" name="email"
                type="email" fullWidth
                value={form.email} onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Password" name="password"
                type="password" fullWidth
                value={form.password} onChange={handleChange}
                helperText="Minimum 6 characters"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select label="Role" name="role" fullWidth
                value={form.role} onChange={handleChange}
              >
                <MenuItem value="teller">Teller</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddStaff}
            disabled={acting}
          >
            {acting
              ? <CircularProgress size={20} color="inherit" />
              : "Add Staff"}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}