const facultyRoles = {
    "Dr. Vinaya Sawant (VS)": "hod",
    "Ms. Neha Katre (NK)": "admin"
  };
  
  const facultyNames = [
    "Dr. Vinaya Sawant (VS)", "Dr. Abhijit Joshi (ARJ)", "Dr. Ram Mangulkar (RM)",
    "Dr. SatishKumar Verma (SV)", "Dr. Monika Mangla (MM)", "Ms. Neha Katre (NK)",
    "Mr. Harshal Dalvi (HD)", "Mr. Arjun Jaiswal (AJ)", "Ms. Stevina Coriea (SC)",
    "Ms. Prachi Satan (PS)", "Ms. Neha Agarwal (NA)", "Ms. Sharvari Patil (SP)",
    "Ms. Richa Sharma (RS)", "Ms. Sweedle Machado (SM)", "Ms. Priyanca Gonsalves (PG)",
    "Ms. Anushree Patkar (AP)", "Ms. Monali Sankhe (MS)", "Ms. Savyasachi Pandit (SSP)",
    "Mr. Chandrashekhar Badgujar (CB)", "Mr. Suryakant Chaudhari (STC)", "Dr. Gayatri Pandya (GP)",
    "Dr. Naresh Afre (NAF)", "Mr. Pravin Hole (PH)", "Ms. Leena Sahu (LS)","Ms. Prahelika Pai (PP)"
  ];
  
  const getRole = (name) => facultyRoles[name] || "teacher";
  
  module.exports = { facultyNames, getRole };
  
  