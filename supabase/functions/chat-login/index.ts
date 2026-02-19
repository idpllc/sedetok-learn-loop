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

// Generate a deterministic password from userId so it's stable
function generateStablePassword(userId: string): string {
  return `SedeChat_${userId.replace(/-/g, "").slice(0, 16)}_!2024`;
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
      return new Response(JSON.stringify({ error: "JWT secret no configurado en el servidor" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify and decode JWT
    const payload = await verifyJWT(token, jwtSecret);

    const {
      email,
      full_name,
      member_role,
      institution_name,
      institution_id,
      institution_nit,
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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── Find or create user ───────────────────────────────────────────────────
    let userId: string;
    let userPassword: string;
    let isNewUser = false;

    // Search existing user by email via admin API
    const { data: existingUsersPage, error: listError } = await adminClient.auth.admin.listUsers({ 
      page: 1, 
      perPage: 1000 
    });
    
    if (listError) {
      console.error(`[chat-login] Error listing users: ${listError.message}`);
    }
    
    const existingUser = existingUsersPage?.users?.find((u: any) => 
      u.email?.toLowerCase() === email.toLowerCase()
    );

    console.log(`[chat-login] Looking for user: ${email}, found: ${existingUser?.id || 'not found'}`);

    if (existingUser) {
      userId = existingUser.id;
      userPassword = generateStablePassword(userId);
      console.log(`[chat-login] Existing user found: ${userId}`);
      
      // Update password to our stable password (in case it was different)
      const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
        password: userPassword,
        email_confirm: true,
      });
      if (updateError) {
        console.error(`[chat-login] Error updating user password: ${updateError.message}`);
      }
    } else {
      // Create new user
      isNewUser = true;
      const tempId = crypto.randomUUID();
      userPassword = generateStablePassword(tempId);
      
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: userPassword,
        email_confirm: true,
        user_metadata: { full_name: full_name || email.split("@")[0] },
      });

      if (createError) {
        console.error(`[chat-login] Error creating user: ${createError.message}`);
        return new Response(JSON.stringify({ error: `Error creando usuario: ${createError.message}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      userId = newUser.user.id;
      // Now update the password with the real stable password based on actual userId
      userPassword = generateStablePassword(userId);
      await adminClient.auth.admin.updateUserById(userId, {
        password: userPassword,
      });
      
      console.log(`[chat-login] New user created: ${userId}`);

      // Create profile for new user
      const username = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_") + "_" + Math.random().toString(36).slice(2, 6);
      const { error: profileError } = await adminClient.from("profiles").upsert({
        id: userId,
        username,
        full_name: full_name || email.split("@")[0],
        numero_documento: numero_documento || null,
        tipo_usuario: member_role === "teacher" ? "docente" : member_role === "student" ? "estudiante" : null,
      }, { onConflict: "id" });
      
      if (profileError) {
        console.error(`[chat-login] Profile creation error: ${profileError.message}`);
      }
    }

    // ── Handle institution ────────────────────────────────────────────────────
    // Priority: institution_id > institution_nit > institution_name
    let instId = institution_id;

    if (!instId && institution_nit) {
      // Look up by NIT first (most reliable key for existing institutions)
      const { data: existingInst } = await adminClient
        .from("institutions")
        .select("id")
        .eq("nit", institution_nit)
        .limit(1)
        .single();

      if (existingInst) {
        instId = existingInst.id;
        console.log(`[chat-login] Institution found by NIT ${institution_nit}: ${instId}`);
      } else if (institution_name) {
        // NIT not found → create institution with NIT + name
        const { data: newInst, error: instError } = await adminClient
          .from("institutions")
          .insert({ name: institution_name, nit: institution_nit, admin_user_id: userId })
          .select("id")
          .single();
        if (instError) {
          console.error(`[chat-login] Institution creation error (by NIT): ${instError.message}`);
        } else {
          instId = newInst?.id;
          console.log(`[chat-login] Institution created with NIT ${institution_nit}: ${instId}`);
        }
      } else {
        console.warn(`[chat-login] institution_nit provided but institution_name missing — cannot create institution`);
      }
    } else if (!instId && institution_name) {
      // Fallback: look up by name only (legacy / no NIT)
      const { data: existingInst } = await adminClient
        .from("institutions")
        .select("id")
        .eq("name", institution_name)
        .limit(1)
        .single();

      if (existingInst) {
        instId = existingInst.id;
        console.log(`[chat-login] Institution found by name: ${instId}`);
      } else {
        const { data: newInst, error: instError } = await adminClient
          .from("institutions")
          .insert({ name: institution_name, admin_user_id: userId })
          .select("id")
          .single();
        if (instError) {
          console.error(`[chat-login] Institution creation error (by name): ${instError.message}`);
        }
        instId = newInst?.id;
        console.log(`[chat-login] Institution created by name: ${instId}`);
      }
    }

    if (instId) {
      await adminClient.from("institution_members").upsert({
        institution_id: instId,
        user_id: userId,
        member_role: member_role || "student",
        status: "active",
      }, { onConflict: "institution_id,user_id" });

      // Handle sede
      let sedeId: string | null = null;
      if (sede) {
        const { data: existingSede } = await adminClient
          .from("institution_sedes")
          .select("id")
          .eq("institution_id", instId)
          .eq("name", sede)
          .limit(1)
          .single();

        if (existingSede) {
          sedeId = existingSede.id;
        } else {
          const { data: newSede } = await adminClient
            .from("institution_sedes")
            .insert({ institution_id: instId, name: sede })
            .select("id")
            .single();
          sedeId = newSede?.id || null;
        }

        if (sedeId) {
          await adminClient.from("profiles").update({ id_sede: sedeId }).eq("id", userId);
        }
      }

      // ── CHAT GROUPS ───────────────────────────────────────────────────────
      const role = member_role || "student";

      if (role === "student" && grupo) {
        const groupChatName = `${grupo}${course_name ? ` - ${course_name}` : ""}`;

        let { data: academicGroup } = await adminClient
          .from("academic_groups")
          .select("id")
          .eq("institution_id", instId)
          .eq("name", grupo)
          .limit(1)
          .single();

        if (!academicGroup) {
          const { data: newGroup } = await adminClient
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
          await adminClient.from("academic_group_members").upsert({
            group_id: academicGroup.id,
            user_id: userId,
            role: "student",
          }, { onConflict: "group_id,user_id" });

          let { data: groupConv } = await adminClient
            .from("chat_conversations")
            .select("id")
            .eq("academic_group_id", academicGroup.id)
            .eq("type", "group")
            .limit(1)
            .single();

          if (!groupConv) {
            const { data: newConv } = await adminClient
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
            await adminClient.from("chat_participants").upsert({
              conversation_id: groupConv.id,
              user_id: userId,
              role: "member",
            }, { onConflict: "conversation_id,user_id" });
          }
        }
      } else if (role === "teacher" && sede) {
        await ensureDocentes(adminClient, instId, sede, userId);
      } else if (role === "admin") {
        await ensureSpecialGroup(adminClient, instId, "Grupo de admin", userId);
        await addToAllDocenteGroups(adminClient, instId, userId);
      } else if (role === "coordinator") {
        await ensureSpecialGroup(adminClient, instId, "Grupo de coordinadores", userId);
        await addToAllDocenteGroups(adminClient, instId, userId);
      }
    }

    // ── Sign in with password to get a real session ───────────────────────────
    // Use anon client for signInWithPassword (this is the correct approach)
    console.log(`[chat-login] Signing in user ${email} to get session...`);
    
    const anonClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    
    const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
      email,
      password: userPassword,
    });

    if (signInError || !signInData?.session) {
      console.error(`[chat-login] SignIn error: ${signInError?.message}`);
      return new Response(JSON.stringify({ 
        error: `No se pudo iniciar sesión: ${signInError?.message || "sin sesión"}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[chat-login] Session obtained for user: ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        email,
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in chat-login:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Error interno del servidor" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

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
