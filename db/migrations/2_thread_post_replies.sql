alter table bookapp.thread_posts
  add column if not exists parent_post_id uuid;

alter table bookapp.thread_posts
  drop constraint if exists thread_posts_thread_id_id_uniq;

alter table bookapp.thread_posts
  add constraint thread_posts_thread_id_id_uniq
  unique (thread_id, id);

alter table bookapp.thread_posts
  drop constraint if exists thread_posts_parent_post_fk;

alter table bookapp.thread_posts
  add constraint thread_posts_parent_post_fk
  foreign key (thread_id, parent_post_id)
  references bookapp.thread_posts(thread_id, id)
  on delete cascade;

create index if not exists thread_posts_thread_parent_created_at_idx
  on bookapp.thread_posts(thread_id, parent_post_id, created_at, id);
