-- Indeksy dla szybkiego pobierania głównych zdjęć aukcji i zarządzania sesjami.
create index if not exists listing_photos_listing_kind_position_idx
  on listing_photos (listing_id, kind, position);

create index if not exists sessions_user_created_idx
  on sessions (user_id, created_at);

create index if not exists sessions_expires_idx
  on sessions (expires_at);
