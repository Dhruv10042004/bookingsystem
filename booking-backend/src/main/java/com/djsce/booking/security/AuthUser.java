package com.djsce.booking.security;

/**
 * Populated onto the request by JwtAuthFilter, equivalent to req.user
 * in the Node authenticateUser / optionalAuth middleware.
 */
public class AuthUser {
    private final String id;
    private final String role;
    private final String name;
    private final String email;

    public AuthUser(String id, String role, String name, String email) {
        this.id = id;
        this.role = role;
        this.name = name;
        this.email = email;
    }

    public String getId() { return id; }
    public String getRole() { return role; }
    public String getName() { return name; }
    public String getEmail() { return email; }
}
