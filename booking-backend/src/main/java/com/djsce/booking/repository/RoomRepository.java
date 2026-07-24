package com.djsce.booking.repository;

import com.djsce.booking.model.Room;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface RoomRepository extends MongoRepository<Room, String> {
    Optional<Room> findByName(String name);
    void deleteByName(String name);
}
