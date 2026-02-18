import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function decodeJWT(token: string): { header: any; payload: any } {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");
  const decode = (s: string) =>
    JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0))));
  return { header: decode(parts[0]), payload: decode(parts[1]) };
}

async function verifyJWT(token: string, secret: string): Promise<any> {
  const [headerB64, payloadB64, signatureB64] = token.split(".");
  if (!headerB64 || !payloadB64 || !signatureB64) throw new Error("Invalid JWT");

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  const signature = Uint8Array.from(
    atob(signatureB64.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0)
  );

  const valid = await crypto.subtle.verify("HMAC", key, signature, data);
  if (!valid) throw new Error("Firma del token inválida");

  const { payload } = decodeJWT(token);

  if (payload.exp && Date.now() / 1000 > payload.exp) {
    throw new Error("Token expirado");
  }

  return payload;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const token = body.token;

    if (!token) {
      return new Response(JSON.stringify({ error: "Token requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jwtSecret = Deno.env.get("CHAT_JWT_SECRET");
    if (!jwtSecret) {
      return new Response(JSON.stringify({ error: "JWT secret no configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify and decode JWT
    const payload = await verifyJWT(token, jwtSecret);

    /*
    Payload esperado del JWT:
    {
      "email": "user@school.edu",
      "full_name": "Juan Pérez",
      "member_role": "teacher" | "student" | "admin" | "coordinator" | "parent",
      "institution_name": "Colegio XYZ",
      "institution_id": "optional-uuid",
      "numero_documento": "123456",
      "grupo": "5°A",
      "course_name": "Quinto",
      "sede": "Sede Norte",
      "es_director_grupo": false,
      "exp": 1234567890
    }
    */

    const {
      email,
      full_name,
      member_role,
      institution_name,
      institution_id,
      numero_documento,
      grupo,
      course_name,
      sede,
      es_director_grupo,
    } = payload;

    if (!email) {
      return new Response(JSON.stringify({ error: "Email requerido en el token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Find or create user
    const { data: existingUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const existingUser = existingUsers?.users?.find((u: any) => u.email === email);

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const userPassword = `Sede_${numero_documento || Math.random().toString(36).slice(2, 10)}`;
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: userPassword,
        email_confirm: true,
        user_metadata: { full_name },
      });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = newUser.user.id;

      // Update profile
      const username = email.split("@")[0] + "_" + Math.random().toString(36).slice(2, 6);
      await supabase.from("profiles").upsert({
        id: userId,
        username,
        full_name: full_name || email.split("@")[0],
        numero_documento: numero_documento || null,
        tipo_usuario: member_role === "teacher" ? "docente" : member_role === "student" ? "estudiante" : null,
      }, { onConflict: "id" });
    }

    // Handle institution
    let instId = institution_id;

    if (institution_name && !instId) {
      const { data: existingInst } = await supabase
        .from("institutions")
        .select("id")
        .eq("name", institution_name)
        .limit(1)
        .single();

      if (existingInst) {
        instId = existingInst.id;
      } else {
        const { data: newInst } = await supabase
          .from("institutions")
          .insert({ name: institution_name, admin_user_id: userId })
          .select("id")
          .single();
        instId = newInst?.id;
      }
    }

    if (instId) {
      // Add to institution
      await supabase.from("institution_members").upsert({
        institution_id: instId,
        user_id: userId,
        member_role: member_role || "student",
        status: "active",
      }, { onConflict: "institution_id,user_id" });

      // Handle sede
      let sedeId: string | null = null;
      if (sede) {
        const { data: existingSede } = await supabase
          .from("institution_sedes")
          .select("id")
          .eq("institution_id", instId)
          .eq("name", sede)
          .limit(1)
          .single();

        if (existingSede) {
          sedeId = existingSede.id;
        } else {
          const { data: newSede } = await supabase
            .from("institution_sedes")
            .insert({ institution_id: instId, name: sede })
            .select("id")
            .single();
          sedeId = newSede?.id || null;
        }

        // Update profile with sede
        if (sedeId) {
          await supabase.from("profiles").update({ id_sede: sedeId }).eq("id", userId);
        }
      }

      // ── CHAT GROUPS ──────────────────────────────────────────────────────────

      const role = member_role || "student";

      if (role === "student" && grupo) {
        // Group chat: "{grupo} - {course_name}"
        const groupChatName = `${grupo}${course_name ? ` - ${course_name}` : ""}`;

        // Find or create academic_group
        let { data: academicGroup } = await supabase
          .from("academic_groups")
          .select("id")
          .eq("institution_id", instId)
          .eq("name", grupo)
          .limit(1)
          .single();

        if (!academicGroup) {
          const { data: newGroup } = await supabase
            .from("academic_groups")
            .insert({
              institution_id: instId,
              name: grupo,
              course_name: course_name || null,
              sede_id: sedeId,
              director_user_id: es_director_grupo ? userId : null,
            })
            .select("id")
            .single();
          academicGroup = newGroup;
        }

        if (academicGroup) {
          await supabase.from("academic_group_members").upsert({
            group_id: academicGroup.id,
            user_id: userId,
            role: "student",
          }, { onConflict: "group_id,user_id" });

          // Find or create group chat conversation
          let { data: groupConv } = await supabase
            .from("chat_conversations")
            .select("id")
            .eq("academic_group_id", academicGroup.id)
            .eq("type", "group")
            .limit(1)
            .single();

          if (!groupConv) {
            const { data: newConv } = await supabase
              .from("chat_conversations")
              .insert({
                type: "group",
                name: groupChatName,
                institution_id: instId,
                academic_group_id: academicGroup.id,
                created_by: userId,
              })
              .select("id")
              .single();
            groupConv = newConv;
          }

          if (groupConv) {
            await supabase.from("chat_participants").upsert({
              conversation_id: groupConv.id,
              user_id: userId,
              role: "member",
            }, { onConflict: "conversation_id,user_id" });
          }
        }
      } else if (role === "teacher" && sede) {
        // Teacher: add to "Docentes {sede}"
        await ensureDocentes(supabase, instId, sede, userId);
      } else if (role === "admin") {
        // Admin: "Grupo de admin" + all "Docentes {sede}" in institution
        await ensureSpecialGroup(supabase, instId, "Grupo de admin", userId);
        await addToAllDocenteGroups(supabase, instId, userId);
      } else if (role === "coordinator") {
        // Coordinator: "Grupo de coordinadores" + all "Docentes {sede}" in institution
        await ensureSpecialGroup(supabase, instId, "Grupo de coordinadores", userId);
        await addToAllDocenteGroups(supabase, instId, userId);
      }
    }

    // Generate session using admin API
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.createSession({ userId });

    if (sessionError || !sessionData?.session) {
      return new Response(JSON.stringify({ error: "No se pudo crear la sesión" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        email,
        session: {
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in chat-login:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Error interno" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function ensureDocentes(supabase: any, instId: string, sedeName: string, userId: string) {
  const chatName = `Docentes ${sedeName}`;
  let { data: conv } = await supabase
    .from("chat_conversations")
    .select("id")
    .eq("institution_id", instId)
    .eq("name", chatName)
    .eq("type", "group")
    .limit(1)
    .single();

  if (!conv) {
    const { data: newConv } = await supabase
      .from("chat_conversations")
      .insert({ type: "group", name: chatName, institution_id: instId, created_by: userId })
      .select("id")
      .single();
    conv = newConv;
  }

  if (conv) {
    await supabase.from("chat_participants").upsert({
      conversation_id: conv.id,
      user_id: userId,
      role: "member",
    }, { onConflict: "conversation_id,user_id" });
  }
}

async function ensureSpecialGroup(supabase: any, instId: string, groupName: string, userId: string) {
  let { data: conv } = await supabase
    .from("chat_conversations")
    .select("id")
    .eq("institution_id", instId)
    .eq("name", groupName)
    .eq("type", "group")
    .limit(1)
    .single();

  if (!conv) {
    const { data: newConv } = await supabase
      .from("chat_conversations")
      .insert({ type: "group", name: groupName, institution_id: instId, created_by: userId })
      .select("id")
      .single();
    conv = newConv;
  }

  if (conv) {
    await supabase.from("chat_participants").upsert({
      conversation_id: conv.id,
      user_id: userId,
      role: "member",
    }, { onConflict: "conversation_id,user_id" });
  }
}

async function addToAllDocenteGroups(supabase: any, instId: string, userId: string) {
  const { data: docenteConvs } = await supabase
    .from("chat_conversations")
    .select("id")
    .eq("institution_id", instId)
    .eq("type", "group")
    .like("name", "Docentes %");

  if (docenteConvs) {
    for (const conv of docenteConvs) {
      await supabase.from("chat_participants").upsert({
        conversation_id: conv.id,
        user_id: userId,
        role: "member",
      }, { onConflict: "conversation_id,user_id" });
    }
  }
}
