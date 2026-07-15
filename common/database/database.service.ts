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
//     await this.enableExtensions();
//     await this.usersTable();
//     await this.patientsTable();
//     await this.appointmentsTable();
//     await this.paymentsTable();
//     await this.aiSettingsTable();
//     await this.actionLogsTable();
//     // await this.notificationsTable();
//     await this.revenueReportsTable();
//     await this.userPermissionsTable();
//     await this.appointmentBalanceMigration();
//     await this.createIndexes();
//   }

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
//           occupation        VARCHAR(100) NOT NULL,
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
//       // branch_id stores one of EBranches ('UEP_MAIN' | 'CATUBIG' | 'CALBAYOG')
//       // directly — no branches table/FK, since the set of branches is fixed.
//       const query = `
//         CREATE TABLE IF NOT EXISTS appointments (
//           id              CHAR(36)      NOT NULL DEFAULT gen_random_uuid(),
//           patient_id      CHAR(36)      NOT NULL,
//           branch_id       VARCHAR(20)   NOT NULL,
//           date            DATE          NOT NULL,
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
//           id           CHAR(36)    NOT NULL DEFAULT gen_random_uuid(),
//           user_id      CHAR(36)    NULL,
//           user_name    VARCHAR(150) NULL,
//           action       VARCHAR(50) NOT NULL,
//           entity_type  VARCHAR(50) NOT NULL,
//           entity_id    CHAR(36)    NULL,
//           created_at   TIMESTAMP   NOT NULL DEFAULT NOW(),
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
//           month       INT       NOT NULL,
//           year        INT       NOT NULL,
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

//   async userPermissionsTable() {
//     try {
//       const query = `
//         CREATE TABLE IF NOT EXISTS user_permissions (
//           id          CHAR(36)    NOT NULL DEFAULT gen_random_uuid(),
//           user_id     CHAR(36)    NOT NULL,
//           permission  VARCHAR(10) NOT NULL,
//           created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
//           PRIMARY KEY (id),
//           CONSTRAINT fk_user_permission_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
//           CONSTRAINT uq_user_permission UNIQUE (user_id, permission)
//         );
//       `;
//       await this.dataSource.query(query);
//       this.logger.log('user_permissions table created successfully');
//     } catch (error) {
//       this.logger.error('Error creating user_permissions table', error);
//     }
//   }

//   // Adds appointments.balance (if missing), backfills it, and sets up triggers
//   // that keep it in sync with debit_amount and payments automatically.
//   async appointmentBalanceMigration() {
//     try {
//       await this.dataSource.query(`
//         ALTER TABLE appointments ADD COLUMN IF NOT EXISTS balance NUMERIC(10,2) NOT NULL DEFAULT 0;
//       `);

//       await this.dataSource.query(`
//         UPDATE appointments a
//         SET balance = a.debit_amount - COALESCE(
//           (SELECT SUM(p.amount_paid) FROM payments p WHERE p.appointment_id = a.id), 0
//         );
//       `);

//       await this.dataSource.query(`
//         CREATE OR REPLACE FUNCTION recalc_appointment_balance() RETURNS TRIGGER AS $$
//         DECLARE
//           target_id CHAR(36);
//         BEGIN
//           target_id := COALESCE(NEW.appointment_id, OLD.appointment_id);

//           UPDATE appointments
//           SET balance = debit_amount - COALESCE(
//             (SELECT SUM(amount_paid) FROM payments WHERE appointment_id = target_id), 0
//           )
//           WHERE id = target_id;

//           RETURN NULL;
//         END;
//         $$ LANGUAGE plpgsql;
//       `);

//       await this.dataSource.query(
//         `DROP TRIGGER IF EXISTS trg_payments_recalc_balance ON payments;`,
//       );
//       await this.dataSource.query(`
//         CREATE TRIGGER trg_payments_recalc_balance
//         AFTER INSERT OR UPDATE OR DELETE ON payments
//         FOR EACH ROW EXECUTE FUNCTION recalc_appointment_balance();
//       `);

//       await this.dataSource.query(`
//         CREATE OR REPLACE FUNCTION recalc_balance_on_debit_change() RETURNS TRIGGER AS $$
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
//         FOR EACH ROW EXECUTE FUNCTION recalc_balance_on_debit_change();
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
//         sql: 'CREATE INDEX idx_users_role ON users (role)',
//       },
//       {
//         name: 'idx_appointments_patient',
//         sql: 'CREATE INDEX idx_appointments_patient ON appointments (patient_id)',
//       },
//       {
//         name: 'idx_appointments_branch',
//         sql: 'CREATE INDEX idx_appointments_branch ON appointments (branch_id)',
//       },
//       {
//         name: 'idx_appointments_date',
//         sql: 'CREATE INDEX idx_appointments_date ON appointments (date)',
//       },
//       {
//         name: 'idx_appointments_no_show',
//         sql: 'CREATE INDEX idx_appointments_no_show ON appointments (no_show)',
//       },
//       {
//         name: 'idx_payments_appointment',
//         sql: 'CREATE INDEX idx_payments_appointment ON payments (appointment_id)',
//       },
//       {
//         name: 'idx_payments_date_paid',
//         sql: 'CREATE INDEX idx_payments_date_paid ON payments (date_paid)',
//       },
//       {
//         name: 'idx_action_logs_entity',
//         sql: 'CREATE INDEX idx_action_logs_entity ON action_logs (entity_type, entity_id)',
//       },
//       {
//         name: 'idx_notifications_user',
//         sql: 'CREATE INDEX idx_notifications_user ON notifications (user_id)',
//       },
//       {
//         name: 'idx_revenue_reports_month_year',
//         sql: 'CREATE INDEX idx_revenue_reports_month_year ON revenue_reports (month, year)',
//       },
//       {
//         name: 'idx_user_permissions_user',
//         sql: 'CREATE INDEX idx_user_permissions_user ON user_permissions (user_id)',
//       },
//     ];

//     for (const index of indexes) {
//       try {
//         const result = await this.dataSource.query(`
//           SELECT COUNT(*) as count
//           FROM pg_indexes
//           WHERE schemaname = 'public'
//           AND indexname = '${index.name}'
//         `);

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
    await this.usersTable();
    await this.patientsTable();
    await this.appointmentsTable();
    await this.paymentsTable();
    await this.aiSettingsTable();
    await this.actionLogsTable();
    // await this.notificationsTable();
    await this.revenueReportsTable();

    await this.appointmentBalanceMigration();
    await this.createIndexes();
  }

  async usersTable() {
    try {
      const query = `
        CREATE TABLE IF NOT EXISTS users (
          id          CHAR(36)     NOT NULL DEFAULT (UUID()),
          name        VARCHAR(150) NOT NULL,
          username    VARCHAR(150) NOT NULL UNIQUE,
          password    VARCHAR(255) NOT NULL,
          role        VARCHAR(20)  NOT NULL DEFAULT 'ASSISTANT',
          permissions JSON         NULL,
          created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB;
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
          id                CHAR(36)     NOT NULL DEFAULT (UUID()),
          name              VARCHAR(150) NOT NULL,
          address           VARCHAR(255) NOT NULL,
          cellphone_number  VARCHAR(20)  NOT NULL,
          age               INT          NOT NULL,
          occupation        VARCHAR(100) NOT NULL,
          status            VARCHAR(20)  NOT NULL DEFAULT 'NEW',
          created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB;
      `;
      await this.dataSource.query(query);
      this.logger.log('patients table created successfully');
    } catch (error) {
      this.logger.error('Error creating patients table', error);
    }
  }

  async appointmentsTable() {
    try {
      // branch_id stores one of EBranches ('UEP_MAIN' | 'CATUBIG' | 'CALBAYOG')
      // directly — no branches table/FK, since the set of branches is fixed.
      const query = `
        CREATE TABLE IF NOT EXISTS appointments (
          id              CHAR(36)      NOT NULL DEFAULT (UUID()),
          patient_id      CHAR(36)      NOT NULL,
          branch_id       VARCHAR(20)   NOT NULL,
          date            DATE          NOT NULL,
          treatment_done  TEXT          NOT NULL,
          debit_amount    DECIMAL(10,2) NOT NULL DEFAULT 0,
          balance         DECIMAL(10,2) NOT NULL DEFAULT 0,
          no_show         BOOLEAN       NOT NULL DEFAULT FALSE,
          created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          CONSTRAINT fk_appointment_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
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
          id              CHAR(36)      NOT NULL DEFAULT (UUID()),
          appointment_id  CHAR(36)      NOT NULL,
          mode            VARCHAR(20)   NOT NULL,
          amount_paid     DECIMAL(10,2) NOT NULL,
          date_paid       DATE          NOT NULL,
          created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          CONSTRAINT fk_payment_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
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
          id                CHAR(36)    NOT NULL DEFAULT (UUID()),
          provider          VARCHAR(50) NOT NULL UNIQUE,
          encrypted_api_key TEXT        NOT NULL,
          is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
          updated_at        TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB;
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
          id           CHAR(36)     NOT NULL DEFAULT (UUID()),
          user_id      CHAR(36)     NULL,
          user_name    VARCHAR(150) NULL,
          action       VARCHAR(50)  NOT NULL,
          entity_type  VARCHAR(50)  NOT NULL,
          entity_id    CHAR(36)     NULL,
          created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB;
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
          id          CHAR(36)  NOT NULL DEFAULT (UUID()),
          month       INT       NOT NULL,
          year        INT       NOT NULL,
          raw_data    JSON      NOT NULL,
          narrative   TEXT      NOT NULL,
          created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          CONSTRAINT uq_revenue_report_month_year UNIQUE (month, year)
        ) ENGINE=InnoDB;
      `;
      await this.dataSource.query(query);
      this.logger.log('revenue_reports table created successfully');
    } catch (error) {
      this.logger.error('Error creating revenue_reports table', error);
    }
  }

  // Adds appointments.balance (if missing), backfills it, and sets up triggers
  // that keep it in sync with debit_amount and payments automatically.
  //
  // NOTE: MySQL has no combined "BEFORE INSERT OR UPDATE" trigger and no
  // "UPDATE OF column" trigger clause like Postgres, so each case below is
  // split into its own trigger, with the debit_amount-change check done
  // manually inside the BEFORE UPDATE trigger body.
  async appointmentBalanceMigration() {
    try {
      const columnCheck = await this.dataSource.query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
        AND table_name = 'appointments'
        AND column_name = 'balance'
      `);

      const balanceColumnExists = Number(columnCheck[0].count) > 0;

      if (!balanceColumnExists) {
        await this.dataSource.query(`
          ALTER TABLE appointments ADD COLUMN balance DECIMAL(10,2) NOT NULL DEFAULT 0;
        `);
      }

      await this.dataSource.query(`
        UPDATE appointments a
        SET a.balance = a.debit_amount - COALESCE(
          (SELECT SUM(p.amount_paid) FROM payments p WHERE p.appointment_id = a.id), 0
        );
      `);

      // --- appointments: keep balance in sync when debit_amount changes ---

      await this.dataSource.query(
        `DROP TRIGGER IF EXISTS trg_appointments_before_insert;`,
      );
      await this.dataSource.query(`
        CREATE TRIGGER trg_appointments_before_insert
        BEFORE INSERT ON appointments
        FOR EACH ROW
        BEGIN
          SET NEW.balance = NEW.debit_amount - COALESCE(
            (SELECT SUM(amount_paid) FROM payments WHERE appointment_id = NEW.id), 0
          );
        END;
      `);

      await this.dataSource.query(
        `DROP TRIGGER IF EXISTS trg_appointments_before_update;`,
      );
      await this.dataSource.query(`
        CREATE TRIGGER trg_appointments_before_update
        BEFORE UPDATE ON appointments
        FOR EACH ROW
        BEGIN
          IF NEW.debit_amount <> OLD.debit_amount THEN
            SET NEW.balance = NEW.debit_amount - COALESCE(
              (SELECT SUM(amount_paid) FROM payments WHERE appointment_id = NEW.id), 0
            );
          END IF;
        END;
      `);

      // --- payments: recalc the related appointment's balance on any change ---

      await this.dataSource.query(
        `DROP TRIGGER IF EXISTS trg_payments_after_insert;`,
      );
      await this.dataSource.query(`
        CREATE TRIGGER trg_payments_after_insert
        AFTER INSERT ON payments
        FOR EACH ROW
        BEGIN
          UPDATE appointments
          SET balance = debit_amount - COALESCE(
            (SELECT SUM(amount_paid) FROM payments WHERE appointment_id = NEW.appointment_id), 0
          )
          WHERE id = NEW.appointment_id;
        END;
      `);

      await this.dataSource.query(
        `DROP TRIGGER IF EXISTS trg_payments_after_update;`,
      );
      await this.dataSource.query(`
        CREATE TRIGGER trg_payments_after_update
        AFTER UPDATE ON payments
        FOR EACH ROW
        BEGIN
          UPDATE appointments
          SET balance = debit_amount - COALESCE(
            (SELECT SUM(amount_paid) FROM payments WHERE appointment_id = NEW.appointment_id), 0
          )
          WHERE id = NEW.appointment_id;

          IF OLD.appointment_id <> NEW.appointment_id THEN
            UPDATE appointments
            SET balance = debit_amount - COALESCE(
              (SELECT SUM(amount_paid) FROM payments WHERE appointment_id = OLD.appointment_id), 0
            )
            WHERE id = OLD.appointment_id;
          END IF;
        END;
      `);

      await this.dataSource.query(
        `DROP TRIGGER IF EXISTS trg_payments_after_delete;`,
      );
      await this.dataSource.query(`
        CREATE TRIGGER trg_payments_after_delete
        AFTER DELETE ON payments
        FOR EACH ROW
        BEGIN
          UPDATE appointments
          SET balance = debit_amount - COALESCE(
            (SELECT SUM(amount_paid) FROM payments WHERE appointment_id = OLD.appointment_id), 0
          )
          WHERE id = OLD.appointment_id;
        END;
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
        sql: 'CREATE INDEX idx_appointments_branch ON appointments (branch_id)',
      },
      {
        name: 'idx_appointments_date',
        table: 'appointments',
        sql: 'CREATE INDEX idx_appointments_date ON appointments (date)',
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
    ];

    for (const index of indexes) {
      try {
        const result = await this.dataSource.query(
          `
          SELECT COUNT(*) as count
          FROM information_schema.statistics
          WHERE table_schema = DATABASE()
          AND table_name = ?
          AND index_name = ?
        `,
          [index.table, index.name],
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
