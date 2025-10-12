import React, { useEffect, useState } from "react";
import axios from "axios";
import { 
  Container, Typography, Table, TableHead, TableRow, TableCell, TableBody, 
  Button, TextField, Select, MenuItem, FormControl, Grid 
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

const facultyNames = [
  "None", "Dr. Vinaya Sawant (VS)", "Dr. Abhijit Joshi (ARJ)", "Dr. Ram Mangulkar (RM)", 
  "Dr. SatishKumar Verma (SV)", "Dr. Monika Mangla (MM)", "Ms. Neha Katre (NK)", "Mr. Harshal Dalvi (HD)", 
  "Mr. Arjun Jaiswal (AJ)", "Ms. Stevina Coriea (SC)", "Ms. Prachi Satan (PS)", "Ms. Neha Agarwal (NA)", 
  "Ms. Sharvari Patil (SP)", "Ms. Richa Sharma (RS)", "Ms. Sweedle Machado (SM)", "Ms. Priyanca Gonsalves (PG)", 
  "Ms. Anushree Patkar (AP)", "Ms. Monali Sankhe (MS)", "Ms. Savyasachi Pandit (SSP)", "Mr. Chandrashekhar Badgujar (CB)", 
  "Mr. Suryakant Chaudhari (STC)", "Dr. Gayatri Pandya (GP)", "Dr. Naresh Afre (NAF)", "Mr. Pravin Hole (PH)", 
  "Ms. Leena Sahu (LS)"
]
// const API = import.meta.env.REACT_APP_API_URL;
// const API="https://bookingsystem-e4oz.onrender.com/api"
const API="http://localhost:5000/api"
const daysOrder = { "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6};

function AdminDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState("");
  const [timetable, setTimetable] = useState([]);
  const [editEntries, setEditEntries] = useState({});
  const navigate = useNavigate();

  /** 📌 Fetch All Rooms */
  useEffect(() => {
    axios.get(`${API}/rooms`)
      .then(response => setRooms(response.data))
      .catch(error => console.error("Error fetching rooms:", error));
  }, []);

  /** 📌 Fetch Booking Requests */
  useEffect(() => {
    if (!user?.token) return;
    axios.get(`${API}/bookings`, {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then(response => setBookings(response.data))
      .catch(error => console.error("Error fetching bookings:", error));
  }, [user?.token]);

  /** 📌 Fetch Timetable for Selected Room */
  const fetchTimetable = async () => {
    if (!selectedRoom) {
      alert("Please select a room first!");
      return;
    }

    try {
      const response = await axios.get(`${API}/rooms/${selectedRoom}/timetable`);
      const sortedTimetable = (response.data.timetable || []).sort((a, b) => {
        const dayDiff = (daysOrder[a.day] || 8) - (daysOrder[b.day] || 8);
        if (dayDiff !== 0) return dayDiff;
        const timeA = a.startTime.split(":").map(Number);
        const timeB = b.startTime.split(":").map(Number);
        return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
      });      
      setTimetable(sortedTimetable);
    } catch (error) {
      console.error("Error fetching timetable:", error);
    }
  };

  /** 📌 Handle Approve Booking */
  const handleApprove = async (id) => {
    try {
      await axios.put(`${API}/bookings/admin/approve/${id}`, {}, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      setBookings(bookings.map(booking =>
        booking._id === id ? { ...booking, status: "Approved by Admin", hodStatus: "Pending" } : booking
      ));
    } catch (error) {
      console.error("Error approving booking:", error);
    }
  };

  /** 📌 Handle Reject Booking */
  const handleReject = async (id) => {
    try {
      await axios.put(`${API}/bookings/admin/reject/${id}`, {}, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      setBookings(bookings.map(booking =>
        booking._id === id ? { ...booking, status: "Rejected" } : booking
      ));
    } catch (error) {
      console.error("Error rejecting booking:", error);
    }
  };

  /** 📌 Handle Update Timetable Entry */
  const handleUpdateTimetableEntry = async (roomName, entryId) => {
    try {
      const updatedEntry = editEntries[entryId] || {}; // Get the edited values, fallback to empty object
      const currentEntry = timetable.find(entry => entry._id === entryId); // Find the original entry
  
      if (!currentEntry) {
        alert("Timetable entry not found.");
        return;
      }
  
      // Prepare the updated data
      const updatedData = {
        subject: updatedEntry.subject !== undefined ? updatedEntry.subject : currentEntry.subject,
        faculty: updatedEntry.faculty !== undefined ? updatedEntry.faculty : currentEntry.faculty,
        class: {
          year: updatedEntry.year !== undefined ? updatedEntry.year : (currentEntry.class?.year || ""),
          division: updatedEntry.division !== undefined ? updatedEntry.division : (currentEntry.class?.division || "")
        }
      };
  
      await axios.put(
        `${API}/rooms/${roomName}/schedule/${entryId}`,
        updatedData, 
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
  
      // Update the timetable with the new values
      setTimetable(timetable.map(entry => 
        entry._id === entryId 
          ? { 
              ...entry, 
              subject: updatedData.subject, 
              faculty: updatedData.faculty,
              class: updatedData.class 
            } 
          : entry
      ));
  
      alert("Timetable updated successfully!");
    } catch (error) {
      console.error("Error updating timetable entry:", error.response?.data || error.message);
      alert("Failed to update timetable entry.");
    }
  };
  
  /** 📌 Handle Delete Timetable Entry */
  const handleDeleteTimetableEntry = async (roomName, entryId) => {
    if (!window.confirm("Are you sure you want to delete this timetable entry?")) return;
    
    try {
      await axios.delete(`${API}/rooms/${roomName}/schedule/${entryId}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      // Remove deleted entry from state
      setTimetable(timetable.filter(entry => entry._id !== entryId));

      alert("Timetable entry deleted successfully!");
    } catch (error) {
      console.error("Error deleting timetable entry:", error);
      alert("Failed to delete timetable entry.");
    }
  };

  // Helper function to handle updates to class fields
  const handleClassFieldChange = (entryId, field, value) => {
    setEditEntries({
      ...editEntries,
      [entryId]: {
        ...editEntries[entryId],
        [field]: value
      }
    });
  };

  return (
    <>
      <Navbar />
      <Container sx={{ marginTop:3, maxHeight:"70vh" }}>
        {/* Booking Requests Table */}
        <Typography variant="h5" sx={{ marginTop: 3 }}>Booking Requests</Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Teacher</TableCell>
              <TableCell>Classroom</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Purpose</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>HOD Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bookings.map(booking => (
              <TableRow key={booking._id}>
                <TableCell>{booking.teacher?.name || "N/A"}</TableCell>
                <TableCell>{booking.classroom}</TableCell>
                <TableCell>{booking.date}</TableCell>
                <TableCell>{booking.timeSlot}</TableCell>
                <TableCell>{booking.purpose}</TableCell>
                <TableCell>{booking.status}</TableCell>
                <TableCell>{booking.hodStatus}</TableCell>
                <TableCell>
                  {booking.status === "Pending" && (
                    <>
                      <Button color="primary" onClick={() => handleApprove(booking._id)}>Approve</Button>
                      <Button color="secondary" onClick={() => handleReject(booking._id)}>Reject</Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Timetable Management */}
        <Typography variant="h5" sx={{ marginTop: 3 }}>Manage TimeTable</Typography>
        <Select value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)} sx={{width:"25vw"}} displayEmpty>
          <MenuItem value="" disabled>Select Room</MenuItem>
          {rooms.map(room => (
            <MenuItem key={room.name} value={room.name}>{room.name}</MenuItem>
          ))}
        </Select>
        <Button onClick={fetchTimetable} variant="contained"
        sx={{ 
          backgroundColor: "#2c3e50", 
          color: "white", 
          marginLeft:4,
          padding: "12px 12px",
          marginTop:2,
          marginBottom: 2,
          borderRadius: 1,
          textTransform: "none",
          fontSize: "0.9rem",
          "&:hover": {
            backgroundColor: "#1a2530"
          }
        }}
        >Load Timetable</Button>

        {timetable.length > 0 && (
          <Table sx={{ marginTop: 3, maxHeight:"70vh" }}>
            <TableHead>
              <TableRow>
                <TableCell>Day</TableCell>
                <TableCell>Start Time</TableCell>
                <TableCell>End Time</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Faculty</TableCell>
                <TableCell>Class</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {timetable.map(entry => (
                <TableRow key={entry._id}>
                  <TableCell>{entry.day}</TableCell>
                  <TableCell>{entry.startTime}</TableCell>
                  <TableCell>{entry.endTime}</TableCell>
                  
                  {/* Editable Subject */}
                  <TableCell>
                    <TextField 
                      value={(editEntries[entry._id] && editEntries[entry._id].subject !== undefined) 
                        ? editEntries[entry._id].subject 
                        : (entry.subject || "")}
                      onChange={(e) => setEditEntries({ 
                        ...editEntries, 
                        [entry._id]: { ...editEntries[entry._id], subject: e.target.value } 
                      })}
                      size="small"
                    />
                  </TableCell>
                  
                  {/* Editable Faculty Dropdown */}
                  <TableCell>
                    <FormControl fullWidth size="small">
                      <Select
                        multiple
                        value={(editEntries[entry._id] && editEntries[entry._id].faculty !== undefined) 
                          ? editEntries[entry._id].faculty 
                          : (entry.faculty || [])}
                        onChange={(e) =>
                          setEditEntries({
                            ...editEntries,
                            [entry._id]: { ...editEntries[entry._id], faculty: e.target.value }
                          })
                        }
                        renderValue={(selected) => selected.join(", ")}
                      >
                        {facultyNames.map(faculty => (
                          <MenuItem key={faculty} value={faculty}>{faculty}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  
                  {/* Class Year and Division as Text Fields */}
                  <TableCell>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="Year"
                          value={(editEntries[entry._id] && editEntries[entry._id].year !== undefined) 
                            ? editEntries[entry._id].year 
                            : (entry.class && entry.class.year ? entry.class.year : "")}
                          onChange={(e) => handleClassFieldChange(entry._id, 'year', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="Division"
                          value={(editEntries[entry._id] && editEntries[entry._id].division !== undefined) 
                            ? editEntries[entry._id].division 
                            : (entry.class && entry.class.division ? entry.class.division : "")}
                          onChange={(e) => handleClassFieldChange(entry._id, 'division', e.target.value)}
                        />
                      </Grid>
                    </Grid>
                  </TableCell>
          
                  {/* Update & Delete Buttons */}
                  <TableCell>
                    <Button 
                      color="primary" 
                      onClick={() => handleUpdateTimetableEntry(selectedRoom, entry._id)}
                    >
                      Update
                    </Button>
                    <Button 
                      color="secondary" 
                      onClick={() => handleDeleteTimetableEntry(selectedRoom, entry._id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>        
        )}
      </Container>
    </>
  );
}

export default AdminDashboard;