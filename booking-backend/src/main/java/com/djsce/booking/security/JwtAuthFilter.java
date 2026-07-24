package com.djsce.booking.security;

import com.djsce.booking.model.User;
import com.djsce.booking.repository.UserRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

/**
 * Runs on every request. If a valid Bearer token is present, looks the user
 * up (mirroring the Node authenticateUser middleware, which re-fetches the
 * user from the DB on every request) and stashes an AuthUser on the request
 * as "authUser". Never blocks the request itself - individual controllers
 * decide (via AuthUtil) whether auth/role checks are required, exactly like
 * the Node routes mixed authenticateUser / optionalAuth / no middleware.
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    public JwtAuthFilter(JwtUtil jwtUtil, UserRepository userRepository) {
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                Claims claims = jwtUtil.parseToken(token);
                String userId = claims.get("id", String.class);
                if (userId == null) {
                    request.setAttribute("authError", "Access Denied. Invalid user data.");
                } else {
                    Optional<User> userOpt = userRepository.findById(userId);
                    if (userOpt.isPresent()) {
                        User u = userOpt.get();
                        request.setAttribute("authUser", new AuthUser(u.getId(), u.getRole(), u.getName(), u.getEmail()));
                    } else {
                        request.setAttribute("authError", "User not found.");
                    }
                }
            } catch (io.jsonwebtoken.ExpiredJwtException e) {
                request.setAttribute("authError", "Token expired. Please log in again.");
            } catch (Exception e) {
                request.setAttribute("authError", "Invalid token. Please log in again.");
            }
        }

        filterChain.doFilter(request, response);
    }
}
