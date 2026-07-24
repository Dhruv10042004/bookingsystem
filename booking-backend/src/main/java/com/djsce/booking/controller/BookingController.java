package com.djsce.booking.controller;

import com.djsce.booking.model.Booking;
import com.djsce.booking.model.ClassInfo;
import com.djsce.booking.model.Room;
import com.djsce.booking.model.ScheduleEntry;
import com.djsce.booking.model.User;
import com.djsce.booking.repository.BookingRepository;
import com.djsce.booking.repository.RoomRepository;
import com.djsce.booking.repository.UserRepository;
import com.djsce.booking.security.AuthUser;
import com.djsce.booking.security.AuthUtil;
import com.djsce.booking.service.EmailService;
import jakarta.servlet.http.HttpServletRequest;
import org.bson.types.ObjectId;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.util.*;

/**
 * Equivalent of backend/routes/bookings.js
 */
@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingRepository bookingRepository;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    public BookingController(BookingRepository bookingRepository, RoomRepository roomRepository,
                              UserRepository userRepository, EmailService emailService) {
        this.bookingRepository = bookingRepository;
        this.roomRepository = roomRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
    }

    // 📌 TEST EMAIL ROUTE (for debugging)
    @GetMapping("/test-email")
    public Object testEmail(HttpServletRequest request) {
        AuthUser authUser = AuthUtil.requireAuth(request);
        AuthUtil.requireRole(authUser, "Admin", "HOD");

        String testEmail = authUser.getEmail();
        String message = "<div style=\"font-family: Arial, sans-serif; padding: 20px;\">"
                + "<h2>Email Configuration Test</h2>"
                + "<p>This is a test email to verify your SMTP configuration.</p>"
                + "<p><strong>Time:</strong> " + new Date() + "</p>"
                + "<p>If you received this, your email system is working correctly!</p></div>";

        emailService.sendHtmlEmail(testEmail, "Test Email - Room Booking System", message);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("success", true);
        res.put("message", "Email test passed!");
        return res;
    }

    // 📌 Teacher Requests a Booking
    @SuppressWarnings("unchecked")
    @PostMapping
    public Object createBooking(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        AuthUser authUser = AuthUtil.requireAuth(request);
        try {
            String roomId = (String) body.get("roomId");
            String date = body.get("date") != null ? body.get("date").toString() : null;
            String day = (String) body.get("day");
            String timeSlot = (String) body.get("timeSlot");
            String purpose = (String) body.get("purpose");
            String subject = (String) body.get("subject");
            String faculty = body.get("faculty") != null ? body.get("faculty").toString() : null;
            Map<String, Object> classInfoMap = (Map<String, Object>) body.get("class");

            if (date != null) {
                LocalDate bookingDate = parseFlexibleDate(date);
                LocalDate today = LocalDate.now();
                if (!bookingDate.isAfter(today)) {
                    return badRequest("Booking date cannot be in the past.");
                }
            }

            List<Booking> existing = bookingRepository.findByClassroomAndDateAndTimeSlot(roomId, date, timeSlot);
            for (Booking eb : existing) {
                if (!"Rejected".equals(eb.getStatus())) {
                    return badRequest("This time slot is already booked.");
                }
            }

            Booking booking = new Booking();
            booking.setTeacher(authUser.getId());
            booking.setClassroom(roomId);
            booking.setDate(date);
            booking.setDay(day);
            booking.setTimeSlot(timeSlot);
            booking.setPurpose(purpose);
            booking.setStatus("Pending");
            booking.setHodStatus("Pending");
            bookingRepository.save(booking);

            Optional<Room> roomOpt = roomRepository.findByName(roomId);
            if (roomOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "Room not found"));
            }
            Room room = roomOpt.get();
            String[] times = timeSlot.split("-");

            ScheduleEntry entry = new ScheduleEntry();
            entry.setId(new ObjectId().toHexString());
            entry.setDay(day);
            entry.setStartTime(times[0]);
            entry.setEndTime(times.length > 1 ? times[1] : "");
            entry.setSubject(subject != null ? subject : "Pending Approval");
            entry.setFaculty(List.of(faculty != null ? faculty : authUser.getName()));
            entry.setClassInfo(new ClassInfo(
                    classInfoMap != null && classInfoMap.get("year") != null ? classInfoMap.get("year").toString() : "",
                    classInfoMap != null && classInfoMap.get("division") != null ? classInfoMap.get("division").toString() : ""
            ));
            entry.setApprovalStatus("pendingApproval");
            entry.setDate(parseDateFlexible(date));
            room.getSchedule().add(entry);
            roomRepository.save(room);

            // fire-and-forget admin notification email, same as sendEmailAsync in bookings.js
            final String finalRoomId = roomId;
            final String finalDate = date;
            final String finalTimeSlot = timeSlot;
            final String finalPurpose = purpose;
            new Thread(() -> {
                try {
                    List<String> adminEmails = getAdminEmails();
                    if (!adminEmails.isEmpty()) {
                        String emailMsg = "<div style=\"font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px; max-width: 600px;\">"
                                + "<h2 style=\"color: #2c3e50;\">New Booking Request Requires Approval</h2>"
                                + "<p><strong>Teacher:</strong> " + authUser.getName() + " (" + authUser.getEmail() + ")</p>"
                                + "<p><strong>Room:</strong> " + finalRoomId + "</p>"
                                + "<p><strong>Date:</strong> " + finalDate + "</p>"
                                + "<p><strong>Time Slot:</strong> " + finalTimeSlot + "</p>"
                                + "<p><strong>Purpose:</strong> " + finalPurpose + "</p></div>";
                        emailService.sendHtmlEmail(adminEmails, "New Booking Request Requires Approval", emailMsg);
                    }
                } catch (Exception ex) {
                    System.err.println("⚠️ Error sending admin notification: " + ex.getMessage());
                }
            }).start();

            Map<String, Object> res = new LinkedHashMap<>();
            res.put("message", "Booking request submitted!");
            res.put("booking", bookingDto(booking));
            return ResponseEntity.status(201).body(res);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Server error while processing booking."));
        }
    }

    // 📌 Get All Bookings
    @GetMapping
    public Object getAllBookings(HttpServletRequest request) {
        AuthUser authUser = AuthUtil.requireAuth(request);
        AuthUtil.requireRole(authUser, "Admin", "HOD");

        List<Map<String, Object>> result = new ArrayList<>();
        for (Booking b : bookingRepository.findAll()) result.add(bookingDto(b));
        return result;
    }

    // 📌 Admin Approves Booking
    @PutMapping("/admin/approve/{id}")
    public Object adminApprove(@PathVariable String id, HttpServletRequest request) {
        AuthUser authUser = AuthUtil.requireAuth(request);
        AuthUtil.requireRole(authUser, "Admin");

        Optional<Booking> bookingOpt = bookingRepository.findById(id);
        if (bookingOpt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "Booking not found"));
        Booking booking = bookingOpt.get();
        if (!"Pending".equals(booking.getStatus())) return badRequest("Booking already processed");

        updateRoomScheduleSubjectAndStatus(booking, "Approved by Admin", "approved");

        booking.setStatus("Approved by Admin");
        booking.setHodStatus("Pending");
        bookingRepository.save(booking);

        User teacher = userRepository.findById(booking.getTeacher()).orElse(null);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("message", "Booking approved by admin");
        res.put("booking", bookingDto(booking));

        new Thread(() -> {
            try {
                List<String> hodEmails = new ArrayList<>();
                for (User h : userRepository.findByRole("HOD")) hodEmails.add(h.getEmail());
                if (!hodEmails.isEmpty()) {
                    String msg = "<div style=\"font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px; max-width: 600px;\">"
                            + "<h2 style=\"color: #2c3e50;\">Booking Approved by Admin - Needs HOD Approval</h2>"
                            + "<p><strong>Teacher:</strong> " + (teacher != null ? teacher.getName() + " (" + teacher.getEmail() + ")" : "") + "</p>"
                            + "<p><strong>Room:</strong> " + booking.getClassroom() + "</p>"
                            + "<p><strong>Time Slot:</strong> " + booking.getTimeSlot() + "</p>"
                            + "<p><strong>Purpose:</strong> " + booking.getPurpose() + "</p></div>";
                    emailService.sendHtmlEmail(hodEmails, "Booking Approved by Admin - HOD Approval Required", msg);
                }
                if (teacher != null) {
                    String msg2 = "<div style=\"font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px; max-width: 600px;\">"
                            + "<h2 style=\"color: #27ae60;\">Your Booking Request Approved by Admin</h2>"
                            + "<p><strong>Room:</strong> " + booking.getClassroom() + "</p>"
                            + "<p><strong>Time Slot:</strong> " + booking.getTimeSlot() + "</p>"
                            + "<p><strong>Purpose:</strong> " + booking.getPurpose() + "</p>"
                            + "<p><strong>Status:</strong> Approved by Admin, Awaiting HOD Approval</p></div>";
                    emailService.sendHtmlEmail(teacher.getEmail(), "Your Booking Request Approved by Admin", msg2);
                }
            } catch (Exception ex) {
                System.err.println("⚠️ Error sending emails: " + ex.getMessage());
            }
        }).start();

        return res;
    }

    // 📌 Admin Rejects Booking
    @PutMapping("/admin/reject/{id}")
    public Object adminReject(@PathVariable String id, HttpServletRequest request) {
        AuthUser authUser = AuthUtil.requireAuth(request);
        AuthUtil.requireRole(authUser, "Admin");

        Optional<Booking> bookingOpt = bookingRepository.findById(id);
        if (bookingOpt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "Booking not found"));
        Booking booking = bookingOpt.get();
        if (!"Pending".equals(booking.getStatus())) return badRequest("Booking already processed");

        removeRoomScheduleEntry(booking);

        booking.setStatus("Rejected");
        booking.setHodStatus("N/A");
        bookingRepository.save(booking);

        User teacher = userRepository.findById(booking.getTeacher()).orElse(null);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("message", "Booking rejected by admin");
        res.put("booking", bookingDto(booking));

        if (teacher != null) {
            new Thread(() -> {
                String msg = "<div style=\"font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px; max-width: 600px;\">"
                        + "<h2 style=\"color: #e74c3c;\">Your Booking Request Has Been Rejected</h2>"
                        + "<p><strong>Room:</strong> " + booking.getClassroom() + "</p>"
                        + "<p><strong>Time Slot:</strong> " + booking.getTimeSlot() + "</p>"
                        + "<p><strong>Purpose:</strong> " + booking.getPurpose() + "</p></div>";
                emailService.sendHtmlEmail(teacher.getEmail(), "Your Booking Request Has Been Rejected", msg);
            }).start();
        }

        return res;
    }

    // 📌 HOD Grants Booking
    @PutMapping("/hod/grant/{id}")
    public Object hodGrant(@PathVariable String id, HttpServletRequest request) {
        AuthUser authUser = AuthUtil.requireAuth(request);
        AuthUtil.requireRole(authUser, "HOD");

        Optional<Booking> bookingOpt = bookingRepository.findById(id);
        if (bookingOpt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "Booking not found"));
        Booking booking = bookingOpt.get();
        if (!"Approved by Admin".equals(booking.getStatus())) return badRequest("Booking must be approved by admin first");

        booking.setHodStatus("Granted");
        bookingRepository.save(booking);

        User teacher = userRepository.findById(booking.getTeacher()).orElse(null);
        updateRoomScheduleGrant(booking, teacher);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("message", "Booking granted by HOD");
        res.put("booking", bookingDto(booking));

        if (teacher != null) {
            new Thread(() -> {
                String msg = "<div style=\"font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px; max-width: 600px;\">"
                        + "<h2 style=\"color: #27ae60;\">Your Booking Has Been Granted</h2>"
                        + "<p><strong>Room:</strong> " + booking.getClassroom() + "</p>"
                        + "<p><strong>Time Slot:</strong> " + booking.getTimeSlot() + "</p>"
                        + "<p><strong>Purpose:</strong> " + booking.getPurpose() + "</p>"
                        + "<p><strong>Status:</strong> Granted</p></div>";
                emailService.sendHtmlEmail(teacher.getEmail(), "Your Booking Has Been Granted", msg);
            }).start();
        }

        return res;
    }

    // 📌 HOD Rejects Booking
    @PutMapping("/hod/reject/{id}")
    public Object hodReject(@PathVariable String id, HttpServletRequest request) {
        AuthUser authUser = AuthUtil.requireAuth(request);
        AuthUtil.requireRole(authUser, "HOD");

        Optional<Booking> bookingOpt = bookingRepository.findById(id);
        if (bookingOpt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "Booking not found"));
        Booking booking = bookingOpt.get();
        if (!"Approved by Admin".equals(booking.getStatus())) return badRequest("Booking must be approved by admin first");

        removeRoomScheduleEntry(booking);

        booking.setHodStatus("Rejected");
        bookingRepository.save(booking);

        User teacher = userRepository.findById(booking.getTeacher()).orElse(null);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("message", "Booking rejected by HOD");
        res.put("booking", bookingDto(booking));

        if (teacher != null) {
            new Thread(() -> {
                String msg = "<div style=\"font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px; max-width: 600px;\">"
                        + "<h2 style=\"color: #e74c3c;\">Your Booking Request Rejected by HOD</h2>"
                        + "<p><strong>Room:</strong> " + booking.getClassroom() + "</p>"
                        + "<p><strong>Time Slot:</strong> " + booking.getTimeSlot() + "</p>"
                        + "<p><strong>Purpose:</strong> " + booking.getPurpose() + "</p>"
                        + "<p><strong>Status:</strong> Rejected by HOD</p></div>";
                emailService.sendHtmlEmail(teacher.getEmail(), "Your Booking Request Has Been Rejected by HOD", msg);
            }).start();
        }

        return res;
    }

    // 📌 Get Bookings for a Teacher
    @GetMapping("/teacher")
    public Object teacherBookings(HttpServletRequest request) {
        AuthUser authUser = AuthUtil.requireAuth(request);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Booking b : bookingRepository.findByTeacher(authUser.getId())) result.add(bookingDto(b));
        return result;
    }

    // 📌 Delete All Bookings (HOD only)
    @DeleteMapping("/delete-all")
    public Object deleteAll(HttpServletRequest request) {
        AuthUser authUser = AuthUtil.requireAuth(request);
        AuthUtil.requireRole(authUser, "HOD");

        List<Booking> bookings = bookingRepository.findAll();
        for (Booking booking : bookings) {
            try {
                removeRoomScheduleEntry(booking);
            } catch (Exception ex) {
                System.err.println("Error processing room for booking " + booking.getId() + ": " + ex.getMessage());
            }
        }
        long count = bookings.size();
        bookingRepository.deleteAll();

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("message", "All bookings have been deleted successfully");
        res.put("deletedCount", count);
        return res;
    }

    // ---- shared helpers ----

    private Map<String, Object> teacherDto(User u) {
        if (u == null) return null;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("_id", u.getId());
        m.put("name", u.getName());
        m.put("email", u.getEmail());
        return m;
    }

    private Map<String, Object> bookingDto(Booking b) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("_id", b.getId());
        m.put("teacher", teacherDto(userRepository.findById(b.getTeacher()).orElse(null)));
        m.put("classroom", b.getClassroom());
        m.put("date", b.getDate());
        m.put("day", b.getDay());
        m.put("timeSlot", b.getTimeSlot());
        m.put("purpose", b.getPurpose());
        m.put("status", b.getStatus());
        m.put("hodStatus", b.getHodStatus());
        return m;
    }

    private List<String> getAdminEmails() {
        List<String> emails = new ArrayList<>();
        for (User u : userRepository.findByRole("Admin")) emails.add(u.getEmail());
        return emails;
    }

    private LocalDate parseFlexibleDate(String date) {
        try {
            return LocalDate.parse(date.length() >= 10 ? date.substring(0, 10) : date);
        } catch (Exception e) {
            return LocalDate.now();
        }
    }

    private Date parseDateFlexible(String date) {
        try {
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");
            return sdf.parse(date.length() >= 10 ? date.substring(0, 10) : date);
        } catch (Exception e) {
            return new Date();
        }
    }

    private boolean matchesBookingSlot(ScheduleEntry entry, Booking booking, String[] times) {
        if (!Objects.equals(entry.getDay(), booking.getDay())) return false;
        if (!Objects.equals(entry.getStartTime(), times[0])) return false;
        if (times.length > 1 && !Objects.equals(entry.getEndTime(), times[1])) return false;
        return true;
    }

    private void updateRoomScheduleSubjectAndStatus(Booking booking, String subject, String approvalStatus) {
        Optional<Room> roomOpt = roomRepository.findByName(booking.getClassroom());
        if (roomOpt.isEmpty() || booking.getTimeSlot() == null) return;
        Room room = roomOpt.get();
        String[] times = booking.getTimeSlot().split("-");
        for (ScheduleEntry entry : room.getSchedule()) {
            if (matchesBookingSlot(entry, booking, times)) {
                entry.setSubject(subject);
                entry.setApprovalStatus(approvalStatus);
            }
        }
        roomRepository.save(room);
    }

    private void updateRoomScheduleGrant(Booking booking, User teacher) {
        Optional<Room> roomOpt = roomRepository.findByName(booking.getClassroom());
        if (roomOpt.isEmpty() || booking.getTimeSlot() == null) return;
        Room room = roomOpt.get();
        String[] times = booking.getTimeSlot().split("-");
        for (ScheduleEntry entry : room.getSchedule()) {
            if (matchesBookingSlot(entry, booking, times)) {
                entry.setSubject(booking.getPurpose());
                entry.setFaculty(List.of(teacher != null ? teacher.getName() : ""));
                entry.setApprovalStatus("granted");
            }
        }
        roomRepository.save(room);
    }

    private void removeRoomScheduleEntry(Booking booking) {
        Optional<Room> roomOpt = roomRepository.findByName(booking.getClassroom());
        if (roomOpt.isEmpty() || booking.getTimeSlot() == null) return;
        Room room = roomOpt.get();
        String[] times = booking.getTimeSlot().split("-");
        room.getSchedule().removeIf(entry -> matchesBookingSlot(entry, booking, times));
        roomRepository.save(room);
    }

    private ResponseEntity<Map<String, String>> badRequest(String message) {
        return ResponseEntity.status(400).body(Map.of("error", message));
    }
}
