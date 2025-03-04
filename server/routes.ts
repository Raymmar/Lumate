('Failedto check RSVP status:', error);
      res.status(500).json({ 
        error: "Failed to check RSVP status",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/events/featured", async (_req, res) => {
    try {
      const featuredEvent = await storage.getFeaturedEvent();

      if (!featuredEvent) {
        return res.status(404).json({ error: "No featured event found" });
      }

      res.json(featuredEvent);
    } catch (error) {
      console.error('Failed to fetch featured event:', error);
      res.status(500).json({ error: "Failed to fetch featured event" });
    }
  });

  app.get("/api/admin/events", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      const searchQuery = (req.query.search as string || '').toLowerCase();
      const offset = (page - 1) * limit;

      const totalCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(events)
        .where(
          searchQuery
            ? sql`(LOWER(title) LIKE ${`%${searchQuery}%`} OR LOWER(description) LIKE ${`%${searchQuery}%`})`
            : sql`1=1`
        )
        .then(result => Number(result[0].count));

      const eventsList = await db
        .select()
        .from(events)
        .where(
          searchQuery
            ? sql`(LOWER(title) LIKE ${`%${searchQuery}%`} OR LOWER(description) LIKE ${`%${searchQuery}%`})`
            : sql`1=1`
        )
        .orderBy(sql`start_time DESC`)
        .limit(limit)
        .offset(offset);
      const eventsWithStatus = await Promise.all(
        eventsList.map(async (event) => {
          const attendanceStatus = await storage.getEventAttendanceStatus(event.api_id);
          return {
            ...event,
            isSynced: attendanceStatus.hasAttendees,
            lastSyncedAt: attendanceStatus.lastSyncTime,
            lastAttendanceSync: event.lastAttendanceSync || attendanceStatus.lastSyncTime
          };
        })
      );

      res.json({
        events: eventsWithStatus,
        total: totalCount
      });
    } catch (error) {
      console.error('Failed to fetch admin events:', error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.get("/api/admin/people", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      const searchQuery = (req.query.search as string || '').toLowerCase();
      const offset = (page - 1) * limit;

      const totalCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(people)
        .where(
          searchQuery
            ? sql`(
              LOWER(user_name) LIKE ${`%${searchQuery}%`} OR 
              LOWER(email) LIKE ${`%${searchQuery}%`} OR 
              LOWER(COALESCE(organization_name, '')) LIKE ${`%${searchQuery}%`} OR 
              LOWER(COALESCE(job_title, '')) LIKE ${`%${searchQuery}%`}
            )`
            : sql`1=1`
        )
        .then(result => Number(result[0].count));

      const peopleList = await db
        .select()
        .from(people)
        .where(
          searchQuery
            ? sql`(
              LOWER(user_name) LIKE ${`%${searchQuery}%`} OR 
              LOWER(email) LIKE ${`%${searchQuery}%`} OR 
              LOWER(COALESCE(organization_name, '')) LIKE ${`%${searchQuery}%`} OR 
              LOWER(COALESCE(job_title, '')) LIKE ${`%${searchQuery}%`}
            )`
            : sql`1=1`
        )
        .orderBy(people.id)
        .limit(limit)
        .offset(offset);

      res.json({
        people: peopleList,
        total: totalCount
      });
    } catch (error) {
      console.error('Failed to fetch people:', error);
      res.status(500).json({ error: "Failed to fetch people" });
    }
  });

  app.get("/api/admin/events/:eventId/guests", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const eventId = req.params.eventId;
      if (!eventId) {
        return res.status(400).json({ error: "Missing event ID" });
      }

      // Initialize SSE connection
      initSSE(res);

      let allGuests: any[] = [];
      let hasMore = true;
      let cursor = undefined;
      let iterationCount = 0;
      const MAX_ITERATIONS = 100;

      // Fetch event details for progress messages
      const event = await storage.getEventByApiId(eventId);
      if (!event) {
        sendSSEUpdate(res, {
          type: 'error',
          message: 'Event not found',
          progress: 0
        });
        return res.end();
      }

      sendSSEUpdate(res, {
        type: 'status',
        message: `Starting attendance sync for event: ${event.title}`,
        progress: 0
      });

      try {
        sendSSEUpdate(res, {
          type: 'status',
          message: 'Clearing existing attendance records...',
          progress: 5
        });

        await storage.deleteAttendanceByEvent(eventId);

        sendSSEUpdate(res, {
          type: 'status',
          message: 'Successfully cleared existing attendance records',
          progress: 10
        });
      } catch (error) {
        sendSSEUpdate(res, {
          type: 'error',
          message: 'Failed to clear existing attendance records',
          progress: 0
        });
        res.end();
        return;
      }

      let totalProcessed = 0;
      let successCount = 0;
      let failureCount = 0;

      while (hasMore && iterationCount < MAX_ITERATIONS) {
        const params: Record<string, string> = { 
          event_api_id: eventId 
        };

        if (cursor) {
          params.pagination_cursor = cursor;
        }

        sendSSEUpdate(res, {
          type: 'status',
          message: `Fetching guests batch ${iterationCount + 1}...`,
          progress: 10 + (iterationCount * 2)
        });

        const response = await lumaApiRequest('event/get-guests', params);

        if (response.entries) {
          const approvedEntries = response.entries.filter((entry: any) => 
            entry.guest.approval_status === 'approved'
          );

          for (const entry of approvedEntries) {
            const guest = entry.guest;
            totalProcessed++;

            try {
              await storage.upsertAttendance({
                eventApiId: eventId,
                userEmail: guest.email.toLowerCase(),
                guestApiId: guest.api_id,
                approvalStatus: guest.approval_status,
                registeredAt: guest.registered_at
              });

              successCount++;
              sendSSEUpdate(res, {
                type: 'progress',
                message: `Successfully processed ${guest.email}`,
                data: {
                  total: totalProcessed,
                  success: successCount,
                  failure: failureCount
                },
                progress: Math.min(90, 10 + ((totalProcessed / (response.total || 1)) * 80))
              });
            } catch (error) {
              failureCount++;
              sendSSEUpdate(res, {
                type: 'error',
                message: `Failed to process ${guest.email}: ${error instanceof Error ? error.message : String(error)}`,
                data: {
                  total: totalProcessed,
                  success: successCount,
                  failure: failureCount
                },
                progress: Math.min(90, 10 + ((totalProcessed / (response.total || 1)) * 80))
              });
            }
          }

          allGuests = allGuests.concat(approvedEntries);
        }

        hasMore = response.has_more;
        cursor = response.next_cursor;
        iterationCount++;

        sendSSEUpdate(res, {
          type: 'status',
          message: `Processed ${totalProcessed} guests so far...`,
          data: {
            total: totalProcessed,
            success: successCount,
            failure: failureCount,
            hasMore,
            currentBatch: iterationCount
          },
          progress: Math.min(90, 10 + ((totalProcessed / (response.total || 1)) * 80))
        });
      }

      if (iterationCount >= MAX_ITERATIONS) {
        sendSSEUpdate(res, {
          type: 'warning',
          message: 'Reached maximum iteration limit while syncing guests',
          progress: 95
        });
      }

      await storage.updateEventAttendanceSync(eventId);

      sendSSEUpdate(res, {
        type: 'complete',
        message: 'Attendance sync completed',
        data: {
          total: totalProcessed,
          success: successCount,
          failure: failureCount,
          totalGuests: allGuests.length
        },
        progress: 100
      });

      res.end();
    } catch (error) {
      console.error('Failed to sync event guests:', error);
      sendSSEUpdate(res, {
        type: 'error',
        message: error instanceof Error ? error.message : String(error),
        progress: 0
      });
      res.end();
    }
  });

  app.get("/api/admin/events/:eventId/attendees", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const eventId = req.params.eventId;
      if (!eventId) {
        return res.status(400).json({ error: "Missing event ID" });
      }

      const result = await db
        .select({
          id: people.id,
          userName: people.userName,
          email: people.email,
          avatarUrl: people.avatarUrl,
          api_id: people.api_id,
        })
        .from(attendance)
        .innerJoin(people, eq(attendance.userEmail, people.email))
        .where(eq(attendance.eventApiId, eventId))
        .orderBy(attendance.registeredAt);

      res.json(result);
    } catch (error) {
      console.error('Failed to fetch event attendees:', error);
      res.status(500).json({ error: "Failed to fetch attendees" });
    }
  });

  app.post("/api/events/send-invite", async (req, res) => {
    try {
      const { email, event_api_id } = req.body;

      if (!email || !event_api_id) {
        return res.status(400).json({ error: "Missing email or event_api_id" });
      }

      console.log('Sending invite for event:', {
        eventId: event_api_id,
        userEmail: email
      });

      const response = await lumaApiRequest(
        'event/send-invites',
        undefined, 
        {
          method: 'POST',
          body: JSON.stringify({
            guests: [{ email }],
            event_api_id
          })
        }
      );

      console.log('Invite sent successfully:', {
        eventId: event_api_id,
        userEmail: email,
        response
      });

      res.json({ 
        message: "Invite sent successfully. Please check your email.",
        details: response
      });
    } catch (error) {
      console.error('Failed to send invite:', error);
      res.status(500).json({ 
        error: "Failed to send invite",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/public/posts", async (_req, res) => {
    try {
      console.log('Fetching public posts...');
      const posts = await storage.getPosts();

      const sortedPosts = posts.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      console.log(`Retrieved ${posts.length} public posts`);
      res.json({ posts: sortedPosts });
    } catch (error) {
      console.error('Failed to fetch public posts:', error);
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  app.post("/api/admin/posts", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const postData = req.body;

      postData.creatorId = user.id;

      const post = await storage.createPost(postData);

      res.json(post);
    } catch (error) {
      console.error('Failed to create post:', error);
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  app.get("/api/admin/posts", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const posts = await storage.getPosts();
      res.json({ posts });
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  app.get("/api/admin/members", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      const searchQuery = (req.query.search as string || '').toLowerCase();
      const offset = (page - 1) * limit;

      const totalCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(
          searchQuery
            ? sql`(LOWER(email) LIKE ${`%${searchQuery}%`} OR LOWER(display_name) LIKE ${`%${searchQuery}%`})`
            : sql`1=1`
        )
        .then(result => Number(result[0].count));

      const usersList = await db
        .select({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          isVerified: users.isVerified,
          isAdmin: users.isAdmin,
          createdAt: users.createdAt,
          person: people
        })
        .from(users)
        .leftJoin(people, eq(users.personId, people.id))
        .where(
          searchQuery
            ? sql`(LOWER(${users.email}) LIKE ${`%${searchQuery}%`} OR LOWER(${users.displayName}) LIKE ${`%${searchQuery}%`})`
            : sql`1=1`
        )
        .orderBy(users.createdAt)
        .limit(limit)
        .offset(offset);

      res.json({
        users: usersList,
        total: totalCount
      });
    } catch (error) {
      console.error('Failed to fetch members:', error);
      res.status(500).json({ error: "Failed to fetch members" });
    }
  });

  app.post("/api/admin/users/:id/toggle-admin", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const currentUser = await storage.getUser(req.session.userId);
      if (!currentUser?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const targetUserId = parseInt(req.params.id);
      const targetUser = await storage.getUser(targetUserId);

      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      console.log(`Toggling admin status for user ${targetUserId} from ${targetUser.isAdmin} to ${!targetUser.isAdmin}`);

      const updatedUser = await storage.updateUserAdminStatus(targetUserId, !targetUser.isAdmin);

      console.log(`Admin status for user ${targetUserId} updated successfully. New status: ${updatedUser.isAdmin}`);
      res.json(updatedUser);
    } catch (error) {
      console.error('Failed to toggle admin status:', error);
      res.status(500).json({ error: "Failed to toggle admin status" });
    }
  });
  app.get("/api/admin/roles", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const roles = await db
        .select()
        .from(rolesTable)
        .orderBy(rolesTable.id);

      console.log('Fetched roles:', roles);
      res.json(roles);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  app.get("/api/admin/permissions", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const permissions = await db
        .select()
        .from(permissionsTable)
        .orderBy(permissionsTable.id);

      console.log('Fetched permissions:', permissions);
      res.json(permissions);
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      res.status(500).json({ error: "Failed to fetch permissions" });
    }
  });

  app.get("/api/admin/roles/:roleId/permissions", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const roleId = parseInt(req.params.roleId);
      if (isNaN(roleId)) {
        return res.status(400).json({ error: "Invalid role ID" });
      }

      const permissions = await storage.getRolePermissions(roleId);
      res.json(permissions);
    } catch (error) {
      console.error('Failed to fetch role permissions:', error);
      res.status(500).json({ error: "Failed to fetch role permissions" });
    }
  });

  app.post("/api/admin/roles/:roleId/permissions/:permissionId", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const roleId = parseInt(req.params.roleId);
      const permissionId = parseInt(req.params.permissionId);

      if (isNaN(roleId) || isNaN(permissionId)) {
        return res.status(400).json({ error: "Invalid role or permission ID" });
      }

      await storage.assignPermissionToRole(roleId, permissionId, req.session.userId);

      // Return updated permissions list
      const updatedPermissions = await storage.getRolePermissions(roleId);
      res.json(updatedPermissions);
    } catch (error) {
      console.error('Failed to assign permission to role:', error);
      res.status(500).json({ 
        error: "Failed to assign permission to role",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.delete("/api/admin/roles/:roleId/permissions/:permissionId", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const roleId = parseInt(req.params.roleId);
      const permissionId = parseInt(req.params.permissionId);

      if (isNaN(roleId) || isNaN(permissionId)) {
        return res.status(400).json({ error: "Invalid role or permission ID" });
      }

      await storage.removePermissionFromRole(roleId, permissionId);

      // Return updated permissions list
      const updatedPermissions = await storage.getRolePermissions(roleId);
      res.json(updatedPermissions);
    } catch (error) {
      console.error('Failed to remove permission from role:', error);
      res.status(500).json({ 
        error: "Failed to remove permission from role",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/admin/members/:userId/roles", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const adminUser = await storage.getUser(req.session.userId);
      if (!adminUser?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const userId = parseInt(req.params.userId);

      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const roles = await storage.getUserRoles(userId);
      res.json({ roles });
    } catch (error) {
      console.error("Failed to fetch user roles:", error);
      res.status(500).json({ error: "Failed to fetch user roles" });
    }
  });

  app.post("/api/admin/members/:userId/roles/:roleName", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const adminUser = await storage.getUser(req.session.userId);
      if (!adminUser?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const userId = parseInt(req.params.userId);
      const roleName = req.params.roleName;
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      console.log(`Updating roles for user ${userId} to role ${roleName} by admin ${req.session.userId}`);

      const role = await storage.getRoleByName(roleName);
      if (!role) {
        return res.status(404).json({ error: "Role not found" });
      }

      const currentRoles = await storage.getUserRoles(userId);
      for (const currentRole of currentRoles) {
        console.log(`Removing role ${currentRole.name} from user ${userId}`);
        await storage.removeRoleFromUser(userId, currentRole.id);
      }

      await storage.assignRoleToUser(userId, role.id, req.session.userId);
      console.log(`Assigned role ${roleName} to user ${userId}`);

      const updatedRoles = await storage.getUserRoles(userId);
      res.json({ roles: updatedRoles });
    } catch (error) {
      console.error('Failed to update user roles:', error);
      res.status(500).json({ error: "Failed to update user roles" });
    }
  });

  app.patch("/api/admin/members/:id/admin-status", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const currentUser = await storage.getUser(req.session.userId);
      if (!currentUser?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const userId = parseInt(req.params.id);
      const { isAdmin } = req.body;

      if (typeof isAdmin !== 'boolean') {
        return res.status(400).json({ error: "isAdmin must be a boolean" });
      }

      console.log(`Updating admin status for user ${userId} to ${isAdmin} by admin ${req.session.userId}`);

      const updatedUser = await storage.updateUserAdminStatus(userId, isAdmin);
      console.log(`Admin status for user ${userId} updated successfully. New status: ${updatedUser.isAdmin}`);

      res.json({
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          displayName: updatedUser.displayName,
          isVerified: updatedUser.isVerified,
          isAdmin: updatedUser.isAdmin
        }
      });
    } catch (error) {
      console.error('Failed to update user admin status:', error);
      res.status(500).json({ error: "Failed to update user admin status" });
    }
  });

  app.get("/api/admin/events/:id/sync-status", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const eventId = req.params.id;

      // Set up SSE connection
      initSSE(res);

      // Send initial status
      sendSSEUpdate(res, { 
        type: 'status',
        message: 'Starting attendance sync...',
        progress: 0
      });

      try {
        const event = await storage.getEventByApiId(eventId);
        if (!event) {
          sendSSEUpdate(res, {
            type: 'error',
            message: 'Event not found',
            progress: 0
          });
          return res.end();
        }

        // Clear existing attendance records
        sendSSEUpdate(res, {
          type: 'status',
          message: 'Clearing existing attendance records...',
          progress: 10
        });

        await storage.deleteAttendanceByEvent(eventId);

        // Fetch guests from Luma API
        sendSSEUpdate(res, {
          type: 'status',
          message: 'Fetching guest list from event platform...',
          progress: 20
        });

        let cursor = null;
        let totalGuests = 0;
        let processedGuests = 0;
        let iteration = 0;

        do {
          iteration++;
          const params: Record<string, string> = { event_api_id: eventId };
          if (cursor) {
            params.cursor = cursor;
          }

          const response = await lumaApiRequest('event/get-guests', params);

          if (response.entries) {
            for (const guest of response.entries) {
              processedGuests++;
              if (guest.approval_status === 'approved') {
                await storage.upsertAttendance({
                  eventApiId: eventId,
                  userEmail: guest.email,
                  guestApiId: guest.guest_id,
                  approvalStatus: guest.approval_status,
                  registeredAt: guest.registered_at,
                  lastSyncedAt: new Date().toISOString()
                });
              }

              // Calculate progress percentage (20-90%)
              const progress = 20 + Math.floor((processedGuests / (totalGuests || response.entries.length)) * 70);

              sendSSEUpdate(res, {
                type: 'progress',
                message: `Processing guest ${processedGuests}: ${guest.email}`,
                progress,
                data: {
                  processedGuests,
                  totalGuests: totalGuests || response.entries.length,
                  currentEmail: guest.email,
                  status: guest.approval_status
                }
              });
            }

            totalGuests = Math.max(totalGuests, processedGuests);
            cursor = response.next_cursor;
          }
        } while (cursor);

        // Update event sync timestamp
        await storage.updateEventAttendanceSync(eventId);

        sendSSEUpdate(res, {
          type: 'complete',
          message: 'Attendance sync completed successfully',
          progress: 100,
          data: {
            totalGuests: processedGuests,
            iterations: iteration
          }
        });

        res.end();
      } catch (error) {
        console.error('Error during attendance sync:', error);
        sendSSEUpdate(res, {
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          progress: 0
        });
        res.end();
      }
    } catch (error) {
      console.error('Failed to setup sync status stream:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to setup sync status stream" });
      }
    }
  });

  return createServer(app);
}

declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}