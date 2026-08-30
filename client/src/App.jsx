import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import EmployeeProfile from "./pages/EmployeeProfile";
import Attendance from "./pages/Attendance";
import Documents from "./pages/Documents";
import Leaves from "./pages/Leaves";
import Departments from "./pages/Departments";
import Settings from "./pages/Settings";
import IDCard from "./pages/IDCard";
import VerifyId from "./pages/VerifyId";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/verify/:employeeId" element={<VerifyId />} />

          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="employees" element={<ProtectedRoute roles={["hr", "manager"]}><Employees /></ProtectedRoute>} />
            <Route path="employees/:id" element={<EmployeeProfile />} />
            <Route path="attendance" element={<ProtectedRoute roles={["hr", "manager"]}><Attendance /></ProtectedRoute>} />
            <Route path="documents" element={<Documents />} />
            <Route path="leaves" element={<Leaves />} />
            <Route path="departments" element={<ProtectedRoute roles={["hr", "manager"]}><Departments /></ProtectedRoute>} />
            <Route path="settings" element={<ProtectedRoute roles={["hr", "manager"]}><Settings /></ProtectedRoute>} />
            <Route path="id-card/:id" element={<IDCard />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
