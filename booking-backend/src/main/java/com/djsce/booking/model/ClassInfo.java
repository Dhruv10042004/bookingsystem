package com.djsce.booking.model;

public class ClassInfo {
    private String year;
    private String division;

    public ClassInfo() {}
    public ClassInfo(String year, String division) {
        this.year = year;
        this.division = division;
    }

    public String getYear() { return year; }
    public void setYear(String year) { this.year = year; }

    public String getDivision() { return division; }
    public void setDivision(String division) { this.division = division; }
}
