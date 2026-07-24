package com.djsce.booking.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "bookings")
public class Booking {

    @Id
    private String id;

    @Indexed
    private String teacher; // User id (string, like Mongoose ObjectId ref)

    @Indexed
    private String classroom;

    @Indexed
    private String date; // stored as "yyyy-MM-dd" string, same as the Node model

    private String day;
    private String timeSlot;
    private String purpose;

    private String status = "Pending"; // Pending | Rejected | Approved by Admin
    private String hodStatus = "Pending"; // Pending | Granted | Rejected | N/A

    public Booking() {}

    @JsonProperty("_id")
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTeacher() { return teacher; }
    public void setTeacher(String teacher) { this.teacher = teacher; }

    public String getClassroom() { return classroom; }
    public void setClassroom(String classroom) { this.classroom = classroom; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public String getDay() { return day; }
    public void setDay(String day) { this.day = day; }

    public String getTimeSlot() { return timeSlot; }
    public void setTimeSlot(String timeSlot) { this.timeSlot = timeSlot; }

    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getHodStatus() { return hodStatus; }
    public void setHodStatus(String hodStatus) { this.hodStatus = hodStatus; }
}
