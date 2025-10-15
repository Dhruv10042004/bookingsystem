import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Container, Typography, Paper, Box, Stack, IconButton, 
  Grid, CircularProgress, Chip, Select, MenuItem, FormControl, InputLabel
} from "@mui/material";
import { 
  ChevronLeft, ChevronRight, CalendarMonth, 
  AccessTime, Room
} from "@mui/icons-material";
import Navbar from "../components/Navbar";
// import PrintTimeTable from "../components/PrintTimeTable";

const ViewTimetable = () => {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState("");
  const [roomData, setRoomData] = useState(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const API="https://bookingsystem-e4oz.onrender.com/api"
  // const API = "http://localhost:5000/api";

  const timeSlots = [
    "08:00-08:30", "08:30-09:00", "09:00-09:30", "09:30-10:00",
    "10:00-10:30", "10:30-11:00", "11:00-11:30", "11:30-12:00",
    "12:00-12:30", "12:30-01:00", "01:00-1:30", "01:30-02:00",
    "02:00-02:30", "02:30-03:00", "03:00-03:30", "03:30-04:00",
    "04:00-04:30", "04:30-05:00", "05:00-05:30", "05:30-06:00"
  ];

  const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const statusColors = {
    pendingApproval: { background: "#FFF9C4", text: "#F57F17", border: "#FFD54F" },
    approved: { background: "#FFE0B2", text: "#E65100", border: "#FFB74D" },
    granted: { background: "#E8F5E9", text: "#2E7D32", border: "#A5D6A7" },
    default: { background: "#E3F2FD", text: "#1565C0", border: "#90CAF9" }
  };

  useEffect(() => {
    async function fetchRooms() {
      try {
        const response = await axios.get(`${API}/rooms`);
        setRooms(response.data);
      } catch (err) {
        console.error("Error fetching rooms:", err);
        setError("Failed to load rooms. Please try again later.");
      }
    }
    
    fetchRooms();
    adjustToMonday(new Date());
  }, []);

  const adjustToMonday = (date) => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date);
    monday.setDate(diff);
    setCurrentWeekStart(monday);
  };

  const handleRoomChange = (event) => {
    setSelectedRoom(event.target.value);
    fetchRoomData(event.target.value);
  };

  const fetchRoomData = async (roomName) => {
    if (!roomName) return;
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(`${API}/rooms/${roomName}/timetable`);
      setRoomData({ name: roomName, schedule: response.data.timetable || [] });
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Room not found or no timetable available.";
      setError(errorMessage);
      setRoomData(null);
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const getDateString = (dayIndex) => {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + dayIndex);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDateForDay = (dayIndex) => {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + dayIndex);
    return date;
  };

  const getWeekRangeDisplay = () => {
    const endDate = new Date(currentWeekStart);
    endDate.setDate(endDate.getDate() + 5);
    const startMonth = currentWeekStart.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
    const startDay = currentWeekStart.getDate();
    const endDay = endDate.getDate();
    const startYear = currentWeekStart.getFullYear();
    const endYear = endDate.getFullYear();
    if (startYear !== endYear) return `${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`;
    else if (startMonth !== endMonth) return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${startYear}`;
    else return `${startMonth} ${startDay} - ${endDay}, ${startYear}`;
  };

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hStr, mStr] = timeStr.split(':');
    let hours = parseInt(hStr, 10);
    const minutes = parseInt(mStr, 10);
    // Interpret timetable times in 12-hour style without AM/PM.
    // Morning slots are 08:00–11:30 (8–11). Afternoon slots are written as 12:00, 01:00, 01:30, ...
    // Map 1–6 to 13–18 so that 12:30–01:00 is treated as 12:30–13:00.
    if (hours >= 1 && hours <= 6) {
      hours += 12;
    }
    return hours * 60 + minutes;
  };

  const areEntriesIdentical = (entry1, entry2) => {
    if (!entry1 || !entry2) return false;
    if (entry1.subject !== entry2.subject) return false;
    if (entry1.approvalStatus !== entry2.approvalStatus) return false;
    const faculty1 = Array.isArray(entry1.faculty) ? entry1.faculty : [entry1.faculty];
    const faculty2 = Array.isArray(entry2.faculty) ? entry2.faculty : [entry2.faculty];
    if (JSON.stringify(faculty1.sort()) !== JSON.stringify(faculty2.sort())) return false;
    const class1 = entry1.class || {};
    const class2 = entry2.class || {};
    if (class1.year !== class2.year || class1.division !== class2.division) return false;
    return true;
  };

  const matchesEntryDate = (entry, currentDate) => {
    if (!entry.approvalStatus || entry.approvalStatus === "default") return true;
    if (entry.date) {
      const entryDate = new Date(entry.date);
      return currentDate.getFullYear() === entryDate.getFullYear() &&
             currentDate.getMonth() === entryDate.getMonth() &&
             currentDate.getDate() === entryDate.getDate();
    }
    return false;
  };

  const findScheduleEntries = (day, timeSlot, dayIndex) => {
    if (!roomData || !roomData.schedule) return [];
    const [startTimeSlot, endTimeSlot] = timeSlot.split('-');
    const slotStartMinutes = timeToMinutes(startTimeSlot);
    const slotEndMinutes = timeToMinutes(endTimeSlot);
    const currentDate = getDateForDay(dayIndex);
    const matchingEntries = roomData.schedule.filter(entry => {
      if (entry.day !== day) return false;
      const entryStartMinutes = timeToMinutes(entry.startTime);
      const entryEndMinutes = timeToMinutes(entry.endTime);
      const hasOverlap = (
        (entryStartMinutes <= slotStartMinutes && entryEndMinutes > slotStartMinutes) ||
        (entryStartMinutes >= slotStartMinutes && entryStartMinutes < slotEndMinutes)
      );
      if (!hasOverlap) return false;
      return matchesEntryDate(entry, currentDate);
    });
    return matchingEntries;
  };

  const areEntrySetsMergeable = (entries1, entries2) => {
    if (!entries1 || !entries2 || entries1.length !== entries2.length) return false;
    const sorted1 = [...entries1].sort((a, b) => a.subject.localeCompare(b.subject));
    const sorted2 = [...entries2].sort((a, b) => a.subject.localeCompare(b.subject));
    for (let i = 0; i < sorted1.length; i++) {
      if (!areEntriesIdentical(sorted1[i], sorted2[i])) return false;
    }
    return true;
  };

  // Special merge logic added
  const processTimeTable = () => {
    const mergeData = {};
    weekDays.forEach((day, dayIndex) => {
      mergeData[day] = [];
      let currentGroup = null;
      for (let slotIndex = 0; slotIndex < timeSlots.length; slotIndex++) {
        const slot = timeSlots[slotIndex];
        const entries = findScheduleEntries(day, slot, dayIndex);

        // Special merge rules
        if ((slot === "12:00-12:30" && timeSlots[slotIndex + 1] === "12:30-13:00") ||
            (slot === "12:30-13:00" && timeSlots[slotIndex + 1] === "13:00-13:30")) {
          const nextSlotIndex = slotIndex + 1;
          const nextEntries = findScheduleEntries(day, timeSlots[nextSlotIndex], dayIndex);
          if (areEntrySetsMergeable(entries, nextEntries)) {
            mergeData[day].push({
              startIndex: slotIndex,
              endIndex: nextSlotIndex,
              entry: entries[0],
              entries: entries,
              span: 2,
              isMultiple: entries.length > 1
            });
            slotIndex = nextSlotIndex;
            continue;
          }
        }

        if (!entries || entries.length === 0) {
          if (currentGroup) {
            mergeData[day].push(currentGroup);
            currentGroup = null;
          }
          mergeData[day].push({
            startIndex: slotIndex,
            endIndex: slotIndex,
            entry: null,
            entries: [],
            span: 1
          });
        } else {
          if (currentGroup && areEntrySetsMergeable(currentGroup.entries, entries)) {
            currentGroup.endIndex = slotIndex;
            currentGroup.span = currentGroup.endIndex - currentGroup.startIndex + 1;
          } else {
            if (currentGroup) {
              mergeData[day].push(currentGroup);
            }
            currentGroup = {
              startIndex: slotIndex,
              endIndex: slotIndex,
              entry: entries[0],
              entries: entries,
              span: 1,
              isMultiple: entries.length > 1
            };
          }
        }
      }

      if (currentGroup) {
        mergeData[day].push(currentGroup);
      }
    });

    return mergeData;
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case "pendingApproval": return "Pending";
      case "approved": return "Approved";
      case "granted": return "Granted";
      default: return "Regular";
    }
  };

  const formatDateDisplay = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const extractFacultyInfo = (faculty) => {
    if (!faculty) return "";
    if (Array.isArray(faculty)) {
      return faculty.map(f => {
        if (f.includes('(') && f.includes(')')) {
          const fullName = f.substring(0, f.lastIndexOf('(')).trim();
          const initials = f.substring(f.lastIndexOf('(') + 1, f.lastIndexOf(')'));
          return { fullName, initials };
        }
        return { fullName: f, initials: f };
      });
    }
    if (faculty.includes('(') && faculty.includes(')')) {
      const fullName = faculty.substring(0, faculty.lastIndexOf('(')).trim();
      const initials = faculty.substring(faculty.lastIndexOf('(') + 1, faculty.lastIndexOf(')'));
      return { fullName, initials };
    }
    return { fullName: faculty, initials: faculty };
  };

  const formatClassInfo = (classInfo) => {
    if (!classInfo) return "";
    const { year, division } = classInfo;
    if (!year && !division) return "";
    return division ? `${year}-${division}` : year;
  };

  const formatFacultyDisplay = (faculty) => {
    if (!faculty) return "";
    const facultyInfo = extractFacultyInfo(faculty);
    if (Array.isArray(facultyInfo)) {
      if (facultyInfo.length > 2) {
        const displayItems = facultyInfo.slice(0, 2).map(f => f.fullName);
        return `${displayItems.join(', ')} +${facultyInfo.length - 2}`;
      }
      return facultyInfo.map(f => f.fullName).join(', ');
    }
    return facultyInfo.fullName;
  };

  const renderCellContent = (slot) => {
    if (!slot || !slot.entry) return null;
    const colors = statusColors[slot.entry.approvalStatus || "default"];
    if (slot.isMultiple && slot.entries.length > 1) {
      return (
        <Box sx={{ height: '100%', p: 1, backgroundColor: colors.background, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 1, overflow: 'hidden', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', position: 'relative', width: '100%', minHeight: '100%' }}>
          {slot.entries.map((entry, index) => (
            <Box key={index} sx={{ mb: index < slot.entries.length - 1 ? 1 : 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.3, lineHeight: 1.2, fontSize: '0.75rem' }}>
                {formatClassInfo(entry.class) && `(${formatClassInfo(entry.class)}) `}{entry.subject}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '0.7rem', lineHeight: 1.2, fontWeight: 'medium' }}>
                {formatFacultyDisplay(entry.faculty)}
              </Typography>
            </Box>
          ))}
        </Box>
      );
    }

    const entry = slot.entry;
    return (
      <Box sx={{ height: '100%', p: 1, backgroundColor: colors.background, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 1, overflow: 'hidden', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', position: 'relative', width: '100%', minHeight: '100%' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.3, lineHeight: 1.2, fontSize: '0.75rem' }}>
          {formatClassInfo(entry.class) && `(${formatClassInfo(entry.class)}) `}{entry.subject}
        </Typography>
        <Typography variant="caption" sx={{ fontSize: '0.7rem', lineHeight: 1.2, mb: 0.3, fontWeight: 'medium' }}>
          {formatFacultyDisplay(entry.faculty)}
        </Typography>
        {entry.approvalStatus && entry.approvalStatus !== "default" && (
          <Box sx={{ mt: 'auto', display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            <Chip label={getStatusLabel(entry.approvalStatus)} size="small" sx={{ height: 14, fontSize: '0.55rem', backgroundColor: 'rgba(255,255,255,0.8)', color: colors.text, fontWeight: 'medium' }} />
            {entry.date && <Chip label={formatDateDisplay(entry.date)} size="small" sx={{ height: 14, fontSize: '0.55rem', backgroundColor: 'rgba(255,255,255,0.8)', color: colors.text, fontWeight: 'medium' }} />}
          </Box>
        )}
      </Box>
    );
  };

  const isToday = (dayIndex) => {
    const today = new Date();
    const compareDate = new Date(currentWeekStart);
    compareDate.setDate(compareDate.getDate() + dayIndex);
    return today.getDate() === compareDate.getDate() && today.getMonth() === compareDate.getMonth() && today.getFullYear() === compareDate.getFullYear();
  };

  return (
    <>
      <Navbar />
      <Container maxWidth="xl" sx={{ mt: 3, mb: 5 }}>
        <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" sx={{ fontWeight: 'medium' }}>Room Timetable</Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel id="room-select-label">Select Room</InputLabel>
                <Select labelId="room-select-label" value={selectedRoom} label="Select Room" onChange={handleRoomChange} size="small">
                  <MenuItem value=""><em>Select a room</em></MenuItem>
                  {rooms.map(room => <MenuItem key={room.name} value={room.name}>{room.name} ({room.type})</MenuItem>)}
                </Select>
              </FormControl>
              {/* Print button removed as requested */}
            </Stack>
          </Stack>
          {selectedRoom && (
            <Box mb={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box display="flex" alignItems="center">
                  <Room sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                    {selectedRoom} {roomData && `(Capacity: ${rooms.find(r => r.name === selectedRoom)?.capacity || '-'})`}
                  </Typography>
                </Box>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <IconButton onClick={goToPreviousWeek} size="small"><ChevronLeft /></IconButton>
                  <Box display="flex" alignItems="center">
                    <CalendarMonth sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>{getWeekRangeDisplay()}</Typography>
                  </Box>
                  <IconButton onClick={goToNextWeek} size="small"><ChevronRight /></IconButton>
                </Stack>
              </Stack>
            </Box>
          )}
          {error && <Typography color="error" sx={{ mt: 1, mb: 2 }} variant="body2">{error}</Typography>}
          {loading && <Box display="flex" justifyContent="center" my={4}><CircularProgress /></Box>}
          {selectedRoom && roomData && !loading && (
            <Box sx={{ overflowX: 'auto' }}>
              <Grid container sx={{ minWidth: 1000 }}>
                <Grid item xs={1} sx={{ borderRight: '1px solid #e0e0e0' }}>
                  <Box sx={{ height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #e0e0e0', backgroundColor: '#f5f5f5' }}>
                    <AccessTime fontSize="small" sx={{ color: 'text.secondary' }} />
                  </Box>
                  {timeSlots.map((slot, index) => (
                    <Box key={index} sx={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 1, borderBottom: '1px solid #e0e0e0', fontSize: '0.7rem', fontWeight: 'medium' }}>{slot}</Box>
                  ))}
                </Grid>
                {weekDays.map((day, dayIndex) => {
                  const mergedData = roomData ? processTimeTable()[day] : [];
                  return (
                    <Grid item xs={1.83} key={day} sx={{ borderRight: '1px solid #e0e0e0' }}>
                      <Box sx={{ height: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #e0e0e0', backgroundColor: isToday(dayIndex) ? 'primary.light' : '#f5f5f5', color: isToday(dayIndex) ? 'primary.contrastText' : 'inherit' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{day}</Typography>
                        <Typography variant="caption">{getDateString(dayIndex)}</Typography>
                      </Box>
                      {mergedData.map((slot, slotIndex) => (
                        <Box key={`${day}-${slotIndex}`} sx={{ height: slot.span * 80, p: 0, borderBottom: '1px solid #e0e0e0', backgroundColor: slot.entry ? 'transparent' : 'white', '&:hover': { backgroundColor: slot.entry ? 'transparent' : '#f9f9f9' } }}>
                          {renderCellContent(slot)}
                        </Box>
                      ))}
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}
        </Paper>
      </Container>
    </>
  );
};

export default ViewTimetable;
