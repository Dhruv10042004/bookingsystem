import React, { useEffect, useState } from "react";
import axios from "axios";
import { 
  Container, Typography, Table, TableHead, TableRow, TableCell, TableBody, 
  Button, Select, MenuItem, FormControl, TextField
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import PrintTimeTable from "../components/PrintTimeTable";

// Define faculty names for dropdown
const facultyNames = [
  "Dr. Vinaya Sawant (VS)", "Dr. Abhijit Joshi (ARJ)", "Dr. Ram Mangulkar (RM)", 
  "Dr. SatishKumar Verma (SV)", "Dr. Monika Mangla (MM)", "Ms. Neha Katre (NK)", 
  "Mr. Harshal Dalvi (HD)", "Mr. Arjun Jaiswal (AJ)", "Ms. Stevina Coriea (SC)", 
  "Ms. Prachi Satam (PS)", "Ms. Neha Agarwal (NA)", "Ms. Sharvari Patil (SP)", 
  "Ms. Richa Sharma (RS)", "Ms. Sweedle Machado (SM)", "Ms. Priyanca Gonsalves (PG)", 
  "Ms. Anushree Patkar (AP)", "Ms. Monali Sankhe (MS)", "Ms. Savyasachi Pandit (SSP)", 
  "Mr. Chandrashekhar Badgujar (CB)", "Mr. Suryakant Chaudhari (STC)", "Dr. Gayatri Pandya (GP)", 
  "Dr. Naresh Afre (NAF)", "Mr. Pravin Hole (PH)", "Ms. Leena Sahu (LS)","Ms. Prahelika Pai (PP)"
];

const subjectOptions = [
  "BDA", "AM", "FLAT", "DAA", "ML", "SE", "IPCV", "ISIG", "DP", "EFM", "PA", "OE", "AM-T", "FLAT-T"
];

function LabAssistantDashboard() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState("");
  const [timetable, setTimetable] = useState([]);
  const [editEntries, setEditEntries] = useState({});
  const navigate = useNavigate();
  // const API=import.meta.env.REACT_APP_API_URL;
  // const API="https://bookingsystem-e4oz.onrender.com/api"
  const API="http://localhost:5000/api"
  // Fetch rooms on load
  useEffect(() => {
    axios.get(`${API}/rooms`)
      .then(response => setRooms(response.data))
      .catch(error => console.error("Error fetching rooms:", error));
  }, []);

  // Fetch timetable data for the selected room
  const fetchTimetable = async () => {
    if (!selectedRoom) {
      alert("Please select a room first!");
      return;
    }

    try {
      const response = await axios.get(`${API}/rooms/${selectedRoom}/timetable`);
      console.log(response.data.timetable);
      setTimetable(response.data.timetable || []);
    } catch (error) {
      console.error("Error fetching timetable:", error);
      alert("Failed to load timetable. Please try again.");
    }
  };
  //Handle Delete room
  // Add this function in the LabAssistantDashboard component
const handleDeleteRoom = async () => {
  if (!selectedRoom) {
    alert("Please select a room first!");
    return;
  }
  
  if (!window.confirm(`Are you sure you want to delete the entire room "${selectedRoom}" and all its schedule data?`)) {
    return;
  }
  
  try {
    await axios.delete(`${API}/rooms/${selectedRoom}`, {
      headers: { Authorization: `Bearer ${user.token}` }
    });
    
    // Update UI by removing the deleted room
    setRooms(rooms.filter(room => room.name !== selectedRoom));
    setSelectedRoom("");
    setTimetable([]);
    alert(`Room "${selectedRoom}" has been deleted successfully!`);
  } catch (error) {
    console.error("Error deleting room:", error);
    alert("Failed to delete room. Please try again.");
  }
};
  // Update a timetable entry
  const handleUpdateTimetableEntry = async (roomName, entryId) => {
    try {
      const updatedEntry = editEntries[entryId] || {}; 
      const currentEntry = timetable.find(entry => entry._id === entryId); 

      if (!currentEntry) {
        alert("Timetable entry not found.");
        return;
      }

      const updatedSubject = updatedEntry.subject ?? currentEntry.subject;
      const updatedFaculty = updatedEntry.faculty ?? currentEntry.faculty;
      
      // Handle class object with year and division
      const updatedClass = {
        year: updatedEntry.class?.year ?? currentEntry.class?.year ?? "",
        division: updatedEntry.class?.division ?? currentEntry.class?.division ?? ""
      };

      await axios.put(
        `${API}/rooms/${roomName}/schedule/${entryId}`,
        { 
          subject: updatedSubject, 
          faculty: updatedFaculty,
          class: updatedClass
        },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      // Update local state
      setTimetable(timetable.map(entry => 
        entry._id === entryId 
          ? { 
              ...entry, 
              subject: updatedSubject, 
              faculty: updatedFaculty,
              class: updatedClass
            }
          : entry
      ));

      alert("Timetable updated successfully!");
    } catch (error) {
      console.error("Error updating timetable entry:", error.response?.data || error.message);
      alert("Failed to update timetable entry.");
    }
  };

  // Delete a timetable entry
  const handleDeleteTimetableEntry = async (roomName, entryId) => {
    if (!window.confirm("Are you sure you want to delete this timetable entry?")) return;
    
    try {
      await axios.delete(`${API}/rooms/${roomName}/schedule/${entryId}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      setTimetable(timetable.filter(entry => entry._id !== entryId));
      alert("Timetable entry deleted successfully!");
    } catch (error) {
      console.error("Error deleting timetable entry:", error);
      alert("Failed to delete timetable entry.");
    }
  };

  // Handle changes to class fields (year and division)
  const handleClassChange = (entryId, field, value) => {
    setEditEntries({
      ...editEntries,
      [entryId]: {
        ...editEntries[entryId] || {},
        class: {
          ...(editEntries[entryId]?.class || {}),
          [field]: value
        }
      }
    });
  };

  return (
    <>
      <Navbar />
      <Container sx={{ marginTop: 6 }}>
        {/* Timetable Management */}
        <Select 
          value={selectedRoom} 
          onChange={(e) => setSelectedRoom(e.target.value)} 
          sx={{width:"50vw"}} 
          displayEmpty
        >
          <MenuItem value="" disabled>Select Room</MenuItem>
          {rooms.map(room => (
            <MenuItem key={room.name} value={room.name}>{room.name}</MenuItem>
          ))}
        </Select>
        <Button 
          onClick={fetchTimetable} 
          variant="contained"
          sx={{ 
            backgroundColor: "#2c3e50", 
            color: "white", 
            marginLeft: 4,
            padding: "12px 12px",
            marginTop: 2,
            marginBottom: 2,
            borderRadius: 1,
            textTransform: "none",
            fontSize: "0.9rem",
            "&:hover": {
              backgroundColor: "#1a2530"
            }
          }}
        >
          Load Timetable
        </Button>
        <Button 
          variant="contained" 
          color="primary" 
          sx={{ 
            backgroundColor: "#2c3e50", 
            color: "white", 
            marginLeft: 4,
            padding: "12px 12px",
            marginTop: 2,
            marginBottom: 2,
            borderRadius: 1,
            textTransform: "none",
            fontSize: "0.9rem",
            "&:hover": {
              backgroundColor: "#1a2530"
            }
          }}
          onClick={() => navigate("/admin-dashboard/input-timetable")}
        >
          Input Timetable
        </Button>
        <Button 
  variant="contained" 
  color="error" 
  sx={{ 
    backgroundColor: "#c0392b", 
    color: "white", 
    marginLeft: 4,
    padding: "12px 12px",
    marginTop: 2,
    marginBottom: 2,
    borderRadius: 1,
    textTransform: "none",
    fontSize: "0.9rem",
    "&:hover": {
      backgroundColor: "#a93226"
    }
  }}
  onClick={handleDeleteRoom}
  disabled={!selectedRoom}
>
  Delete Room
</Button>
        {timetable.length > 0 && (
          <Table sx={{ marginTop: 3, maxHeight: "70vh" }}>
            <TableHead>
              <TableRow>
                <TableCell>Day</TableCell>
                <TableCell>Start Time</TableCell>
                <TableCell>End Time</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Faculty</TableCell>
                <TableCell>Year</TableCell>
                <TableCell>Division</TableCell>
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
                      value={editEntries[entry._id]?.subject || entry.subject || ""}
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
                        value={editEntries[entry._id]?.faculty ?? entry.faculty}
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

                  {/* Editable Year TextField (from class object) */}
                  <TableCell>
                    <TextField
                      value={
                        editEntries[entry._id]?.class?.year || 
                        entry.class?.year || 
                        ""
                      }
                      onChange={(e) => handleClassChange(entry._id, "year", e.target.value)}
                      size="small"
                    />
                  </TableCell>

                  {/* Editable Division TextField (from class object) */}
                  <TableCell>
                    <TextField
                      value={
                        editEntries[entry._id]?.class?.division || 
                        entry.class?.division || 
                        ""
                      }
                      onChange={(e) => handleClassChange(entry._id, "division", e.target.value)}
                      size="small"
                    />
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

export default LabAssistantDashboard;