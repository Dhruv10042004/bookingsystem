package com.djsce.booking.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.Date;
import java.util.List;

/**
 * A single slot in a Room's weekly schedule. Mirrors the embedded
 * "schedule" sub-documents from the Node Room model.
 */
public class ScheduleEntry {

    @Field("_id")
    @JsonProperty("_id")
    private String id;

    private String day; // Monday..Saturday
    private String startTime;
    private String endTime;
    private String subject;
    private List<String> faculty;

    @Field("class")
    @JsonProperty("class")
    private ClassInfo classInfo;

    private Date date;

    // pendingApproval | approved | granted | default
    private String approvalStatus = "default";

    public ScheduleEntry() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getDay() { return day; }
    public void setDay(String day) { this.day = day; }

    public String getStartTime() { return startTime; }
    public void setStartTime(String startTime) { this.startTime = startTime; }

    public String getEndTime() { return endTime; }
    public void setEndTime(String endTime) { this.endTime = endTime; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public List<String> getFaculty() { return faculty; }
    public void setFaculty(List<String> faculty) { this.faculty = faculty; }

    public ClassInfo getClassInfo() { return classInfo; }
    public void setClassInfo(ClassInfo classInfo) { this.classInfo = classInfo; }

    public Date getDate() { return date; }
    public void setDate(Date date) { this.date = date; }

    public String getApprovalStatus() { return approvalStatus; }
    public void setApprovalStatus(String approvalStatus) { this.approvalStatus = approvalStatus; }
}
