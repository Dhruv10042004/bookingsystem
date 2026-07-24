package com.djsce.booking.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Document(collection = "rooms")
public class Room {

    @Id
    private String id;

    @Indexed(unique = true)
    private String name;

    private String type; // Classroom | Lab
    private Integer capacity;
    private String location = "Department of Information Technology";
    private List<ScheduleEntry> schedule = new ArrayList<>();

    public Room() {}

    @JsonProperty("_id")
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public List<ScheduleEntry> getSchedule() { return schedule; }
    public void setSchedule(List<ScheduleEntry> schedule) { this.schedule = schedule; }
}
