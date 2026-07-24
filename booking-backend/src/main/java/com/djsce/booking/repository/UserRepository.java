package com.djsce.booking.repository;

import com.djsce.booking.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);
    Optional<User> findByName(String name);
    Optional<User> findByResetPasswordToken(String token);
    List<User> findByRole(String role);
    void deleteByName(String name);
}
