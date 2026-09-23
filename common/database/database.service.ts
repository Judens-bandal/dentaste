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
    // await this.patientsTable();
    // await this.patientHealthQuestionsMigration();
    // await this.appointmentsTable();
    // await this.appointmentServiceColumnsMigration();
    // // await this.patientsMigration();
    // // await this.appointmentScheduledAtTypeMigration();
    // await this.paymentsTable();
    await this.intraoralExamsTable();
    await this.intraoralExamsAppointmentMigration();
    await this.createIndexes();
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

  // async intraoralExamsTable() {
  //   try {
  //     const query = `
  //       CREATE TABLE IF NOT EXISTS intraoral_exams (
  //         id                      CHAR(36)      NOT NULL DEFAULT gen_random_uuid(),
  //         patient_id              CHAR(36)      NOT NULL,
  //         exam_date               DATE          NOT NULL,

  //         -- simple-array columns stored as TEXT (comma-separated)
  //         periodontal             TEXT          NULL,
  //         occlusion               TEXT          NULL,
  //         appliances              TEXT          NULL,
  //         appliances_other        VARCHAR(255)  NULL,
  //         tmd                     TEXT          NULL,
  //         xray_taken              TEXT          NULL,

  //         xray_periapical_teeth   VARCHAR(100)  NULL,
  //         xray_others             VARCHAR(255)  NULL,

  //         created_at              TIMESTAMP     NOT NULL DEFAULT NOW(),

  //         PRIMARY KEY (id),
  //         CONSTRAINT fk_intraoral_exam_patient
  //           FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
  //       );
  //     `;
  //     await this.dataSource.query(query);
  //     await this.dataSource.query(
  //       `ALTER TABLE intraoral_exams ADD COLUMN IF NOT EXISTS tooth_records JSONB NULL;`,
  //     );
  //     await this.dataSource.query(
  //       `UPDATE intraoral_exams
  //        SET tooth_records = (tooth_records #>> '{}')::jsonb
  //        WHERE jsonb_typeof(tooth_records) = 'string';`,
  //     );
  //     this.logger.log('intraoral_exams table created successfully');
  //   } catch (error) {
  //     this.logger.error('Error creating intraoral_exams table', error);
  //   }
  // }

  async intraoralExamsTable() {
    try {
      const query = `
      CREATE TABLE IF NOT EXISTS intraoral_exams (
        id                      CHAR(36)      NOT NULL DEFAULT gen_random_uuid(),
        patient_id              CHAR(36)      NOT NULL,
        exam_date               DATE          NOT NULL,
        periodontal             TEXT          NULL,
        occlusion               TEXT          NULL,
        appliances              TEXT          NULL,
        appliances_other        VARCHAR(255)  NULL,
        tmd                     TEXT          NULL,
        xray_taken              TEXT          NULL,
        xray_periapical_teeth   VARCHAR(100)  NULL,
        xray_others             VARCHAR(255)  NULL,
        tooth_records           JSONB         NULL,
        appointment_id          CHAR(36)      NULL,
        created_at              TIMESTAMP     NOT NULL DEFAULT NOW(),
        PRIMARY KEY (id),
        CONSTRAINT fk_intraoral_exam_patient
          FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        CONSTRAINT fk_intraoral_exams_appointment
          FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
      );
    `;
      await this.dataSource.query(query);
      this.logger.log('intraoral_exams table created successfully');
    } catch (error) {
      this.logger.error('Error creating intraoral_exams table', error);
    }
  }

  async intraoralExamsAppointmentMigration() {
    try {
      const appointmentIdCheck = await this.dataSource.query(`
      SELECT COUNT(*) as count
      FROM information_schema.columns
      WHERE table_schema = current_schema()
      AND table_name = 'intraoral_exams'
      AND column_name = 'appointment_id'
    `);

      if (Number(appointmentIdCheck[0].count) === 0) {
        await this.dataSource.query(`
        ALTER TABLE intraoral_exams 
        ADD COLUMN appointment_id CHAR(36) NULL;
      `);
        this.logger.log('intraoral_exams.appointment_id column added');
      }

      const fkCheck = await this.dataSource.query(`
      SELECT COUNT(*) as count
      FROM information_schema.table_constraints
      WHERE table_schema = current_schema()
      AND table_name = 'intraoral_exams'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name = 'fk_intraoral_exams_appointment'
    `);

      if (Number(fkCheck[0].count) === 0) {
        await this.dataSource.query(`
        ALTER TABLE intraoral_exams
        ADD CONSTRAINT fk_intraoral_exams_appointment
        FOREIGN KEY (appointment_id) 
        REFERENCES appointments(id) 
        ON DELETE SET NULL;
      `);
        this.logger.log(
          'intraoral_exams appointment_id foreign key constraint added',
        );
      }

      this.logger.log(
        'IntraoralExams appointment migration completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Error running intraoral exams appointment migration',
        error,
      );
    }
  }

  async usersTable() {
    try {
      const query = `
        CREATE TABLE IF NOT EXISTS users (
          id          UUID         NOT NULL DEFAULT gen_random_uuid(),
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

  // async patientsTable() {
  //   try {
  //     const query = `
  //       CREATE TABLE IF NOT EXISTS patients (
  //         id                UUID         NOT NULL DEFAULT gen_random_uuid(),
  //         last_name         VARCHAR(150) NOT NULL,
  //         first_name        VARCHAR(150) NOT NULL,
  //         middle_name       VARCHAR(150) NULL,
  //         address           VARCHAR(255) NOT NULL,
  //         cellphone_number  VARCHAR(20)  NOT NULL,
  //         age               INT          NOT NULL,
  //         occupation        VARCHAR(100) NOT NULL,
  //         complain          VARCHAR(255) NULL,
  //         status            VARCHAR(20)  NOT NULL DEFAULT 'SINGLE',
  //         created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
  //         updated_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
  //         PRIMARY KEY (id)
  //       );
  //     `;
  //     await this.dataSource.query(query);
  //     this.logger.log('patients table created successfully');
  //   } catch (error) {
  //     this.logger.error('Error creating patients table', error);
  //   }
  // }

  async patientsTable() {
    try {
      const query = `
      CREATE TABLE IF NOT EXISTS patients (
        id                        CHAR(36)      NOT NULL DEFAULT gen_random_uuid(),
        last_name                 VARCHAR(150)  NOT NULL,
        first_name                VARCHAR(150)  NOT NULL,
        middle_name               VARCHAR(150)  NULL,
        birthdate                 DATE          NULL,
        age                       INT           NULL,
        sex                       VARCHAR(1)    NULL,                 
        nickname                  VARCHAR(100)  NULL,
        religion                  VARCHAR(100)  NULL,
        nationality               VARCHAR(100)  NULL,
        address              VARCHAR(255)  NULL,
        home_no                   VARCHAR(30)   NULL,
        office_no                 VARCHAR(30)   NULL,
        fax_no                    VARCHAR(30)   NULL,
        cellphone_number          VARCHAR(20)   NULL,
        email                     VARCHAR(150)  NULL,
        occupation                VARCHAR(100)  NULL,
        dental_insurance          VARCHAR(150)  NULL,
        effective_date            DATE          NULL,

        parent_guardian_name      VARCHAR(150)  NULL,
        parent_occupation         VARCHAR(100)  NULL,
        referred_by               VARCHAR(255)  NULL,
        reason_for_consultation   VARCHAR(255)  NULL,

        prev_dentist              VARCHAR(150)  NULL,
        last_dental_visit         VARCHAR(100)  NULL,

        -- Medical History – Physician
        physician_name            VARCHAR(150)  NULL,
        physician_specialty       VARCHAR(100)  NULL,
        physician_office_address  VARCHAR(255)  NULL,
        physician_office_no       VARCHAR(30)   NULL,

        ar_gh                     SMALLINT      NOT NULL DEFAULT 1,   
        ar_umt                    SMALLINT      NOT NULL DEFAULT 1,   
        umt_cond                  VARCHAR(255)  NULL,                 
        ar_sio                    SMALLINT      NOT NULL DEFAULT 1,   
        sio_detail                VARCHAR(255)  NULL,
        ar_hosp                   SMALLINT      NOT NULL DEFAULT 1,  
        hosp_detail               VARCHAR(255)  NULL,
        ar_med                    SMALLINT      NOT NULL DEFAULT 1,  
        med_detail                VARCHAR(255)  NULL,
        ar_tob                    SMALLINT      NOT NULL DEFAULT 1,   
        ar_drug                   SMALLINT      NOT NULL DEFAULT 1,   
        ar_all                    SMALLINT      NOT NULL DEFAULT 1,   

        allergies                 TEXT          NULL,                 
        allergy_others            VARCHAR(100)  NULL,

        bleeding_time             VARCHAR(50)   NULL,

       
        ar_preg                   SMALLINT      NULL,                 
        ar_nurs                   SMALLINT      NULL,                 
        ar_bcp                    SMALLINT      NULL,                

        -- Blood info
        blood_type                VARCHAR(10)   NULL,
        blood_pressure            VARCHAR(20)   NULL,

        
        med_conds                 TEXT          NULL,               
        med_conds_other           VARCHAR(255)  NULL,

        
        status                    VARCHAR(20)   NOT NULL DEFAULT 'single',

        created_at                TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at                TIMESTAMP     NOT NULL DEFAULT NOW(),

        PRIMARY KEY (id)
      );
    `;
      await this.dataSource.query(query);
      this.logger.log('patients table created successfully');
    } catch (error) {
      this.logger.error('Error creating patients table', error);
    }
  }

  /**
   * Adds / migrates all new columns on an already-existing patients table.
   * Safe to run multiple times (checks information_schema first).
   */
  async patientHealthQuestionsMigration() {
    const columns: Array<{ name: string; definition: string }> = [
      // Basic
      { name: 'birthdate', definition: 'DATE NULL' },
      { name: 'sex', definition: 'VARCHAR(1) NULL' },
      { name: 'nickname', definition: 'VARCHAR(100) NULL' },
      { name: 'religion', definition: 'VARCHAR(100) NULL' },
      { name: 'nationality', definition: 'VARCHAR(100) NULL' },
      { name: 'address', definition: 'VARCHAR(255) NULL' },
      { name: 'home_no', definition: 'VARCHAR(30) NULL' },
      { name: 'office_no', definition: 'VARCHAR(30) NULL' },
      { name: 'fax_no', definition: 'VARCHAR(30) NULL' },
      { name: 'email', definition: 'VARCHAR(150) NULL' },
      { name: 'dental_insurance', definition: 'VARCHAR(150) NULL' },
      { name: 'effective_date', definition: 'DATE NULL' },

      // Minors
      { name: 'parent_guardian_name', definition: 'VARCHAR(150) NULL' },
      { name: 'parent_occupation', definition: 'VARCHAR(100) NULL' },
      { name: 'referred_by', definition: 'VARCHAR(255) NULL' },
      { name: 'reason_for_consultation', definition: 'VARCHAR(255) NULL' },

      // Dental History
      { name: 'prev_dentist', definition: 'VARCHAR(150) NULL' },
      { name: 'last_dental_visit', definition: 'VARCHAR(100) NULL' },

      // Physician
      { name: 'physician_name', definition: 'VARCHAR(150) NULL' },
      { name: 'physician_specialty', definition: 'VARCHAR(100) NULL' },
      { name: 'physician_office_address', definition: 'VARCHAR(255) NULL' },
      { name: 'physician_office_no', definition: 'VARCHAR(30) NULL' },

      // Yes / No (0 = Yes, 1 = No)
      { name: 'ar_gh', definition: 'SMALLINT NOT NULL DEFAULT 1' },
      { name: 'ar_umt', definition: 'SMALLINT NOT NULL DEFAULT 1' },
      { name: 'umt_cond', definition: 'VARCHAR(255) NULL' },
      { name: 'ar_sio', definition: 'SMALLINT NOT NULL DEFAULT 1' },
      { name: 'sio_detail', definition: 'VARCHAR(255) NULL' },
      { name: 'ar_hosp', definition: 'SMALLINT NOT NULL DEFAULT 1' },
      { name: 'hosp_detail', definition: 'VARCHAR(255) NULL' },
      { name: 'ar_med', definition: 'SMALLINT NOT NULL DEFAULT 1' },
      { name: 'med_detail', definition: 'VARCHAR(255) NULL' },
      { name: 'ar_tob', definition: 'SMALLINT NOT NULL DEFAULT 1' },
      { name: 'ar_drug', definition: 'SMALLINT NOT NULL DEFAULT 1' },
      { name: 'ar_all', definition: 'SMALLINT NOT NULL DEFAULT 1' },

      // Allergies
      { name: 'allergies', definition: 'TEXT NULL' },
      { name: 'allergy_others', definition: 'VARCHAR(100) NULL' },
      { name: 'bleeding_time', definition: 'VARCHAR(50) NULL' },

      // Women only
      { name: 'ar_preg', definition: 'SMALLINT NULL' },
      { name: 'ar_nurs', definition: 'SMALLINT NULL' },
      { name: 'ar_bcp', definition: 'SMALLINT NULL' },

      // Blood
      { name: 'blood_type', definition: 'VARCHAR(10) NULL' },
      { name: 'blood_pressure', definition: 'VARCHAR(20) NULL' },

      // Medical conditions
      { name: 'med_conds', definition: 'TEXT NULL' },
      { name: 'med_conds_other', definition: 'VARCHAR(255) NULL' },
    ];

    for (const col of columns) {
      try {
        const check = await this.dataSource.query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'patients'
          AND column_name = '${col.name}'
      `);

        if (Number(check[0].count) === 0) {
          await this.dataSource.query(`
          ALTER TABLE patients ADD COLUMN ${col.name} ${col.definition};
        `);
          this.logger.log(`patients.${col.name} column added`);
        }
      } catch (error) {
        this.logger.error(`Error migrating patients.${col.name}`, error);
      }
    }

    // Optional: drop the old health-question columns if they still exist
    // const oldColumns = [
    //   'ar_sinus_trouble',
    //   'ar_headaches',
    //   'ar_freq_colds',
    //   'ar_allergies',
    //   'ar_diabetes',
    //   'ar_bleeding_gums',
    //   'ar_self_medication',
    //   'ar_heart_bp',
    //   'complain',
    // ];

    // for (const oldCol of oldColumns) {
    //   try {
    //     const check = await this.dataSource.query(`
    //     SELECT COUNT(*) as count
    //     FROM information_schema.columns
    //     WHERE table_schema = 'public'
    //       AND table_name = 'patients'
    //       AND column_name = '${oldCol}'
    //   `);

    //     if (Number(check[0].count) > 0) {
    //       await this.dataSource.query(`
    //       ALTER TABLE patients DROP COLUMN IF EXISTS ${oldCol};
    //     `);
    //       this.logger.log(`patients.${oldCol} (old) column dropped`);
    //     }
    //   } catch (error) {
    //     this.logger.error(
    //       `Error dropping old column patients.${oldCol}`,
    //       error,
    //     );
    //   }
    // }

    // Make sure the original required columns that may have changed nullability are handled
    // (address, cellphone_number, age, occupation are now nullable in the new design)
    try {
      await this.dataSource.query(`
      ALTER TABLE patients
        ALTER COLUMN address DROP NOT NULL,
        ALTER COLUMN cellphone_number DROP NOT NULL,
        ALTER COLUMN age DROP NOT NULL,
        ALTER COLUMN occupation DROP NOT NULL;
    `);
      this.logger.log(
        'patients – relaxed NOT NULL constraints on legacy columns',
      );
    } catch (error) {
      // ignore if already nullable or column names differ
    }

    this.logger.log('Patient health questions migration completed');
  }

  async appointmentsTable() {
    try {
      // branch stores one of EBranches ('UEP_MAIN' | 'CATUBIG' | 'CALBAYOG')
      // directly — no branches table/FK, since the set of branches is fixed.
      //
      // scheduled_at is stored as TIMESTAMPTZ. No old no_show column exists in
      // the current entity schema.
      const query = `
        CREATE TABLE IF NOT EXISTS appointments (
          id                  CHAR(36)      NOT NULL DEFAULT gen_random_uuid(),
          patient_id          CHAR(36)      NOT NULL,
          branch          VARCHAR(20)   NOT NULL,
          scheduled_at    TIMESTAMPTZ   NOT NULL,
          treatment_done  TEXT          NOT NULL,
          service         VARCHAR(30)   NOT NULL,
          service_type    VARCHAR(30)   NULL,
          amount_charge   NUMERIC(10,2) NOT NULL DEFAULT 0,
          balance         NUMERIC(10,2) NOT NULL DEFAULT 0,
          appointment_status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
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

  // Adds appointments.service / appointments.service_type to tables created
  // before these columns existed. Added NULLable (not NOT NULL like the
  // fresh-create schema) since existing rows have no service data to
  // backfill — enforce presence at the DTO/service-layer level instead.
  // Safe to re-run — each column check runs independently.
  async appointmentServiceColumnsMigration() {
    try {
      const serviceColumnCheck = await this.dataSource.query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_schema = current_schema()
        AND table_name = 'appointments'
        AND column_name = 'service'
      `);

      if (Number(serviceColumnCheck[0].count) === 0) {
        await this.dataSource.query(`
          ALTER TABLE appointments ADD COLUMN service VARCHAR(30) NULL;
          
        `);
        this.logger.log('appointments.service column added');
      }

      const serviceTypeColumnCheck = await this.dataSource.query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_schema = current_schema()
        AND table_name = 'appointments'
        AND column_name = 'service_type'
      `);

      if (Number(serviceTypeColumnCheck[0].count) === 0) {
        await this.dataSource.query(`
          ALTER TABLE appointments ADD COLUMN service_type VARCHAR(30) NULL;
        `);
        this.logger.log('appointments.service_type column added');
      }

      this.logger.log(
        'Appointment service columns migration completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Error running appointment service columns migration',
        error,
      );
    }
  }

  async paymentsTable() {
    try {
      const query = `
        CREATE TABLE IF NOT EXISTS payments (
          id              CHAR(36)          NOT NULL DEFAULT gen_random_uuid(),
          appointment_id  CHAR(36)          NOT NULL,
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
        scheduledAtType[0].data_type !== 'timestamp with time zone'
      ) {
        await this.dataSource.query(`
          ALTER TABLE appointments
          ALTER COLUMN scheduled_at TYPE timestamptz USING scheduled_at::timestamptz;
        `);
        this.logger.log('appointments.scheduled_at converted to TIMESTAMPTZ');
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
        SET balance = a.amount_charge - COALESCE(
          (SELECT SUM(p.amount_paid) FROM payments p WHERE p.appointment_id = a.id), 0
        );
      `);

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
        CREATE OR REPLACE FUNCTION recalc_appointment_balance_on_amount_charge_change() RETURNS TRIGGER AS $$
        BEGIN
          NEW.balance := NEW.amount_charge - COALESCE(
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
        BEFORE INSERT OR UPDATE OF amount_charge ON appointments
        FOR EACH ROW EXECUTE FUNCTION recalc_appointment_balance_on_amount_charge_change();
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
        name: 'idx_intraoral_exams_appointment',
        sql: 'CREATE INDEX idx_intraoral_exams_appointment ON intraoral_exams (appointment_id)',
      },
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
        name: 'idx_appointments_service',
        table: 'appointments',
        sql: 'CREATE INDEX idx_appointments_service ON appointments (service)',
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
      // ── tooth_records ────────────────────────────────────────────────────
      // {
      //   name: 'idx_tooth_records_patient',
      //   sql: 'CREATE INDEX idx_tooth_records_patient ON tooth_records (patient_id)',
      // },
      // {
      //   name: 'idx_tooth_records_patient_tooth',
      //   sql: 'CREATE INDEX idx_tooth_records_patient_tooth ON tooth_records (patient_id, tooth_number)',
      // },
      // {
      //   name: 'idx_tooth_records_condition',
      //   sql: 'CREATE INDEX idx_tooth_records_condition ON tooth_records (condition)',
      // },

      // ── intraoral_exams ──────────────────────────────────────────────────
      {
        name: 'idx_intraoral_exams_patient',
        sql: 'CREATE INDEX idx_intraoral_exams_patient ON intraoral_exams (patient_id)',
      },
      {
        name: 'idx_intraoral_exams_exam_date',
        sql: 'CREATE INDEX idx_intraoral_exams_exam_date ON intraoral_exams (exam_date)',
      },
      {
        name: 'idx_intraoral_exams_patient_date',
        sql: 'CREATE INDEX idx_intraoral_exams_patient_date ON intraoral_exams (patient_id, exam_date)',
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
