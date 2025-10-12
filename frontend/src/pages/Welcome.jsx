import React from "react";
import { Container, Typography, Button, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import Logo from "../assets/logo.png";
import FeedbackIllustration from "../assets/feedback-illustration.png";
import Navbar from "../components/Navbar";
function Welcome() {
  const navigate = useNavigate();

  return (<>
    <Navbar />
    <Container maxWidth="lg" sx={{ padding: 4 }}>
      {/* Header with logo */}
      {/* Main content */}
      <Box sx={{ 
        display: "flex", 
        flexDirection: { xs: "column", md: "row" }, 
        alignItems: "center", 
        justifyContent: "space-between",
        minHeight: "70vh"
      }}>
        {/* Left side content */}
        <Box sx={{ 
          width: { xs: "100%", md: "45%" }, 
          textAlign: "left", 
          marginBottom: { xs: 4, md: 0 } 
        }}>
          <Typography 
            variant="h2" 
            sx={{ 
              fontWeight: "bold", 
              color: "#2c3e50",
              fontSize: { xs: "2.5rem", sm: "3.5rem" },
              marginBottom: 2
            }}
          >
            Welcome to the Classroom Booking Portal
          </Typography>
          {/* Buttons */}
          <Button 
            variant="contained" 
            fullWidth 
            sx={{ 
              backgroundColor: "#2c3e50", 
              color: "white", 
              padding: "12px 0",
              marginBottom: 2,
              borderRadius: 1,
              textTransform: "none",
              fontSize: "1rem",
              "&:hover": {
                backgroundColor: "#1a2530"
              }
            }}
            onClick={() => navigate("/login")}
          >
            Login
          </Button>
          <Button 
            variant="contained" 
            fullWidth 
            sx={{ 
              backgroundColor: "#5dade2", 
              color: "white", 
              padding: "12px 0",
              borderRadius: 1,
              textTransform: "none",
              fontSize: "1rem",
              "&:hover": {
                backgroundColor: "#3498db"
              }
            }}
            onClick={() => navigate("/register")}
          >
            Register
          </Button>
        </Box>

        {/* Right side illustration */}
        <Box sx={{ 
          width: { xs: "100%", md: "50%" }, 
          textAlign: "center" 
        }}>
          <img 
            src={FeedbackIllustration} 
            alt="Feedback Illustration" 
            style={{ 
              maxWidth: "100%", 
              height: "auto"
            }} 
          />
        </Box>
      </Box>
    </Container>
    </>
  );
}

export default Welcome;