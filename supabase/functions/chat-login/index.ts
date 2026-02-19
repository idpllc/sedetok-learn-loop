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

// Map member_role string to valid tipo_usuario enum value (must match DB enum exactly)
function mapRoleToTipoUsuario(role: string): string | null {
  const map: Record<string, string> = {
    "student": "Estudiante",
    "estudiante": "Estudiante",
    "teacher": "Docente",
    "docente": "Docente",
    "admin": "Institución",
    "coordinator": "Docente",
    "coordinador": "Docente",
    "padre": "Padre",
    "parent": "Padre",
  };
  return map[role?.toLowerCase()] || null;
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

    const role = (member_role || "student").toLowerCase();
    const tipoUsuario = mapRoleToTipoUsuario(role);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── Find or create user ───────────────────────────────────────────────────
    let userId: string;
    let userPassword: string;

    // Use DB function to find user by email reliably (no pagination limits)
    const { data: foundUserId } = await adminClient
      .rpc("find_user_by_email_or_username", { search_text: email });

    console.log(`[chat-login] Looking for user: ${email}, found via DB fn: ${foundUserId || 'not found'}`);

    if (foundUserId) {
      // User exists — update password and proceed
      userId = foundUserId;
      userPassword = generateStablePassword(userId);
      console.log(`[chat-login] Existing user found: ${userId}`);
      
      const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
        password: userPassword,
        email_confirm: true,
      });
      if (updateError) {
        console.error(`[chat-login] Error updating user password: ${updateError.message}`);
      }

      // ALWAYS update profile data for existing users (role, name, document)
      const profileUpdate: Record<string, any> = {};
      if (tipoUsuario) profileUpdate.tipo_usuario = tipoUsuario;
      if (full_name) profileUpdate.full_name = full_name;
      if (numero_documento) profileUpdate.numero_documento = numero_documento;

      if (Object.keys(profileUpdate).length > 0) {
        const { error: profileUpdateError } = await adminClient
          .from("profiles")
          .update(profileUpdate)
          .eq("id", userId);
        if (profileUpdateError) {
          console.error(`[chat-login] Profile update error for existing user: ${profileUpdateError.message}`);
        } else {
          console.log(`[chat-login] Profile updated for existing user: ${userId}, tipo_usuario=${tipoUsuario}`);
        }
      }
    } else {
      // User not found — try to create; handle race condition where user exists
      const tempId = crypto.randomUUID();
      userPassword = generateStablePassword(tempId);
      
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: userPassword,
        email_confirm: true,
        user_metadata: { full_name: full_name || email.split("@")[0] },
      });

      if (createError) {
        // If email already registered, recover the user via admin list (fallback)
        if (createError.message?.includes("already been registered") || createError.message?.includes("email_exists")) {
          console.warn(`[chat-login] User already exists (race condition), recovering...`);
          const { data: usersPage } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const recoveredUser = usersPage?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
          
          if (!recoveredUser) {
            return new Response(JSON.stringify({ error: "Usuario existente pero no se pudo recuperar. Intente de nuevo." }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          
          userId = recoveredUser.id;
          userPassword = generateStablePassword(userId);
          
          await adminClient.auth.admin.updateUserById(userId, {
            password: userPassword,
            email_confirm: true,
          });
          console.log(`[chat-login] Recovered existing user: ${userId}`);
        } else {
          console.error(`[chat-login] Error creating user: ${createError.message}`);
          return new Response(JSON.stringify({ error: `Error creando usuario: ${createError.message}` }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        userId = newUser.user.id;
        // Update with stable password based on real userId
        userPassword = generateStablePassword(userId);
        await adminClient.auth.admin.updateUserById(userId, { password: userPassword });
        console.log(`[chat-login] New user created: ${userId}`);
      }

      // Create or update profile
      const username = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_") + "_" + Math.random().toString(36).slice(2, 6);
      const { error: profileError } = await adminClient.from("profiles").upsert({
        id: userId,
        username,
        full_name: full_name || email.split("@")[0],
        numero_documento: numero_documento || null,
        ...(tipoUsuario ? { tipo_usuario: tipoUsuario } : {}),
      }, { onConflict: "id" });
      
      if (profileError) {
        console.error(`[chat-login] Profile creation error: ${profileError.message}`);
      } else {
        console.log(`[chat-login] Profile created/updated: ${userId}, tipo_usuario=${tipoUsuario}`);
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
      // Ensure institution membership
      const { error: memberError } = await adminClient.from("institution_members").upsert({
        institution_id: instId,
        user_id: userId,
        member_role: role,
        status: "active",
      }, { onConflict: "institution_id,user_id" });
      if (memberError) {
        console.error(`[chat-login] Institution member upsert error: ${memberError.message}`);
      }

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
          const { data: newSede, error: sedeError } = await adminClient
            .from("institution_sedes")
            .insert({ institution_id: instId, name: sede })
            .select("id")
            .single();
          if (sedeError) {
            console.error(`[chat-login] Sede creation error: ${sedeError.message}`);
          }
          sedeId = newSede?.id || null;
        }

        if (sedeId) {
          await adminClient.from("profiles").update({ id_sede: sedeId }).eq("id", userId);
        }
        console.log(`[chat-login] Sede resolved: ${sede} => ${sedeId}`);
      }

      // ── CHAT GROUPS ───────────────────────────────────────────────────────
      console.log(`[chat-login] Assigning chat groups for role=${role}, sede=${sede}, grupo=${grupo}, es_director_grupo=${es_director_grupo}`);

      if (role === "student" || role === "estudiante") {
        // Students → assign to their academic group chat
        if (grupo) {
          await ensureStudentGroupChat(adminClient, instId, sedeId, grupo, course_name, userId);
        }
      } else if (role === "teacher" || role === "docente") {
        // Teachers → always add to "Docentes {sede}"
        if (sede) {
          console.log(`[chat-login] Adding teacher to Docentes group for sede: ${sede}`);
          await ensureDocentes(adminClient, instId, sede, userId);
        }

        // If director of group → also add to students' group chat as admin
        if (es_director_grupo && grupo) {
          console.log(`[chat-login] Teacher is group director, adding to student group: ${grupo}`);
          await ensureStudentGroupChat(adminClient, instId, sedeId, grupo, course_name, userId, "admin");
        }
      } else if (role === "admin") {
        await ensureSpecialGroup(adminClient, instId, "Grupo de admin", userId);
        await addToAllDocenteGroups(adminClient, instId, userId);
      } else if (role === "coordinator" || role === "coordinador") {
        await ensureSpecialGroup(adminClient, instId, "Grupo de coordinadores", userId);
        await addToAllDocenteGroups(adminClient, instId, userId);
      }
    } else {
      console.warn(`[chat-login] No institution resolved — skipping group assignment`);
    }

    // ── Sign in with password to get a real session ───────────────────────────
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

/**
 * Ensures a student group chat exists and adds the user to it.
 * participantRole defaults to "member" for students, can be "admin" for directors.
 */
async function ensureStudentGroupChat(
  supabase: any,
  instId: string,
  sedeId: string | null,
  grupo: string,
  course_name: string | undefined,
  userId: string,
  participantRole: string = "member"
) {
  const groupChatName = `${grupo}${course_name ? ` - ${course_name}` : ""}`;

  // Find or create academic group
  let { data: academicGroup, error: agError } = await supabase
    .from("academic_groups")
    .select("id")
    .eq("institution_id", instId)
    .eq("name", grupo)
    .limit(1)
    .single();

  if (agError && agError.code !== "PGRST116") {
    console.error(`[chat-login] Error fetching academic group: ${agError.message}`);
  }

  if (!academicGroup) {
    const { data: newGroup, error: newGroupError } = await supabase
      .from("academic_groups")
      .insert({
        institution_id: instId,
        name: grupo,
        course_name: course_name || null,
        sede_id: sedeId,
      })
      .select("id")
      .single();
    if (newGroupError) {
      console.error(`[chat-login] Error creating academic group: ${newGroupError.message}`);
      return;
    }
    academicGroup = newGroup;
    console.log(`[chat-login] Academic group created: ${grupo} => ${academicGroup.id}`);
  } else {
    console.log(`[chat-login] Academic group found: ${grupo} => ${academicGroup.id}`);
  }

  if (!academicGroup) return;

  // Add user to academic_group_members
  const memberRole = participantRole === "admin" ? "teacher" : "student";
  const { error: memberError } = await supabase
    .from("academic_group_members")
    .upsert({
      group_id: academicGroup.id,
      user_id: userId,
      role: memberRole,
    }, { onConflict: "group_id,user_id" });
  if (memberError) {
    console.error(`[chat-login] Error upserting academic_group_member: ${memberError.message}`);
  }

  // Find or create the group chat conversation
  let { data: groupConv, error: convError } = await supabase
    .from("chat_conversations")
    .select("id")
    .eq("academic_group_id", academicGroup.id)
    .eq("type", "group")
    .limit(1)
    .single();

  if (convError && convError.code !== "PGRST116") {
    console.error(`[chat-login] Error fetching group conversation: ${convError.message}`);
  }

  if (!groupConv) {
    const { data: newConv, error: newConvError } = await supabase
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
    if (newConvError) {
      console.error(`[chat-login] Error creating group conversation: ${newConvError.message}`);
      return;
    }
    groupConv = newConv;
    console.log(`[chat-login] Group conversation created: ${groupChatName} => ${groupConv.id}`);
  } else {
    console.log(`[chat-login] Group conversation found: ${groupChatName} => ${groupConv.id}`);
  }

  if (!groupConv) return;

  // Add user as participant
  const { error: partError } = await supabase
    .from("chat_participants")
    .upsert({
      conversation_id: groupConv.id,
      user_id: userId,
      role: participantRole,
    }, { onConflict: "conversation_id,user_id" });
  if (partError) {
    console.error(`[chat-login] Error upserting chat participant: ${partError.message}`);
  } else {
    console.log(`[chat-login] User ${userId} added to chat ${groupChatName} as ${participantRole}`);
  }
}

/**
 * Ensures "Docentes {sede}" group exists and adds the teacher to it.
 */
async function ensureDocentes(supabase: any, instId: string, sedeName: string, userId: string) {
  const chatName = `Docentes ${sedeName}`;
  let { data: conv, error: convError } = await supabase
    .from("chat_conversations")
    .select("id")
    .eq("institution_id", instId)
    .eq("name", chatName)
    .eq("type", "group")
    .limit(1)
    .single();

  if (convError && convError.code !== "PGRST116") {
    console.error(`[chat-login] Error fetching Docentes conv: ${convError.message}`);
  }

  if (!conv) {
    const { data: newConv, error: newConvError } = await supabase
      .from("chat_conversations")
      .insert({ type: "group", name: chatName, institution_id: instId, created_by: userId })
      .select("id")
      .single();
    if (newConvError) {
      console.error(`[chat-login] Error creating Docentes conv: ${newConvError.message}`);
      return;
    }
    conv = newConv;
    console.log(`[chat-login] Docentes group created: ${chatName} => ${conv.id}`);
  } else {
    console.log(`[chat-login] Docentes group found: ${chatName} => ${conv.id}`);
  }

  if (conv) {
    const { error: partError } = await supabase.from("chat_participants").upsert({
      conversation_id: conv.id,
      user_id: userId,
      role: "member",
    }, { onConflict: "conversation_id,user_id" });
    if (partError) {
      console.error(`[chat-login] Error adding to Docentes group: ${partError.message}`);
    } else {
      console.log(`[chat-login] User ${userId} added to ${chatName}`);
    }
  }
}

/**
 * Ensures a named special group (e.g. "Grupo de admin") exists and adds the user.
 */
async function ensureSpecialGroup(supabase: any, instId: string, groupName: string, userId: string) {
  let { data: conv, error: convError } = await supabase
    .from("chat_conversations")
    .select("id")
    .eq("institution_id", instId)
    .eq("name", groupName)
    .eq("type", "group")
    .limit(1)
    .single();

  if (convError && convError.code !== "PGRST116") {
    console.error(`[chat-login] Error fetching special group ${groupName}: ${convError.message}`);
  }

  if (!conv) {
    const { data: newConv, error: newConvError } = await supabase
      .from("chat_conversations")
      .insert({ type: "group", name: groupName, institution_id: instId, created_by: userId })
      .select("id")
      .single();
    if (newConvError) {
      console.error(`[chat-login] Error creating special group ${groupName}: ${newConvError.message}`);
      return;
    }
    conv = newConv;
    console.log(`[chat-login] Special group created: ${groupName}`);
  }

  if (conv) {
    const { error: partError } = await supabase.from("chat_participants").upsert({
      conversation_id: conv.id,
      user_id: userId,
      role: "member",
    }, { onConflict: "conversation_id,user_id" });
    if (partError) {
      console.error(`[chat-login] Error adding to special group ${groupName}: ${partError.message}`);
    } else {
      console.log(`[chat-login] User ${userId} added to ${groupName}`);
    }
  }
}

/**
 * Adds user to ALL "Docentes {sede}" groups in the institution (for admins/coordinators).
 */
async function addToAllDocenteGroups(supabase: any, instId: string, userId: string) {
  const { data: docenteConvs, error } = await supabase
    .from("chat_conversations")
    .select("id, name")
    .eq("institution_id", instId)
    .eq("type", "group")
    .like("name", "Docentes %");

  if (error) {
    console.error(`[chat-login] Error fetching Docentes groups: ${error.message}`);
    return;
  }

  if (docenteConvs && docenteConvs.length > 0) {
    console.log(`[chat-login] Adding user to ${docenteConvs.length} Docentes groups`);
    for (const conv of docenteConvs) {
      const { error: partError } = await supabase.from("chat_participants").upsert({
        conversation_id: conv.id,
        user_id: userId,
        role: "member",
      }, { onConflict: "conversation_id,user_id" });
      if (partError) {
        console.error(`[chat-login] Error adding to ${conv.name}: ${partError.message}`);
      }
    }
  }
}
