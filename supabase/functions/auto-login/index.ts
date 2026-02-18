import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SECRET_KEY = "tucanmistico";

// ── Helpers ────────────────────────────────────────────────────────────────────

async function generateHMAC(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function verifyHMAC(message: string, signature: string, secret: string): Promise<boolean> {
  return (await generateHMAC(message, secret)) === signature;
}

const tipoDocMap: Record<string, string> = {
  "CEDULA DE CIUDADANIA": "CC", "CÉDULA DE CIUDADANÍA": "CC", "CC": "CC",
  "TARJETA DE IDENTIDAD": "TI", "TI": "TI",
  "CEDULA DE EXTRANJERIA": "CE", "CÉDULA DE EXTRANJERÍA": "CE", "CE": "CE",
  "PASAPORTE": "PA", "PA": "PA",
  "REGISTRO CIVIL": "RC", "RC": "RC",
  "NUMERO UNICO DE IDENTIFICACION PERSONAL": "NUIP", "NUIP": "NUIP",
  "NIT": "NIT",
};

function normalizeTipoDoc(raw?: string): string {
  if (!raw) return "CC";
  const upper = raw.toUpperCase().trim();
  return tipoDocMap[upper] ?? "CC";
}

// ── Conversation-group helpers ─────────────────────────────────────────────────

/** Finds or creates a chat conversation (group) by name within an institution.
 *  Returns the conversation id. */
async function upsertChatGroup(
  supabase: ReturnType<typeof createClient>,
  name: string,
  institutionId: string
): Promise<string> {
  // Check existing
  const { data: existing } = await supabase
    .from("chat_conversations")
    .select("id")
    .eq("name", name)
    .eq("institution_id", institutionId)
    .eq("type", "group")
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("chat_conversations")
    .insert({ name, institution_id: institutionId, type: "group" })
    .select("id")
    .single();

  if (error) throw new Error(`Error creando grupo "${name}": ${error.message}`);
  return created.id;
}

/** Adds a user to a chat conversation if not already a member. */
async function addToGroup(
  supabase: ReturnType<typeof createClient>,
  conversationId: string,
  userId: string,
  role = "member"
): Promise<void> {
  const { data: existing } = await supabase
    .from("chat_participants")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return;

  await supabase.from("chat_participants").insert({
    conversation_id: conversationId,
    user_id: userId,
    role,
  });
}

// ── Institution / sede / academic-group helpers ────────────────────────────────

async function upsertInstitution(
  supabase: ReturnType<typeof createClient>,
  institutionName: string,
  adminUserId: string
): Promise<string> {
  const { data: existing } = await supabase
    .from("institutions")
    .select("id")
    .eq("name", institutionName)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("institutions")
    .insert({ name: institutionName, admin_user_id: adminUserId })
    .select("id")
    .single();

  if (error) throw new Error(`Error creando institución: ${error.message}`);
  return created.id;
}

async function upsertSede(
  supabase: ReturnType<typeof createClient>,
  sedeName: string,
  institutionId: string
): Promise<string> {
  const { data: existing } = await supabase
    .from("institution_sedes")
    .select("id")
    .eq("name", sedeName)
    .eq("institution_id", institutionId)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("institution_sedes")
    .insert({ name: sedeName, institution_id: institutionId })
    .select("id")
    .single();

  if (error) throw new Error(`Error creando sede "${sedeName}": ${error.message}`);
  return created.id;
}

/** Creates or finds an academic group.
 *  Display name: "{grupoName} - {courseName}" */
async function upsertAcademicGroup(
  supabase: ReturnType<typeof createClient>,
  grupoName: string,
  courseName: string,
  institutionId: string,
  sedeId: string | null,
  academicYear?: string
): Promise<string> {
  const fullName = courseName ? `${grupoName} - ${courseName}` : grupoName;

  const query = supabase
    .from("academic_groups")
    .select("id")
    .eq("name", fullName)
    .eq("institution_id", institutionId);

  if (sedeId) query.eq("sede_id", sedeId);

  const { data: existing } = await query.maybeSingle();
  if (existing) return existing.id;

  const insertPayload: Record<string, unknown> = {
    name: fullName,
    institution_id: institutionId,
    course_name: courseName || null,
    academic_year: academicYear || null,
  };
  if (sedeId) insertPayload.sede_id = sedeId;

  const { data: created, error } = await supabase
    .from("academic_groups")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error) throw new Error(`Error creando grupo académico "${fullName}": ${error.message}`);
  return created.id;
}

async function addMemberToAcademicGroup(
  supabase: ReturnType<typeof createClient>,
  groupId: string,
  userId: string,
  role: string
): Promise<void> {
  const { data: existing } = await supabase
    .from("academic_group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return;

  await supabase.from("academic_group_members").insert({
    group_id: groupId,
    user_id: userId,
    role,
  });
}

async function ensureInstitutionMember(
  supabase: ReturnType<typeof createClient>,
  institutionId: string,
  userId: string,
  memberRole: string
): Promise<void> {
  const { data: existing } = await supabase
    .from("institution_members")
    .select("id")
    .eq("institution_id", institutionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return;

  await supabase.from("institution_members").insert({
    institution_id: institutionId,
    user_id: userId,
    member_role: memberRole,
    status: "active",
  });
}

/** Fetches all sede names for an institution */
async function getAllSedeNames(
  supabase: ReturnType<typeof createClient>,
  institutionId: string
): Promise<string[]> {
  const { data } = await supabase
    .from("institution_sedes")
    .select("name")
    .eq("institution_id", institutionId);

  return (data ?? []).map((s) => s.name);
}

// ── Main handler ───────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── Parse parameters (query string or JSON body) ───────────────────────
    const url = new URL(req.url);
    let params: Record<string, string | null> = {
      token: url.searchParams.get("token"),
      documento: url.searchParams.get("documento"),
      tipo_documento: url.searchParams.get("tipo_documento"),
      full_name: url.searchParams.get("full_name"),
      email: url.searchParams.get("email"),
      member_role: url.searchParams.get("member_role"),
      grupo: url.searchParams.get("grupo"),
      course_name: url.searchParams.get("course_name"),
      sede: url.searchParams.get("sede"),
      institution: url.searchParams.get("institution"),
      academic_year: url.searchParams.get("academic_year"),
      es_director_grupo: url.searchParams.get("es_director_grupo"),
      redirect: url.searchParams.get("redirect"),
    };

    // Merge body if present
    if (req.headers.get("content-type")?.includes("application/json")) {
      try {
        const body = await req.json();
        for (const key of Object.keys(params)) {
          if (params[key] === null && body[key] !== undefined) {
            params[key] = String(body[key]);
          }
        }
      } catch { /* no body */ }
    }

    const { token, documento, full_name, email, member_role,
            grupo, course_name, sede, institution, academic_year,
            es_director_grupo } = params;
    const tipo_documento_raw = params.tipo_documento;

    // ── MODE: Legacy HMAC token ────────────────────────────────────────────
    if (token && !documento && !institution) {
      const parts = token.split(".");
      if (parts.length !== 2) {
        return new Response(JSON.stringify({ error: "Formato de token inválido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const [encodedData, encodedHmac] = parts;
      const isValid = await verifyHMAC(encodedData, encodedHmac, SECRET_KEY);
      if (!isValid) {
        return new Response(JSON.stringify({ error: "Token inválido o manipulado" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      let decodedData;
      try { decodedData = JSON.parse(atob(encodedData)); } catch {
        return new Response(JSON.stringify({ error: "Token corrupto" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { email: dEmail, numero_documento: dDoc, password: dPass, timestamp } = decodedData;
      if (timestamp && Date.now() - timestamp > 5 * 60 * 1000) {
        return new Response(JSON.stringify({ error: "Token expirado" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      let loginEmail = dEmail;
      let loginPassword = dPass;
      if (!loginEmail && dDoc) {
        const { data: p } = await supabase.from("profiles").select("id")
          .eq("numero_documento", dDoc).maybeSingle();
        if (p) {
          const { data: au } = await supabase.auth.admin.getUserById(p.id);
          loginEmail = au?.user?.email;
          if (!loginPassword) loginPassword = dDoc;
        }
      }

      if (!loginEmail || !loginPassword) {
        return new Response(JSON.stringify({ error: "Credenciales incompletas en el token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword(
        { email: loginEmail, password: loginPassword }
      );
      if (authError) {
        return new Response(JSON.stringify({ error: "Credenciales inválidas", details: authError.message }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ success: true, session: authData.session, user: authData.user }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── MODE: Smart auto-login / register ─────────────────────────────────
    // Requires: documento + institution + member_role
    if (!documento) {
      return new Response(JSON.stringify({ error: "Se requiere 'documento'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!institution) {
      return new Response(JSON.stringify({ error: "Se requiere 'institution' (nombre de la institución)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const role = (member_role ?? "student") as string;
    const tipoDoc = normalizeTipoDoc(tipo_documento_raw ?? undefined);
    const sedeNombre = sede ?? null;
    const groupName = grupo ?? null;
    const courseName = course_name ?? null;
    const isDirector = es_director_grupo === "true" || es_director_grupo === "1";

    console.log(`Auto-login: doc=${documento}, role=${role}, inst=${institution}, sede=${sedeNombre}, grupo=${groupName}`);

    // ── 1. Find or create the user ─────────────────────────────────────────
    let userId: string;
    let userEmail: string;
    let isNew = false;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("numero_documento", documento)
      .maybeSingle();

    if (profile) {
      userId = profile.id;
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      userEmail = authUser?.user?.email ?? `${documento}@sedefy.local`;
    } else {
      // Create new user
      isNew = true;
      userEmail = email ?? `${documento}@sedefy.local`;
      const username = `user_${documento}`;
      const displayName = full_name ?? username;

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: userEmail,
        password: documento,
        email_confirm: true,
        user_metadata: { full_name: displayName, username },
      });

      if (createError) {
        return new Response(JSON.stringify({ error: "Error creando usuario", details: createError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      userId = newUser.user.id;

      // Upsert profile (trigger might have already created it)
      await supabase.from("profiles").upsert({
        id: userId,
        username,
        full_name: displayName,
        numero_documento: documento,
        tipo_documento: tipoDoc,
        tipo_usuario: role === "teacher" ? "Docente" : role === "student" ? "Estudiante" : "Administrador",
      }, { onConflict: "id" });
    }

    // ── 2. Resolve institution ─────────────────────────────────────────────
    const institutionId = await upsertInstitution(supabase, institution, userId);

    // ── 3. Ensure institution membership ──────────────────────────────────
    await ensureInstitutionMember(supabase, institutionId, userId, role);

    // ── 4. Resolve sede ────────────────────────────────────────────────────
    let sedeId: string | null = null;
    if (sedeNombre) {
      sedeId = await upsertSede(supabase, sedeNombre, institutionId);
    }

    // ── 5. Create / join groups according to role ─────────────────────────

    if (role === "student") {
      // Students → academic group chat "{groupName} - {courseName}"
      if (groupName) {
        const academicGroupId = await upsertAcademicGroup(
          supabase, groupName, courseName ?? "", institutionId, sedeId, academic_year ?? undefined
        );
        await addMemberToAcademicGroup(supabase, academicGroupId, userId, isDirector ? "director" : "student");

        // Chat group with same name as academic group
        const chatGroupName = courseName ? `${groupName} - ${courseName}` : groupName;
        const chatGroupId = await upsertChatGroup(supabase, chatGroupName, institutionId);
        await addToGroup(supabase, chatGroupId, userId, "member");
      }

    } else if (role === "teacher") {
      // Teachers → "Docentes {sede}" for each sede they belong to
      const sedesToJoin = sedeNombre ? [sedeNombre] : await getAllSedeNames(supabase, institutionId);
      for (const s of sedesToJoin) {
        const chatName = `Docentes ${s}`;
        const chatId = await upsertChatGroup(supabase, chatName, institutionId);
        await addToGroup(supabase, chatId, userId, "member");
      }

      // If assigned to a specific group (e.g. director de grupo)
      if (groupName) {
        const academicGroupId = await upsertAcademicGroup(
          supabase, groupName, courseName ?? "", institutionId, sedeId, academic_year ?? undefined
        );
        await addMemberToAcademicGroup(supabase, academicGroupId, userId, isDirector ? "director" : "teacher");
      }

    } else if (role === "admin") {
      // Admins → "Admin" group + all "Docentes {sede}" groups
      const adminChatId = await upsertChatGroup(supabase, "Admin", institutionId);
      await addToGroup(supabase, adminChatId, userId, "admin");

      const allSedes = await getAllSedeNames(supabase, institutionId);
      for (const s of allSedes) {
        const chatId = await upsertChatGroup(supabase, `Docentes ${s}`, institutionId);
        await addToGroup(supabase, chatId, userId, "admin");
      }

    } else if (role === "coordinator") {
      // Coordinators → "Coordinadores" group + all "Docentes {sede}" groups
      const coordChatId = await upsertChatGroup(supabase, "Coordinadores", institutionId);
      await addToGroup(supabase, coordChatId, userId, "member");

      const allSedes = await getAllSedeNames(supabase, institutionId);
      for (const s of allSedes) {
        const chatId = await upsertChatGroup(supabase, `Docentes ${s}`, institutionId);
        await addToGroup(supabase, chatId, userId, "member");
      }
    }

    // ── 6. Sign in and return session ──────────────────────────────────────
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: documento,
    });

    if (signInError) {
      return new Response(
        JSON.stringify({ error: "Error al iniciar sesión", details: signInError.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        is_new_user: isNew,
        session: signInData.session,
        user: {
          id: userId,
          email: userEmail,
          full_name: full_name ?? null,
          numero_documento: documento,
          member_role: role,
          institution: institution,
          sede: sedeNombre,
          grupo: groupName,
          course_name: courseName,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
