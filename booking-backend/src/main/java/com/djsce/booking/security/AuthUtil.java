package com.djsce.booking.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.List;

/**
 * Helper used inside controllers to emulate the Node authenticateUser /
 * authorizeRole / optionalAuth middleware combinations.
 */
public final class AuthUtil {

    private AuthUtil() {}

    public static AuthUser requireAuth(HttpServletRequest request) {
        Object attr = request.getAttribute("authUser");
        if (attr == null) {
            String err = (String) request.getAttribute("authError");
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    err != null ? err : "Access Denied. No token provided.");
        }
        return (AuthUser) attr;
    }

    public static AuthUser optionalAuth(HttpServletRequest request) {
        Object attr = request.getAttribute("authUser");
        return attr != null ? (AuthUser) attr : null;
    }

    public static void requireRole(AuthUser user, String... roles) {
        List<String> allowed = Arrays.asList(roles);
        if (user.getRole() == null || !allowed.contains(user.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Access Denied. Only " + String.join(" / ", roles) + " allowed.");
        }
    }
}
