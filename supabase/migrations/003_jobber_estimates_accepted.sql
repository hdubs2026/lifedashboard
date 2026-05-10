alter table jobber_daily
  add column if not exists estimates_accepted_today integer,
  add column if not exists estimates_accepted_mtd integer;
