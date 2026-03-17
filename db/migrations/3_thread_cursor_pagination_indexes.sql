create index if not exists threads_club_book_feed_idx
  on bookapp.threads(club_id, club_book_id, is_pinned desc, created_at desc, id desc)
  where deleted_at is null;

create index if not exists thread_posts_thread_top_level_created_at_idx
  on bookapp.thread_posts(thread_id, created_at, id)
  where parent_post_id is null;
