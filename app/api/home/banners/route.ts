import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rowToHomeBanner, type HomeBannerRow } from '@/lib/route-home-ads/db';

/**
 * GET /api/home/banners — public active homepage banners (no auth).
 */
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase
    .from('home_banners')
    .select(
      'id, source_application_id, image_url, title, subtitle, cta_label, link_url, sponsored_label, starts_at, ends_at, sort_order, is_active, created_by, created_at, updated_at',
    )
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('home_banners public list:', error);
    return NextResponse.json({ error: 'Failed to load banners' }, { status: 500 });
  }

  const rows = (data ?? []) as HomeBannerRow[];
  return NextResponse.json({ banners: rows.map(rowToHomeBanner) });
}
