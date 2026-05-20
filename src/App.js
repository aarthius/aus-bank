// src/App.js
import ManageLoans from "./pages/admin/ManageLoans"
import CustomerTransactionHistory from "./pages/customer/TransactionHistory"
import Portfolio                  from "./pages/customer/Portfolio"
import Loans                      from "./pages/customer/Loans"
import SendMoney from "./pages/customer/SendMoney"
import CustomerDashboard from "./pages/customer/CustomerDashboard"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { useAuth } from "./context/AuthContext"
import Login             from "./pages/auth/Login"
import Register          from "./pages/shared/Register"
import AdminDashboard    from "./pages/admin/AdminDashboard"
import CustomerRequests  from "./pages/admin/CustomerRequests"
import ManageAccounts from "./pages/admin/ManageAccounts"
import ManageStaff from "./pages/admin/ManageStaff"
import TransactionHistory from "./pages/admin/TransactionHistory"
function ProtectedRoute({ children, allowedRoles }) {
  const { user, staff } = useAuth()
  if (!user) return <Navigate to="/login" />
  if (allowedRoles && !allowedRoles.includes(staff?.role)) {
    return <Navigate to="/login" />
  }
  return children
}

function RoleRedirect() {
  const { user, staff } = useAuth()
  if (!user) return <Navigate to="/login" />
  if (["admin", "manager", "teller"].includes(staff?.role)) {
    return <Navigate to="/admin/dashboard" />
  }
  if (staff?.role === "customer") {
    return <Navigate to="/customer/dashboard" />
  }
  return <Navigate to="/login" />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Role redirect */}
        <Route path="/dashboard" element={<RoleRedirect />} />

        {/* Admin routes */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute allowedRoles={["admin", "manager", "teller"]}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/requests" element={
          <ProtectedRoute allowedRoles={["admin", "manager", "teller"]}>
            <CustomerRequests />
          </ProtectedRoute>
        } />
        <Route path="/customer/transactions" element={
  <ProtectedRoute allowedRoles={["customer"]}>
    <CustomerTransactionHistory />
  </ProtectedRoute>
} />
<Route path="/customer/portfolio" element={
  <ProtectedRoute allowedRoles={["customer"]}>
    <Portfolio />
  </ProtectedRoute>
} />
<Route path="/customer/loans" element={
  <ProtectedRoute allowedRoles={["customer"]}>
    <Loans />
  </ProtectedRoute>
} />
      <Route path="/admin/loans" element={
  <ProtectedRoute allowedRoles={["admin", "manager"]}>
    <ManageLoans />
  </ProtectedRoute>
} />
        <Route path="/customer/send" element={
          <ProtectedRoute allowedRoles={["customer"]}>
            <SendMoney />
          </ProtectedRoute>
        } />
        <Route path="/admin/accounts" element={
          <ProtectedRoute allowedRoles={["admin", "manager", "teller"]}>
            <ManageAccounts />
          </ProtectedRoute>
        } />
        <Route path="/customer/dashboard" element={
          <ProtectedRoute allowedRoles={["customer"]}>
            <CustomerDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/transactions" element={
          <ProtectedRoute allowedRoles={["admin", "manager", "teller"]}>
            <TransactionHistory />
          </ProtectedRoute>
        } />
        <Route path="/admin/staff" element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <ManageStaff />
          </ProtectedRoute>
        } />
        {/* Customer routes */}
        <Route path="/customer/dashboard" element={
          <ProtectedRoute allowedRoles={["customer"]}>
            <div style={{ padding: 40 }}>Customer Dashboard Coming Soon</div>
          </ProtectedRoute>
        } />

        {/* Default */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App