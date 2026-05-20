// src/pages/auth/Login.js
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import {
  Container, Box, TextField, Button,
  Typography, Alert, CircularProgress, Paper
} from "@mui/material"
import AccountBalanceIcon from "@mui/icons-material/AccountBalance"

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [error,    setError]    = useState("")
  const [loading,  setLoading]  = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await login(email, password)
      navigate("/dashboard")
    } catch (err) {
      setError("Invalid email or password. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <Paper elevation={4} sx={{ p: 5, width: "100%", borderRadius: 3 }}>
          
          {/* Bank Logo and Name */}
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <AccountBalanceIcon sx={{ fontSize: 56, color: "primary.main" }} />
            <Typography variant="h4" fontWeight="bold" color="primary">
              {process.env.REACT_APP_BANK_NAME}
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>
              Staff Login Portal
            </Typography>
          </Box>

          {/* Error message */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Login Form */}
          <Box component="form" onSubmit={handleLogin}>
            <TextField
              label="Email Address"
              type="email"
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 3 }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ py: 1.5, borderRadius: 2 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "Login"}
            </Button>
          </Box>
          <Box sx={{ textAlign: "center", mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
                Want to open an account?{" "}
                <span
                    onClick={() => navigate("/register")}
                    style={{ color: "#1a237e", cursor: "pointer", fontWeight: "bold" }}
                >
                Apply here
                </span>
            </Typography>
            </Box>
        </Paper>
      </Box>
    </Container>
  )
}