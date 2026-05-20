// src/components/layout/CustomerLayout.js
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import {
  Box, Drawer, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Typography, Divider, Button
} from "@mui/material"
import { useInterbankListener } from "../../hooks/useInterbankListener"
import DashboardIcon      from "@mui/icons-material/Dashboard"
import SendIcon           from "@mui/icons-material/Send"
import HistoryIcon        from "@mui/icons-material/History"
import AccountBalanceIcon from "@mui/icons-material/AccountBalance"
import PieChartIcon       from "@mui/icons-material/PieChart"
import CreditScoreIcon    from "@mui/icons-material/CreditScore"
import LogoutIcon         from "@mui/icons-material/Logout"

const DRAWER_WIDTH = 240

const customerLinks = [
  { text: "Dashboard",           icon: <DashboardIcon />,      path: "/customer/dashboard" },
  { text: "Send Money",          icon: <SendIcon />,           path: "/customer/send" },
  { text: "Transaction History", icon: <HistoryIcon />,        path: "/customer/transactions" },
  { text: "Portfolio",           icon: <PieChartIcon />,       path: "/customer/portfolio" },
  { text: "Loans",               icon: <CreditScoreIcon />,    path: "/customer/loans" },
]

export default function CustomerLayout({ children }) {
  useInterbankListener()
  const { staff, logout } = useAuth()
  const navigate          = useNavigate()
  const location          = useLocation()

  const handleLogout = async () => {
    await logout()
    navigate("/login")
  }

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            backgroundColor: "#00695c",
            color: "white"
          }
        }}
      >
        {/* Bank Name */}
        <Box sx={{ p: 3, textAlign: "center" }}>
          <AccountBalanceIcon sx={{ fontSize: 40, color: "white" }} />
          <Typography variant="h6" fontWeight="bold" color="white">
            {process.env.REACT_APP_BANK_NAME}
          </Typography>
          <Typography variant="caption" sx={{ color: "#b2dfdb" }}>
            Customer Portal
          </Typography>
        </Box>

        <Divider sx={{ borderColor: "#00897b" }} />

        {/* Nav Links */}
        <List sx={{ flexGrow: 1, mt: 1 }}>
          {customerLinks.map((link) => (
            <ListItem key={link.path} disablePadding>
              <ListItemButton
                onClick={() => navigate(link.path)}
                selected={location.pathname === link.path}
                sx={{
                  mx: 1, borderRadius: 2, mb: 0.5,
                  color: "white",
                  "&.Mui-selected": {
                    backgroundColor: "#00897b",
                    color: "white"
                  },
                  "&:hover": { backgroundColor: "#00796b" }
                }}
              >
                <ListItemIcon sx={{ color: "white", minWidth: 36 }}>
                  {link.icon}
                </ListItemIcon>
                <ListItemText
                  primary={link.text}
                  primaryTypographyProps={{ fontSize: 14 }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Divider sx={{ borderColor: "#00897b" }} />

        {/* Customer Info + Logout */}
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="#b2dfdb" noWrap>
            {staff?.name}
          </Typography>
          <Typography variant="caption" color="#b2dfdb" noWrap>
            {staff?.email}
          </Typography>
          <Button
            fullWidth
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            sx={{ mt: 1, color: "white", borderColor: "#00897b",
                  border: 1, borderRadius: 2 }}
          >
            Logout
          </Button>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{
        flexGrow: 1,
        p: 4,
        backgroundColor: "#f5f5f5",
        minHeight: "100vh"
      }}>
        {children}
      </Box>
    </Box>
  )
}