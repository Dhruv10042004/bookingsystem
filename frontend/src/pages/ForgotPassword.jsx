import React, { useState } from "react";
import axios from "axios";
import { 
  Container, Typography, TextField, Button, Card, CardContent, 
  Alert, CircularProgress, Box
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  // const API = import.meta.env.REACT_APP_API_URL;
  const API = "https://bookingsystem-e4oz.onrender.com/api";
  //  const API="https://bookingsystem-iv8l.vercel.app/api"
  // const API = "http://localhost:5000/api";

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setMessage({ text: "Please enter your email address", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/forgot-password`, { email });
      
      setMessage({ 
        text: response.data.message || "Password reset link has been sent to your email address. Please check your email and click the link to reset your password.", 
        type: "success" 
      });
      
      // Clear the form
      setEmail("");
      
    } catch (error) {
      setMessage({ 
        text: error.response?.data?.error || "Error processing request", 
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
            <Typography variant="h5" component="h1">
              Forgot Password
            </Typography>
          </Box>

          {message.text && (
            <Alert severity={message.type} sx={{ mb: 3 }}>
              {message.text}
            </Alert>
          )}

          <form onSubmit={handleForgotPassword}>
            <Typography variant="body1" sx={{ mb: 3 }}>
              Enter your email address and we'll send you a password reset link.
            </Typography>
            
            <TextField
              label="Email Address"
              type="email"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              {loading ? <CircularProgress size={24} /> : "Send Reset Link"}
            </Button>
          </form>
          </CardContent>
        </Card>
      </Container>
    </>
  );
};

export default ForgotPassword;
