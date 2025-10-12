import React from "react";
import { AppBar, Toolbar, Typography, Button } from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

function TimeTableNavbar({ title }) {
  const { logout, user } = useAuth();
  console.log(user.user.role);

  // Determine the dashboard route based on user role
  let dashboardPath = "/";
  if (user.user.role === "Teacher") {
    dashboardPath = "/teacher-dashboard";
  } else if (user.user.role === "Admin") {
    dashboardPath = "/admin-dashboard";
  } else if (user.user.role === "HOD") {
    dashboardPath = "/hod-dashboard";
  }else if(user.user.role === "Lab Assistant")
  {
    dashboardPath="/lab";
  }

  return (
    <AppBar position="fixed" style={{ top: 0, zIndex: 1000 }}>
      <Toolbar style={{ display: "flex", justifyContent: "space-between" }}>
        <Typography variant="h6">{title}</Typography>

        <div>
          {/* Dashboard Button Based on Role */}
          {user.user.role && (
            <Button color="inherit" component={Link} to={dashboardPath}>
              Dashboard
            </Button>
          )}

          {/* <Button color="inherit" component={Link} to="/view-timetable">
            View Timetable
          </Button> */}
          
          <Button color="inherit" onClick={logout}>
            LOGOUT
          </Button>
        </div>
      </Toolbar>
    </AppBar>
  );
}

export default TimeTableNavbar;
