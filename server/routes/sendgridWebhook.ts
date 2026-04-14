import { Request, Response } from "express";
import { db } from "../db";
import { emailEvents, newsletterRecipients, newsletterSends, people } from "@shared/schema";
import { eq, and, sql, isNull } from "drizzle-orm";

const SCANNER_GRACE_PERIOD_MS = 30 * 1000;

interface SendGridEvent {
  event: string;
  email: string;
  timestamp: number;
  sg_message_id?: string;
  useragent?: string;
  ip?: string;
  url?: string;
  reason?: string;
  sg_machine_open?: boolean;
  newsletter_send_id?: string;
  [key: string]: any;
}

export async function handleSendGridWebhook(req: Request, res: Response) {
  res.status(200).json({ received: true });

  try {
    let events: SendGridEvent[] = req.body;

    if (!Array.isArray(events)) {
      events = [events];
    }

    console.log("[SendGrid Webhook] Processing", events.length, "events:", events.map(e => `${e.event}:${e.email}`).join(", "));

    const results = await Promise.allSettled(
      events.map(event => processEvent(event))
    );

    const failed = results.filter(r => r.status === "rejected");
    if (failed.length > 0) {
      console.error(`[SendGrid Webhook] ${failed.length}/${events.length} events failed to process`);
    }
  } catch (error) {
    console.error("[SendGrid Webhook] Error:", error);
  }
}

async function processEvent(event: SendGridEvent) {
  const sgMessageId = event.sg_message_id?.split(".")[0];
  const eventEmail = event.email?.toLowerCase();
  const eventTimestamp = new Date(event.timestamp * 1000).toISOString();

  if (!eventEmail || !event.event) return;

  let newsletterSendId: number | null = null;

  if (sgMessageId) {
    const [recipient] = await db
      .select({ newsletterSendId: newsletterRecipients.newsletterSendId })
      .from(newsletterRecipients)
      .where(eq(newsletterRecipients.sendgridMessageId, sgMessageId))
      .limit(1);

    if (recipient) {
      newsletterSendId = recipient.newsletterSendId;
    }
  }

  if (!newsletterSendId && event.newsletter_send_id) {
    const parsedId = parseInt(event.newsletter_send_id);
    if (!isNaN(parsedId)) {
      newsletterSendId = parsedId;
    }
  }

  if (event.event === "open" && event.sg_machine_open) {
    await db.insert(emailEvents).values({
      eventType: event.event,
      email: eventEmail,
      sendgridMessageId: sgMessageId || null,
      newsletterSendId,
      timestamp: eventTimestamp,
      userAgent: event.useragent || null,
      ip: event.ip || null,
      url: null,
      reason: null,
      sgMachineOpen: true,
      rawPayload: event,
    });
    return;
  }

  if (event.event === "open" && newsletterSendId) {
    const [send] = await db
      .select({ sentAt: newsletterSends.sentAt })
      .from(newsletterSends)
      .where(eq(newsletterSends.id, newsletterSendId))
      .limit(1);

    if (send) {
      const sentTime = new Date(send.sentAt).getTime();
      const eventTime = event.timestamp * 1000;
      if (eventTime - sentTime < SCANNER_GRACE_PERIOD_MS) {
        await db.insert(emailEvents).values({
          eventType: "scanner_filtered",
          email: eventEmail,
          sendgridMessageId: sgMessageId || null,
          newsletterSendId,
          timestamp: eventTimestamp,
          userAgent: event.useragent || null,
          ip: event.ip || null,
          url: null,
          reason: "Filtered: opened within 30s scanner grace period",
          sgMachineOpen: false,
          rawPayload: event,
        });
        return;
      }
    }
  }

  await db.insert(emailEvents).values({
    eventType: event.event,
    email: eventEmail,
    sendgridMessageId: sgMessageId || null,
    newsletterSendId,
    timestamp: eventTimestamp,
    userAgent: event.useragent || null,
    ip: event.ip || null,
    url: event.url || null,
    reason: event.reason || null,
    sgMachineOpen: false,
    rawPayload: event,
  });

  if (!sgMessageId) return;

  switch (event.event) {
    case "delivered":
      await handleDelivered(sgMessageId, eventTimestamp, newsletterSendId);
      break;
    case "open":
      await handleOpen(sgMessageId, eventTimestamp, newsletterSendId);
      break;
    case "click":
      await handleClick(sgMessageId, eventTimestamp, newsletterSendId, event.url);
      break;
    case "bounce":
    case "dropped":
      await handleBounce(sgMessageId, eventTimestamp, newsletterSendId);
      break;
    case "unsubscribe":
    case "group_unsubscribe":
    case "spamreport":
      await handleUnsubscribe(eventEmail, sgMessageId, eventTimestamp, newsletterSendId);
      break;
  }

  if (event.event === "click" && event.url && event.url.includes("/unsubscribe")) {
    await handleUnsubscribe(eventEmail, sgMessageId, eventTimestamp, newsletterSendId);
  }
}

async function handleDelivered(sgMessageId: string, timestamp: string, newsletterSendId: number | null) {
  const [updated] = await db
    .update(newsletterRecipients)
    .set({ status: "delivered", deliveredAt: timestamp })
    .where(
      and(
        eq(newsletterRecipients.sendgridMessageId, sgMessageId),
        isNull(newsletterRecipients.deliveredAt)
      )
    )
    .returning({ id: newsletterRecipients.id });

  if (updated && newsletterSendId) {
    await db
      .update(newsletterSends)
      .set({ deliveredCount: sql`${newsletterSends.deliveredCount} + 1` })
      .where(eq(newsletterSends.id, newsletterSendId));
  }
}

async function handleOpen(sgMessageId: string, timestamp: string, newsletterSendId: number | null) {
  const [updated] = await db
    .update(newsletterRecipients)
    .set({ openedAt: timestamp })
    .where(
      and(
        eq(newsletterRecipients.sendgridMessageId, sgMessageId),
        isNull(newsletterRecipients.openedAt)
      )
    )
    .returning({ id: newsletterRecipients.id });

  if (updated && newsletterSendId) {
    await db
      .update(newsletterSends)
      .set({ openCount: sql`${newsletterSends.openCount} + 1` })
      .where(eq(newsletterSends.id, newsletterSendId));
  }
}

async function handleClick(sgMessageId: string, timestamp: string, newsletterSendId: number | null, _url?: string) {
  const [updated] = await db
    .update(newsletterRecipients)
    .set({ clickedAt: timestamp })
    .where(
      and(
        eq(newsletterRecipients.sendgridMessageId, sgMessageId),
        isNull(newsletterRecipients.clickedAt)
      )
    )
    .returning({ id: newsletterRecipients.id });

  if (updated && newsletterSendId) {
    await db
      .update(newsletterSends)
      .set({ clickCount: sql`${newsletterSends.clickCount} + 1` })
      .where(eq(newsletterSends.id, newsletterSendId));
  }
}

async function handleBounce(sgMessageId: string, timestamp: string, newsletterSendId: number | null) {
  const [updated] = await db
    .update(newsletterRecipients)
    .set({ status: "bounced", bouncedAt: timestamp })
    .where(
      and(
        eq(newsletterRecipients.sendgridMessageId, sgMessageId),
        isNull(newsletterRecipients.bouncedAt)
      )
    )
    .returning({ id: newsletterRecipients.id });

  if (updated && newsletterSendId) {
    await db
      .update(newsletterSends)
      .set({ bounceCount: sql`${newsletterSends.bounceCount} + 1` })
      .where(eq(newsletterSends.id, newsletterSendId));
  }
}

async function handleUnsubscribe(email: string, sgMessageId: string, timestamp: string, _newsletterSendId: number | null) {
  const [updated] = await db
    .update(newsletterRecipients)
    .set({ unsubscribedAt: timestamp })
    .where(
      and(
        eq(newsletterRecipients.sendgridMessageId, sgMessageId),
        isNull(newsletterRecipients.unsubscribedAt)
      )
    )
    .returning({ id: newsletterRecipients.id, email: newsletterRecipients.email });

  if (updated) {
    await db
      .update(people)
      .set({ newsletterUnsubscribedAt: timestamp })
      .where(
        and(
          eq(people.email, email),
          isNull(people.newsletterUnsubscribedAt)
        )
      );
  } else {
    console.warn("[SendGrid Webhook] Unsubscribe event for unknown message ID:", sgMessageId, email);
  }
}
