const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Faculty = require("../models/Falculty");

const initialFaculty = [
  { name: "Dr. Vinaya Sawant (VS)", role: "HOD" },
  { name: "Ms. Neha Katre (NK)", role: "Admin" },
  { name: "Prasad Sir", role: "Lab Assistant" },
  { name: "Dr. Abhijit Joshi (ARJ)", role: "Teacher" },
  { name: "Dr. Ram Mangulkar (RM)", role: "Teacher" },
  { name: "Dr. SatishKumar Verma (SV)", role: "Teacher" },
  { name: "Dr. Monika Mangla (MM)", role: "Teacher" },
  { name: "Mr. Harshal Dalvi (HD)", role: "Teacher" },
  { name: "Mr. Arjun Jaiswal (AJ)", role: "Teacher" },
  { name: "Ms. Stevina Coriea (SC)", role: "Teacher" },
  { name: "Ms. Prachi Satan (PS)", role: "Teacher" },
  { name: "Ms. Neha Agarwal (NA)", role: "Teacher" },
  { name: "Ms. Sharvari Patil (SP)", role: "Teacher" },
  { name: "Ms. Richa Sharma (RS)", role: "Teacher" },
  { name: "Ms. Sweedle Machado (SM)", role: "Teacher" },
  { name: "Ms. Priyanca Gonsalves (PG)", role: "Teacher" },
  { name: "Ms. Anushree Patkar (AP)", role: "Teacher" },
  { name: "Ms. Monali Sankhe (MS)", role: "Teacher" },
  { name: "Ms. Savyasachi Pandit (SSP)", role: "Teacher" },
  { name: "Mr. Chandrashekhar Badgujar (CB)", role: "Teacher" },
  { name: "Mr. Suryakant Chaudhari (STC)", role: "Teacher" },
  { name: "Dr. Gayatri Pandya (GP)", role: "Teacher" },
  { name: "Dr. Naresh Afre (NAF)", role: "Teacher" },
  { name: "Mr. Pravin Hole (PH)", role: "Teacher" },
  { name: "Ms. Leena Sahu (LS)", role: "Teacher" },
];

const runSeed = async () => {
  const mongoUri ="mongodb+srv://dhruvnariani207:wbcdhSPn0fD6bKL5@cluster0.0n4p0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"; // fallback

  try {
    console.log("Connecting to MongoDB:", mongoUri);
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    await Faculty.deleteMany({});
    await Faculty.insertMany(initialFaculty);
    console.log("✅ Faculty seeded successfully");
  } catch (err) {
    console.error("❌ Error seeding faculty:", err);
  } finally {
    await mongoose.disconnect();
  }
};

runSeed();
