import { sql } from "drizzle-orm";
import { check, index, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const yearlyTotals = sqliteTable(
  "yearly_totals",
  {
    ownerId: text("owner_id").notNull(),
    year: integer("year").notNull(),
    hours: real("hours").notNull(),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({ columns: [table.ownerId, table.year] }),
    check("yearly_totals_year_check", sql`${table.year} IN (2024, 2025)`),
    check("yearly_totals_hours_check", sql`${table.hours} >= 0 AND ${table.hours} <= 5000`),
  ],
);

export const trainingSessions = sqliteTable(
  "training_sessions",
  {
    ownerId: text("owner_id").notNull(),
    trainingDate: text("training_date").notNull(),
    hours: real("hours").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({ columns: [table.ownerId, table.trainingDate] }),
    index("training_sessions_owner_date_idx").on(table.ownerId, table.trainingDate),
    check("training_sessions_hours_check", sql`${table.hours} > 0 AND ${table.hours} <= 24`),
  ],
);
