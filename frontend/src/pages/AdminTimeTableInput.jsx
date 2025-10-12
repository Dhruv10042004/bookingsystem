import React, { useState } from "react";
import { 
  Card, CardContent, Typography, Button, TextField, 
  Grid, Alert, CircularProgress
} from "@mui/material";
import axios from "axios";
import ExcelJS from "exceljs";
// import * as XLSX from "xlsx";
import Navbar from "../components/Navbar";

// Original data from your component
const facultyNames = [
  "Dr. Vinaya Sawant (VS)", "Dr. Abhijit Joshi (ARJ)", "Dr. Ram Mangulkar (RM)", "Dr. SatishKumar Verma (SV)",
  "Dr. Monika Mangla (MM)", "Ms. Neha Katre (NK)", "Mr. Harshal Dalvi (HD)", "Mr. Arjun Jaiswal (AJ)",
  "Ms. Stevina Coriea (SC)", "Ms. Prachi Satan (PS)", "Ms. Neha Agarwal (NA)", "Ms. Sharvari Patil (SP)",
  "Ms. Richa Sharma (RS)", "Ms. Sweedle Machado (SM)", "Ms. Priyanca Gonsalves (PG)", "Ms. Anushree Patkar (AP)",
  "Ms. Monali Sankhe (MS)", "Ms. Savyasachi Pandit (SSP)", "Mr. Chandrashekhar Badgujar (CB)",
  "Mr. Suryakant Chaudhari (STC)", "Dr. Gayatri Pandya (GP)", "Dr. Naresh Afre (NAF)", "Mr. Pravin Hole (PH)",
  "Ms. Leena Sahu (LS)","Ms. Prahelika Pai (PP)"
];
// const API=import.meta.env.REACT_APP_API_URL;
const API="https://bookingsystem-e4oz.onrender.com/api"
// const API="http://localhost:5000/api"
// Updated to ensure all days from Monday to Saturday are included
const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const AdminTimeTableInput = () => {
  const [file, setFile] = useState(null);
  const [roomName, setRoomName] = useState("");
  const [roomType, setRoomType] = useState("");
  const [capacity, setCapacity] = useState("");
  const [extractedData, setExtractedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  // Enhanced function to parse complex class codes like "TY-I1,2,3", "TY-I1-2", "TY-11", etc.
  const parseClassCode = (roomCode) => {
    if (!roomCode || typeof roomCode !== 'string') {
      return { year: "", division: "" };
    }
    
    const trimmedCode = roomCode.trim();
    
    // Handle multiple divisions separated by commas: "TY-I1,2,3"
    if (trimmedCode.includes(',')) {
      const parts = trimmedCode.split('-');
      if (parts.length === 2) {
        return {
          year: parts[0], // "TY"
          division: parts[1] // "I1,2,3"
        };
      }
    }
    
    // Handle range of divisions with hyphen: "TY-I1-2"
    if (trimmedCode.includes('-') && trimmedCode.match(/\d+-\d+/)) {
      const parts = trimmedCode.split('-');
      if (parts.length >= 3) {
        return {
          year: parts[0], // "TY"
          division: `${parts[1]}-${parts[2]}` // "I1-2"
        };
      }
    }
    
    // Match standard patterns like "TY-11", "SY-I3", etc.
    const regex = /^([A-Z]+)-([A-Z0-9]+)$/;
    const match = trimmedCode.match(regex);
    
    if (match) {
      return {
        year: match[1], // "TY", "SY", etc.
        division: match[2] // "11", "I3", etc.
      };
    }
    
    return { year: trimmedCode, division: "" };
  };

  // Enhanced function to parse complex cell entries with multiple subjects, faculty, and divisions
  const parseCellEntry = (entry) => {
    if (!entry || typeof entry !== 'string') return null;
    
    const entryStr = String(entry).trim();
    
    // Handle multiple entries in one cell (separated by newlines or semicolons)
    const entries = entryStr.split(/[\n;]/).filter(e => e.trim());
    
    if (entries.length > 1) {
      // Return array of parsed entries for multiple subjects in one cell
      return entries.map(e => parseCellEntry(e.trim())).filter(e => e);
    }
    
    // Regular expression to match pattern with multiple faculty codes like "(TY-11) ISIG (RS, NK)"
    // This will capture room code, subject, and faculty codes (potentially multiple)
    let regex = /^(?:\(([^)]+)\)\s*)?(.*?)\s*\(([^)]+)\)$/;
    let match = entryStr.match(regex);
    
    if (match) {
      const [, roomCode, subject, facultyCodes] = match;
      
      // Split by comma to handle multiple faculty codes
      const facultyCodeList = facultyCodes.split(',').map(code => code.trim());
      
      // Parse year and division from roomCode (handles complex formats like TY-I1,2,3 or TY-I1-2)
      const classInfo = parseClassCode(roomCode || "");
      
      return {
        roomCode: roomCode || "",
        subject: subject.trim(),
        facultyCodes: facultyCodeList,
        year: classInfo.year,
        division: classInfo.division
      };
    }
    
    // Try the format with colon (e.g., "II-1: PBC")
    regex = /^(.*?):\s*(.*)$/;
    match = entryStr.match(regex);
    
    if (match) {
      const [, prefix, subject] = match;
      
      // Parse year and division from prefix
      const classInfo = parseClassCode(prefix || "");
      
      return {
        roomCode: prefix.trim(),
        subject: subject.trim(),
        facultyCodes: [],
        year: classInfo.year,
        division: classInfo.division
      };
    }
    
    // If nothing matches, just use the entire string as the subject
    return {
      roomCode: "",
      subject: entryStr,
      facultyCodes: [],
      year: "",
      division: ""
    };
  };

  // Helper function to find full faculty name from code
  const findFacultyByCode = (codes) => {
    if (!codes || (Array.isArray(codes) && codes.length === 0)) return [];
    
    // Convert to array if it's not already one
    const codeArray = Array.isArray(codes) ? codes : [codes];
    
    const foundFaculty = [];
    
    codeArray.forEach(code => {
      const matches = facultyNames.filter(name => {
        const codeMatch = name.match(/\(([^)]+)\)$/);
        return codeMatch && codeMatch[1] === code;
      });
      
      foundFaculty.push(...matches);
    });
    
    return foundFaculty;
  };

  // Improved function to parse time slots, handling formats like "10:00-10:30" or just "10:00"
  const parseTimeSlot = (periodText) => {
    if (!periodText || typeof periodText !== 'string') return null;
    
    // Try the standard format first (e.g., "10:00-10:30")
    const timeFormat1 = /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/;
    const match1 = String(periodText).match(timeFormat1);
    
    if (match1) {
      return {
        startTime: match1[1].trim(),
        endTime: match1[2].trim()
      };
    }
    
    // Try a single time format (e.g., "10:00") - use this for merged cells or single time representation
    const timeFormat2 = /(\d{1,2}:\d{2})/;
    const match2 = String(periodText).match(timeFormat2);
    
    if (match2) {
      // For a single time value, we need to infer the end time
      // We'll add 1 hour as a default duration
      const startTime = match2[1].trim();
      
      const [hours, minutes] = startTime.split(':').map(num => parseInt(num, 10));
      let endHours = hours + 1;
      
      // Format the end time
      const endTime = `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      return {
        startTime,
        endTime
      };
    }
    
    return null;
  };

  // Function to handle merged cells and extract time slots
  const getTimeSlotForRow = (sheet, rowIndex, timeColumnIndex) => {
    // Try to get a value from the expected cell
    let cellValue = sheet[XLSX.utils.encode_cell({r: rowIndex, c: timeColumnIndex})];
    
    // If the cell is undefined, the Excel file might have merged cells
    if (!cellValue || !cellValue.v) {
      // Look up for previous rows to find a merged cell value
      for (let i = rowIndex - 1; i >= 0; i--) {
        const prevCellValue = sheet[XLSX.utils.encode_cell({r: i, c: timeColumnIndex})];
        if (prevCellValue && prevCellValue.v) {
          // Check if this cell is part of a merged range that includes our target cell
          const merges = sheet['!merges'] || [];
          for (const merge of merges) {
            if (i >= merge.s.r && i <= merge.e.r && 
                timeColumnIndex >= merge.s.c && timeColumnIndex <= merge.e.c &&
                rowIndex >= merge.s.r && rowIndex <= merge.e.r) {
              cellValue = prevCellValue;
              break;
            }
          }
          if (cellValue) break;
        }
      }
    }
    
    return cellValue ? parseTimeSlot(String(cellValue.v)) : null;
  };

  // Function to merge consecutive time slots for the same subject and faculty
  const mergeConsecutiveSlots = (entries) => {
    if (!entries || entries.length === 0) return [];
    
    // Sort entries by day, subject, faculty, and start time
    const sortedEntries = [...entries].sort((a, b) => {
      // Sort by day of week first
      const dayIndexA = daysOfWeek.indexOf(a.day);
      const dayIndexB = daysOfWeek.indexOf(b.day);
      if (dayIndexA !== dayIndexB) return dayIndexA - dayIndexB;
      
      // Then by subject
      if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
      
      // Then by faculty (using first faculty member if available)
      const facultyA = a.faculty.length > 0 ? a.faculty[0] : "";
      const facultyB = b.faculty.length > 0 ? b.faculty[0] : "";
      if (facultyA !== facultyB) return facultyA.localeCompare(facultyB);
      
      // Finally by start time
      return a.startTime.localeCompare(b.startTime);
    });
    
    const mergedEntries = [];
    let currentEntry = null;
    
    for (const entry of sortedEntries) {
      if (!currentEntry) {
        currentEntry = { ...entry };
        continue;
      }
      
      // Check if this entry can be merged with the current one
      const canMerge = 
        currentEntry.day === entry.day &&
        currentEntry.subject === entry.subject &&
        JSON.stringify(currentEntry.faculty) === JSON.stringify(entry.faculty) &&
        currentEntry.endTime === entry.startTime;
      
      if (canMerge) {
        // Merge by updating the end time
        currentEntry.endTime = entry.endTime;
      } else {
        // Cannot merge, add current entry to results and start a new one
        mergedEntries.push(currentEntry);
        currentEntry = { ...entry };
      }
    }
    
    // Add the last entry if there is one
    if (currentEntry) {
      mergedEntries.push(currentEntry);
    }
    
    return mergedEntries;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setMessage({ text: "", type: "" });
  };

  const processExcelFile = async () => {
    if (!file) {
      setMessage({ text: "Please select a file first", type: "error" });
      return;
    }
    if (!roomName || !roomType || !capacity || parseInt(capacity) <= 0) {
      setMessage({ text: "Please complete all room details", type: "error" });
      return;
    }
  
    setLoading(true);
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file);
      const worksheet = workbook.worksheets[0];
  
      const mergedCells = worksheet._merges;
      const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
      const extractedEntries = [];
      let headerRowIndex = -1;
      const dayColumnIndices = {};
  
      for (let r = 0; r < 10; r++) {
        const row = worksheet.getRow(r + 1);
        let daysFound = 0;
        row.eachCell((cell, colNumber) => {
          const val = String(cell.value).trim();
          daysOfWeek.forEach((day, index) => {
            if (val.toLowerCase().includes(day.toLowerCase())) {
              dayColumnIndices[index] = colNumber;
              daysFound++;
            }
          });
        });
        if (daysFound >= 3) {
          headerRowIndex = r + 1;
          break;
        }
      }
  
      if (headerRowIndex === -1) {
        setMessage({ text: "Could not find header row with days of the week", type: "error" });
        setLoading(false);
        return;
      }
  
      let timeColumnIndex = -1;
      worksheet.getRow(headerRowIndex).eachCell((cell, colNumber) => {
        const value = String(cell.value || '').toUpperCase();
        if (value.includes("TIME") || value.includes("PERIOD")) {
          timeColumnIndex = colNumber;
        }
      });
  
      if (timeColumnIndex === -1) {
        setMessage({ text: "Could not find time/period column", type: "error" });
        setLoading(false);
        return;
      }
  
      for (let r = headerRowIndex + 1; r <= worksheet.rowCount; r++) {
        const row = worksheet.getRow(r);
        const timeSlot = row.getCell(timeColumnIndex).value;
        if (!timeSlot) continue;
  
        for (let dayIndex in dayColumnIndices) {
          const colIndex = dayColumnIndices[dayIndex];
          const cell = row.getCell(colIndex);
          const value = cell.value;
          if (!value) continue;
  
          // Handle multiple entries in one cell
          const parsedCell = parseCellEntry(value);
          if (!parsedCell) continue;

          // Check if parsedCell is an array (multiple entries in one cell)
          const entries = Array.isArray(parsedCell) ? parsedCell : [parsedCell];

          entries.forEach(entry => {
            if (!entry) return;

            const { subject, facultyCodes, year, division } = entry;
            const facultyList = findFacultyByCode(facultyCodes);
            const { startTime, endTime } = parseTimeSlot(timeSlot);

            extractedEntries.push({
              name: roomName,
              day: daysOfWeek[dayIndex],
              startTime,
              endTime,
              faculty: facultyList,
              subject,
              capacity,
              type: roomType,
              class: { year, division }
            });
          });
        }
      }
  
      const mergedEntries = mergeConsecutiveSlots(extractedEntries);
      setExtractedData(mergedEntries);
      setMessage({ 
        text: `Successfully extracted ${extractedEntries.length} entries and merged into ${mergedEntries.length} entries`, 
        type: "success" 
      });
    } catch (error) {
      console.error("Error processing Excel file:", error);
      setMessage({ text: "Error processing Excel file: " + error.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmitAll = async () => {
    if (extractedData.length === 0) {
      setMessage({ text: "No data to submit", type: "error" });
      return;
    }

    setLoading(true);
    setMessage({ text: "Submitting timetable entries...", type: "info" });
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const entry of extractedData) {
      try {
        await axios.post(`${API}/rooms/add`, entry, {
          headers: { "Content-Type": "application/json" },
        });
        successCount++;
      } catch (error) {
        console.error("Error adding entry:", error);
        errorCount++;
      }
    }
    
    setLoading(false);
    setMessage({ 
      text: `Submitted ${successCount} entries successfully. ${errorCount > 0 ? `Failed to submit ${errorCount} entries.` : ''}`, 
      type: errorCount > 0 ? "warning" : "success" 
    });
    
    // Reset data after submission
    if (successCount > 0) {
      setExtractedData([]);
      setFile(null);
    }
  };

  return (
    <>
      <Navbar />
       <Card style={{ maxWidth: 600, margin: "40px auto", padding: "20px" }}>
      <CardContent>
        <Grid container spacing={2} style={{ marginBottom: "20px" }}>
          <Grid item xs={12}>
            <TextField
              label="Room/Lab Name"
              fullWidth
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              select
              label="Room Type"
              fullWidth
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              required
              SelectProps={{ native: true }}
            >
              <option value=""></option>
              <option value="Classroom">Classroom</option>
              <option value="Lab">Lab</option>
            </TextField>
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Capacity"
              type="number"
              fullWidth
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              required
            />
          </Grid>
        </Grid>
        
        <input
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          id="excel-file-input"
          type="file"
          onChange={handleFileChange}
        />
        <label htmlFor="excel-file-input">
          <Button 
            variant="outlined" 
            component="span" 
            fullWidth
            style={{ marginBottom: "10px" }}
          >
            Select Excel File
          </Button>
        </label>
        
        {file && (
          <Typography variant="body2" style={{ marginBottom: "10px" }}>
            Selected file: {file.name}
          </Typography>
        )}
        
        <Button 
          variant="contained" 
          color="primary" 
          onClick={processExcelFile}
          disabled={loading || !file}
          fullWidth
          style={{ marginBottom: "10px" }}
        >
          Process Excel File
        </Button>
        
        {message.text && (
          <Alert severity={message.type} style={{ marginTop: "10px", marginBottom: "10px" }}>
            {message.text}
          </Alert>
        )}
        
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
            <CircularProgress />
          </div>
        )}
        
        {extractedData.length > 0 && (
          <>
            <Typography variant="subtitle1" style={{ marginTop: "20px" }}>
              Extracted {extractedData.length} timetable entries
            </Typography>
            
            <div style={{ maxHeight: "300px", overflowY: "auto", marginBottom: "20px" }}>
              {extractedData.map((entry, index) => (
                <div key={index} style={{ padding: "5px", borderBottom: "1px solid #eee" }}>
                  <Typography variant="body2">
                    <strong>{entry.day}</strong>, {entry.startTime}-{entry.endTime}: {entry.subject} - 
                    {entry.faculty.length > 0 
                      ? <span style={{color: "#007700"}}>{entry.faculty.join(", ")}</span> 
                      : <span style={{color: "#CC0000"}}>No faculty matched</span>}
                    {entry.class && (entry.class.year || entry.class.division) && 
                      <span style={{color: "#0055AA"}}> ({entry.class.year}-{entry.class.division})</span>}
                  </Typography>
                </div>
              ))}
            </div>
            
            <Button 
              variant="contained" 
              color="success" 
              onClick={handleSubmitAll}
              disabled={loading}
              fullWidth
            >
              Submit All Entries
            </Button>
          </>
        )}
      </CardContent>
    </Card></>
  );
};

export default AdminTimeTableInput;