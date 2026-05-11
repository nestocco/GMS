// supabase/functions/enviar-email-lead/index.ts
// Envía un email al prospecto via Resend.
// Requiere secrets: RESEND_API_KEY, RESEND_FROM_EMAIL.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED = ['R1_DUENO', 'R2_ENCARGADO', 'R3_STAFF']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return err(401, 'Sin autorización')

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user: caller }, error: authErr } = await anonClient.auth.getUser()
    if (authErr || !caller) return err(401, 'Sesión inválida')

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const { data: callerUser } = await admin
      .from('users')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (!ALLOWED.includes(callerUser?.role ?? '')) return err(403, 'Sin permiso')

    const { lead_id, mensaje } = await req.json()
    if (!lead_id) return err(400, 'lead_id es obligatorio')

    const { data: lead, error: leadErr } = await admin
      .from('leads')
      .select('nombre, email')
      .eq('id', lead_id)
      .single()
    if (leadErr || !lead) return err(404, 'Prospecto no encontrado')
    if (!lead.email)      return err(400, 'El prospecto no tiene email registrado')

    const resendKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') ?? 'no-reply@gms.app'
    if (!resendKey)  return err(500, 'RESEND_API_KEY no configurado en secrets')

    const texto = mensaje?.trim() ||
      `Hola ${lead.nombre},\n\nGracias por visitar nuestro gimnasio. ` +
      `Quedamos a tu disposición para cualquier consulta sobre nuestros planes y horarios.\n\n` +
      `¡Te esperamos!\n— Equipo GMS`

    const resRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    fromEmail,
        to:      lead.email,
        subject: `${lead.nombre}, te esperamos en el gimnasio`,
        text:    texto,
      }),
    })

    if (!resRes.ok) {
      const detail = await resRes.text()
      return err(502, `Error al enviar email (Resend): ${detail}`)
    }

    // Registrar en el log que se contactó
    await admin.from('lead_state_log').insert({
      lead_id,
      estado_from: null,
      estado_to:   'CONTACTADO',
      comentario:  'Email enviado al prospecto',
      changed_by:  caller.id,
    }).select().maybeSingle()  // no fallar si ya estaba en otro estado

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...CORS, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (e) {
    return err(500, (e as Error).message)
  }
})

function err(status: number, message: string) {
  return new Response(
    JSON.stringify({ ok: false, error: message }),
    { headers: { ...CORS, 'Content-Type': 'application/json' }, status }
  )
}
