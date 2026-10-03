import { neon } from "@neondatabase/serverless";

function sqlClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}

let initPromise: Promise<void> | null = null;

export function ensureSchema() {
  if (!initPromise) {
    initPromise = (async () => {
      const sql = sqlClient();
      await sql`
        CREATE TABLE IF NOT EXISTS attendance_settings (
          id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
          current_code varchar(4) NOT NULL DEFAULT '0000',
          is_open boolean NOT NULL DEFAULT false,
          cutoff_time time NOT NULL DEFAULT '07:15',
          auto_close_time time NOT NULL DEFAULT '10:00',
          reopen_override_date date,
          code_date date,
          session_date date,
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await sql`ALTER TABLE attendance_settings ADD COLUMN IF NOT EXISTS auto_close_time time NOT NULL DEFAULT '10:00'`;
      await sql`ALTER TABLE attendance_settings ADD COLUMN IF NOT EXISTS reopen_override_date date`;
      await sql`ALTER TABLE attendance_settings ADD COLUMN IF NOT EXISTS code_date date`;
      await sql`ALTER TABLE attendance_settings ADD COLUMN IF NOT EXISTS session_date date`;
      await sql`
        INSERT INTO attendance_settings (id)
        VALUES (1)
        ON CONFLICT (id) DO NOTHING
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS attendance_members (
          id bigserial PRIMARY KEY,
          full_name text NOT NULL UNIQUE,
          active boolean NOT NULL DEFAULT true,
          joined_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS attendance_marks (
          id bigserial PRIMARY KEY,
          member_id bigint NOT NULL REFERENCES attendance_members(id),
          attendance_date date NOT NULL,
          marked_at timestamptz NOT NULL DEFAULT now(),
          status varchar(16) NOT NULL CHECK (status IN ('on_time','late')),
          cutoff_used time,
          minutes_late integer,
          UNIQUE(member_id, attendance_date)
        )
      `;
      await sql`ALTER TABLE attendance_marks ADD COLUMN IF NOT EXISTS cutoff_used time`;
      await sql`ALTER TABLE attendance_marks ADD COLUMN IF NOT EXISTS minutes_late integer`;
      await sql`CREATE INDEX IF NOT EXISTS attendance_marks_date_idx ON attendance_marks(attendance_date)`;

      await sql`
        CREATE TABLE IF NOT EXISTS attendance_sessions (
          attendance_date date PRIMARY KEY,
          opened_at timestamptz NOT NULL DEFAULT now(),
          cutoff_used time NOT NULL,
          code_used varchar(4) NOT NULL,
          last_opened_at timestamptz NOT NULL DEFAULT now(),
          manually_closed_at timestamptz
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS attendance_sessions_date_idx ON attendance_sessions(attendance_date)`;
      await sql`
        INSERT INTO attendance_sessions(attendance_date,opened_at,cutoff_used,code_used,last_opened_at,manually_closed_at)
        SELECT
          a.attendance_date,
          MIN(a.marked_at),
          COALESCE(MIN(a.cutoff_used),(SELECT cutoff_time FROM attendance_settings WHERE id=1)),
          '0000',
          MIN(a.marked_at),
          NULL
        FROM attendance_marks a
        GROUP BY a.attendance_date
        ON CONFLICT(attendance_date) DO NOTHING
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS attendance_member_periods (
          id bigserial PRIMARY KEY,
          member_id bigint NOT NULL REFERENCES attendance_members(id) ON DELETE CASCADE,
          active_from date NOT NULL,
          inactive_from date,
          CHECK (inactive_from IS NULL OR inactive_from >= active_from)
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS attendance_member_periods_member_idx ON attendance_member_periods(member_id,active_from,inactive_from)`;
      await sql`
        INSERT INTO attendance_member_periods(member_id,active_from,inactive_from)
        SELECT m.id,(m.joined_at AT TIME ZONE 'Africa/Lagos')::date,
               CASE WHEN m.active THEN NULL ELSE (now() AT TIME ZONE 'Africa/Lagos')::date END
        FROM attendance_members m
        WHERE NOT EXISTS (
          SELECT 1 FROM attendance_member_periods p WHERE p.member_id=m.id
        )
      `;
    })();
  }
  return initPromise;
}

export async function db() {
  await ensureSchema();
  return sqlClient();
}
