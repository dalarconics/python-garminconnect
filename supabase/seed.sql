-- Seed macrocycle phases and milestones for Diego (mmB 2027 + Reto Letras)

delete from public.macrocycle_phases where user_id = '00000000-0000-0000-0000-000000000001';
delete from public.event_milestones where user_id = '00000000-0000-0000-0000-000000000001';

insert into public.event_milestones (user_id, code, name, event_date, notes) values
    ('00000000-0000-0000-0000-000000000001', 'mmb_2027', 'Media Maraton Bogota 2027', '2027-07-25', 'https://www.mediamaratonbogota.com/faq'),
    ('00000000-0000-0000-0000-000000000001', 'reto_letras_2027', 'Reto Mariquita Letras 2027', '2027-09-13', 'Fecha estimada; confirmar calendario oficial');

insert into public.macrocycle_phases (user_id, code, name, start_date, end_date, focus, sport, hr_cap, max_duration_min) values
    ('00000000-0000-0000-0000-000000000001', 'R0', 'Recuperacion', '2026-09-20', '2026-10-05', 'ACWR < 1.0; solo Z1-Z2', 'walk/off', 128, 45),
    ('00000000-0000-0000-0000-000000000001', 'R1', 'Base aerobica', '2026-10-06', '2026-12-31', '80/20, VO2 -> 44+', 'run+bike', 135, 75),
    ('00000000-0000-0000-0000-000000000001', 'R2', 'Construccion', '2027-01-01', '2027-03-31', 'Volumen + 1 tempo/sem', 'run', 141, 90),
    ('00000000-0000-0000-0000-000000000001', 'R3', 'Especifico 21K', '2027-04-01', '2027-07-24', 'Long run, ritmo mmB', 'run', 155, 120),
    ('00000000-0000-0000-0000-000000000001', 'R4', 'Carrera mmB', '2027-07-25', '2027-07-25', 'Taper + carrera', 'race', 182, 150),
    ('00000000-0000-0000-0000-000000000001', 'R5', 'Transicion ciclismo', '2027-08-01', '2027-08-31', 'Fuerza + bici subida', 'bike', 141, 120),
    ('00000000-0000-0000-0000-000000000001', 'R6', 'Reto Letras', '2027-09-01', '2027-09-13', 'Ascenso + taper', 'bike', 155, 180);
