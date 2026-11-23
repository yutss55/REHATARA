-- Semua password contoh: password123
INSERT INTO divisions (name, description, created_at) VALUES
 ('Teknologi Informasi','Pengembangan dan infrastruktur','2020-01-03'),
 ('Keuangan','Akuntansi dan anggaran','2020-01-03'),
 ('Pemasaran','Brand dan penjualan','2021-02-15'),
 ('Sumber Daya Manusia','Rekrutmen dan administrasi karyawan','2020-01-03');

INSERT INTO users (username,email,password_hash,full_name,phone,address,role,division_id,join_date,leave_quota) VALUES
 ('admin','admin@perusahaan.co.id',crypt('password123',gen_salt('bf')),'Admin Sistem',NULL,NULL,'admin',NULL,'2019-01-01',12),
 ('siti.a','siti@perusahaan.co.id',crypt('password123',gen_salt('bf')),'Siti Aminah','0811-1111-1111','Makassar','hrd',4,'2019-08-18',12),
 ('bagas.w','bagas@perusahaan.co.id',crypt('password123',gen_salt('bf')),'Bagas Wicaksono','0812-2222-2222','Makassar','leader',1,'2020-01-03',12),
 ('maya.l','maya@perusahaan.co.id',crypt('password123',gen_salt('bf')),'Maya Lestari','0812-3333-3333','Makassar','leader',2,'2020-01-03',12),
 ('rudi.h','rudi@perusahaan.co.id',crypt('password123',gen_salt('bf')),'Rudi Hartono','0812-4444-4444','Makassar','leader',3,'2021-02-15',12),
 ('aulia.r','aulia@perusahaan.co.id',crypt('password123',gen_salt('bf')),'Aulia Rahman','0812-5555-5555','Makassar','employee',1,'2023-03-12',12),
 ('dimas.p','dimas@perusahaan.co.id',crypt('password123',gen_salt('bf')),'Dimas Prakoso','0812-6666-6666','Makassar','employee',1,'2026-09-02',12),
 ('zalfa.n','zalfa@perusahaan.co.id',crypt('password123',gen_salt('bf')),'Zalfa Nuraini','0812-3456-7890','Jl. Sultan Hasanuddin 21, Makassar','employee',1,'2024-05-09',8.5),
 ('hendra.g','hendra@perusahaan.co.id',crypt('password123',gen_salt('bf')),'Hendra Gunawan','0812-7777-7777','Makassar','employee',2,'2022-10-21',12),
 ('rani.o','rani@perusahaan.co.id',crypt('password123',gen_salt('bf')),'Rani Oktaviani','0812-8888-8888','Makassar','employee',3,'2024-01-15',12);

UPDATE divisions SET leader_id=(SELECT id FROM users WHERE username='bagas.w') WHERE name='Teknologi Informasi';
UPDATE divisions SET leader_id=(SELECT id FROM users WHERE username='maya.l') WHERE name='Keuangan';
UPDATE divisions SET leader_id=(SELECT id FROM users WHERE username='rudi.h') WHERE name='Pemasaran';
UPDATE divisions SET leader_id=(SELECT id FROM users WHERE username='siti.a') WHERE name='Sumber Daya Manusia';

INSERT INTO leave_types (name,quota_days,min_notice_days,max_late_days,requires_attachment,deducts_annual_quota,is_system) VALUES
 ('Cuti Tahunan',12,3,0,false,true,true),
 ('Cuti Sakit',NULL,0,3,true,false,true),
 ('Cuti Menikah',3,14,0,true,false,false),
 ('Cuti Melahirkan',90,30,0,true,false,false),
 ('Cuti Duka',2,0,0,false,false,false);
INSERT INTO leave_types (name,quota_days,min_notice_days,deducts_annual_quota,is_active) VALUES ('Cuti Tanpa Gaji',14,7,false,false);

INSERT INTO holidays (date,name,type) VALUES
 ('2026-12-24','Cuti bersama Natal','collective'),
 ('2026-12-25','Hari Raya Natal','national'),
 ('2027-01-01','Tahun Baru Masehi','national');
INSERT INTO blackout_periods (start_date,end_date,note) VALUES ('2026-12-28','2027-01-08','Tutup buku akhir tahun');
INSERT INTO settings VALUES ('capacity_percent','30');

INSERT INTO leave_requests (user_id,leave_type_id,start_date,end_date,total_days,reason,substitute_id,handover_note,address,emergency_phone,status,created_at)
SELECT z.id,1,'2026-12-07','2026-12-09',3,'Acara keluarga di luar kota.',d.id,'Laporan mingguan sudah dikirim.','Jl. Sultan Hasanuddin 21, Makassar','0812-3456-7890','approved_leader','2026-11-19 09:14'
FROM users z, users d WHERE z.username='zalfa.n' AND d.username='dimas.p';
INSERT INTO leave_approvals (request_id,approver_id,level,decision,note,decided_at)
SELECT 1,id,'leader','approved','Disetujui, pastikan handover rapi.','2026-11-20 13:02' FROM users WHERE username='bagas.w';
