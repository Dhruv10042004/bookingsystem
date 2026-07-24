package com.djsce.booking.service;

import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Equivalent of backend/utils/emailService.js (and friends) - sends the
 * same HTML notification/reset emails via SMTP, using Spring's JavaMailSender
 * (configured from spring.mail.* properties / EMAIL_USER / EMAIL_PASSWORD env vars).
 */
@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String emailUser;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendHtmlEmail(String to, String subject, String html) {
        sendHtmlEmail(List.of(to), subject, html);
    }

    public void sendHtmlEmail(List<String> to, String subject, String html) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom("\"DJSCE IT Department\" <" + emailUser + ">");
            helper.setTo(to.toArray(new String[0]));
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(message);
            System.out.println("✉️ Email sent to " + to);
        } catch (Exception e) {
            System.err.println("📮 Error sending email: " + e.getMessage());
        }
    }

    public void sendPasswordResetEmail(String email, String resetToken, String userName) {
        String resetLink = frontendUrl + "/reset-password?token=" + resetToken;
        String html = "<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;\">"
                + "<div style=\"background-color: #2c3e50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;\">"
                + "<h1 style=\"margin: 0; font-size: 24px;\">DJSCE IT Department</h1>"
                + "<p style=\"margin: 5px 0 0 0; font-size: 16px;\">Password Reset Request</p>"
                + "</div>"
                + "<div style=\"background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;\">"
                + "<h2 style=\"color: #2c3e50; margin-top: 0;\">Hello " + userName + ",</h2>"
                + "<p style=\"color: #555; line-height: 1.6; font-size: 16px;\">We received a request to reset your password for your DJSCE IT Department account.</p>"
                + "<p style=\"color: #555; line-height: 1.6; font-size: 16px;\">Click the button below to reset your password:</p>"
                + "<div style=\"text-align: center; margin: 30px 0;\">"
                + "<a href=\"" + resetLink + "\" style=\"background-color: #2c3e50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block;\">Reset Password</a>"
                + "</div>"
                + "<p style=\"color: #777; font-size: 14px; line-height: 1.5;\">If the button doesn't work, copy and paste this link into your browser:</p>"
                + "<p style=\"color: #2c3e50; font-size: 14px; word-break: break-all; background-color: #f0f0f0; padding: 10px; border-radius: 4px;\">" + resetLink + "</p>"
                + "<div style=\"background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0;\">"
                + "<p style=\"color: #856404; margin: 0; font-size: 14px;\"><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>"
                + "</div>"
                + "<p style=\"color: #777; font-size: 14px; line-height: 1.5;\">If you didn't request this password reset, please ignore this email.</p>"
                + "</div></div>";
        sendHtmlEmail(email, "Password Reset Request - DJSCE IT Department", html);
    }
}
