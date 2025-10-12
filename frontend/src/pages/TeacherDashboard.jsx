import React from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import { AppBar, Toolbar, Button } from "@mui/material";
import Requests from "./Requests";
import CreateBooking from "./CreateBooking";
import ViewTimetable from "./ViewTimetable"; // Import the ViewTimetable component
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

function TeacherDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (<>
      <Navbar />
      <Requests />
  </>
  );
}

export default TeacherDashboard;
