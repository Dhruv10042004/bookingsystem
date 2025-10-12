import React from "react";
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 20 },
  header: { fontSize: 24, marginBottom: 10, textAlign: "center" },
  table: { display: "table", width: "100%", borderStyle: "solid", borderWidth: 1, borderColor: "#000" },
  row: { flexDirection: "row" },
  cell: { flex: 1, borderWidth: 1, borderColor: "#000", padding: 5, fontSize: 10 },
  day: { backgroundColor: "#f2f2f2", fontWeight: "bold" }
});

const TimetablePDF = ({ timetable, roomName }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>Timetable for Room: {roomName}</Text>
      <View style={styles.table}>
        <View style={[styles.row, styles.day]}>
          <Text style={styles.cell}>Day</Text>
          <Text style={styles.cell}>Start Time</Text>
          <Text style={styles.cell}>End Time</Text>
          <Text style={styles.cell}>Faculty</Text>
          <Text style={styles.cell}>Purpose</Text>
        </View>
        {timetable.map((slot, index) => (
          <View key={index} style={styles.row}>
            <Text style={styles.cell}>{slot.day}</Text>
            <Text style={styles.cell}>{slot.startTime}</Text>
            <Text style={styles.cell}>{slot.endTime}</Text>
            <Text style={styles.cell}>{slot.faculty}</Text>
            <Text style={styles.cell}>{slot.purpose}</Text>
          </View>
        ))}
      </View>
    </Page>
  </Document>
);

export default TimetablePDF;
