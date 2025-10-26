import React, { useState } from "react";
import {
  Card, CardContent, Typography, Button, TextField,
  Grid, Alert, CircularProgress
} from "@mui/material";
import axios from "axios";
import ExcelJS from "exceljs";
import Navbar from "../components/Navbar";

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

const API="https://bookingsystem-e4oz.onrender.com/api";
// const API="http://localhost:5000/api";
const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const AdminTimeTableInput = () => {
  const [file, setFile] = useState(null);
  const [roomName, setRoomName] = useState("");
  const [roomType, setRoomType] = useState("");
  const [capacity, setCapacity] = useState("");
  const [extractedData, setExtractedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const parseClassCode = (roomCode) => {
    if (!roomCode || typeof roomCode !== 'string') return { year: "", division: "" };
    const trimmedCode = roomCode.trim();
    const regex = /^([A-Z]+)(?:-)?([A-Z0-9]+)?$/;
    const match = trimmedCode.match(regex);
    return match ? { year: match[1], division: match[2] || "" } : { year: trimmedCode, division: "" };
  };

  const parseCellEntry = (entryStr) => {
    if (!entryStr || typeof entryStr !== "string") return null;
    entryStr = entryStr.trim();

    const lines = entryStr.split(/[\r\n]+/).filter((e) => e.trim());
    if (lines.length > 1) {
      const parsed = lines.map((line) => parseCellEntry(line.trim())).filter(Boolean);
      return parsed.length > 1 ? parsed : parsed[0] || null;
    }

    const allParens = entryStr.match(/\([^)]+\)/g);
    if (allParens && allParens.length >= 4) {
      const completePattern = /\(([^)]+)\)\s*([^\s(]+(?::[^\s(]+)?)\s*\(([^)]+)\)/g;
      const matches = [];
      let match;
      while ((match = completePattern.exec(entryStr)) !== null) {
        const batch = match[1].trim();
        const subject = match[2].trim();
        const facultyCode = match[3].trim();
        const isFacultyCode = facultyNames.some(name => name.includes(`(${facultyCode})`));
        if (isFacultyCode) matches.push({ batch, subject, facultyCode });
      }
      if (matches.length >= 2) return matches;

      const lastParen = allParens[allParens.length - 1];
      const lastCode = lastParen.replace(/[()]/g, '');
      const isLastFaculty = facultyNames.some(name => name.includes(`(${lastCode})`));
      if (isLastFaculty && matches.length < 2) {
        const beforeLastParen = entryStr.substring(0, entryStr.lastIndexOf(lastParen));
        const classSubjPattern = /\(([^)]+)\)\s*([^\s(]+(?::[^\s(]+)?)/g;
        const classMatches = [];
        while ((match = classSubjPattern.exec(beforeLastParen)) !== null) {
          classMatches.push({
            batch: match[1].trim(),
            subject: match[2].trim(),
            facultyCode: lastCode,
          });
        }
        if (classMatches.length >= 2) return classMatches;
      }
    }

    const singleMatch = entryStr.match(/\(([^)]+)\)\s*([^\s:]+:?[^\s]*)\s*\(([^)]+)\)/);
    if (!singleMatch) return null;
    return {
      batch: singleMatch[1].trim(),
      subject: singleMatch[2].trim(),
      facultyCode: singleMatch[3].trim(),
    };
  };

  const findFacultyByCode = (code) => {
    const match = facultyNames.find((name) => name.includes(`(${code})`));
    return match ? match : code;
  };

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

  const parseTimeSlot = (periodText) => {
    if (!periodText || typeof periodText !== "string") return null;
    const match = periodText.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    if (match) return { startTime: match[1], endTime: match[2] };
    return null;
  };

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

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage({ text: "", type: "" });
  };

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

      let timeCol = -1;
      worksheet.getRow(headerRowIndex).eachCell((cell, col) => {
        const v = String(cell.value || "").toUpperCase();
        if (v.includes("TIME") || v.includes("PERIOD")) timeCol = col;
      });

      const processedCells = new Set();

      for (let r = headerRowIndex + 1; r <= worksheet.rowCount; r++) {
        const row = worksheet.getRow(r);
        const timeVal = row.getCell(timeCol).value;
        const time = parseTimeSlot(String(timeVal));
        if (!time) continue;

        for (const [i, col] of Object.entries(dayCols)) {
          const cell = row.getCell(col);
          const cellKey = `${r}-${col}`;
          if (processedCells.has(cellKey)) continue;

          let val = cell.value;

          // --------- Robust merged-cell handling (no _merges access) ----------
          if (cell.isMerged) {
            const master = cell.master;
            // Determine bottom row of vertical merge by walking down
            let endRow = master.row;
            // Keep moving down while the cell at (endRow+1, master.col) is merged and points to same master
            while (endRow + 1 <= worksheet.rowCount) {
              const nextCell = worksheet.getRow(endRow + 1).getCell(master.col);
              if (nextCell && nextCell.isMerged && nextCell.master &&
                  nextCell.master.row === master.row && nextCell.master.col === master.col) {
                endRow += 1;
              } else {
                break;
              }
            }

            // If merged spans multiple rows, read the time from the bottom row to get the true endTime
            if (endRow !== master.row) {
              const bottomRowTimeVal = worksheet.getRow(endRow).getCell(timeCol).value;
              const bottomRowTime = parseTimeSlot(String(bottomRowTimeVal));
              if (bottomRowTime) {
                time.endTime = bottomRowTime.endTime;
              }
            }

            val = master.value;
            // mark all rows in the merged vertical block as processed for this column
            for (let markRow = master.row; markRow <= endRow; markRow++) {
              processedCells.add(`${markRow}-${master.col}`);
            }
            // also mark current cell position
            processedCells.add(cellKey);
          } else {
            processedCells.add(cellKey);
          }
          // -------------------------------------------------------------------

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
