const Booking = require("../models/Booking");
const Room = require("../models/Room");

/**
 * Removes bookings that have expired (date is in the past)
 * This function can be called periodically or before fetching bookings
 */
async function removeExpiredBookings() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of the day
    
    console.log("⏳ Running Cleanup: Checking for expired bookings...");
    
    // Convert today to ISO string format (YYYY-MM-DD) to match your date storage format
    const todayStr = today.toISOString().split('T')[0];
    
    // Find bookings with dates in the past
    const expiredBookings = await Booking.find({ 
      date: { $lt: todayStr } 
    }).populate("teacher", "name email");
    
    if (expiredBookings.length === 0) {
      console.log("✅ No expired bookings found.");
      return { removed: 0 };
    }
    
    console.log(`🚨 Found ${expiredBookings.length} expired bookings to clean up.`);
    
    // Process each expired booking
    let cleanupCount = 0;
    for (const booking of expiredBookings) {
      try {
        // Find the corresponding room
        const room = await Room.findOne({ name: booking.classroom });
        
        if (room) {
          // Parse the time slot
          const [startTime, endTime] = booking.timeSlot.split("-");
          
          // Get the day of week from the booking date
          const bookingDate = new Date(booking.date);
          const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
          const bookingDay = daysOfWeek[bookingDate.getDay()]; 
          
          // Find the exact schedule entry to remove
          const initialScheduleLength = room.schedule.length;
          
          // Remove only the specific booking entry from the room schedule
          room.schedule = room.schedule.filter(entry => {
            // Keep all entries that don't match the exact booking parameters
            return !(
              entry.day === bookingDay && 
              entry.startTime === startTime && 
              entry.endTime === endTime &&
              (
                // Match any approval status since we're removing expired bookings regardless of status
                entry.approvalStatus === "pendingApproval" || 
                entry.approvalStatus === "approved" || 
                entry.approvalStatus === "granted"
              )
            );
          });
          
          // Only save if we actually removed something
          if (initialScheduleLength > room.schedule.length) {
            await room.save();
            console.log(`🧹 Removed expired booking slot from room ${room.name} schedule`);
          }
        }
        
        // Delete the expired booking document
        await Booking.findByIdAndDelete(booking._id);
        cleanupCount++;
        
      } catch (error) {
        console.error(`Error processing expired booking ${booking._id}:`, error);
        // Continue with next booking even if this one fails
      }
    }
    
    console.log(`🗑️ Successfully removed ${cleanupCount} expired bookings!`);
    return { removed: cleanupCount };
    
  } catch (error) {
    console.error("🚨 Error in removing expired bookings:", error);
    throw error;
  }
}

module.exports = removeExpiredBookings;