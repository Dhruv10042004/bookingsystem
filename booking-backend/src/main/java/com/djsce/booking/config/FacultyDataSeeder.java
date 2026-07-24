package com.djsce.booking.config;

import com.djsce.booking.model.Faculty;
import com.djsce.booking.repository.FacultyRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Equivalent of backend/seed/falcultySeed.js, but runs automatically and
 * idempotently on startup instead of as a one-off script: it only inserts
 * the default faculty list if the faculties collection is empty.
 */
@Component
public class FacultyDataSeeder implements CommandLineRunner {

    private final FacultyRepository facultyRepository;

    public FacultyDataSeeder(FacultyRepository facultyRepository) {
        this.facultyRepository = facultyRepository;
    }

    @Override
    public void run(String... args) {
        if (facultyRepository.count() > 0) return;

        List<Faculty> initial = List.of(
                new Faculty("Dr. Vinaya Sawant (VS)", "HOD"),
                new Faculty("Ms. Neha Katre (NK)", "Admin"),
                new Faculty("Prasad Sir", "Lab Assistant"),
                new Faculty("Dr. Abhijit Joshi (ARJ)", "Teacher"),
                new Faculty("Dr. Ram Mangrulkar (RM)", "Teacher"),
                new Faculty("Dr. Satishkumar Verma (SV)", "Teacher"),
                new Faculty("Dr. Monika Mangla (MM)", "Teacher"),
                new Faculty("Mr. Harshal Dalvi (HD)", "Teacher"),
                new Faculty("Mr. Arjun Jaiswal (AJ)", "Teacher"),
                new Faculty("Ms. Stevina Correia (SC)", "Teacher"),
                new Faculty("Ms. Prachi Satam (PS)", "Teacher"),
                new Faculty("Ms. Neha Agarwal (NA)", "Teacher"),
                new Faculty("Ms. Richa Sharma (RS)", "Teacher"),
                new Faculty("Ms. Sharvari Patil (SP)", "Teacher"),
                new Faculty("Ms. Sweedle Machado (SM)", "Teacher"),
                new Faculty("Ms. Priyanca Gonsalves (PG)", "Teacher"),
                new Faculty("Ms. Anushree Patkar (AP)", "Teacher"),
                new Faculty("Ms. Monali Sankhe (MS)", "Teacher"),
                new Faculty("Ms. Savyasaachi Pandit (SSP)", "Teacher"),
                new Faculty("Mr. Chandrashekhar Badgujar (CB)", "Teacher"),
                new Faculty("Ms. Leena Sahu (LS)", "Teacher"),
                new Faculty("Ms. Praniti Patil (PP)", "Teacher"),
                new Faculty("Ms. Shraddha More (SSM)", "Teacher"),
                new Faculty("Ms. Fahad Siddique (FS)", "Teacher"),
                new Faculty("Dr. Sanjay Deshmukh (SD)", "Teacher"),
                new Faculty("Mr. Pravin Hole (PH)", "Teacher"),
                new Faculty("Ms. Rupali Karande (RK)", "Teacher"),
                new Faculty("Mr. Vishal Shah (VJS)", "Teacher"),
                new Faculty("Ms. Swati (SW)", "Teacher"),
                new Faculty("Mr. Amaro Henrique (H)", "Teacher"),
                new Faculty("Ms. Sunita Ramchandran (SR)", "Teacher"),
                new Faculty("Mr. Suryakant Chaudhari (STC)", "Teacher"),
                new Faculty("Dr. Gayatri Pandya (GP)", "Teacher"),
                new Faculty("Dr. Naresh Afre (NAF)", "Teacher"),
                new Faculty("Ms. Prahelika Pai (PP)", "Teacher")
        );
        facultyRepository.saveAll(initial);
        System.out.println("✅ Faculty seeded successfully (" + initial.size() + " entries)");
    }
}
