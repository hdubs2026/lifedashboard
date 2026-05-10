alter table jobber_daily
  add column if not exists estimates_sent_mtd integer;
