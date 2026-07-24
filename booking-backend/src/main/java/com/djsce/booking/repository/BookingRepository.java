package com.djsce.booking.repository;

import com.djsce.booking.model.Booking;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface BookingRepository extends MongoRepository<Booking, String> {
    List<Booking> findByTeacher(String teacherId);
    List<Booking> findByClassroomAndDateAndTimeSlot(String classroom, String date, String timeSlot);
    // "yyyy-MM-dd" strings sort correctly lexicographically, just like Mongo's $lt on the Node model
    List<Booking> findByDateLessThan(String date);
}
