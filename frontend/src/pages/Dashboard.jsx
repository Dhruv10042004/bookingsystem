import React from "react";
import { useAuth } from "../context/AuthContext";
import { Button, Container, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <Container>
      <Typography variant="h4">Welcome, {user?.name} ({user?.role})</Typography>

      {/* Role-based actions */}
      {user?.role === "admin" && (
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate("/approve-bookings")}
          sx={{ marginRight: 2, marginTop: 2 }}
        >
          Approve Bookings
        </Button>
      )}

      {user?.role === "hod" && (
        <Button
          variant="contained"
          color="success"
          onClick={() => navigate("/grant-bookings")}
          sx={{ marginRight: 2, marginTop: 2 }}
        >
          Grant Bookings
        </Button>
      )}

      {user?.role === "teacher" && (
        <Button
          variant="contained"
          color="warning"
          onClick={() => navigate("/create-booking")}
          sx={{ marginRight: 2, marginTop: 2 }}
        >
          Request a Booking
        </Button>
      )}

      <Button
        variant="contained"
        color="info"
        onClick={() => navigate("/bookings")}
        sx={{ marginRight: 2, marginTop: 2 }}
      >
        View My Bookings
      </Button>

      <Button onClick={logout} variant="contained" color="secondary" sx={{ marginTop: 2 }}>
        Logout
      </Button>
    </Container>
  );
}

export default Dashboard;
