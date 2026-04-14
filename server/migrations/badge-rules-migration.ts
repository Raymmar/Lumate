import { pool } from "../db";

export async function runBadgeRulesMigration() {
  console.log("[BadgeRules] Running badge_rules migration...");

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS badge_rules (
        id SERIAL PRIMARY KEY,
        badge_id INTEGER NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
        rule_type VARCHAR(50) NOT NULL,
        config JSON NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log("[BadgeRules] Table ensured");

    const existing = await pool.query("SELECT COUNT(*) FROM badge_rules");
    if (parseInt(existing.rows[0].count) > 0) {
      console.log("[BadgeRules] Rules already seeded, skipping");
      return;
    }

    const badgeRes = await pool.query("SELECT id, name FROM badges");
    const badgeMap: Record<string, number> = {};
    badgeRes.rows.forEach((r: any) => { badgeMap[r.name] = r.id; });

    const rules: { badge_id: number; rule_type: string; config: string }[] = [];

    if (badgeMap["2025 Summit"]) {
      rules.push({
        badge_id: badgeMap["2025 Summit"],
        rule_type: "event_attendance",
        config: JSON.stringify({ eventApiId: "evt-7mHZuVCKYfqARWL" }),
      });
    }

    if (badgeMap["OG"]) {
      const ogEvents = [
        "evt-KUEx5csMUv6otHD",
        "evt-LArNIZtsDO3shT7",
        "evt-t8pRapBHvNlNw1L",
        "evt-C1AWCRN0nScneOw",
      ];
      ogEvents.forEach((evtId) => {
        rules.push({
          badge_id: badgeMap["OG"],
          rule_type: "event_attendance",
          config: JSON.stringify({ eventApiId: evtId }),
        });
      });
    }

    if (badgeMap["Newbie"]) {
      rules.push({
        badge_id: badgeMap["Newbie"],
        rule_type: "event_count_max",
        config: JSON.stringify({ maxEvents: 3 }),
      });
    }

    for (const rule of rules) {
      await pool.query(
        "INSERT INTO badge_rules (badge_id, rule_type, config) VALUES ($1, $2, $3)",
        [rule.badge_id, rule.rule_type, rule.config]
      );
    }

    console.log(`[BadgeRules] Seeded ${rules.length} rules`);
  } catch (error) {
    console.error("[BadgeRules] Migration failed:", error);
  }
}
