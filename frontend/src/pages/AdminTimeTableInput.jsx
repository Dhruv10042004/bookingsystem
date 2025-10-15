import React, { useState } from "react";
import {
  Card, CardContent, Typography, Button, TextField,
  Grid, Alert, CircularProgress
} from "@mui/material";
import axios from "axios";
import ExcelJS from "exceljs";
import Navbar from "../components/Navbar";

// Faculty names list
const facultyNames = [
  "Dr. Vinaya Sawant (VS)", 
  "Dr. A. R. Joshi (ARJ)", 
  "Dr. Ram Mangrulkar (RM)", 
  "Dr. Monika Mangla (MM)", 
  "Dr. Satishkumar Verma (SV)", 
  "Ms. Neha Katre (NK)", 
  "Mr. Harshal Dalvi (HD)", 
  "Mr. Arjun Jaiswal (AJ)", 
  "Ms. Stevina Correia (SC)", 
  "Ms. Prachi Satam (PS)", 
  "Ms. Neha Agarwal (NA)", 
  "Ms. Richa Sharma (RS)", 
  "Ms. Sharvari Patil (SP)", 
  "Ms. Sweedle Machado (SM)", 
  "Ms. Priyanca Gonsalves (PG)", 
  "Ms. Anushree Patkar (AP)", 
  "Ms. Monali Sankhe (MS)", 
  "Ms. Savyasaachi Pandit (SSP)", 
  "Mr. Chandrashekhar Badgujar (CB)", 
  "Ms. Leena Sahu (LS)", 
  "Ms. Praniti Patil (PP)", 
  "Ms. Shraddha More (SSM)", 
  "Ms. Fahad Siddique (FS)", 
  "Dr. Sanjay Deshmukh (SD)", 
  "Mr. Pravin Hole (PH)", 
  "Ms. Rupali Karande (RK)", 
  "Mr. Vishal Shah (VJS)", 
  "Ms. Swati (SW)", 
  "Mr. Amaro Henrique (H)", 
  "Ms. Sunita Ramchandran (SR)", 
  "Mr. Suryakant Chaudhari (STC)", 
  "Dr. Gayatri Pandya (GP)", 
  "Dr. Naresh Afre (NAF)", 
  "Ms. Prahelika Pai (PP)"
];
// const API="https://bookingsystem-e4oz.onrender.com/api"
const API = "http://localhost:5000/api";
const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const AdminTimeTableInput = () => {
  const [file, setFile] = useState(null);
  const [roomName, setRoomName] = useState("");
  const [roomType, setRoomType] = useState("");
  const [capacity, setCapacity] = useState("");
  const [extractedData, setExtractedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  // Parse class codes like "TY-I1,2,3", "TY-I1-2", "SYI2", etc.
  const parseClassCode = (roomCode) => {
    if (!roomCode || typeof roomCode !== 'string') return { year: "", division: "" };
    const trimmedCode = roomCode.trim();
    const regex = /^([A-Z]+)(?:-)?([A-Z0-9]+)?$/;
    const match = trimmedCode.match(regex);
    return match ? { year: match[1], division: match[2] || "" } : { year: trimmedCode, division: "" };
  };

  // ✅ Updated function to support multiple stacked entries in one cell
  const parseCellEntry = (entryStr) => {
    if (!entryStr || typeof entryStr !== "string") return null;
    entryStr = entryStr.trim();

    // ✅ Handle multiple entries (newline, semicolon, or stacked patterns)
    const multipleEntryRegex = /\([A-Za-z0-9]+\)[^()]+\([^()]+\)/g;
    const matches = entryStr.match(multipleEntryRegex);
    if (matches && matches.length > 1) {
      return matches.map((e) => parseCellEntry(e.trim())).filter(Boolean);
    }

    // ✅ Also handle newlines or semicolons
    const entries = entryStr.split(/[\n;]/).filter((e) => e.trim());
    if (entries.length > 1) {
      return entries.map((e) => parseCellEntry(e.trim())).filter(Boolean);
    }

    // ✅ Parse single entry: (CLASS)SUBJECT (FACULTY)
    const match = entryStr.match(/\(([^)]+)\)\s*([^\s:]+:?[^\s]*)\s*\(([^)]+)\)/);
    if (!match) return null;

    return {
      batch: match[1].trim(),       // e.g. SYI2
      subject: match[2].trim(),     // e.g. I2-1:DS
      facultyCode: match[3].trim(), // e.g. PH
    };
  };

  // ✅ Faculty code → Full name
  const findFacultyByCode = (code) => {
    const match = facultyNames.find((name) => name.includes(`(${code})`));
    return match ? match : code;
  };

  // ✅ Expand division range or grouped strings like I1+I2+I3
  const expandDivisions = (divStr) => {
    if (!divStr || typeof divStr !== "string") return [];
    const cleaned = divStr.replace(/\s+/g, "");
    if (cleaned.includes('+') || cleaned.includes(',')) {
      return cleaned.split(/[,+]/).map((d) => d.trim());
    }
    const rangeMatch = cleaned.match(/^([A-Za-z]+)?(\d+)-(\d+)$/);
    if (rangeMatch) {
      const prefix = rangeMatch[1] || "";
      const start = parseInt(rangeMatch[2]);
      const end = parseInt(rangeMatch[3]);
      const out = [];
      for (let i = start; i <= end; i++) out.push(`${prefix}${i}`);
      return out;
    }
    return [cleaned];
  };

  // ✅ Parse time slot like "10:00-11:00"
  const parseTimeSlot = (periodText) => {
    if (!periodText || typeof periodText !== "string") return null;
    const match = periodText.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    if (match) return { startTime: match[1], endTime: match[2] };
    return null;
  };

  // ✅ Merge consecutive identical classes
  const mergeConsecutiveSlots = (entries) => {
    if (!entries.length) return [];
    const sorted = entries.sort((a, b) => a.day.localeCompare(b.day) || a.startTime.localeCompare(b.startTime));
    const merged = [];
    let current = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      const e = sorted[i];
      if (
        e.day === current.day &&
        e.subject === current.subject &&
        e.faculty.join(",") === current.faculty.join(",") &&
        e.startTime === current.endTime
      ) {
        current.endTime = e.endTime;
      } else {
        merged.push(current);
        current = e;
      }
    }
    merged.push(current);
    return merged;
  };

  // File selection
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage({ text: "", type: "" });
  };

  // ✅ Main Excel processing
  const processExcelFile = async () => {
    if (!file) return setMessage({ text: "Please select a file first", type: "error" });
    if (!roomName || !roomType || !capacity) return setMessage({ text: "Please complete room details", type: "error" });

    setLoading(true);
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file);
      const worksheet = workbook.worksheets[0];

      const extractedEntries = [];
      let headerRowIndex = -1;
      const dayCols = {};

      // Detect day columns
      for (let r = 1; r <= 10; r++) {
        const row = worksheet.getRow(r);
        row.eachCell((cell, col) => {
          const val = String(cell.value || "").trim().toLowerCase();
          daysOfWeek.forEach((day, i) => {
            if (val.includes(day.toLowerCase())) dayCols[i] = col;
          });
        });
        if (Object.keys(dayCols).length >= 3) {
          headerRowIndex = r;
          break;
        }
      }

      // Find time column
      let timeCol = -1;
      worksheet.getRow(headerRowIndex).eachCell((cell, col) => {
        const v = String(cell.value || "").toUpperCase();
        if (v.includes("TIME") || v.includes("PERIOD")) timeCol = col;
      });

      for (let r = headerRowIndex + 1; r <= worksheet.rowCount; r++) {
        const row = worksheet.getRow(r);
        const timeVal = row.getCell(timeCol).value;
        const time = parseTimeSlot(String(timeVal));
        if (!time) continue;

        for (const [i, col] of Object.entries(dayCols)) {
          const val = row.getCell(col).value;
          if (!val) continue;

          const parsed = parseCellEntry(String(val));
          if (!parsed) continue;

          const entries = Array.isArray(parsed) ? parsed : [parsed];
          entries.forEach((p) => {
            if (!p) return;
            const classInfo = parseClassCode(p.batch);
            const facultyFull = [findFacultyByCode(p.facultyCode)];
            const divisions = expandDivisions(classInfo.division);
            divisions.forEach((div) => {
              extractedEntries.push({
                name: roomName,
                type: roomType,
                capacity: parseInt(capacity),
                day: daysOfWeek[i],
                startTime: time.startTime,
                endTime: time.endTime,
                subject: p.subject,
                faculty: facultyFull,
                class: { year: classInfo.year, division: div },
              });
            });
          });
        }
      }

      const merged = mergeConsecutiveSlots(extractedEntries);
      setExtractedData(merged);
      setMessage({
        text: `✅ Extracted ${extractedEntries.length} entries, merged into ${merged.length}`,
        type: "success",
      });
    } catch (err) {
      console.error(err);
      setMessage({ text: "Error reading Excel: " + err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAll = async () => {
    if (!extractedData.length) return setMessage({ text: "No data to submit", type: "error" });
    setLoading(true);
    let success = 0;
    for (const e of extractedData) {
      try {
        await axios.post(`${API}/rooms/add`, e);
        success++;
      } catch (err) {
        console.error(err);
      }
    }
    setLoading(false);
    setMessage({ text: `Uploaded ${success} entries successfully.`, type: "success" });
  };

  // ✅ UI remains identical
  return (
    <>
      <Navbar />
      <Card style={{ maxWidth: 600, margin: "40px auto", padding: "20px" }}>
        <CardContent>
          <Grid container spacing={2} style={{ marginBottom: "20px" }}>
            <Grid item xs={12}>
              <TextField label="Room/Lab Name" fullWidth value={roomName} onChange={(e) => setRoomName(e.target.value)} />
            </Grid>
            <Grid item xs={6}>
              <TextField select label="Room Type" fullWidth value={roomType} onChange={(e) => setRoomType(e.target.value)} required SelectProps={{ native: true }}>
                <option value=""></option>
                <option value="Classroom">Classroom</option>
                <option value="Lab">Lab</option>
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField label="Capacity" type="number" fullWidth value={capacity} onChange={(e) => setCapacity(e.target.value)} required />
            </Grid>
          </Grid>

          <input accept=".xlsx,.xls" style={{ display: "none" }} id="excel-file-input" type="file" onChange={handleFileChange} />
          <label htmlFor="excel-file-input">
            <Button variant="outlined" component="span" fullWidth style={{ marginBottom: "10px" }}>
              Select Excel File
            </Button>
          </label>

          {file && (
            <Typography variant="body2" style={{ marginBottom: "10px" }}>
              Selected file: {file.name}
            </Typography>
          )}

          <Button variant="contained" color="primary" onClick={processExcelFile} disabled={loading || !file} fullWidth style={{ marginBottom: "10px" }}>
            Process Excel File
          </Button>

          {message.text && (
            <Alert severity={message.type} style={{ marginTop: "10px", marginBottom: "10px" }}>
              {message.text}
            </Alert>
          )}

          {loading && (
            <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
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
                      {entry.faculty.length > 0 ? (
                        <span style={{ color: "#007700" }}> {entry.faculty.join(", ")}</span>
                      ) : (
                        <span style={{ color: "#CC0000" }}> No faculty matched</span>
                      )}
                      {entry.class && (entry.class.year || entry.class.division) && (
                        <span style={{ color: "#0055AA" }}>
                          {" "}
                          ({entry.class.year}
                          {entry.class.division ? `-${entry.class.division}` : ""})
                        </span>
                      )}
                    </Typography>
                  </div>
                ))}
              </div>

              <Button variant="contained" color="success" onClick={handleSubmitAll} disabled={loading} fullWidth>
                Submit All Entries
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default AdminTimeTableInput;
