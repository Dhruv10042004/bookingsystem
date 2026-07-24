package com.djsce.booking.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "faculties")
public class Faculty {

    @Id
    private String id;

    @Indexed(unique = true)
    private String name;

    private String role; // Teacher, HOD, Admin, Lab Assistant

    // not persisted - only populated for the /faculty-list response
    @org.springframework.data.annotation.Transient
    private Boolean isRegistered;

    public Faculty() {}
    public Faculty(String name, String role) {
        this.name = name;
        this.role = role;
    }

    @JsonProperty("_id")
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public Boolean getIsRegistered() { return isRegistered; }
    public void setIsRegistered(Boolean isRegistered) { this.isRegistered = isRegistered; }
}
