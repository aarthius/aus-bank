// src/components/layout/Sidebar.js
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import {
  Box, Drawer, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Typography, Divider, Button
} from "@mui/material"
import DashboardIcon    from "@mui/icons-material/Dashboard"
import PeopleIcon       from "@mui/icons-material/People"
import AccountBalanceIcon from "@mui/icons-material/AccountBalance"
import SendIcon         from "@mui/icons-material/Send"
import HistoryIcon      from "@mui/icons-material/History"
import PersonAddIcon    from "@mui/icons-material/PersonAdd"
import LogoutIcon       from "@mui/icons-material/Logout"
import BadgeIcon        from "@mui/icons-material/Badge"
import CreditScoreIcon from "@mui/icons-material/CreditScore"
const DRAWER_WIDTH = 240

const adminLinks = [
  { text: "Dashboard",          icon: <DashboardIcon />,     path: "/admin/dashboard" },
  { text: "Customer Requests",  icon: <PeopleIcon />,        path: "/admin/requests" },
  { text: "Manage Accounts",    icon: <AccountBalanceIcon />, path: "/admin/accounts" },
  { text: "Manage Staff",       icon: <BadgeIcon />,         path: "/admin/staff" },
  { text: "Manage Loans",       icon: <CreditScoreIcon />,   path: "/admin/loans" },
  { text: "Transaction History",icon: <HistoryIcon />,       path: "/admin/transactions" },
]

const customerLinks = [
  { text: "Dashboard",          icon: <DashboardIcon />,     path: "/customer/dashboard" },
  { text: "Send Money",         icon: <SendIcon />,          path: "/customer/send" },
  { text: "Transaction History",icon: <HistoryIcon />,       path: "/customer/transactions" },
  { text: "Portfolio",          icon: <AccountBalanceIcon />, path: "/customer/portfolio" },
  { text: "Loans",              icon: <PersonAddIcon />,     path: "/customer/loans" },
]

export default function Sidebar() {
  const { staff, logout } = useAuth()
  const navigate          = useNavigate()
  const location          = useLocation()

  const isAdmin    = ["admin", "manager", "teller"].includes(staff?.role)
  const links      = isAdmin ? adminLinks : customerLinks

  const handleLogout = async () => {
    await logout()
    navigate("/login")
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: DRAWER_WIDTH,
          boxSizing: "border-box",
          backgroundColor: "#1a237e",
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
        <Typography variant="caption" sx={{ color: "#90caf9" }}>
          {staff?.role?.toUpperCase()}
        </Typography>
      </Box>

      <Divider sx={{ borderColor: "#3949ab" }} />

      {/* Nav Links */}
      <List sx={{ flexGrow: 1, mt: 1 }}>
        {links.map((link) => (
          <ListItem key={link.path} disablePadding>
            <ListItemButton
              onClick={() => navigate(link.path)}
              selected={location.pathname === link.path}
              sx={{
                mx: 1, borderRadius: 2, mb: 0.5,
                color: "white",
                "&.Mui-selected": {
                  backgroundColor: "#3949ab",
                  color: "white"
                },
                "&:hover": { backgroundColor: "#283593" }
              }}
            >
              <ListItemIcon sx={{ color: "white", minWidth: 36 }}>
                {link.icon}
              </ListItemIcon>
              <ListItemText primary={link.text}
                primaryTypographyProps={{ fontSize: 14 }} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ borderColor: "#3949ab" }} />

      {/* Staff Info + Logout */}
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="#90caf9" noWrap>
          {staff?.name}
        </Typography>
        <Typography variant="caption" color="#90caf9" noWrap>
          {staff?.email}
        </Typography>
        <Button
          fullWidth
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{ mt: 1, color: "white", borderColor: "#3949ab",
                border: 1, borderRadius: 2 }}
        >
          Logout
        </Button>
      </Box>
    </Drawer>
  )
}