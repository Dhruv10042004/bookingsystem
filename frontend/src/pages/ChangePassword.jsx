import React, { useState } from "react";
import axios from "axios";
import { 
  Container, Typography, TextField, Button, Card, CardContent, 
  Alert, CircularProgress, Box
} from "@mui/material";
import { ArrowBack, Lock } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const ChangePassword = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  // const API = import.meta.env.REACT_APP_API_URL;
  const API = "https://bookingsystem-e4oz.onrender.com/api";
  // const API = "http://localhost:5000/api";
  //  const API="https://bookingsystem-iv8l.vercel.app/api"

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ text: "Please fill in all fields", type: "error" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ text: "New passwords do not match", type: "error" });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ text: "New password must be at least 6 characters long", type: "error" });
      return;
    }

    if (currentPassword === newPassword) {
      setMessage({ text: "New password must be different from current password", type: "error" });
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/auth/change-password`, {
        currentPassword,
        newPassword
      }, { 
        headers: { Authorization: `Bearer ${user.token}` } 
      });
      
      setMessage({ text: "Password changed successfully!", type: "success" });
      
      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
    } catch (error) {
      setMessage({ 
        text: error.response?.data?.error || "Error changing password", 
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
                onClick={() => navigate(-1)}
                sx={{ mr: 2 }}
              >
                Back
              </Button>
              <Lock sx={{ mr: 1 }} />
              <Typography variant="h5" component="h1">
                Change Password
              </Typography>
            </Box>

            <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
              Change your password for better security.
            </Typography>

            {message.text && (
              <Alert severity={message.type} sx={{ mb: 3 }}>
                {message.text}
              </Alert>
            )}

            <form onSubmit={handleChangePassword}>
              <TextField
                label="Current Password"
                type="password"
                fullWidth
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                margin="normal"
                required
              />
              
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
                disabled={loading}
                sx={{ mt: 3, mb: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : "Change Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </Container>
    </>
  );
};

export default ChangePassword;
