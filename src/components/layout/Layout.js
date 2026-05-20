// src/components/layout/Layout.js
import { Box } from "@mui/material"
import Sidebar from "./Sidebar"
import { useInterbankListener } from "../../hooks/useInterbankListener"

export default function Layout({ children }) {
  useInterbankListener() 

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
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