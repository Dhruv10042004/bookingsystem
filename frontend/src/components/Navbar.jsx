import React from 'react';
import { AppBar, Toolbar, Box, Typography, Button, Menu, MenuItem } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useState } from 'react';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import LogoutIcon from '@mui/icons-material/Logout';
import LockIcon from '@mui/icons-material/Lock';
import { useAuth } from '../context/AuthContext'; // Update path as needed
import { Link } from 'react-router-dom';

// Import your logo
import Logo from '../assets/logo.png'; // Update this path

// Styled components
const NavbarContainer = styled(AppBar)(({ theme }) => ({
  backgroundColor: 'white',
  boxShadow: '0px 1px 5px rgba(0, 0, 0, 0.1)',
  position: 'sticky',
  top: 0,
  zIndex: 1000,
  width: "100vw",
}));

const LogoImage = styled('img')({
  height: 50,
  marginRight: 10,
});

const NavBorder = styled(Box)({
  width: '100%',
  height: '1px',
  backgroundColor: '#e0e0e0',
  position: 'absolute',
  bottom: 0,
});

const LogoText = styled(Typography)({
  color: '#2c3e50',
  fontWeight: 'bold',
  lineHeight: 1.2,
});

const SubText = styled(Typography)({
  color: '#2c3e50',
  lineHeight: 1.2,
});

const UserButton = styled(Button)(({ theme }) => ({
  backgroundColor: '#2c3e50',
  color: 'white',
  borderRadius: '4px',
  padding: '8px 16px',
  textTransform: 'none',
  '&:hover': {
    backgroundColor: '#1a252f',
  },
}));

const NavButton = styled(Button)({
  marginLeft: '10px',
  color: '#2c3e50',
});

const MenuButton = styled(Button)({
  color: '#2c3e50',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
});

const LogoutMenuItem = styled(MenuItem)({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
});

const Navbar = ({ title = "DJSCE IT Department" }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  
  // Use the auth context
  const { user, logout } = useAuth();
  const isLoggedIn = !!user;
  
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleLogout = () => {
    logout();
    handleClose();
  };

  // Get the username from the user object
  const username = user?.user?.name || user?.user?.email?.split('@')[0] || '';
  
  // Determine dashboard path based on user role
  let dashboardPath = '/';
  if (isLoggedIn) {
    const role = user.user.role;
    if (role === 'Teacher') {
      dashboardPath = '/teacher-dashboard';
    } else if (role === 'Admin') {
      dashboardPath = '/admin-dashboard';
    } else if (role === 'HOD') {
      dashboardPath = '/hod-dashboard';
    } else if (role === 'Lab Assistant') {
      dashboardPath = '/lab';
    }
  }

  return (
    <NavbarContainer>
      <Toolbar sx={{ padding: { xs: 1, md: 2 }, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <LogoImage src={Logo} alt="DJSCE Logo" />
          <Box>
            <LogoText variant="h6">
              {title}
            </LogoText>
            <SubText variant="subtitle2">
              INFORMATION TECHNOLOGY
            </SubText>
          </Box>
        </Box>
        
        {isLoggedIn ? (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Navigation Links Based on Role */}
            <Box sx={{ display: 'flex', mr: 2 }}>
              {/* Dashboard Link for non-Teacher Roles */}
              {user.user.role !== 'Teacher' && (
                <NavButton component={Link} to={dashboardPath}>
                  Dashboard
                </NavButton>
              )}
              
              {/* View Timetable Link for All Roles */}
              <NavButton component={Link} to="/view-timetable">
                View Timetable
              </NavButton>
              
              {/* Additional Links for Teacher Role */}
              {user.user.role === 'Teacher' && (
                <>
                  {/* Dashboard (Requests) for Teachers */}
                  <NavButton component={Link} to="/teacher-dashboard">
                    Requests
                  </NavButton>
                  
                  {/* Create Booking for Teachers */}
                  <NavButton component={Link} to="/teacher-dashboard/create">
                    Create Booking
                  </NavButton>
                </>
              )}
            </Box>
            
            {/* User Dropdown */}
            <Box>
              <UserButton 
                endIcon={<ArrowDropDownIcon />}
                onClick={handleClick}
                aria-controls={open ? 'user-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
              >
                Welcome {username}!
              </UserButton>
              <Menu
                id="user-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                MenuListProps={{
                  'aria-labelledby': 'user-button',
                }}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
              >
                <MenuItem component={Link} to="/change-password" onClick={handleClose}>
                  <LockIcon fontSize="small" />
                  Change Password
                </MenuItem>
                <LogoutMenuItem onClick={handleLogout}>
                  <LogoutIcon fontSize="small" />
                  Logout
                </LogoutMenuItem>
              </Menu>
            </Box>
          </Box>
        ) : (
          <Button 
            variant="contained" 
            color="primary"
            component={Link}
            to="/login"
            sx={{ 
              backgroundColor: "#2c3e50", 
              color: "white", 
              padding: "6px 0",
              marginTop:2,
              marginBottom: 2,
              borderRadius: 1,
              textTransform: "none",
              fontSize: "0.9rem",
              "&:hover": {
                backgroundColor: "#1a2530"
              }
            }}
          >
            Login
          </Button>
        )}
      </Toolbar>
      <NavBorder />
    </NavbarContainer>
  );
};

export default Navbar;