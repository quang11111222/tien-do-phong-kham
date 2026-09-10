begin;

drop policy if exists work_items_read on public.work_items;
create policy work_items_read on public.work_items for select to authenticated
using (public.is_manager() or public.can_view_work_item(id));

drop policy if exists participants_read on public.work_item_participants;
create policy participants_read on public.work_item_participants for select to authenticated
using (public.is_manager() or public.can_view_work_item(work_item_id));

drop policy if exists progress_updates_read on public.progress_updates;
create policy progress_updates_read on public.progress_updates for select to authenticated
using (public.is_manager() or public.can_view_work_item(work_item_id));

drop policy if exists attachments_read on public.attachments;
create policy attachments_read on public.attachments for select to authenticated
using (public.is_manager() or public.can_view_work_item(work_item_id));

drop policy if exists completion_requests_read on public.completion_requests;
create policy completion_requests_read on public.completion_requests for select to authenticated
using (public.is_manager() or submitted_by = auth.uid() or public.can_review_work_item(work_item_id));

commit;
