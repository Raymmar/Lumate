// Add new route for fetching event stats
router.get('/events/:id/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const eventApiId = req.params.id;
    
    // Get attendees
    const attendees = await storage.getAttendanceByEvent(eventApiId);
    
    // Get real-time stats
    const stats = {
      total: attendees.length,
      approved: attendees.filter(a => a.approvalStatus === 'approved').length,
      pending: attendees.filter(a => a.approvalStatus === 'pending').length,
      unique: new Set(attendees.map(a => a.userEmail)).size
    };

    // Map attendees to people
    const peoplePromises = attendees.map(async (attendance) => {
      if (attendance.personId) {
        return await storage.getPerson(attendance.personId);
      }
      return null;
    });

    const people = (await Promise.all(peoplePromises))
      .filter((person): person is NonNullable<typeof person> => person !== null);

    res.json({
      attendees: people,
      stats
    });
  } catch (error) {
    console.error('Failed to fetch event stats:', error);
    res.status(500).json({ error: 'Failed to fetch event stats' });
  }
});
