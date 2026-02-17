import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserPayload {
  numero_documento: string;
  tipo_documento?: string;
  full_name?: string;
  email?: string;
  member_role: "admin" | "teacher" | "coordinator" | "student" | "parent";
  grupo?: string; // e.g. "5°A"
  sede?: string; // e.g. "Sede Norte" — para diferenciar grupos con mismo nombre en distintas sedes
  es_director_grupo?: boolean;
}

interface SedePayload {
  name: string; // e.g. "Sede Norte"
  code?: string; // e.g. "SN01"
  address?: string;
  city?: string;
  coordinator_documento?: string; // documento del coordinador de sede
}

interface GroupPayload {
  name: string; // e.g. "5°A"
  course_name?: string; // e.g. "Quinto"
  academic_year?: string; // e.g. "2025"
  director_documento?: string; // documento del director de grupo
  sede?: string; // nombre de la sede a la que pertenece el grupo
}

interface BatchPayload {
  institution: {
    name: string;
    nit?: string;
    codigo_dane?: string;
    address?: string;
    city?: string;
    country?: string;
    contact_email?: string;
    contact_phone?: string;
    description?: string;
    logo_url?: string;
    cover_url?: string;
    admin_documento: string; // documento del admin principal
  };
  sedes?: SedePayload[];
  groups?: GroupPayload[];
  users: UserPayload[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const payload: BatchPayload = await req.json();

    if (!payload.institution || !payload.users || !Array.isArray(payload.users)) {
      return new Response(
        JSON.stringify({ error: "Se requiere 'institution' y 'users' (array)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (payload.users.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Máximo 5000 usuarios por lote" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const log = {
      users_created: 0,
      users_updated: 0,
      users_skipped: 0,
      groups_created: 0,
      group_members_added: 0,
      chat_conversations_created: 0,
      errors: [] as string[],
    };

    // ========== 1. CREATE OR FIND INSTITUTION ==========
    let institutionId: string;

    // Try to find by NIT first
    let existingInst = null;
    if (payload.institution.nit) {
      const { data } = await supabase
        .from("institutions")
        .select("id, admin_user_id")
        .eq("nit", payload.institution.nit)
        .limit(1)
        .single();
      existingInst = data;
    }

    if (!existingInst) {
      // Try by name
      const { data } = await supabase
        .from("institutions")
        .select("id, admin_user_id")
        .eq("name", payload.institution.name)
        .limit(1)
        .single();
      existingInst = data;
    }

    // We need the admin user first to create the institution
    const adminUser = await ensureUser(supabase, {
      numero_documento: payload.institution.admin_documento,
      tipo_documento: "CC",
      member_role: "admin",
      full_name: "Administrador",
    }, log);

    if (!adminUser) {
      return new Response(
        JSON.stringify({ error: "No se pudo crear el usuario administrador", log }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingInst) {
      institutionId = existingInst.id;
      // Update institution data
      await supabase.from("institutions").update({
        name: payload.institution.name,
        nit: payload.institution.nit || undefined,
        codigo_dane: payload.institution.codigo_dane || undefined,
        address: payload.institution.address || undefined,
        city: payload.institution.city || undefined,
        country: payload.institution.country || undefined,
        contact_email: payload.institution.contact_email || undefined,
        contact_phone: payload.institution.contact_phone || undefined,
        description: payload.institution.description || undefined,
        logo_url: payload.institution.logo_url || undefined,
        cover_url: payload.institution.cover_url || undefined,
        last_sync_at: new Date().toISOString(),
      }).eq("id", institutionId);
    } else {
      const { data: newInst, error: instErr } = await supabase
        .from("institutions")
        .insert({
          name: payload.institution.name,
          admin_user_id: adminUser.id,
          nit: payload.institution.nit || null,
          codigo_dane: payload.institution.codigo_dane || null,
          address: payload.institution.address || null,
          city: payload.institution.city || null,
          country: payload.institution.country || null,
          contact_email: payload.institution.contact_email || null,
          contact_phone: payload.institution.contact_phone || null,
          description: payload.institution.description || null,
          logo_url: payload.institution.logo_url || null,
          cover_url: payload.institution.cover_url || null,
          last_sync_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (instErr || !newInst) {
        return new Response(
          JSON.stringify({ error: `Error creando institución: ${instErr?.message}`, log }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      institutionId = newInst.id;
    }

    // Ensure admin is institution member
    await ensureMember(supabase, institutionId, adminUser.id, "admin");

    // ========== 2. CREATE SEDES ==========
    const sedeMap: Record<string, string> = {}; // sede_name -> sede_id

    if (payload.sedes && Array.isArray(payload.sedes)) {
      for (const s of payload.sedes) {
        const sedeId = await ensureSede(supabase, institutionId, s);
        if (sedeId) {
          sedeMap[s.name] = sedeId;
          // Assign coordinator if specified
          if (s.coordinator_documento) {
            const { data: coordProfile } = await supabase
              .from("profiles")
              .select("id")
              .eq("numero_documento", s.coordinator_documento)
              .limit(1)
              .single();
            if (coordProfile) {
              await supabase.from("institution_sedes")
                .update({ coordinator_user_id: coordProfile.id })
                .eq("id", sedeId);
            }
          }
        }
      }
    }

    // ========== 3. CREATE GROUPS ==========
    // groupKey = "sede_name::group_name" or just "group_name" if no sede
    const groupMap: Record<string, string> = {}; // groupKey -> group_id
    const directorMap: Record<string, string> = {}; // groupKey -> director_documento

    const makeGroupKey = (groupName: string, sedeName?: string | null) =>
      sedeName ? `${sedeName}::${groupName}` : groupName;

    if (payload.groups && Array.isArray(payload.groups)) {
      for (const g of payload.groups) {
        const sedeId = g.sede ? sedeMap[g.sede] || null : null;
        const groupId = await ensureGroup(supabase, institutionId, g.name, g.course_name, g.academic_year, sedeId);
        const key = makeGroupKey(g.name, g.sede);
        if (groupId) {
          groupMap[key] = groupId;
          log.groups_created++;
          if (g.director_documento) {
            directorMap[key] = g.director_documento;
          }
        }
      }
    }

    // ========== 3. PROCESS USERS ==========
    // Process in batches of 50
    const BATCH_SIZE = 50;
    for (let i = 0; i < payload.users.length; i += BATCH_SIZE) {
      const batch = payload.users.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (userData) => {
        try {
          if (!userData.numero_documento) {
            log.errors.push(`Usuario sin numero_documento: ${JSON.stringify(userData)}`);
            return;
          }

          const user = await ensureUser(supabase, userData, log);
          if (!user) return;

          // Add as institution member
          await ensureMember(supabase, institutionId, user.id, userData.member_role || "student");

          // Handle group membership
          const groupName = userData.grupo;
          if (groupName) {
            const key = makeGroupKey(groupName, userData.sede);
            // Ensure group exists
            if (!groupMap[key]) {
              const sedeId = userData.sede ? sedeMap[userData.sede] || null : null;
              const gId = await ensureGroup(supabase, institutionId, groupName, null, null, sedeId);
              if (gId) groupMap[key] = gId;
            }

            const groupId = groupMap[key];
            if (groupId) {
              // Add to academic group
              const memberRole = userData.member_role === "parent" ? "parent" 
                : userData.member_role === "teacher" ? "teacher" 
                : "student";

              const { error: gmErr } = await supabase
                .from("academic_group_members")
                .upsert({
                  group_id: groupId,
                  user_id: user.id,
                  role: memberRole,
                }, { onConflict: "group_id,user_id" });

              if (!gmErr) log.group_members_added++;

              // Set as director if specified
              if (userData.es_director_grupo) {
                await supabase
                  .from("academic_groups")
                  .update({ director_user_id: user.id })
                  .eq("id", groupId);
              }
            }
          }
        } catch (err) {
          log.errors.push(`Error procesando ${userData.numero_documento}: ${err.message}`);
        }
      }));
    }

    // Handle director assignments from groups payload
    for (const [groupName, dirDoc] of Object.entries(directorMap)) {
      const { data: dirProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("numero_documento", dirDoc)
        .limit(1)
        .single();

      if (dirProfile && groupMap[groupName]) {
        await supabase
          .from("academic_groups")
          .update({ director_user_id: dirProfile.id })
          .eq("id", groupMap[groupName]);
      }
    }

    // ========== 4. CREATE CHAT CONVERSATIONS FOR EACH GROUP ==========
    for (const [groupName, groupId] of Object.entries(groupMap)) {
      try {
        // Check if chat conversation already exists for this group
        const { data: existingConv } = await supabase
          .from("chat_conversations")
          .select("id")
          .eq("academic_group_id", groupId)
          .eq("institution_id", institutionId)
          .limit(1)
          .single();

        if (existingConv) continue; // Already has a chat

        // Get group director
        const { data: groupData } = await supabase
          .from("academic_groups")
          .select("director_user_id")
          .eq("id", groupId)
          .single();

        const creatorId = groupData?.director_user_id || adminUser.id;

        // Create group chat conversation
        const { data: conv, error: convErr } = await supabase
          .from("chat_conversations")
          .insert({
            name: `Chat ${groupName}`,
            type: "group",
            academic_group_id: groupId,
            institution_id: institutionId,
            created_by: creatorId,
          })
          .select("id")
          .single();

        if (convErr || !conv) {
          log.errors.push(`Error creando chat para grupo ${groupName}: ${convErr?.message}`);
          continue;
        }

        log.chat_conversations_created++;

        // Add all group members as chat participants
        const { data: members } = await supabase
          .from("academic_group_members")
          .select("user_id, role")
          .eq("group_id", groupId);

        if (members && members.length > 0) {
          const participants = members.map((m) => ({
            conversation_id: conv.id,
            user_id: m.user_id,
            role: m.role === "teacher" ? "admin" : "member",
          }));

          // Also add the director if not already in members
          if (groupData?.director_user_id) {
            const directorInMembers = participants.some(p => p.user_id === groupData.director_user_id);
            if (!directorInMembers) {
              participants.push({
                conversation_id: conv.id,
                user_id: groupData.director_user_id,
                role: "admin",
              });
            }
          }

          await supabase.from("chat_participants").insert(participants);
        }
      } catch (err) {
        log.errors.push(`Error en chat grupo ${groupName}: ${err.message}`);
      }
    }

    // ========== 5. CREATE INSTITUTION-WIDE CHAT ==========
    try {
      const { data: instChat } = await supabase
        .from("chat_conversations")
        .select("id")
        .eq("institution_id", institutionId)
        .eq("type", "group")
        .is("academic_group_id", null)
        .eq("name", `Chat Institucional - ${payload.institution.name}`)
        .limit(1)
        .single();

      if (!instChat) {
        const { data: newInstChat } = await supabase
          .from("chat_conversations")
          .insert({
            name: `Chat Institucional - ${payload.institution.name}`,
            type: "group",
            institution_id: institutionId,
            created_by: adminUser.id,
          })
          .select("id")
          .single();

        if (newInstChat) {
          log.chat_conversations_created++;

          // Add admins, teachers, and coordinators
          const { data: staffMembers } = await supabase
            .from("institution_members")
            .select("user_id, member_role")
            .eq("institution_id", institutionId)
            .in("member_role", ["admin", "teacher", "coordinator"]);

          if (staffMembers && staffMembers.length > 0) {
            const staffParticipants = staffMembers.map((m) => ({
              conversation_id: newInstChat.id,
              user_id: m.user_id,
              role: m.member_role === "admin" ? "admin" : "member",
            }));

            await supabase.from("chat_participants").insert(staffParticipants);
          }
        }
      }
    } catch (err) {
      log.errors.push(`Error creando chat institucional: ${err.message}`);
    }

    // Update institution sync timestamp
    await supabase
      .from("institutions")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", institutionId);

    return new Response(
      JSON.stringify({
        success: true,
        institution_id: institutionId,
        log,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync batch error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Error interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ========== HELPER FUNCTIONS ==========

async function ensureUser(
  supabase: any,
  userData: UserPayload,
  log: any
): Promise<{ id: string; email: string } | null> {
  const doc = userData.numero_documento;

  // Check if user already exists by document number
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("numero_documento", doc)
    .limit(1)
    .single();

  if (existingProfile) {
    // Update profile data if needed
    const updates: any = {};
    if (userData.full_name) updates.full_name = userData.full_name;
    if (userData.tipo_documento) updates.tipo_documento = userData.tipo_documento;

    if (Object.keys(updates).length > 0) {
      await supabase.from("profiles").update(updates).eq("id", existingProfile.id);
    }

    // Get the email for this user
    const { data: authUser } = await supabase.auth.admin.getUserById(existingProfile.id);
    log.users_updated++;
    return { id: existingProfile.id, email: authUser?.user?.email || "" };
  }

  // Create new user
  // Email: use provided email or generate doc-based email
  const email = userData.email && userData.email.trim() !== ""
    ? userData.email
    : `${doc}@sedefy.local`;

  // Password is always the document number
  const password = doc;

  const tipoUsuarioMap: Record<string, string> = {
    admin: "docente",
    teacher: "docente",
    coordinator: "docente",
    student: "estudiante",
    parent: "estudiante",
  };

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: userData.full_name || doc,
      username: doc,
    },
  });

  if (authError) {
    // If email already taken, try to find by email
    if (authError.message?.includes("already been registered") || authError.message?.includes("already exists")) {
      const { data: users } = await supabase.auth.admin.listUsers({ filter: email });
      const found = users?.users?.find((u: any) => u.email === email);
      if (found) {
        // Update profile with documento
        await supabase.from("profiles").update({
          numero_documento: doc,
          tipo_documento: userData.tipo_documento || "CC",
          full_name: userData.full_name || doc,
        }).eq("id", found.id);

        log.users_updated++;
        return { id: found.id, email };
      }
    }
    log.errors.push(`Error creando usuario ${doc}: ${authError.message}`);
    return null;
  }

  // Wait a moment for the trigger to create the profile
  await new Promise(resolve => setTimeout(resolve, 500));

  // Update profile with document data
  const { error: profileErr } = await supabase.from("profiles").update({
    full_name: userData.full_name || doc,
    numero_documento: doc,
    tipo_documento: userData.tipo_documento || "CC",
    tipo_usuario: tipoUsuarioMap[userData.member_role] || "estudiante",
  }).eq("id", authData.user.id);

  if (profileErr) {
    console.error(`Profile update error for ${doc}:`, profileErr);
    // Retry without tipo_documento enum in case of mismatch
    await supabase.from("profiles").update({
      full_name: userData.full_name || doc,
      numero_documento: doc,
    }).eq("id", authData.user.id);
  }

  log.users_created++;
  return { id: authData.user.id, email };
}

async function ensureMember(
  supabase: any,
  institutionId: string,
  userId: string,
  role: string
) {
  const { data: existing } = await supabase
    .from("institution_members")
    .select("id, member_role")
    .eq("institution_id", institutionId)
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (existing) {
    // Update role if different
    if (existing.member_role !== role) {
      await supabase
        .from("institution_members")
        .update({ member_role: role, status: "active" })
        .eq("id", existing.id);
    }
    return;
  }

  await supabase.from("institution_members").insert({
    institution_id: institutionId,
    user_id: userId,
    member_role: role,
    status: "active",
  });
}

async function ensureGroup(
  supabase: any,
  institutionId: string,
  name: string,
  courseName: string | null | undefined,
  academicYear: string | null | undefined,
  sedeId: string | null = null
): Promise<string | null> {
  let query = supabase
    .from("academic_groups")
    .select("id")
    .eq("institution_id", institutionId)
    .eq("name", name);

  if (sedeId) {
    query = query.eq("sede_id", sedeId);
  } else {
    query = query.is("sede_id", null);
  }

  const { data: existing } = await query.limit(1).single();

  if (existing) return existing.id;

  const { data: newGroup, error } = await supabase
    .from("academic_groups")
    .insert({
      institution_id: institutionId,
      name,
      course_name: courseName || null,
      academic_year: academicYear || null,
      sede_id: sedeId,
    })
    .select("id")
    .single();

  if (error) {
    console.error(`Error creating group ${name}:`, error);
    return null;
  }

  return newGroup?.id || null;
}

async function ensureSede(
  supabase: any,
  institutionId: string,
  sede: SedePayload
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("institution_sedes")
    .select("id")
    .eq("institution_id", institutionId)
    .eq("name", sede.name)
    .limit(1)
    .single();

  if (existing) return existing.id;

  const { data: newSede, error } = await supabase
    .from("institution_sedes")
    .insert({
      institution_id: institutionId,
      name: sede.name,
      code: sede.code || null,
      address: sede.address || null,
      city: sede.city || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error(`Error creating sede ${sede.name}:`, error);
    return null;
  }

  return newSede?.id || null;
}
