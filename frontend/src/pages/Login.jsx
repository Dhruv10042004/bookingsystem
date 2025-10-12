import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Box, Container, Typography, TextField, Button, InputAdornment, IconButton } from "@mui/material";
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
// import Logo from '../assets/Logo.png';
import loginIllustration from '../assets/Login-illustration.png';
import Navbar from '../components/Navbar';
function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  // const API=import.meta.env.REACT_APP_API_URL;
  // const API="https://bookingsystem-e4oz.onrender.com/api"
  const API="http://localhost:5000/api"
  console.log(API);
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log(API);
    await login(email, password);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box sx={{ 
      background: "#f8f9fa",
      display: "flex",
      flexDirection: "column"
    }}>
      {/* Header */}
      <Navbar />
      {/* Main Content */}
      <Container sx={{ 
        flex: 1,
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        padding: "40px 20px",
        // height : '100vh',
        // width : '100%'
      }}>
        {/* Left Side - Illustration */}
        <Box sx={{ 
          display: { xs: "none", md: "block" },
          width: "45%"
        }}>
          <img
            src={loginIllustration}
            alt="Login illustration"
            style={{ width: "100%" }}
          />
        </Box>

        {/* Right Side - Login Form */}
        <Box sx={{ 
          width: { xs: "100%", md: "45%" },
          background: "white",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          padding: "30px"
        }}>
          {/* Portal Header */}
          <Box sx={{ 
            background: "#2c3e50",
            color: "white",
            padding: "15px",
            textAlign: "center",
            borderRadius: "4px",
            marginBottom: "20px"
          }}>
            <Typography variant="h5">DJSCE Portal</Typography>
          </Box>

          {/* Login Header */}
          <Typography variant="h4" sx={{ 
            textAlign: "center", 
            fontWeight: "bold",
            marginBottom: "20px"
          }}>
            LOGIN
          </Typography>

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              margin="normal"
              placeholder="Email"
              variant="outlined"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ 
                mb: 2,
                "& .MuiOutlinedInput-root": {
                  borderRadius: "4px",
                  background: "#f0f4f8"
                }
              }}
            />
            
            <TextField
              fullWidth
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              variant="outlined"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={togglePasswordVisibility} edge="end">
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ 
                mb: 2,
                "& .MuiOutlinedInput-root": {
                  borderRadius: "4px",
                  background: "#f0f4f8"
                }
              }}
            />

            {/* Forgot Password Link */}
            <Box sx={{ textAlign: "left", mb: 2 }}>
              <Link to="/forgot-password" style={{ color: "#3498db", textDecoration: "none" }}>
                Forgot Password?
              </Link>
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ 
                backgroundColor: "#2c3e50",
                color: "white",
                padding: "12px",
                borderRadius: "4px",
                textTransform: "none",
                fontSize: "16px",
                "&:hover": {
                  backgroundColor: "#1a2530"
                }
              }}
            >
              Login
            </Button>
          </form>

          {/* Sign Up Button */}
          <Button
            component={Link}
            to="/register"
            fullWidth
            variant="contained"
            sx={{ 
              backgroundColor: "#2c3e50",
              color: "white",
              padding: "12px",
              marginTop:2,
              borderRadius: "4px",
              textTransform: "none",
              fontSize: "16px",
              "&:hover": {
                backgroundColor: "#1a2530"
              }
            }}
          >
            Register
          </Button>
        </Box>
      </Container>
    </Box>
  );
}

export default Login;