import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  Container, Typography, TextField, Button, Card, CardContent, 
  Alert, CircularProgress, Box
} from "@mui/material";
import { ArrowBack, Lock } from "@mui/icons-material";
import Navbar from "../components/Navbar";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  // const API = import.meta.env.REACT_APP_API_URL;
  const API = "https://bookingsystem-e4oz.onrender.com/api";
  // const API = "http://localhost:5000/api";

  useEffect(() => {
    // Get token from URL parameters
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    }
  }, [searchParams]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (!token) {
      setMessage({ text: "Invalid reset link. Please request a new password reset.", type: "error" });
      return;
    }

    if (!newPassword || !confirmPassword) {
      setMessage({ text: "Please fill in all fields", type: "error" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ text: "Passwords do not match", type: "error" });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ text: "Password must be at least 6 characters long", type: "error" });
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, {
        token,
        newPassword
      });
      
      setMessage({ text: "Password reset successfully! You can now login with your new password.", type: "success" });
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (error) {
      setMessage({ 
        text: error.response?.data?.error || "Error resetting password", 
        type: "error" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Button
                startIcon={<ArrowBack />}
                onClick={() => navigate("/login")}
                sx={{ mr: 2 }}
              >
                Back to Login
              </Button>
              <Lock sx={{ mr: 1 }} />
              <Typography variant="h5" component="h1">
                Reset Password
              </Typography>
            </Box>

            <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
              Enter your new password below to complete the password reset process.
            </Typography>

            {message.text && (
              <Alert severity={message.type} sx={{ mb: 3 }}>
                {message.text}
              </Alert>
            )}

            <form onSubmit={handleResetPassword}>
              <TextField
                label="New Password"
                type="password"
                fullWidth
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                margin="normal"
                required
                helperText="Password must be at least 6 characters long"
              />
              
              <TextField
                label="Confirm New Password"
                type="password"
                fullWidth
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                margin="normal"
                required
              />
              
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading || !token}
                sx={{ mt: 3, mb: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : "Reset Password"}
              </Button>
            </form>

            {!token && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                No reset token found. Please use the "Forgot Password" link from the login page.
              </Alert>
            )}
          </CardContent>
        </Card>
      </Container>
    </>
  );
};

export default ResetPassword;
