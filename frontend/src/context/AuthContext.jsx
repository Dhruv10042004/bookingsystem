import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  // const API = import.meta.env.REACT_APP_API_URL;
  const API="https://bookingsystem-e4oz.onrender.com/api"
  // const API="http://localhost:5000/api"
  useEffect(() => {
    // Use sessionStorage instead of localStorage to ensure logout on restart
    const storedUser = sessionStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (email, password) => {
    try {
      console.log(API);
      const response = await axios.post(`${API}/auth/login`, { email, password });
  
      if (!response.data || !response.data.user) {
        throw new Error("Invalid response from server");
      }

      const userData = response.data;
      const userRole = userData.user.role;

      console.log("Logged in User:", userData);
      console.log("User Role:", userRole);

      setUser(userData);
      // Store in sessionStorage instead of localStorage
      sessionStorage.setItem("user", JSON.stringify(userData));

      // Redirect based on role
      redirectUser(userRole);
    } catch (error) {
      console.error("❌ Login failed", error.response?.data || error.message);
      alert("❌ Login Failed: " + (error.response?.data?.error || "Unknown error"));
    }
  };

  const register = async (name, email, password, role) => {
    try {
      const response = await axios.post(`${API}/auth/register`, { name, email, password, role });

      if (response.status === 201) {
        const userData = { user: { name, email, role } };

        console.log("✅ Registration Successful:", userData);
        setUser(userData);
        // Store in sessionStorage instead of localStorage
        sessionStorage.setItem("user", JSON.stringify(userData));

        // Redirect after successful registration
        redirectUser(role);
      }
    } catch (error) {
      console.error("❌ Registration failed", error.response?.data || error.message);
      alert("❌ Registration Failed: " + (error.response?.data?.error || "Unknown error"));
    }
  };

  const logout = () => {
    setUser(null);
    // Clear from sessionStorage instead of localStorage
    sessionStorage.removeItem("user");
    navigate("/login");
  };

  // Helper function to navigate based on user role
  const redirectUser = (role) => {
    if (role === "Admin") {
      navigate("/admin-dashboard");
    } else if (role === "HOD") {
      navigate("/hod-dashboard");
    } else if (role === "Teacher") {
      navigate("/teacher-dashboard");
    } else {
      navigate("/lab"); // Default fallback
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}