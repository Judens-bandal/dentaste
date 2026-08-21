-- Run after verifying any required legacy tooth_records data has been migrated.
-- intraoral_exams.tooth_records is the replacement JSONB source of truth.
UPDATE intraoral_exams
SET tooth_records = (tooth_records #>> '{}')::jsonb
WHERE jsonb_typeof(tooth_records) = 'string';

DROP TABLE IF EXISTS tooth_records;
