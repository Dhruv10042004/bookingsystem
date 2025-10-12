import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { Container, Typography, Button, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";

function Bookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  // const API=import.meta.env.REACT_APP_API_URL;
  const API="https://bookingsystem-e4oz.onrender.com/api"
  // const API="http://localhost:5000/api"
  useEffect(() => {
    axios.get(`${API}/bookings`, {
      headers: { Authorization: user?.token },
    })
    .then(response => setBookings(response.data))
    .catch(error => console.error("Error fetching bookings", error));
  }, []);

  const handleApprove = async (id) => {
    await axios.put(`${API}/bookings/${id}/approve`, { status: "approved" }, {
      headers: { Authorization: user?.token },
    });
    alert("Booking Approved by Admin. Awaiting HOD approval.");
  };

  const handleGrant = async (id) => {
    await axios.put(`${API}/bookings/${id}/grant`, { grantStatus: "granted" }, {
      headers: { Authorization: user?.token },
    });
    alert("Booking Granted by HOD.");
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>Bookings</Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Room</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Time Slot</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Grant Status</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {bookings.map(booking => (
            <TableRow key={booking._id}>
              <TableCell>{booking.room.name}</TableCell>
              <TableCell>{new Date(booking.date).toDateString()}</TableCell>
              <TableCell>{booking.timeSlot}</TableCell>
              <TableCell>{booking.status}</TableCell>
              <TableCell>{booking.grantStatus}</TableCell>
              <TableCell>
                {user.role === "admin" && booking.status === "pending" && (
                  <Button onClick={() => handleApprove(booking._id)} color="primary">Approve</Button>
                )}
                {user.role === "hod" && booking.status === "approved" && booking.grantStatus === "pending" && (
                  <Button onClick={() => handleGrant(booking._id)} color="secondary">Grant</Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Container>
  );
}

export default Bookings;
