// import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
// import { InjectDataSource } from '@nestjs/typeorm';
// import { DataSource } from 'typeorm';

// @Injectable()
// export class DatabaseService implements OnApplicationBootstrap {
//   private logger = new Logger('DatabaseService');

//   constructor(
//     @InjectDataSource('main_repo')
//     private readonly dataSource: DataSource,
//   ) {}

//   async onApplicationBootstrap() {
//     // await this.enableExtensions();
//     // await this.usersTable();
//     // await this.patientsTable();
//     // await this.appointmentsTable();
//     // await this.paymentsTable();
//     // await this.aiSettingsTable();
//     // await this.actionLogsTable();
//     // // await this.notificationsTable();
//     // await this.revenueReportsTable();
//     // await this.schemaMigrations();
//     // await this.appointmentBalanceMigration();
//     // await this.createIndexes();
//   }

//   // gen_random_uuid() lives in pgcrypto on Postgres < 14 — it's built into
//   // core from PG 14 onward, in which case this can be dropped.
//   async enableExtensions() {
//     try {
//       const query = `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`;
//       await this.dataSource.query(query);
//       this.logger.log('pgcrypto extension enabled successfully');
//     } catch (error) {
//       this.logger.error('Error enabling pgcrypto extension', error);
//     }
//   }

//   async usersTable() {
//     try {
//       const query = `
//         CREATE TABLE IF NOT EXISTS users (
//           id          CHAR(36)     NOT NULL DEFAULT gen_random_uuid(),
//           name        VARCHAR(150) NOT NULL,
//           username    VARCHAR(150) NOT NULL UNIQUE,
//           password    VARCHAR(255) NOT NULL,
//           role        VARCHAR(20)  NOT NULL DEFAULT 'ASSISTANT',
//           permissions JSONB        NULL,
//           created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
//           updated_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
//           PRIMARY KEY (id)
//         );
//       `;
//       await this.dataSource.query(query);
//       this.logger.log('users table created successfully');
//     } catch (error) {
//       this.logger.error('Error creating users table', error);
//     }
//   }

//   async patientsTable() {
//     try {
//       const query = `
//         CREATE TABLE IF NOT EXISTS patients (
//           id                CHAR(36)     NOT NULL DEFAULT gen_random_uuid(),
//           name              VARCHAR(150) NOT NULL,
//           address           VARCHAR(255) NOT NULL,
//           cellphone_number  VARCHAR(20)  NOT NULL,
//           age               INT          NOT NULL,
//           occupation        VARCHAR(20) NOT NULL,
//           status            VARCHAR(20)  NOT NULL DEFAULT 'NEW',
//           created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
//           updated_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
//           PRIMARY KEY (id)
//         );
//       `;
//       await this.dataSource.query(query);
//       this.logger.log('patients table created successfully');
//     } catch (error) {
//       this.logger.error('Error creating patients table', error);
//     }
//   }

//   async appointmentsTable() {
//     try {
//       // branch stores one of EBranches ('UEP_MAIN' | 'CATUBIG' | 'CALBAYOG')
//       // directly — no branches table/FK, since the set of branches is fixed.
//       const query = `
//         CREATE TABLE IF NOT EXISTS appointments (
//           id              CHAR(36)      NOT NULL DEFAULT gen_random_uuid(),
//           patient_id      CHAR(36)      NOT NULL,
//           branch          VARCHAR(20)   NOT NULL,
//           scheduled_at    TIMESTAMPTZ   NOT NULL,
//           treatment_done  TEXT          NOT NULL,
//           debit_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,
//           balance         NUMERIC(10,2) NOT NULL DEFAULT 0,
//           no_show         BOOLEAN       NOT NULL DEFAULT FALSE,
//           created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
//           updated_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
//           PRIMARY KEY (id),
//           CONSTRAINT fk_appointment_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
//         );
//       `;
//       await this.dataSource.query(query);
//       this.logger.log('appointments table created successfully');
//     } catch (error) {
//       this.logger.error('Error creating appointments table', error);
//     }
//   }

//   async paymentsTable() {
//     try {
//       const query = `
//         CREATE TABLE IF NOT EXISTS payments (
//           id              CHAR(36)      NOT NULL DEFAULT gen_random_uuid(),
//           appointment_id  CHAR(36)      NOT NULL,
//           mode            VARCHAR(20)   NOT NULL,
//           amount_paid     NUMERIC(10,2) NOT NULL,
//           date_paid       DATE          NOT NULL,
//           created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
//           PRIMARY KEY (id),
//           CONSTRAINT fk_payment_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
//         );
//       `;
//       await this.dataSource.query(query);
//       this.logger.log('payments table created successfully');
//     } catch (error) {
//       this.logger.error('Error creating payments table', error);
//     }
//   }

//   async aiSettingsTable() {
//     try {
//       const query = `
//         CREATE TABLE IF NOT EXISTS ai_settings (
//           id                CHAR(36)    NOT NULL DEFAULT gen_random_uuid(),
//           provider          VARCHAR(50) NOT NULL UNIQUE,
//           encrypted_api_key TEXT        NOT NULL,
//           is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
//           updated_at        TIMESTAMP   NOT NULL DEFAULT NOW(),
//           PRIMARY KEY (id)
//         );
//       `;
//       await this.dataSource.query(query);
//       this.logger.log('ai_settings table created successfully');
//     } catch (error) {
//       this.logger.error('Error creating ai_settings table', error);
//     }
//   }

//   async actionLogsTable() {
//     try {
//       const query = `
//         CREATE TABLE IF NOT EXISTS action_logs (
//           id           CHAR(36)     NOT NULL DEFAULT gen_random_uuid(),
//           user_id      CHAR(36)     NULL,
//           user_name    VARCHAR(150) NULL,
//           action       VARCHAR(50)  NOT NULL,
//           entity_type  VARCHAR(50)  NOT NULL,
//           entity_id    CHAR(36)     NULL,
//           created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
//           PRIMARY KEY (id)
//         );
//       `;
//       await this.dataSource.query(query);
//       this.logger.log('action_logs table created successfully');
//     } catch (error) {
//       this.logger.error('Error creating action_logs table', error);
//     }
//   }

//   async revenueReportsTable() {
//     try {
//       const query = `
//         CREATE TABLE IF NOT EXISTS revenue_reports (
//           id          CHAR(36)  NOT NULL DEFAULT gen_random_uuid(),
//           month       BIGINT    NOT NULL,
//           year        BIGINT    NOT NULL,
//           raw_data    JSONB     NOT NULL,
//           narrative   TEXT      NOT NULL,
//           created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
//           PRIMARY KEY (id),
//           CONSTRAINT uq_revenue_report_month_year UNIQUE (month, year)
//         );
//       `;
//       await this.dataSource.query(query);
//       this.logger.log('revenue_reports table created successfully');
//     } catch (error) {
//       this.logger.error('Error creating revenue_reports table', error);
//     }
//   }

//   // Brings ALREADY-EXISTING tables in sync with schema changes made after
//   // they were first created. CREATE TABLE IF NOT EXISTS above does nothing
//   // once a table exists, so renamed/added columns need to be handled here
//   // explicitly. Each step checks information_schema first so it's safe to
//   // re-run on every boot.
//   async schemaMigrations() {
//     try {
//       // users.permissions — added after the users table already existed
//       const permissionsColumnCheck = await this.dataSource.query(`
//         SELECT COUNT(*) as count
//         FROM information_schema.columns
//         WHERE table_schema = current_schema()
//         AND table_name = 'users'
//         AND column_name = 'permissions'
//       `);
//       if (Number(permissionsColumnCheck[0].count) === 0) {
//         await this.dataSource.query(`
//           ALTER TABLE users ADD COLUMN permissions JSONB NULL;
//         `);
//         this.logger.log('users.permissions column added');
//       }

//       // appointments.branch_id -> appointments.branch (it's a fixed enum
//       // value, not a foreign key, so the _id suffix was misleading)
//       const branchIdCheck = await this.dataSource.query(`
//         SELECT COUNT(*) as count
//         FROM information_schema.columns
//         WHERE table_schema = current_schema()
//         AND table_name = 'appointments'
//         AND column_name = 'branch_id'
//       `);
//       const branchCheck = await this.dataSource.query(`
//         SELECT COUNT(*) as count
//         FROM information_schema.columns
//         WHERE table_schema = current_schema()
//         AND table_name = 'appointments'
//         AND column_name = 'branch'
//       `);
//       if (
//         Number(branchIdCheck[0].count) > 0 &&
//         Number(branchCheck[0].count) === 0
//       ) {
//         await this.dataSource.query(`
//           ALTER TABLE appointments RENAME COLUMN branch_id TO branch;
//         `);
//         this.logger.log(
//           'appointments.branch_id renamed to appointments.branch',
//         );
//       }

//       // appointments.date -> appointments.scheduled_at, DATE -> TIMESTAMPTZ
//       // (now stores the exact date AND time of the appointment, not just the day)
//       const dateColumnCheck = await this.dataSource.query(`
//         SELECT COUNT(*) as count
//         FROM information_schema.columns
//         WHERE table_schema = current_schema()
//         AND table_name = 'appointments'
//         AND column_name = 'date'
//       `);
//       const scheduledAtColumnCheck = await this.dataSource.query(`
//         SELECT COUNT(*) as count
//         FROM information_schema.columns
//         WHERE table_schema = current_schema()
//         AND table_name = 'appointments'
//         AND column_name = 'scheduled_at'
//       `);
//       if (
//         Number(dateColumnCheck[0].count) > 0 &&
//         Number(scheduledAtColumnCheck[0].count) === 0
//       ) {
//         await this.dataSource.query(`
//           ALTER TABLE appointments RENAME COLUMN date TO scheduled_at;
//         `);
//         // Existing rows only had a DATE (midnight, no real time-of-day) —
//         // this cast just widens the column type so new rows can carry a
//         // real time component. Old rows will show 00:00:00 until edited.
//         await this.dataSource.query(`
//           ALTER TABLE appointments
//           ALTER COLUMN scheduled_at TYPE TIMESTAMPTZ USING scheduled_at::TIMESTAMPTZ;
//         `);
//         this.logger.log(
//           'appointments.date renamed to appointments.scheduled_at and widened to TIMESTAMPTZ',
//         );
//       }

//       this.logger.log('Schema migrations completed successfully');
//     } catch (error) {
//       this.logger.error('Error running schema migrations', error);
//     }
//   }

//   // Adds appointments.balance (if missing), backfills it, and sets up triggers
//   // that keep it in sync with debit_amount and payments automatically.
//   //
//   // Postgres supports combined "INSERT OR UPDATE" trigger events and the
//   // "UPDATE OF column" clause natively, so — unlike the MySQL version — this
//   // stays as two trigger functions instead of five separate triggers.
//   async appointmentBalanceMigration() {
//     try {
//       const columnCheck = await this.dataSource.query(`
//         SELECT COUNT(*) as count
//         FROM information_schema.columns
//         WHERE table_schema = current_schema()
//         AND table_name = 'appointments'
//         AND column_name = 'balance'
//       `);

//       const balanceColumnExists = Number(columnCheck[0].count) > 0;

//       if (!balanceColumnExists) {
//         await this.dataSource.query(`
//           ALTER TABLE appointments ADD COLUMN balance NUMERIC(10,2) NOT NULL DEFAULT 0;
//         `);
//       }

//       await this.dataSource.query(`
//         UPDATE appointments a
//         SET balance = a.debit_amount - COALESCE(
//           (SELECT SUM(p.amount_paid) FROM payments p WHERE p.appointment_id = a.id), 0
//         );
//       `);

//       // --- payments: recalc the related appointment's balance on any change ---

//       await this.dataSource.query(`
//         CREATE OR REPLACE FUNCTION recalc_payment_appointment_balance() RETURNS TRIGGER AS $$
//         BEGIN
//           IF TG_OP = 'DELETE' THEN
//             UPDATE appointments
//             SET balance = debit_amount - COALESCE(
//               (SELECT SUM(amount_paid) FROM payments WHERE appointment_id = OLD.appointment_id), 0
//             )
//             WHERE id = OLD.appointment_id;
//             RETURN OLD;
//           END IF;

//           UPDATE appointments
//           SET balance = debit_amount - COALESCE(
//             (SELECT SUM(amount_paid) FROM payments WHERE appointment_id = NEW.appointment_id), 0
//           )
//           WHERE id = NEW.appointment_id;

//           IF TG_OP = 'UPDATE' AND OLD.appointment_id IS DISTINCT FROM NEW.appointment_id THEN
//             UPDATE appointments
//             SET balance = debit_amount - COALESCE(
//               (SELECT SUM(amount_paid) FROM payments WHERE appointment_id = OLD.appointment_id), 0
//             )
//             WHERE id = OLD.appointment_id;
//           END IF;

//           RETURN NEW;
//         END;
//         $$ LANGUAGE plpgsql;
//       `);

//       await this.dataSource.query(
//         `DROP TRIGGER IF EXISTS trg_payments_recalc_balance ON payments;`,
//       );
//       await this.dataSource.query(`
//         CREATE TRIGGER trg_payments_recalc_balance
//         AFTER INSERT OR UPDATE OR DELETE ON payments
//         FOR EACH ROW EXECUTE FUNCTION recalc_payment_appointment_balance();
//       `);

//       // --- appointments: keep balance in sync when debit_amount changes ---

//       await this.dataSource.query(`
//         CREATE OR REPLACE FUNCTION recalc_appointment_balance_on_debit_change() RETURNS TRIGGER AS $$
//         BEGIN
//           NEW.balance := NEW.debit_amount - COALESCE(
//             (SELECT SUM(amount_paid) FROM payments WHERE appointment_id = NEW.id), 0
//           );
//           RETURN NEW;
//         END;
//         $$ LANGUAGE plpgsql;
//       `);

//       await this.dataSource.query(
//         `DROP TRIGGER IF EXISTS trg_appointments_recalc_balance ON appointments;`,
//       );
//       await this.dataSource.query(`
//         CREATE TRIGGER trg_appointments_recalc_balance
//         BEFORE INSERT OR UPDATE OF debit_amount ON appointments
//         FOR EACH ROW EXECUTE FUNCTION recalc_appointment_balance_on_debit_change();
//       `);

//       this.logger.log(
//         'appointments.balance column and triggers set up successfully',
//       );
//     } catch (error) {
//       this.logger.error('Error setting up appointments.balance', error);
//     }
//   }

//   async createIndexes() {
//     const indexes = [
//       {
//         name: 'idx_users_role',
//         table: 'users',
//         sql: 'CREATE INDEX idx_users_role ON users (role)',
//       },
//       {
//         name: 'idx_appointments_patient',
//         table: 'appointments',
//         sql: 'CREATE INDEX idx_appointments_patient ON appointments (patient_id)',
//       },
//       {
//         name: 'idx_appointments_branch',
//         table: 'appointments',
//         sql: 'CREATE INDEX idx_appointments_branch ON appointments (branch)',
//       },
//       {
//         name: 'idx_appointments_scheduled_at',
//         table: 'appointments',
//         sql: 'CREATE INDEX idx_appointments_scheduled_at ON appointments (scheduled_at)',
//       },
//       {
//         name: 'idx_appointments_no_show',
//         table: 'appointments',
//         sql: 'CREATE INDEX idx_appointments_no_show ON appointments (no_show)',
//       },
//       {
//         name: 'idx_payments_appointment',
//         table: 'payments',
//         sql: 'CREATE INDEX idx_payments_appointment ON payments (appointment_id)',
//       },
//       {
//         name: 'idx_payments_date_paid',
//         table: 'payments',
//         sql: 'CREATE INDEX idx_payments_date_paid ON payments (date_paid)',
//       },
//       {
//         name: 'idx_action_logs_entity',
//         table: 'action_logs',
//         sql: 'CREATE INDEX idx_action_logs_entity ON action_logs (entity_type, entity_id)',
//       },
//       // {
//       //   name: 'idx_notifications_user',
//       //   table: 'notifications',
//       //   sql: 'CREATE INDEX idx_notifications_user ON notifications (user_id)',
//       // },
//       {
//         name: 'idx_revenue_reports_month_year',
//         table: 'revenue_reports',
//         sql: 'CREATE INDEX idx_revenue_reports_month_year ON revenue_reports (month, year)',
//       },
//     ];

//     for (const index of indexes) {
//       try {
//         const result = await this.dataSource.query(
//           `
//           SELECT COUNT(*) as count
//           FROM pg_indexes
//           WHERE schemaname = 'public'
//           AND indexname = $1
//         `,
//           [index.name],
//         );

//         const exists = Number(result[0].count) > 0;

//         if (!exists) {
//           await this.dataSource.query(index.sql);
//           this.logger.log(`Index ${index.name} created successfully`);
//         } else {
//           this.logger.log(`Index ${index.name} already exists, skipping`);
//         }
//       } catch (error) {
//         this.logger.error(`Error creating index ${index.name}`, error);
//       }
//     }

//     this.logger.log('All indexes processed successfully');
//   }
// }

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseService implements OnApplicationBootstrap {
  private logger = new Logger('DatabaseService');

  constructor(
    @InjectDataSource('main_repo')
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap() {
    // await this.enableExtensions();
    // await this.usersTable();
    // await this.patientsTable();
    // await this.appointmentsTable();
    // await this.paymentsTable();
    // await this.aiSettingsTable();
    // await this.actionLogsTable();
    // // await this.notificationsTable();
    // await this.revenueReportsTable();
    // await this.schemaMigrations();
    // await this.appointmentBalanceMigration();
    // await this.appointmentColumnTypeMigration();
    // await this.createIndexes();
    // await this.appointmentStatusMigration();
  }

  // gen_random_uuid() lives in pgcrypto on Postgres < 14 — it's built into
  // core from PG 14 onward, in which case this can be dropped.
  async enableExtensions() {
    try {
      const query = `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`;
      await this.dataSource.query(query);
      this.logger.log('pgcrypto extension enabled successfully');
    } catch (error) {
      this.logger.error('Error enabling pgcrypto extension', error);
    }
  }

  async usersTable() {
    try {
      const query = `
        CREATE TABLE IF NOT EXISTS users (
          id          CHAR(36)     NOT NULL DEFAULT gen_random_uuid(),
          name        VARCHAR(150) NOT NULL,
          username    VARCHAR(150) NOT NULL UNIQUE,
          password    VARCHAR(255) NOT NULL,
          role        VARCHAR(20)  NOT NULL DEFAULT 'ASSISTANT',
          permissions JSONB        NULL,
          created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
          updated_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
          PRIMARY KEY (id)
        );
      `;
      await this.dataSource.query(query);
      this.logger.log('users table created successfully');
    } catch (error) {
      this.logger.error('Error creating users table', error);
    }
  }

  async patientsTable() {
    try {
      const query = `
        CREATE TABLE IF NOT EXISTS patients (
          id                CHAR(36)     NOT NULL DEFAULT gen_random_uuid(),
          name              VARCHAR(150) NOT NULL,
          address           VARCHAR(255) NOT NULL,
          cellphone_number  VARCHAR(20)  NOT NULL,
          age               INT          NOT NULL,
          occupation        VARCHAR(20) NOT NULL,
          status            VARCHAR(20)  NOT NULL DEFAULT 'NEW',
          created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
          updated_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
          PRIMARY KEY (id)
        );
      `;
      await this.dataSource.query(query);
      this.logger.log('patients table created successfully');
    } catch (error) {
      this.logger.error('Error creating patients table', error);
    }
  }

  async appointmentsTable() {
    try {
      // branch stores one of EBranches ('UEP_MAIN' | 'CATUBIG' | 'CALBAYOG')
      // directly — no branches table/FK, since the set of branches is fixed.
      //
      // scheduled_at is TEXT (not TIMESTAMPTZ) and no_show is SMALLINT (0/1,
      // not BOOLEAN) — matches the entity's current field types. See
      // appointmentColumnTypeMigration() for how existing rows get converted.
      const query = `
        CREATE TABLE IF NOT EXISTS appointments (
          id              CHAR(36)      NOT NULL DEFAULT gen_random_uuid(),
          patient_id      CHAR(36)      NOT NULL,
          branch          VARCHAR(20)   NOT NULL,
          scheduled_at    TEXT          NOT NULL,
          treatment_done  TEXT          NOT NULL,
          debit_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,
          balance         NUMERIC(10,2) NOT NULL DEFAULT 0,
          appointment_status  VARCHAR(20)   NOT NULL DEFAULT 'SCHEDULED',
          created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
          updated_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
          PRIMARY KEY (id),
          CONSTRAINT fk_appointment_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
        );
      `;
      await this.dataSource.query(query);
      this.logger.log('appointments table created successfully');
    } catch (error) {
      this.logger.error('Error creating appointments table', error);
    }
  }

  async paymentsTable() {
    try {
      const query = `
        CREATE TABLE IF NOT EXISTS payments (
          id              CHAR(36)      NOT NULL DEFAULT gen_random_uuid(),
          appointment_id  CHAR(36)      NOT NULL,
          mode            VARCHAR(20)   NOT NULL,
          amount_paid     NUMERIC(10,2) NOT NULL,
          date_paid       DATE          NOT NULL,
          created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
          PRIMARY KEY (id),
          CONSTRAINT fk_payment_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
        );
      `;
      await this.dataSource.query(query);
      this.logger.log('payments table created successfully');
    } catch (error) {
      this.logger.error('Error creating payments table', error);
    }
  }

  async aiSettingsTable() {
    try {
      const query = `
        CREATE TABLE IF NOT EXISTS ai_settings (
          id                CHAR(36)    NOT NULL DEFAULT gen_random_uuid(),
          provider          VARCHAR(50) NOT NULL UNIQUE,
          encrypted_api_key TEXT        NOT NULL,
          is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
          updated_at        TIMESTAMP   NOT NULL DEFAULT NOW(),
          PRIMARY KEY (id)
        );
      `;
      await this.dataSource.query(query);
      this.logger.log('ai_settings table created successfully');
    } catch (error) {
      this.logger.error('Error creating ai_settings table', error);
    }
  }

  async actionLogsTable() {
    try {
      const query = `
        CREATE TABLE IF NOT EXISTS action_logs (
          id           CHAR(36)     NOT NULL DEFAULT gen_random_uuid(),
          user_id      CHAR(36)     NULL,
          user_name    VARCHAR(150) NULL,
          action       VARCHAR(50)  NOT NULL,
          entity_type  VARCHAR(50)  NOT NULL,
          entity_id    CHAR(36)     NULL,
          created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
          PRIMARY KEY (id)
        );
      `;
      await this.dataSource.query(query);
      this.logger.log('action_logs table created successfully');
    } catch (error) {
      this.logger.error('Error creating action_logs table', error);
    }
  }

  async revenueReportsTable() {
    try {
      const query = `
        CREATE TABLE IF NOT EXISTS revenue_reports (
          id          CHAR(36)  NOT NULL DEFAULT gen_random_uuid(),
          month       BIGINT    NOT NULL,
          year        BIGINT    NOT NULL,
          raw_data    JSONB     NOT NULL,
          narrative   TEXT      NOT NULL,
          created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
          PRIMARY KEY (id),
          CONSTRAINT uq_revenue_report_month_year UNIQUE (month, year)
        );
      `;
      await this.dataSource.query(query);
      this.logger.log('revenue_reports table created successfully');
    } catch (error) {
      this.logger.error('Error creating revenue_reports table', error);
    }
  }

  // Brings ALREADY-EXISTING tables in sync with schema changes made after
  // they were first created. CREATE TABLE IF NOT EXISTS above does nothing
  // once a table exists, so renamed/added columns need to be handled here
  // explicitly. Each step checks information_schema first so it's safe to
  // re-run on every boot.
  async schemaMigrations() {
    try {
      // users.permissions — added after the users table already existed
      const permissionsColumnCheck = await this.dataSource.query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_schema = current_schema()
        AND table_name = 'users'
        AND column_name = 'permissions'
      `);
      if (Number(permissionsColumnCheck[0].count) === 0) {
        await this.dataSource.query(`
          ALTER TABLE users ADD COLUMN permissions JSONB NULL;
        `);
        this.logger.log('users.permissions column added');
      }

      // appointments.branch_id -> appointments.branch (it's a fixed enum
      // value, not a foreign key, so the _id suffix was misleading)
      const branchIdCheck = await this.dataSource.query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_schema = current_schema()
        AND table_name = 'appointments'
        AND column_name = 'branch_id'
      `);
      const branchCheck = await this.dataSource.query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_schema = current_schema()
        AND table_name = 'appointments'
        AND column_name = 'branch'
      `);
      if (
        Number(branchIdCheck[0].count) > 0 &&
        Number(branchCheck[0].count) === 0
      ) {
        await this.dataSource.query(`
          ALTER TABLE appointments RENAME COLUMN branch_id TO branch;
        `);
        this.logger.log(
          'appointments.branch_id renamed to appointments.branch',
        );
      }

      // appointments.date -> appointments.scheduled_at
      // (now stores the exact date AND time of the appointment, not just the day)
      const dateColumnCheck = await this.dataSource.query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_schema = current_schema()
        AND table_name = 'appointments'
        AND column_name = 'date'
      `);
      const scheduledAtColumnCheck = await this.dataSource.query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_schema = current_schema()
        AND table_name = 'appointments'
        AND column_name = 'scheduled_at'
      `);
      if (
        Number(dateColumnCheck[0].count) > 0 &&
        Number(scheduledAtColumnCheck[0].count) === 0
      ) {
        await this.dataSource.query(`
          ALTER TABLE appointments RENAME COLUMN date TO scheduled_at;
        `);
        this.logger.log(
          'appointments.date renamed to appointments.scheduled_at',
        );
      }

      this.logger.log('Schema migrations completed successfully');
    } catch (error) {
      this.logger.error('Error running schema migrations', error);
    }
  }

  // Converts appointments.scheduled_at (TIMESTAMPTZ -> TEXT) and
  // appointments.no_show (BOOLEAN -> SMALLINT) on any table created before
  // this type change. Checks actual column data_type first, so it's a no-op
  // on tables already created fresh via appointmentsTable() above.
  async appointmentColumnTypeMigration() {
    try {
      const scheduledAtType = await this.dataSource.query(`
        SELECT data_type
        FROM information_schema.columns
        WHERE table_schema = current_schema()
        AND table_name = 'appointments'
        AND column_name = 'scheduled_at'
      `);

      if (
        scheduledAtType.length > 0 &&
        scheduledAtType[0].data_type !== 'text'
      ) {
        await this.dataSource.query(`
          ALTER TABLE appointments
          ALTER COLUMN scheduled_at TYPE TEXT USING scheduled_at::TEXT;
        `);
        this.logger.log('appointments.scheduled_at converted to TEXT');
      }

      const noShowType = await this.dataSource.query(`
        SELECT data_type
        FROM information_schema.columns
        WHERE table_schema = current_schema()
        AND table_name = 'appointments'
        AND column_name = 'appointment_status'
      `);

      if (noShowType.length > 0 && noShowType[0].data_type !== 'smallint') {
        // must drop the boolean default before the type change,
        // then set the new integer default afterward
        await this.dataSource.query(`
          ALTER TABLE appointments ALTER COLUMN no_show DROP DEFAULT;
        `);
        await this.dataSource.query(`
          ALTER TABLE appointments
          ALTER COLUMN no_show TYPE SMALLINT USING (no_show::INT);
        `);
        await this.dataSource.query(`
          ALTER TABLE appointments ALTER COLUMN no_show SET DEFAULT 0;
        `);
        this.logger.log('appointments.no_show converted to SMALLINT');
      }

      this.logger.log(
        'Appointment column type migration completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Error running appointment column type migration',
        error,
      );
    }
  }

  // Adds appointments.appointment_status (if missing), backfilling it from
  // the old no_show column before dropping no_show entirely. Safe to re-run —
  // each step checks first.
  async appointmentStatusMigration() {
    try {
      const statusColumnCheck = await this.dataSource.query(`
      SELECT COUNT(*) as count
      FROM information_schema.columns
      WHERE table_schema = current_schema()
      AND table_name = 'appointments'
      AND column_name = 'appointment_status'
    `);

      if (Number(statusColumnCheck[0].count) === 0) {
        await this.dataSource.query(`
        ALTER TABLE appointments ADD COLUMN appointment_status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED';
      `);
        this.logger.log('appointments.appointment_status column added');
      }

      const noShowColumnCheck = await this.dataSource.query(`
      SELECT COUNT(*) as count
      FROM information_schema.columns
      WHERE table_schema = current_schema()
      AND table_name = 'appointments'
      AND column_name = 'appointment_status'
    `);

      // if (Number(noShowColumnCheck[0].count) > 0) {
      //   // backfill: existing no_show=1 rows become NO_SHOW
      //   await this.dataSource.query(`
      //   UPDATE appointments SET appointment_status = 'NO_SHOW' WHERE no_show = 1;
      // `);
      //   // backfill: already fully-paid rows become COMPLETED
      //   await this.dataSource.query(`
      //   UPDATE appointments SET appointment_status = 'COMPLETED' WHERE balance <= 0 AND no_show = 0;
      // `);
      //   await this.dataSource.query(`
      //   ALTER TABLE appointments DROP COLUMN no_show;
      // `);
      //   this.logger.log(
      //     'appointments.no_show backfilled into appointment_status and dropped',
      //   );
      // }

      this.logger.log('Appointment status migration completed successfully');
    } catch (error) {
      this.logger.error('Error running appointment status migration', error);
    }
  }

  // Adds appointments.balance (if missing), backfills it, and sets up triggers
  // that keep it in sync with debit_amount and payments automatically.
  //
  // Postgres supports combined "INSERT OR UPDATE" trigger events and the
  // "UPDATE OF column" clause natively, so — unlike the MySQL version — this
  // stays as two trigger functions instead of five separate triggers.
  async appointmentBalanceMigration() {
    try {
      const columnCheck = await this.dataSource.query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_schema = current_schema()
        AND table_name = 'appointments'
        AND column_name = 'balance'
      `);

      const balanceColumnExists = Number(columnCheck[0].count) > 0;

      if (!balanceColumnExists) {
        await this.dataSource.query(`
          ALTER TABLE appointments ADD COLUMN balance NUMERIC(10,2) NOT NULL DEFAULT 0;
        `);
      }

      await this.dataSource.query(`
        UPDATE appointments a
        SET balance = a.debit_amount - COALESCE(
          (SELECT SUM(p.amount_paid) FROM payments p WHERE p.appointment_id = a.id), 0
        );
      `);

      // --- payments: recalc the related appointment's balance on any change ---

      // await this.dataSource.query(`
      //   CREATE OR REPLACE FUNCTION recalc_payment_appointment_balance() RETURNS TRIGGER AS $$
      //   BEGIN
      //     IF TG_OP = 'DELETE' THEN
      //       UPDATE appointments
      //       SET balance = debit_amount - COALESCE(
      //         (SELECT SUM(amount_paid) FROM payments WHERE appointment_id = OLD.appointment_id), 0
      //       )
      //       WHERE id = OLD.appointment_id;
      //       RETURN OLD;
      //     END IF;

      //     UPDATE appointments
      //     SET balance = debit_amount - COALESCE(
      //       (SELECT SUM(amount_paid) FROM payments WHERE appointment_id = NEW.appointment_id), 0
      //     )
      //     WHERE id = NEW.appointment_id;

      //     IF TG_OP = 'UPDATE' AND OLD.appointment_id IS DISTINCT FROM NEW.appointment_id THEN
      //       UPDATE appointments
      //       SET balance = debit_amount - COALESCE(
      //         (SELECT SUM(amount_paid) FROM payments WHERE appointment_id = OLD.appointment_id), 0
      //       )
      //       WHERE id = OLD.appointment_id;
      //     END IF;

      //     RETURN NEW;
      //   END;
      //   $$ LANGUAGE plpgsql;
      // `);
      await this.dataSource.query(`
        CREATE OR REPLACE FUNCTION recalc_payment_appointment_balance() RETURNS TRIGGER AS $$
        DECLARE
          target_id CHAR(36);
          new_balance NUMERIC(10,2);
          current_status VARCHAR(20);
        BEGIN
          IF TG_OP = 'DELETE' THEN
            target_id := OLD.appointment_id;
          ELSE
            target_id := NEW.appointment_id;
          END IF;
      
          SELECT
            debit_amount - COALESCE((SELECT SUM(amount_paid) FROM payments WHERE appointment_id = target_id), 0),
            appointment_status
          INTO new_balance, current_status
          FROM appointments WHERE id = target_id;
      
          UPDATE appointments
          SET
            balance = new_balance,
            appointment_status = CASE
              WHEN current_status IN ('NO_SHOW', 'CANCELLED') THEN current_status
              WHEN new_balance <= 0 THEN 'COMPLETED'
              WHEN current_status = 'COMPLETED' AND new_balance > 0 THEN 'SCHEDULED'
              ELSE current_status
            END
          WHERE id = target_id;
      
          IF TG_OP = 'UPDATE' AND OLD.appointment_id IS DISTINCT FROM NEW.appointment_id THEN
            UPDATE appointments
            SET balance = debit_amount - COALESCE(
              (SELECT SUM(amount_paid) FROM payments WHERE appointment_id = OLD.appointment_id), 0
            )
            WHERE id = OLD.appointment_id;
          END IF;
      
          RETURN NULL;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await this.dataSource.query(
        `DROP TRIGGER IF EXISTS trg_payments_recalc_balance ON payments;`,
      );
      await this.dataSource.query(`
        CREATE TRIGGER trg_payments_recalc_balance
        AFTER INSERT OR UPDATE OR DELETE ON payments
        FOR EACH ROW EXECUTE FUNCTION recalc_payment_appointment_balance();
      `);

      // --- appointments: keep balance in sync when debit_amount changes ---

      await this.dataSource.query(`
        CREATE OR REPLACE FUNCTION recalc_appointment_balance_on_debit_change() RETURNS TRIGGER AS $$
        BEGIN
          NEW.balance := NEW.debit_amount - COALESCE(
            (SELECT SUM(amount_paid) FROM payments WHERE appointment_id = NEW.id), 0
          );
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await this.dataSource.query(
        `DROP TRIGGER IF EXISTS trg_appointments_recalc_balance ON appointments;`,
      );
      await this.dataSource.query(`
        CREATE TRIGGER trg_appointments_recalc_balance
        BEFORE INSERT OR UPDATE OF debit_amount ON appointments
        FOR EACH ROW EXECUTE FUNCTION recalc_appointment_balance_on_debit_change();
      `);

      this.logger.log(
        'appointments.balance column and triggers set up successfully',
      );
    } catch (error) {
      this.logger.error('Error setting up appointments.balance', error);
    }
  }

  async createIndexes() {
    const indexes = [
      {
        name: 'idx_users_role',
        table: 'users',
        sql: 'CREATE INDEX idx_users_role ON users (role)',
      },
      {
        name: 'idx_appointments_patient',
        table: 'appointments',
        sql: 'CREATE INDEX idx_appointments_patient ON appointments (patient_id)',
      },
      {
        name: 'idx_appointments_branch',
        table: 'appointments',
        sql: 'CREATE INDEX idx_appointments_branch ON appointments (branch)',
      },
      {
        name: 'idx_appointments_scheduled_at',
        table: 'appointments',
        sql: 'CREATE INDEX idx_appointments_scheduled_at ON appointments (scheduled_at)',
      },
      {
        name: 'idx_appointments_no_show',
        table: 'appointments',
        sql: 'CREATE INDEX idx_appointments_no_show ON appointments (no_show)',
      },
      {
        name: 'idx_payments_appointment',
        table: 'payments',
        sql: 'CREATE INDEX idx_payments_appointment ON payments (appointment_id)',
      },
      {
        name: 'idx_payments_date_paid',
        table: 'payments',
        sql: 'CREATE INDEX idx_payments_date_paid ON payments (date_paid)',
      },
      {
        name: 'idx_action_logs_entity',
        table: 'action_logs',
        sql: 'CREATE INDEX idx_action_logs_entity ON action_logs (entity_type, entity_id)',
      },
      // {
      //   name: 'idx_notifications_user',
      //   table: 'notifications',
      //   sql: 'CREATE INDEX idx_notifications_user ON notifications (user_id)',
      // },
      {
        name: 'idx_revenue_reports_month_year',
        table: 'revenue_reports',
        sql: 'CREATE INDEX idx_revenue_reports_month_year ON revenue_reports (month, year)',
      },

      {
        name: 'idx_appointments_status',
        table: 'appointments',
        sql: 'CREATE INDEX idx_appointments_status ON appointments (appointment_status)',
      },
    ];

    for (const index of indexes) {
      try {
        const result = await this.dataSource.query(
          `
          SELECT COUNT(*) as count
          FROM pg_indexes
          WHERE schemaname = 'public'
          AND indexname = $1
        `,
          [index.name],
        );

        const exists = Number(result[0].count) > 0;

        if (!exists) {
          await this.dataSource.query(index.sql);
          this.logger.log(`Index ${index.name} created successfully`);
        } else {
          this.logger.log(`Index ${index.name} already exists, skipping`);
        }
      } catch (error) {
        this.logger.error(`Error creating index ${index.name}`, error);
      }
    }

    this.logger.log('All indexes processed successfully');
  }
}
