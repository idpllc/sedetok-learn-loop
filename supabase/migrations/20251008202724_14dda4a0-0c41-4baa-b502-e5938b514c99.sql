-- Create enum types
create type public.app_role as enum ('admin', 'moderator', 'user');
create type public.content_type as enum ('video', 'document', 'quiz');
create type public.grade_level as enum ('primaria', 'secundaria', 'preparatoria', 'universidad');
create type public.category_type as enum ('matematicas', 'ciencias', 'lenguaje', 'historia', 'arte', 'tecnologia', 'otros');

-- Profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text,
  bio text,
  avatar_url text,
  institution text,
  is_verified boolean default false,
  followers_count integer default 0,
  following_count integer default 0,
  total_likes integer default 0,
  total_views integer default 0,
  experience_points integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- User roles table
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create policy "Roles are viewable by everyone"
  on public.user_roles for select
  using (true);

-- Content table
create table public.content (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  content_type content_type not null,
  category category_type not null,
  grade_level grade_level not null,
  thumbnail_url text,
  video_url text,
  document_url text,
  tags text[] default array[]::text[],
  is_public boolean default true,
  likes_count integer default 0,
  comments_count integer default 0,
  shares_count integer default 0,
  saves_count integer default 0,
  views_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.content enable row level security;

create policy "Public content is viewable by everyone"
  on public.content for select
  using (is_public = true or auth.uid() = creator_id);

create policy "Users can create content"
  on public.content for insert
  with check (auth.uid() = creator_id);

create policy "Users can update own content"
  on public.content for update
  using (auth.uid() = creator_id);

create policy "Users can delete own content"
  on public.content for delete
  using (auth.uid() = creator_id);

-- Likes table
create table public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  content_id uuid references public.content(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique (user_id, content_id)
);

alter table public.likes enable row level security;

create policy "Likes are viewable by everyone"
  on public.likes for select
  using (true);

create policy "Users can like content"
  on public.likes for insert
  with check (auth.uid() = user_id);

create policy "Users can unlike content"
  on public.likes for delete
  using (auth.uid() = user_id);

-- Comments table
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  content_id uuid references public.content(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  parent_id uuid references public.comments(id) on delete cascade,
  comment_text text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.comments enable row level security;

create policy "Comments are viewable by everyone"
  on public.comments for select
  using (true);

create policy "Users can create comments"
  on public.comments for insert
  with check (auth.uid() = user_id);

create policy "Users can update own comments"
  on public.comments for update
  using (auth.uid() = user_id);

create policy "Users can delete own comments"
  on public.comments for delete
  using (auth.uid() = user_id);

-- Saves table
create table public.saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  content_id uuid references public.content(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique (user_id, content_id)
);

alter table public.saves enable row level security;

create policy "Saves are viewable by owner"
  on public.saves for select
  using (auth.uid() = user_id);

create policy "Users can save content"
  on public.saves for insert
  with check (auth.uid() = user_id);

create policy "Users can unsave content"
  on public.saves for delete
  using (auth.uid() = user_id);

-- Follows table
create table public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid references public.profiles(id) on delete cascade not null,
  following_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique (follower_id, following_id),
  check (follower_id != following_id)
);

alter table public.follows enable row level security;

create policy "Follows are viewable by everyone"
  on public.follows for select
  using (true);

create policy "Users can follow others"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "Users can unfollow others"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- Achievements table
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  icon text,
  points integer default 0,
  created_at timestamptz default now()
);

alter table public.achievements enable row level security;

create policy "Achievements are viewable by everyone"
  on public.achievements for select
  using (true);

-- User achievements table
create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  achievement_id uuid references public.achievements(id) on delete cascade not null,
  earned_at timestamptz default now(),
  unique (user_id, achievement_id)
);

alter table public.user_achievements enable row level security;

create policy "User achievements are viewable by everyone"
  on public.user_achievements for select
  using (true);

-- Learning paths table
create table public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  category category_type not null,
  grade_level grade_level not null,
  is_public boolean default true,
  thumbnail_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.learning_paths enable row level security;

create policy "Public learning paths are viewable by everyone"
  on public.learning_paths for select
  using (is_public = true or auth.uid() = creator_id);

create policy "Users can create learning paths"
  on public.learning_paths for insert
  with check (auth.uid() = creator_id);

create policy "Users can update own learning paths"
  on public.learning_paths for update
  using (auth.uid() = creator_id);

create policy "Users can delete own learning paths"
  on public.learning_paths for delete
  using (auth.uid() = creator_id);

-- Learning path content table
create table public.learning_path_content (
  id uuid primary key default gen_random_uuid(),
  path_id uuid references public.learning_paths(id) on delete cascade not null,
  content_id uuid references public.content(id) on delete cascade not null,
  order_index integer not null,
  created_at timestamptz default now(),
  unique (path_id, content_id)
);

alter table public.learning_path_content enable row level security;

create policy "Learning path content is viewable by everyone"
  on public.learning_path_content for select
  using (true);

-- Quiz questions table
create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  content_id uuid references public.content(id) on delete cascade not null,
  question_text text not null,
  options jsonb not null,
  correct_answer integer not null,
  points integer default 10,
  order_index integer not null,
  created_at timestamptz default now()
);

alter table public.quiz_questions enable row level security;

create policy "Quiz questions are viewable by everyone"
  on public.quiz_questions for select
  using (true);

-- Quiz attempts table
create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  content_id uuid references public.content(id) on delete cascade not null,
  score integer not null,
  max_score integer not null,
  completed_at timestamptz default now()
);

alter table public.quiz_attempts enable row level security;

create policy "Users can view own quiz attempts"
  on public.quiz_attempts for select
  using (auth.uid() = user_id);

create policy "Users can create quiz attempts"
  on public.quiz_attempts for insert
  with check (auth.uid() = user_id);

-- Functions

-- Handle new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  
  insert into public.user_roles (user_id, role)
  values (new.id, 'user');
  
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Check if user has role
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

create trigger update_content_updated_at
  before update on public.content
  for each row execute function public.update_updated_at_column();

create trigger update_comments_updated_at
  before update on public.comments
  for each row execute function public.update_updated_at_column();

create trigger update_learning_paths_updated_at
  before update on public.learning_paths
  for each row execute function public.update_updated_at_column();

-- Increment likes count
create or replace function public.increment_likes_count()
returns trigger
language plpgsql
as $$
begin
  update public.content
  set likes_count = likes_count + 1
  where id = new.content_id;
  
  update public.profiles
  set total_likes = total_likes + 1
  where id = (select creator_id from public.content where id = new.content_id);
  
  return new;
end;
$$;

create trigger on_like_created
  after insert on public.likes
  for each row execute function public.increment_likes_count();

-- Decrement likes count
create or replace function public.decrement_likes_count()
returns trigger
language plpgsql
as $$
begin
  update public.content
  set likes_count = likes_count - 1
  where id = old.content_id;
  
  update public.profiles
  set total_likes = total_likes - 1
  where id = (select creator_id from public.content where id = old.content_id);
  
  return old;
end;
$$;

create trigger on_like_deleted
  after delete on public.likes
  for each row execute function public.decrement_likes_count();

-- Increment comments count
create or replace function public.increment_comments_count()
returns trigger
language plpgsql
as $$
begin
  update public.content
  set comments_count = comments_count + 1
  where id = new.content_id;
  
  return new;
end;
$$;

create trigger on_comment_created
  after insert on public.comments
  for each row execute function public.increment_comments_count();

-- Decrement comments count
create or replace function public.decrement_comments_count()
returns trigger
language plpgsql
as $$
begin
  update public.content
  set comments_count = comments_count - 1
  where id = old.content_id;
  
  return old;
end;
$$;

create trigger on_comment_deleted
  after delete on public.comments
  for each row execute function public.decrement_comments_count();

-- Increment saves count
create or replace function public.increment_saves_count()
returns trigger
language plpgsql
as $$
begin
  update public.content
  set saves_count = saves_count + 1
  where id = new.content_id;
  
  return new;
end;
$$;

create trigger on_save_created
  after insert on public.saves
  for each row execute function public.increment_saves_count();

-- Decrement saves count
create or replace function public.decrement_saves_count()
returns trigger
language plpgsql
as $$
begin
  update public.content
  set saves_count = saves_count - 1
  where id = old.content_id;
  
  return old;
end;
$$;

create trigger on_save_deleted
  after delete on public.saves
  for each row execute function public.decrement_saves_count();

-- Update followers count
create or replace function public.update_followers_count()
returns trigger
language plpgsql
as $$
begin
  if (TG_OP = 'INSERT') then
    update public.profiles set followers_count = followers_count + 1 where id = new.following_id;
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
  elsif (TG_OP = 'DELETE') then
    update public.profiles set followers_count = followers_count - 1 where id = old.following_id;
    update public.profiles set following_count = following_count - 1 where id = old.follower_id;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger on_follow_change
  after insert or delete on public.follows
  for each row execute function public.update_followers_count();

-- Create indexes for better performance
create index idx_content_creator_id on public.content(creator_id);
create index idx_content_category on public.content(category);
create index idx_content_grade_level on public.content(grade_level);
create index idx_content_created_at on public.content(created_at desc);
create index idx_likes_user_id on public.likes(user_id);
create index idx_likes_content_id on public.likes(content_id);
create index idx_comments_content_id on public.comments(content_id);
create index idx_comments_user_id on public.comments(user_id);
create index idx_saves_user_id on public.saves(user_id);
create index idx_follows_follower_id on public.follows(follower_id);
create index idx_follows_following_id on public.follows(following_id);