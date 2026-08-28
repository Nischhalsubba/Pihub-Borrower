import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const internalKey = Deno.env.get('PIHUB_INTERNAL_JOB_KEY');
  if (!internalKey || request.headers.get('x-pihub-internal-key') !== internalKey) return json({ error: 'unauthorized' }, 401);
  const { notificationId } = await request.json() as { notificationId?: string };
  if (!notificationId) return json({ error: 'notificationId_required' }, 400);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const mailerUrl = Deno.env.get('PIHUB_MAILER_URL');
  const mailerToken = Deno.env.get('PIHUB_MAILER_TOKEN');
  if (!url || !serviceRole || !mailerUrl || !mailerToken) return json({ error: 'service_not_configured' }, 503);
  const supabase = createClient(url, serviceRole, { auth: { persistSession: false } });

  const { data: notification, error } = await supabase.from('notifications').select('id,user_id,title,body,href').eq('id', notificationId).single();
  if (error || !notification) return json({ error: 'notification_not_found' }, 404);
  const { data: userData } = await supabase.auth.admin.getUserById(notification.user_id);
  const email = userData?.user?.email;
  if (!email) return json({ error: 'recipient_email_unavailable' }, 422);

  const response = await fetch(mailerUrl, {
    method: 'POST',
    headers: { authorization: `Bearer ${mailerToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ template: 'borrower-notification', to: email, data: { title: notification.title, body: notification.body, href: notification.href } })
  });
  if (!response.ok) return json({ error: 'mailer_failed' }, 502);
  return json({ delivered: true, notificationId });
});
