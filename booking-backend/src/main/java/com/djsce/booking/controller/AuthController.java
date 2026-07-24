package com.djsce.booking.controller;

import com.djsce.booking.model.Faculty;
import com.djsce.booking.model.User;
import com.djsce.booking.repository.FacultyRepository;
import com.djsce.booking.repository.UserRepository;
import com.djsce.booking.security.AuthUser;
import com.djsce.booking.security.AuthUtil;
import com.djsce.booking.security.JwtUtil;
import com.djsce.booking.service.EmailService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.util.*;

/**
 * Equivalent of backend/routes/auth.js
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final List<String> VALID_ROLES = List.of("Teacher", "Lab Assistant", "HOD", "Admin");

    private final UserRepository userRepository;
    private final FacultyRepository facultyRepository;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;

    public AuthController(UserRepository userRepository, FacultyRepository facultyRepository,
                           JwtUtil jwtUtil, EmailService emailService) {
        this.userRepository = userRepository;
        this.facultyRepository = facultyRepository;
        this.jwtUtil = jwtUtil;
        this.emailService = emailService;
    }

    // ✅ Register
    @PostMapping("/register")
    public Object register(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        String email = body.get("email");
        String password = body.get("password");
        if (name == null || email == null || password == null) {
            return error(400, "All fields are required");
        }

        Optional<Faculty> facultyOpt = facultyRepository.findByName(name);
        if (facultyOpt.isEmpty()) {
            return error(403, "You are not authorized to register.");
        }

        if (userRepository.findByEmail(email).isPresent()) {
            return error(400, "User already exists");
        }

        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPassword(BCrypt.hashpw(password, BCrypt.gensalt(10)));
        user.setRole(facultyOpt.get().getRole());
        userRepository.save(user);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("message", "User registered successfully");
        res.put("role", facultyOpt.get().getRole());
        return ResponseEntity.status(201).body(res);
    }

    // ✅ Login
    @PostMapping("/login")
    public Object login(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String password = body.get("password");

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) return error(400, "User not found");
        User user = userOpt.get();

        if (!BCrypt.checkpw(password, user.getPassword())) return error(400, "Invalid credentials");

        String token = jwtUtil.generateToken(user.getId(), user.getRole(), user.getName(), user.getEmail());

        Map<String, Object> userInfo = new LinkedHashMap<>();
        userInfo.put("name", user.getName());
        userInfo.put("email", user.getEmail());
        userInfo.put("role", user.getRole());

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("message", "Login successful");
        res.put("token", token);
        res.put("user", userInfo);
        return res;
    }

    // ✅ Add Faculty (HOD only)
    @PostMapping("/add-faculty")
    public Object addFaculty(@RequestBody Map<String, String> body, HttpServletRequest request) {
        AuthUser authUser = AuthUtil.requireAuth(request);
        if (!"HOD".equals(authUser.getRole())) return error(403, "Only HOD can add faculty members");

        String name = body.get("name");
        String role = body.get("role");
        if (name == null || name.isBlank()) return error(400, "Faculty name is required");
        if (facultyRepository.findByName(name).isPresent()) return error(400, "Faculty already exists");

        Faculty faculty = new Faculty(name, VALID_ROLES.contains(role) ? role : "Teacher");
        facultyRepository.save(faculty);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("message", "Faculty added successfully");
        res.put("faculty", faculty);
        return ResponseEntity.status(201).body(res);
    }

    // ✅ Remove Faculty (HOD only)
    @DeleteMapping("/remove-faculty")
    public Object removeFaculty(@RequestBody Map<String, String> body, HttpServletRequest request) {
        AuthUser authUser = AuthUtil.requireAuth(request);
        if (!"HOD".equals(authUser.getRole())) return error(403, "Only HOD can remove faculty members");

        String name = body.get("name");
        Optional<Faculty> facultyOpt = facultyRepository.findByName(name);
        if (facultyOpt.isEmpty()) return error(404, "Faculty member not found");
        if ("HOD".equals(facultyOpt.get().getRole())) return error(403, "Cannot remove HOD from faculty list");

        facultyRepository.deleteByName(name);
        userRepository.deleteByName(name); // optional: remove user login if exists

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("message", "Faculty removed successfully");
        res.put("facultyName", name);
        return res;
    }

    // ✅ Update Faculty (HOD only)
    @PutMapping("/update-faculty")
    public Object updateFaculty(@RequestBody Map<String, String> body, HttpServletRequest request) {
        AuthUser authUser = AuthUtil.requireAuth(request);
        if (!"HOD".equals(authUser.getRole())) return error(403, "Only HOD can update faculty members");

        String oldName = body.get("oldName");
        String newName = body.get("newName");
        String role = body.get("role");

        Optional<Faculty> facultyOpt = facultyRepository.findByName(oldName);
        if (facultyOpt.isEmpty()) return error(404, "Faculty member not found");
        Faculty faculty = facultyOpt.get();

        if ("HOD".equals(faculty.getRole()) && !"HOD".equals(role)) return error(403, "Cannot change HOD's role");

        if (newName != null && !newName.isBlank() && !newName.equals(oldName)) {
            if (facultyRepository.findByName(newName).isPresent()) return error(400, "Faculty with this name already exists");
        }

        String finalName = (newName != null && !newName.isBlank()) ? newName : oldName;
        faculty.setName(finalName);
        faculty.setRole(VALID_ROLES.contains(role) ? role : faculty.getRole());
        facultyRepository.save(faculty);

        Optional<User> userOpt = userRepository.findByName(oldName);
        userOpt.ifPresent(u -> {
            u.setName(finalName);
            u.setRole(faculty.getRole());
            userRepository.save(u);
        });

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("message", "Faculty updated successfully");
        res.put("faculty", faculty);
        return res;
    }

    // ✅ Get All Faculty (optional auth for HOD flag)
    @GetMapping("/faculty-list")
    public Object facultyList(HttpServletRequest request) {
        AuthUser authUser = AuthUtil.optionalAuth(request);
        boolean isHodRequest = authUser != null && "HOD".equals(authUser.getRole());

        List<Faculty> facultyList = facultyRepository.findAll();
        Set<String> registeredNames = new HashSet<>();
        for (User u : userRepository.findAll()) registeredNames.add(u.getName());

        List<Map<String, Object>> result = new ArrayList<>();
        for (Faculty f : facultyList) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("name", f.getName());
            m.put("role", f.getRole());
            m.put("isRegistered", isHodRequest ? registeredNames.contains(f.getName()) : null);
            result.add(m);
        }

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("facultyList", result);
        return res;
    }

    // ✅ Forgot Password - Request Password Reset
    @PostMapping("/forgot-password")
    public Object forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null) return error(400, "Email is required");

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) return error(404, "User not found with this email");
        User user = userOpt.get();

        String resetToken = generateHexToken(32);
        user.setResetPasswordToken(resetToken);
        user.setResetPasswordExpires(new Date(System.currentTimeMillis() + 3600000));
        userRepository.save(user);

        try {
            emailService.sendPasswordResetEmail(email, resetToken, user.getName());
        } catch (Exception e) {
            return error(500, "Failed to send password reset email. Please try again later.");
        }

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("message", "Password reset link has been sent to your email address");
        res.put("expiresIn", "1 hour");
        return res;
    }

    // ✅ Reset Password - Set New Password
    @PostMapping("/reset-password")
    public Object resetPassword(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        String newPassword = body.get("newPassword");
        if (token == null || newPassword == null) return error(400, "Token and new password are required");
        if (newPassword.length() < 6) return error(400, "Password must be at least 6 characters long");

        Optional<User> userOpt = userRepository.findByResetPasswordToken(token);
        if (userOpt.isEmpty()
                || userOpt.get().getResetPasswordExpires() == null
                || userOpt.get().getResetPasswordExpires().before(new Date())) {
            return error(400, "Invalid or expired reset token");
        }

        User user = userOpt.get();
        user.setPassword(BCrypt.hashpw(newPassword, BCrypt.gensalt(10)));
        user.setResetPasswordToken(null);
        user.setResetPasswordExpires(null);
        userRepository.save(user);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("message", "Password reset successfully");
        return res;
    }

    // ✅ Change Password (for logged-in users)
    @PostMapping("/change-password")
    public Object changePassword(@RequestBody Map<String, String> body, HttpServletRequest request) {
        AuthUser authUser = AuthUtil.requireAuth(request);
        String currentPassword = body.get("currentPassword");
        String newPassword = body.get("newPassword");
        if (currentPassword == null || newPassword == null) return error(400, "Current password and new password are required");
        if (newPassword.length() < 6) return error(400, "New password must be at least 6 characters long");

        Optional<User> userOpt = userRepository.findById(authUser.getId());
        if (userOpt.isEmpty()) return error(404, "User not found");
        User user = userOpt.get();

        if (!BCrypt.checkpw(currentPassword, user.getPassword())) return error(400, "Current password is incorrect");

        user.setPassword(BCrypt.hashpw(newPassword, BCrypt.gensalt(10)));
        userRepository.save(user);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("message", "Password changed successfully");
        return res;
    }

    private String generateHexToken(int numBytes) {
        byte[] bytes = new byte[numBytes];
        new SecureRandom().nextBytes(bytes);
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    private ResponseEntity<Map<String, String>> error(int status, String message) {
        return ResponseEntity.status(status).body(Map.of("error", message));
    }
}
