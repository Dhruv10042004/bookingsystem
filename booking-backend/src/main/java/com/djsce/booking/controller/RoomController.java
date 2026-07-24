package com.djsce.booking.controller;

import com.djsce.booking.model.ClassInfo;
import com.djsce.booking.model.Room;
import com.djsce.booking.model.ScheduleEntry;
import com.djsce.booking.repository.RoomRepository;
import com.djsce.booking.security.AuthUser;
import com.djsce.booking.security.AuthUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.bson.types.ObjectId;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.text.SimpleDateFormat;
import java.util.*;

/**
 * Equivalent of backend/routes/rooms.js
 */
@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private static final List<String> TIME_SLOTS = List.of(
            "08:00", "08:30", "09:00", "09:30",
            "10:00", "10:30", "11:00", "11:30",
            "12:00", "12:30", "01:00", "01:30",
            "02:00", "02:30", "03:00", "03:30",
            "04:00", "04:30", "05:00", "05:30", "06:00");
    private static final List<String> WEEK_DAYS = List.of(
            "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday");

    private final RoomRepository roomRepository;

    public RoomController(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    /** 📌 Add Predefined Rooms to Database (If Not Exists) */
    @PostMapping("/add-rooms")
    public Object addDefaultRooms() {
        String[][] defaults = {
                { "64", "Classroom", "70" },
                { "65", "Classroom", "70" },
                { "66", "Classroom", "70" },
                { "Lab1", "Lab", "35" },
                { "Lab2", "Lab", "35" },
                { "Lab3", "Lab", "35" }
        };
        for (String[] d : defaults) {
            if (roomRepository.findByName(d[0]).isEmpty()) {
                Room room = new Room();
                room.setName(d[0]);
                room.setType(d[1]);
                room.setCapacity(Integer.parseInt(d[2]));
                room.setLocation("Department of Information Technology");
                roomRepository.save(room);
            }
        }
        return ResponseEntity.status(201).body(Map.of("message", "Rooms added successfully!"));
    }

    /** 📌 Get All Rooms (with details) */
    @GetMapping
    public Object getAllRooms() {
        return roomRepository.findAll();
    }

    /** 📌 Fetch Timetable for a Specific Room */
    @GetMapping("/{roomName}/timetable")
    public Object getTimetable(@PathVariable String roomName) {
        Optional<Room> roomOpt = roomRepository.findByName(roomName);
        if (roomOpt.isEmpty())
            return notFound("Room not found");
        return Map.of("timetable", roomOpt.get().getSchedule());
    }

    /** 📌 Available slots across all rooms for a given day/date */
    @GetMapping("/available")
    public Object getAvailableRooms(@RequestParam String day, @RequestParam(required = false) String date) {
        List<Room> allRooms = roomRepository.findAll();
        Map<String, Object> availableRooms = new LinkedHashMap<>();
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");

        for (Room room : allRooms) {
            // normalized (minutes-since-midnight) booked ranges, for the overlap check only
            List<int[]> bookedRanges = new ArrayList<>();
            for (ScheduleEntry sch : room.getSchedule()) {
                if (!day.equals(sch.getDay()))
                    continue;

                boolean include;
                if ("default".equals(sch.getApprovalStatus())) {
                    include = true; // recurring/default slot always counts
                } else {
                    if (date == null || sch.getDate() == null) {
                        include = false;
                    } else {
                        String entryDateStr = sdf.format(sch.getDate());
                        include = entryDateStr.equals(date);
                    }
                }

                if (include) {
                    bookedRanges.add(new int[] { normalizeTime(sch.getStartTime()), normalizeTime(sch.getEndTime()) });
                }
            }

            List<Map<String, String>> availableSlots = new ArrayList<>();
            for (int i = 0; i < TIME_SLOTS.size() - 1; i++) {
                String slotStart = TIME_SLOTS.get(i);
                String slotEnd = TIME_SLOTS.get(i + 1);
                int normStart = normalizeTime(slotStart);
                int normEnd = normalizeTime(slotEnd);

                boolean isBooked = false;
                for (int[] booking : bookedRanges) {
                    if (Math.max(normStart, booking[0]) < Math.min(normEnd, booking[1])) {
                        isBooked = true;
                        break;
                    }
                }

                if (!isBooked) {
                    Map<String, String> slot = new LinkedHashMap<>();
                    slot.put("startTime", slotStart);
                    slot.put("endTime", slotEnd);
                    availableSlots.add(slot);
                }
            }

            Map<String, Object> roomInfo = new LinkedHashMap<>();
            roomInfo.put("type", room.getType());
            roomInfo.put("capacity", room.getCapacity());
            roomInfo.put("availableSlots", availableSlots);
            availableRooms.put(room.getName(), roomInfo);
        }

        return availableRooms;
    }

    // Converts "08:00", "04:00 PM", "05:30" (implicit-PM afternoon convention),
    // etc.
    // into minutes-since-midnight, mirroring the Node normalizeTime() helper
    // exactly.
    private int normalizeTime(String timeStr) {
        if (timeStr == null || timeStr.isBlank())
            return 0;
        String[] parts = timeStr.trim().split(" ");
        String timePart = parts[0];
        String[] hm = timePart.split(":");
        int hours = Integer.parseInt(hm[0]);
        int minutes = hm.length > 1 ? Integer.parseInt(hm[1]) : 0;
        String period = parts.length > 1 ? parts[1] : null;

        int hour24 = hours;
        if (period != null) {
            if (period.equalsIgnoreCase("PM") && hours != 12)
                hour24 = hours + 12;
            else if (period.equalsIgnoreCase("AM") && hours == 12)
                hour24 = 0;
        } else {
            if (hours >= 1 && hours <= 7 && hours != 12)
                hour24 = hours + 12;
            else if (hours == 12)
                hour24 = 12;
        }
        return hour24 * 60 + minutes;
    }

    /** 📌 Weekly availability for a single room */
    @GetMapping("/{roomName}/available-week")
    public Object availableWeek(@PathVariable String roomName) {
        Optional<Room> roomOpt = roomRepository.findByName(roomName);
        if (roomOpt.isEmpty())
            return notFound("Room not found");
        Room room = roomOpt.get();

        Map<String, Object> availableWeekSchedule = new LinkedHashMap<>();
        for (String day : WEEK_DAYS) {
            List<ScheduleEntry> bookedSlots = new ArrayList<>();
            for (ScheduleEntry sch : room.getSchedule()) {
                if (day.equals(sch.getDay()))
                    bookedSlots.add(sch);
            }

            List<Map<String, String>> availableSlots = new ArrayList<>();
            for (int i = 0; i < TIME_SLOTS.size() - 1; i++) {
                String slotStart = TIME_SLOTS.get(i);
                String slotEnd = TIME_SLOTS.get(i + 1);
                boolean isBooked = false;
                for (ScheduleEntry b : bookedSlots) {
                    if (b.getStartTime() != null && b.getEndTime() != null
                            && b.getStartTime().compareTo(slotEnd) < 0
                            && b.getEndTime().compareTo(slotStart) > 0) {
                        isBooked = true;
                        break;
                    }
                }
                if (!isBooked) {
                    Map<String, String> slot = new LinkedHashMap<>();
                    slot.put("startTime", slotStart);
                    slot.put("endTime", slotEnd);
                    availableSlots.add(slot);
                }
            }
            availableWeekSchedule.put(day, availableSlots);
        }

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("roomName", roomName);
        res.put("availableWeekSchedule", availableWeekSchedule);
        return res;
    }

    /**
     * 📌 Add or Update a Timetable Entry for a Room (used by the bulk Excel
     * importer)
     */
    @SuppressWarnings("unchecked")
    @PostMapping("/add")
    public Object addTimetableEntry(@RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String day = (String) body.get("day");
        String startTime = (String) body.get("startTime");
        String endTime = (String) body.get("endTime");
        Object facultyRaw = body.get("faculty");
        String subject = (String) body.get("subject");
        Object capacityRaw = body.get("capacity");
        String type = (String) body.get("type");
        Map<String, Object> classMap = (Map<String, Object>) body.get("class");

        if (name == null || day == null || startTime == null || endTime == null
                || facultyRaw == null || subject == null || capacityRaw == null || type == null) {
            return ResponseEntity.status(400).body(Map.of("error", "All fields are required"));
        }

        List<String> facultyList = toStringList(facultyRaw);

        Room room = roomRepository.findByName(name).orElseGet(() -> {
            Room r = new Room();
            r.setName(name);
            r.setType(type);
            r.setCapacity(parseIntSafe(capacityRaw));
            r.setLocation("N/A");
            return r;
        });

        // NOTE: intentionally no conflict check here. The Node version's equivalent
        // check had a find()/findOne() bug that made it a no-op in practice, and the
        // bulk Excel importer relies on being able to add multiple schedule entries
        // for the same room/day/time slot (e.g. several divisions sharing a period).
        // Real overlap prevention for actual bookings happens in BookingController.

        ScheduleEntry entry = new ScheduleEntry();
        entry.setId(new ObjectId().toHexString());
        entry.setDay(day);
        entry.setStartTime(startTime);
        entry.setEndTime(endTime);
        entry.setFaculty(facultyList);
        entry.setSubject(subject);
        entry.setApprovalStatus("default");
        entry.setClassInfo(classInfoFrom(classMap));
        room.getSchedule().add(entry);
        roomRepository.save(room);

        return ResponseEntity.status(201).body(Map.of("message", "Timetable entry added successfully!"));
    }

    /** 📌 Update a Timetable Entry (Subject & Faculty) */
    @SuppressWarnings("unchecked")
    @PutMapping("/{roomName}/schedule/{entryId}")
    public Object updateScheduleEntry(@PathVariable String roomName, @PathVariable String entryId,
            @RequestBody Map<String, Object> body, HttpServletRequest request) {
        AuthUser authUser = AuthUtil.requireAuth(request);
        AuthUtil.requireRole(authUser, "Admin", "Lab Assistant");

        String subject = (String) body.get("subject");
        Object facultyRaw = body.get("faculty");
        Map<String, Object> classMap = (Map<String, Object>) body.get("class");

        if (subject == null || facultyRaw == null) {
            return ResponseEntity.status(400).body(Map.of("error", "Both subject and faculty are required."));
        }

        Optional<Room> roomOpt = roomRepository.findByName(roomName);
        if (roomOpt.isEmpty())
            return notFound("Room or schedule entry not found.");
        Room room = roomOpt.get();

        List<String> facultyList = toStringList(facultyRaw);

        boolean found = false;
        for (ScheduleEntry entry : room.getSchedule()) {
            if (entryId.equals(entry.getId())) {
                entry.setSubject(subject);
                entry.setFaculty(facultyList);
                if (classMap != null)
                    entry.setClassInfo(classInfoFrom(classMap));
                found = true;
                break;
            }
        }
        if (!found)
            return notFound("Room or schedule entry not found.");
        roomRepository.save(room);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("message", "Timetable entry updated successfully!");
        res.put("room", room);
        return res;
    }

    /** 📌 Delete a Timetable Entry */
    @DeleteMapping("/{roomName}/schedule/{entryId}")
    public Object deleteScheduleEntry(@PathVariable String roomName, @PathVariable String entryId,
            HttpServletRequest request) {
        AuthUser authUser = AuthUtil.requireAuth(request);
        AuthUtil.requireRole(authUser, "Admin", "Lab Assistant");

        Optional<Room> roomOpt = roomRepository.findByName(roomName);
        if (roomOpt.isEmpty())
            return notFound("Room or schedule entry not found.");
        Room room = roomOpt.get();

        boolean removed = room.getSchedule().removeIf(entry -> entryId.equals(entry.getId()));
        if (!removed)
            return notFound("Room or schedule entry not found.");
        roomRepository.save(room);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("message", "Timetable entry deleted successfully!");
        res.put("room", room);
        return res;
    }

    /** 📌 Delete a room and all its schedule entries */
    @DeleteMapping("/{roomName}")
    public Object deleteRoom(@PathVariable String roomName, HttpServletRequest request) {
        AuthUser authUser = AuthUtil.requireAuth(request);
        AuthUtil.requireRole(authUser, "Admin", "Lab Assistant");

        Optional<Room> roomOpt = roomRepository.findByName(roomName);
        if (roomOpt.isEmpty())
            return ResponseEntity.status(404).body(Map.of("message", "Room not found"));
        roomRepository.delete(roomOpt.get());

        return Map.of("message", "Room and all its schedule entries deleted successfully");
    }

    // ---- helpers ----

    private ClassInfo classInfoFrom(Map<String, Object> classMap) {
        String year = classMap != null && classMap.get("year") != null ? classMap.get("year").toString() : "";
        String division = classMap != null && classMap.get("division") != null ? classMap.get("division").toString()
                : "";
        return new ClassInfo(year, division);
    }

    private List<String> toStringList(Object raw) {
        List<String> list = new ArrayList<>();
        if (raw instanceof List<?> l) {
            for (Object o : l)
                list.add(String.valueOf(o));
        } else if (raw != null) {
            list.add(String.valueOf(raw));
        }
        return list;
    }

    private Integer parseIntSafe(Object raw) {
        try {
            return Integer.parseInt(String.valueOf(raw));
        } catch (Exception e) {
            return 0;
        }
    }

    private ResponseEntity<Map<String, String>> notFound(String message) {
        return ResponseEntity.status(404).body(Map.of("error", message));
    }
}