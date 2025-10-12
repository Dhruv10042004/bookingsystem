import React from 'react';
import jsPDF from 'jspdf';
import { Button } from "@mui/material";

const PrintTimeTable = ({ roomName, timetable }) => {
  const generatePDF = () => {
    if (!timetable || timetable.length === 0) {
      alert("Please load a timetable first!");
      return;
    }
    
    // Create new PDF document
    const doc = new jsPDF();
    
    // Set up document properties
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    
    // Add college header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("DWARKADAS J. SANGHVI COLLEGE OF ENGINEERING", pageWidth / 2, 20, { align: 'center' });
    
    // Add department header
    doc.setFontSize(14);
    doc.text("Department of Information Technology", pageWidth / 2, 30, { align: 'center' });
    
    // Add timetable and date info
    doc.setFontSize(12);
    doc.text(`Time-table for the academic term: Jan-May 2025`, pageWidth / 2, 40, { align: 'center' });
    
    // Add classroom name
    doc.text(`Classroom: ${roomName}`, 20, 55);
    
    // Add effective date
    const today = new Date();
    const formattedDate = `${today.getDate()}${getOrdinalSuffix(today.getDate())} ${getMonthName(today.getMonth())} ${today.getFullYear()}`;
    doc.text(`w.e.f: ${formattedDate}`, pageWidth - 50, 55);
    
    // Create a manual table
    const createManualTable = () => {
      // Define days
      const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      
      // Define time periods with standardized 24-hour format internally
      const periods = [
        { no: 1, time: "08:00-08:30", start24: "08:00", end24: "08:30" },
        { no: 2, time: "08:30-09:00", start24: "08:30", end24: "09:00" },
        { no: 3, time: "09:00-09:30", start24: "09:00", end24: "09:30" },
        { no: 4, time: "09:30-10:00", start24: "09:30", end24: "10:00" },
        { no: 5, time: "10:00-10:30", start24: "10:00", end24: "10:30" },
        { no: 6, time: "10:30-11:00", start24: "10:30", end24: "11:00" },
        { no: 7, time: "11:00-11:30", start24: "11:00", end24: "11:30" },
        { no: 8, time: "11:30-12:00", start24: "11:30", end24: "12:00" },
        { no: 9, time: "12:00-12:30", start24: "12:00", end24: "12:30" },
        { no: 10, time: "12:30-01:00", start24: "12:30", end24: "13:00" },
        { no: 11, time: "01:00-01:30", start24: "13:00", end24: "13:30" },
        { no: 12, time: "01:30-02:00", start24: "13:30", end24: "14:00" },
        { no: 13, time: "02:00-02:30", start24: "14:00", end24: "14:30" },
        { no: 14, time: "02:30-03:00", start24: "14:30", end24: "15:00" },
        { no: 15, time: "03:00-03:30", start24: "15:00", end24: "15:30" },
        { no: 16, time: "03:30-04:00", start24: "15:30", end24: "16:00" },
        { no: 17, time: "04:00-04:30", start24: "16:00", end24: "16:30" },
        { no: 18, time: "04:30-05:00", start24: "16:30", end24: "17:00" },
        { no: 19, time: "05:00-05:30", start24: "17:00", end24: "17:30" },
        { no: 20, time: "05:30-06:00", start24: "17:30", end24: "18:00" }
      ];
      
      // Table dimensions
      const startY = 65;
      const cellWidth = (pageWidth - margin * 2) / (days.length + 2); // +2 for No. and Period columns
      const rowHeight = 10;
      
      // Helper function to convert time to minutes for comparison
      const timeToMinutes = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(num => parseInt(num, 10));
        return hours * 60 + minutes;
      };
      
      // Helper function to extract faculty initials
      const extractInitials = (facultyStr) => {
        if (!facultyStr) return '';
        
        if (facultyStr.includes('(') && facultyStr.includes(')')) {
          return facultyStr.substring(
            facultyStr.lastIndexOf('(') + 1,
            facultyStr.lastIndexOf(')')
          );
        }
        return facultyStr;
      };
      
      // Helper function to get display text for an entry
      const getDisplayText = (entry) => {
        if (!entry) return '';
        
        let displayText = '';
        
        // Add subject
        if (entry.subject) {
          displayText += entry.subject;
        }
        
        // Handle faculty array
        if (entry.faculty) {
          const facultyInitials = Array.isArray(entry.faculty)
            ? entry.faculty
                .filter(f => f && f !== 'None')
                .map(extractInitials)
                .join('/')
            : extractInitials(entry.faculty);
          
          if (facultyInitials) {
            displayText += ` (${facultyInitials})`;
          }
        }
        
        // Add class info if available
        if (entry.className && !displayText.includes(entry.className)) {
          displayText = `${entry.className ? `(${entry.className}) ` : ''}${displayText}`;
        }
        
        return displayText.trim();
      };
      
      // Helper function to normalize time to 24-hour format
      const normalizeTo24Hour = (timeStr) => {
        // Handle cases with AM/PM suffix
        const isPM = timeStr.toLowerCase().includes('pm');
        const isAM = timeStr.toLowerCase().includes('am');
        
        // Remove non-numeric characters except colon
        let cleanTime = timeStr.replace(/[^0-9:]/g, '');
        let [hours, minutes] = cleanTime.split(':').map(num => parseInt(num, 10));
        
        // Convert 12-hour to 24-hour format if needed
        if (isPM && hours !== 12) {
          hours += 12;
        } else if (isAM && hours === 12) {
          hours = 0;
        }
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      };
      
      // Process entries and create schedule grid
      const processScheduleGrid = () => {
        // Create a 2D array for the schedule
        const grid = Array(days.length).fill().map(() => Array(periods.length).fill(null));
        
        // Process each entry
        timetable.forEach(entry => {
          if (!entry.day || !entry.startTime || !entry.endTime) return;
          
          // Find day index
          const dayIndex = days.findIndex(d => d === entry.day);
          if (dayIndex === -1) return;
          
          // Normalize times to 24-hour format
          const startTime24 = normalizeTo24Hour(entry.startTime);
          const endTime24 = normalizeTo24Hour(entry.endTime);
          
          // Convert to minutes for comparison
          const startMinutes = timeToMinutes(startTime24);
          const endMinutes = timeToMinutes(endTime24);
          
          // Find periods this entry spans
          let firstPeriodIndex = -1;
          let lastPeriodIndex = -1;
          
          periods.forEach((period, index) => {
            const periodStartMinutes = timeToMinutes(period.start24);
            const periodEndMinutes = timeToMinutes(period.end24);
            
            // Check if entry overlaps with this period
            const hasOverlap = (
              // Entry starts before or at period start and ends after period start
              (startMinutes <= periodStartMinutes && endMinutes > periodStartMinutes) ||
              // Entry starts before period end and ends at or after period end
              (startMinutes < periodEndMinutes && endMinutes >= periodEndMinutes) ||
              // Entry is completely contained within period
              (startMinutes >= periodStartMinutes && endMinutes <= periodEndMinutes)
            );
            
            if (hasOverlap) {
              if (firstPeriodIndex === -1) firstPeriodIndex = index;
              lastPeriodIndex = index;
            }
          });
          
          if (firstPeriodIndex === -1) return;
          
          // Calculate row span for this entry
          const rowSpan = lastPeriodIndex - firstPeriodIndex + 1;
          
          // Add entry to grid
          grid[dayIndex][firstPeriodIndex] = {
            text: getDisplayText(entry),
            rowSpan: rowSpan,
            entry: entry,
            spanStart: firstPeriodIndex,
            spanEnd: lastPeriodIndex
          };
          
          // Mark subsequent periods as merged
          for (let i = firstPeriodIndex + 1; i <= lastPeriodIndex; i++) {
            grid[dayIndex][i] = { 
              merged: true, 
              mergedWith: firstPeriodIndex,
              spanStart: firstPeriodIndex,
              spanEnd: lastPeriodIndex
            };
          }
        });
        
        return grid;
      };
      
      // Create a structure to track which horizontal lines to draw
      const drawHorizontalLines = (scheduleGrid) => {
        // Initialize all lines to true (draw them)
        const lines = Array(periods.length + 1).fill().map(() => Array(days.length).fill(true));
        
        // Mark horizontal lines that should not be drawn due to merged cells
        for (let d = 0; d < days.length; d++) {
          console.log(periods.length);
          for (let p = 0; p < periods.length; p++) {
            const cell = scheduleGrid[d][p];
            
            if (cell && (cell.rowSpan > 1 || cell.merged)) {
              // Get the span boundaries
              const spanStart = cell.spanStart;
              const spanEnd = cell.spanEnd;
              
              // For all rows in the middle of this span, disable the horizontal lines
              for (let i = spanStart+1; i <=spanEnd; i++) {
                lines[i+1][d] = false;
              }
            }
          }
        }
        
        return lines;
      };
      
      // Get processed schedule grid
      const scheduleGrid = processScheduleGrid();
      const horizontalLines = drawHorizontalLines(scheduleGrid);
      
      // Draw table border
      doc.setDrawColor(0);
      doc.setLineWidth(0.3);
      doc.rect(margin, startY, pageWidth - margin * 2, rowHeight * (periods.length + 1));
      
      // Draw header
      doc.setFillColor(220, 220, 220); // Light gray for header
      doc.rect(margin, startY, pageWidth - margin * 2, rowHeight, 'F');
      
      doc.setTextColor(0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      
      // Draw header cells and text
      doc.line(margin, startY, margin, startY + rowHeight * (periods.length + 1)); // First vertical line
      
      // Header cell for "No."
      doc.text('No.', margin + cellWidth/2, startY + 7, { align: 'center' });
      doc.line(margin + cellWidth, startY, margin + cellWidth, startY + rowHeight * (periods.length + 1));
      
      // Header cell for "PERIOD"
      doc.text('PERIOD', margin + cellWidth + cellWidth/2, startY + 7, { align: 'center' });
      doc.line(margin + 2 * cellWidth, startY, margin + 2 * cellWidth, startY + rowHeight * (periods.length + 1));
      
      // Header cells for days
      days.forEach((day, index) => {
        doc.text(day, margin + (2 + index) * cellWidth + cellWidth/2, startY + 7, { align: 'center' });
        doc.line(margin + (3 + index) * cellWidth, startY, margin + (3 + index) * cellWidth, startY + rowHeight * (periods.length + 1));
      });
      
      // Draw horizontal header line
      doc.line(margin, startY + rowHeight, pageWidth - margin, startY + rowHeight);
      
      // Reset text color and font
      doc.setTextColor(0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      
      // Draw period numbers and times (left columns)
      periods.forEach((period, periodIndex) => {
        const rowY = startY + rowHeight * (periodIndex + 1);
        
        // Period number
        doc.text(`${period.no}`, margin + cellWidth/2, rowY + 7, { align: 'center' });
        
        // Time period
        doc.text(period.time, margin + cellWidth + cellWidth/2, rowY + 7, { align: 'center' });
      });
      
      // Draw all vertical lines
      for (let i = 0; i <= days.length + 2; i++) {
        const lineX = margin + i * cellWidth;
        doc.line(lineX, startY, lineX, startY + rowHeight * (periods.length + 1));
      }
      
      // Draw horizontal lines, respecting merged cells
      for (let p = 0; p <= periods.length; p++) {
        const lineY = startY + p * rowHeight;
        
        // Always draw the top and bottom borders
        if (p === 0 || p === periods.length) {
          doc.line(margin, lineY, pageWidth - margin, lineY);
          continue;
        }
        
        // Draw horizontal line segments for each column
        let currentX = margin;
        
        // Always draw lines for period number and period time columns
        doc.line(currentX, lineY, currentX + 2 * cellWidth, lineY);
        currentX += 2 * cellWidth;
        
        // For each day column, check if we should draw the line
        for (let d = 0; d < days.length; d++) {
          if (horizontalLines[p][d]) {
            doc.line(currentX, lineY, currentX + cellWidth, lineY);
          }
          currentX += cellWidth;
        }
      }
      
      // Draw content cells for all days
      for (let d = 0; d < days.length; d++) {
        const dayX = margin + (2 + d) * cellWidth;
        
        for (let p = 0; p < periods.length; p++) {
          const cell = scheduleGrid[d][p];
          if (!cell || cell.merged) continue;
          
          const rowY = startY + rowHeight * (p + 1);
          const cellHeight = rowHeight * cell.rowSpan;
          
          // Draw the cell content
          if (cell.text) {
            // Split text if needed to fit in cell
            const maxWidth = cellWidth - 2; // leave 1pt padding on each side
            const lines = doc.splitTextToSize(cell.text, maxWidth);
            
            // Calculate vertical position to center text in merged cell
            const lineHeight = 3.5;
            const totalTextHeight = lines.length * lineHeight;
            const textStartY = rowY + (cellHeight - totalTextHeight) / 2 + lineHeight;
            
            // Draw each line of text
            lines.forEach((line, lineIndex) => {
              doc.text(line, dayX + cellWidth/2, textStartY + (lineIndex * lineHeight), { align: 'center' });
            });
          }
        }
      }
      
      return startY + rowHeight * (periods.length + 1);
    };
    
    // Create table and get final Y position
    const finalY = createManualTable();
    
    // Add faculty list
    const facultyY = finalY + 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text("Faculty:", 10, facultyY);
    
    doc.setFont('helvetica', 'normal');
    
    // Faculty list
    const facultyText = "VS: Dr. Vinaya Sawant, ARJ: Dr. Abhijit Joshi, RM: Dr. Ram Mangulkar, SV: Dr. SatishKumar Verma, MM: Dr. Monika Mangla, NK: Ms. Neha Katre, HD: Mr. Harshal Dalvi, AJ: Mr. Arjun Jaiswal, SC: Ms. Stevina Corriea, PS: Ms. Prachi Satam, NA: Ms. Neha Agarwal, SP: Ms. Sharvari Patil, RS: Ms. Richa Sharma, SM: Ms. Sweedle Machado, PG: Ms. Priyanca Gonsalves, AP: Ms. Anushree Patkar, MS: Ms. Monali Sankhe, SSP: Ms. Savyasachi Pandit, CB: Mr. Chandrashekhar Badgujar, STC: Mr. Suryakant Chaudhari, GP: Dr. Gayatri Pandya, NAF: Dr. Naresh Afre, PH: Mr. Pravin Hole, LS: Ms. Leena Sahu";
    
    // Split faculty text into lines to fit the page width
    const splitFaculty = doc.splitTextToSize(facultyText, pageWidth - (margin * 2));
    doc.text(splitFaculty, margin, facultyY + 5);
    
    // Add signatures
    const signaturesY = facultyY + 5 + (splitFaculty.length * 5) + 15;
    
    doc.setFontSize(10);
    doc.text("Ms. Sharvari/ Ms. Stevina/ Ms. Neha K", margin + 50, signaturesY, { align: 'center' });
    doc.text("Time Table Coordinator", margin + 50, signaturesY + 7, { align: 'center' });
    
    doc.text("Dr. Vinaya Sawant", pageWidth - margin - 50, signaturesY, { align: 'center' });
    doc.text("Head of Dept.", pageWidth - margin - 50, signaturesY + 7, { align: 'center' });
    
    // Save the PDF
    doc.save(`${roomName}_Timetable.pdf`);
  };
  
  // Helper function to get month name
  const getMonthName = (monthIndex) => {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return months[monthIndex];
  };
  
  // Helper function for ordinal suffix (1st, 2nd, 3rd, etc.)
  const getOrdinalSuffix = (day) => {
    if (day > 3 && day < 21) return "th";
    switch (day % 10) {
      case 1: return "st";
      case 2: return "nd";
      case 3: return "rd";
      default: return "th";
    }
  };

  return (
    <Button 
      variant="contained" 
      color="primary" 
      onClick={generatePDF}
      disabled={!timetable || timetable.length === 0}
    >
      Print Timetable
    </Button>
  );
};

export default PrintTimeTable;