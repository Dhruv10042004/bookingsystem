import React, { useEffect, useState } from "react";
import axios from "axios";
import { Table, TableHead, TableBody, TableRow, TableCell, Paper, Typography } from "@mui/material";
import { useAuth } from "../context/AuthContext";

function Requests() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  // const API=import.meta.env.REACT_APP_API_URL;
  // const API="https://bookingsystem-e4oz.onrender.com/api"
  const API="http://localhost:5000/api"
  useEffect(() => {
    if (!user?.token) return; // Ensure token is available

    axios
      .get(`${API}/bookings/teacher`, {
        headers: { Authorization: `Bearer ${user.token}` }, // Send token in header
      })
      .then((response) => {
        console.log(response.data);
        setBookings(response.data)})
      .catch((error) => console.error("Error fetching requests:", error));
  }, [user.token]);

  return (
    <Paper style={{ padding: 20 }}>
      <Typography variant="h5" gutterBottom>
        Your Booking Requests
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Classroom</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Time</TableCell>
            <TableCell>Purpose</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>HODStatus</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow key={booking._id}>
              <TableCell>{booking.classroom}</TableCell>
              <TableCell>{booking.date}</TableCell>
              <TableCell>{booking.timeSlot}</TableCell>
              <TableCell>{booking.purpose}</TableCell>
              <TableCell>{booking.status}</TableCell>
              <TableCell>{booking.hodStatus}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}

export default Requests;
