import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { TextField, Button, Typography, MenuItem } from "@mui/material";
import "./Registerpage.css";
import registerIllustration from '../assets/registerIllustration.png';
import Navbar from "../components/Navbar";
import axios from "axios";

function Register() {
  const [facultyList, setFacultyList] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const { register } = useAuth();
  const navigate = useNavigate();
  // const API=import.meta.env.REACT_APP_API_URL
  // ;
  // const API="https://bookingsystem-e4oz.onrender.com/api"
  const API="http://localhost:5000/api"
  console.log(API);
  useEffect(() => {
    const fetchFacultyList = async () => {
      axios
      .get(`${API}/auth/faculty-list`)
      .then((response) => {
        setFacultyList(response.data.facultyList);
      })
      .catch(error => console.error("Error fetching faculty list:", error));
    
    };

    fetchFacultyList();
  }, []);

  const handleNameChange = (event) => {
    const selectedName = event.target.value;
    setName(selectedName);
    const selectedFaculty = facultyList.find(f => f.name === selectedName);
    setRole(selectedFaculty?.role || "Teacher");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !email || !password) {
      setError("Please fill all fields.");
      return;
    }

    try {
      await register(name, email, password, role);
      navigate("/");
    } catch (err) {
      console.error(err);
      setError("Registration failed. Please try again.");
    }
  };

  return (
    <>
      <Navbar />
      <div className="register-container">
        <div className="register-form-container">
          <div className="form-header">
            <h2>DJSCE Feedback Portal</h2>
          </div>

          <div className="register-form-content">
            <div className="form-section">
              <h1>SIGN UP</h1>

              {error && (
                <Typography color="error" variant="body2" sx={{ mb: 2 }}>
                  {error}
                </Typography>
              )}

              <form onSubmit={handleSubmit} className="original-form">
                <TextField
                  select
                  label="Select Name"
                  fullWidth
                  margin="normal"
                  value={name}
                  onChange={handleNameChange}
                  className="styled-input"
                >
                  {facultyList.map((faculty, index) => (
                    <MenuItem key={index} value={faculty.name}>
                      {faculty.name}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Email"
                  fullWidth
                  margin="normal"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="styled-input"
                />

                <TextField
                  label="Password"
                  type="password"
                  fullWidth
                  margin="normal"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="styled-input"
                />

                <TextField
                  label="Role"
                  fullWidth
                  margin="normal"
                  value={role}
                  disabled
                  className="styled-input"
                />

                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  className="register-btn"
                  sx={{
                    backgroundColor: "#2c3e50",
                    color: "white",
                    padding: "12px",
                    marginTop: 2,
                    borderRadius: "4px",
                    textTransform: "none",
                    fontSize: "16px",
                    "&:hover": {
                      backgroundColor: "#1a2530",
                    },
                  }}
                >
                  Register
                </Button>
              </form>

              <div className="login-link">
                <Typography variant="body1">
                  Already have an account? <Link to="/login">Login</Link>
                </Typography>
              </div>
            </div>

            <div className="illustration">
              <img src={registerIllustration} alt="Person working at desk" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Register;
