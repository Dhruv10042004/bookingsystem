package com.djsce.booking.repository;

import com.djsce.booking.model.Faculty;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface FacultyRepository extends MongoRepository<Faculty, String> {
    Optional<Faculty> findByName(String name);
    void deleteByName(String name);
}
