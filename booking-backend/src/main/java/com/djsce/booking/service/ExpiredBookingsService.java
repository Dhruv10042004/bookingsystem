package com.djsce.booking.service;

import com.djsce.booking.model.Booking;
import com.djsce.booking.model.Room;
import com.djsce.booking.repository.BookingRepository;
import com.djsce.booking.repository.RoomRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Equivalent of backend/utils/removeExpiredBookings.js. The Node version was
 * only ever called manually / ad-hoc; here it's wired up as an hourly
 * scheduled job so expired bookings and their room-schedule slots get
 * cleaned up automatically.
 */
@Service
public class ExpiredBookingsService {

    private static final List<String> ACTIVE_STATUSES = List.of("pendingApproval", "approved", "granted");

    private final BookingRepository bookingRepository;
    private final RoomRepository roomRepository;

    public ExpiredBookingsService(BookingRepository bookingRepository, RoomRepository roomRepository) {
        this.bookingRepository = bookingRepository;
        this.roomRepository = roomRepository;
    }

    @Scheduled(cron = "0 0 * * * *") // once per hour
    public void removeExpiredBookings() {
        String todayStr = LocalDate.now().toString(); // yyyy-MM-dd
        List<Booking> expired = bookingRepository.findByDateLessThan(todayStr);
        if (expired.isEmpty()) {
            System.out.println("✅ No expired bookings found.");
            return;
        }

        System.out.println("🚨 Found " + expired.size() + " expired bookings to clean up.");
        int cleanupCount = 0;
        for (Booking booking : expired) {
            try {
                Optional<Room> roomOpt = roomRepository.findByName(booking.getClassroom());
                if (roomOpt.isPresent() && booking.getTimeSlot() != null) {
                    Room room = roomOpt.get();
                    String[] times = booking.getTimeSlot().split("-");
                    boolean removed = room.getSchedule().removeIf(entry ->
                            entry.getDay() != null && entry.getDay().equals(booking.getDay())
                                    && entry.getStartTime() != null && entry.getStartTime().equals(times[0])
                                    && (times.length < 2 || (entry.getEndTime() != null && entry.getEndTime().equals(times[1])))
                                    && entry.getApprovalStatus() != null
                                    && ACTIVE_STATUSES.contains(entry.getApprovalStatus())
                    );
                    if (removed) {
                        roomRepository.save(room);
                        System.out.println("🧹 Removed expired booking slot from room " + room.getName());
                    }
                }
                bookingRepository.deleteById(booking.getId());
                cleanupCount++;
            } catch (Exception e) {
                System.err.println("Error processing expired booking " + booking.getId() + ": " + e.getMessage());
            }
        }
        System.out.println("🗑️ Successfully removed " + cleanupCount + " expired bookings!");
    }
}
