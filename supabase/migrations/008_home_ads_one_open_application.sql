-- One in-flight homepage ad application per route (draft or pending_review).
-- Also at most one published banner per source application.

drop index if exists public.route_home_ad_applications_one_pending_per_route_idx;

create unique index if not exists route_home_ad_applications_one_open_per_route_idx
  on public.route_home_ad_applications (route_id)
  where status in ('draft', 'pending_review');

create unique index if not exists home_banners_one_per_source_application_idx
  on public.home_banners (source_application_id)
  where source_application_id is not null;
