import { storage } from "../storage";
import { lumaApiRequest } from "../routes";
import { InsertAttendance } from "@shared/schema";

export class AttendanceService {
  private static instance: AttendanceService;
  private isUpdating = false;

  private constructor() {}

  public static getInstance(): AttendanceService {
    if (!AttendanceService.instance) {
      AttendanceService.instance = new AttendanceService();
    }
    return AttendanceService.instance;
  }

  private async fetchGuestsForEvent(eventApiId: string): Promise<void> {
    try {
      console.log(`Fetching guests for event: ${eventApiId}`);
      
      // Clear existing attendance records for this event
      await storage.clearAttendanceForEvent(eventApiId);
      
      let hasMore = true;
      let cursor: string | undefined;
      
      while (hasMore) {
        const params: Record<string, string> = {
          event_api_id: eventApiId,
          ...(cursor ? { pagination_cursor: cursor } : {})
        };
        
        const response = await lumaApiRequest('event/get-guests', params);
        
        if (!response.guests || !Array.isArray(response.guests)) {
          console.warn(`No guests found for event ${eventApiId}`);
          break;
        }
        
        console.log(`Processing ${response.guests.length} guests for event ${eventApiId}`);
        
        for (const guestEntry of response.guests) {
          const guest = guestEntry.guest;
          if (!guest) continue;

          const attendanceData: InsertAttendance = {
            api_id: guest.api_id,
            eventApiId,
            userApiId: guest.user_api_id,
            approvalStatus: guest.approval_status,
            createdAt: new Date(guest.created_at).toISOString(),
            registeredAt: guest.registered_at ? new Date(guest.registered_at).toISOString() : null,
            checkedInAt: guest.checked_in_at ? new Date(guest.checked_in_at).toISOString() : null,
            userName: guest.user_name,
            userEmail: guest.user_email,
            checkInQrCode: guest.check_in_qr_code,
            ticketData: guest.event_ticket || null
          };

          await storage.insertAttendance(attendanceData);
        }
        
        hasMore = response.has_more === true;
        cursor = response.next_cursor;
        
        if (hasMore) {
          console.log(`More guests available for event ${eventApiId}, continuing with cursor: ${cursor}`);
        }
      }
      
      console.log(`Completed fetching guests for event: ${eventApiId}`);
    } catch (error) {
      console.error(`Failed to fetch guests for event ${eventApiId}:`, error);
      throw error;
    }
  }

  public async updateAttendance(): Promise<void> {
    if (this.isUpdating) {
      console.log('Attendance update already in progress');
      return;
    }

    try {
      this.isUpdating = true;
      console.log('Starting attendance update process');

      const events = await storage.getEvents();
      console.log(`Found ${events.length} events to process`);

      for (const event of events) {
        try {
          await this.fetchGuestsForEvent(event.api_id);
        } catch (error) {
          console.error(`Failed to process event ${event.api_id}:`, error);
          // Continue with next event even if one fails
        }
      }

      console.log('Completed attendance update process');
    } catch (error) {
      console.error('Failed to update attendance:', error);
      throw error;
    } finally {
      this.isUpdating = false;
    }
  }
}
