-- Break recursive RLS by using security definer helper and relax SELECT for waiting matches
create or replace function public.is_user_in_trivia_match(_user_id uuid, _match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.trivia_1v1_players p
    where p.match_id = _match_id and p.user_id = _user_id
  );
$$;

-- Matches policies
drop policy if exists "Users can view matches they're in" on public.trivia_1v1_matches;
create policy "Users can view matches"
  on public.trivia_1v1_matches
  for select
  to authenticated
  using (
    public.is_user_in_trivia_match(auth.uid(), id)
    or status = 'waiting'
  );

drop policy if exists "Players in match can update it" on public.trivia_1v1_matches;
create policy "Players can update their matches"
  on public.trivia_1v1_matches
  for update
  to authenticated
  using (public.is_user_in_trivia_match(auth.uid(), id));

-- Ensure insert policy exists and is simple (non-recursive)
drop policy if exists "Users can create matches" on public.trivia_1v1_matches;
create policy "Users can create matches"
  on public.trivia_1v1_matches
  for insert
  to authenticated
  with check (auth.uid() is not null);

-- Players policies (avoid recursion by using helper)
drop policy if exists "Users can view match players" on public.trivia_1v1_players;
create policy "Users can view match players"
  on public.trivia_1v1_players
  for select
  to authenticated
  using (
    user_id = auth.uid() or public.is_user_in_trivia_match(auth.uid(), match_id)
  );