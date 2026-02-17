import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple JWT decode (header.payload.signature)
function decodeJWT(token: string): { header: any; payload: any } {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");
  const decode = (s: string) =>
    JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0))));
  return { header: decode(parts[0]), payload: decode(parts[1]) };
}

// Verify HMAC-SHA256 JWT signature
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
  if (!valid) throw new Error("Invalid signature");

  const { payload } = decodeJWT(token);

  // Check expiration
  if (payload.exp && Date.now() / 1000 > payload.exp) {
    throw new Error("Token expired");
  }

  return payload;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") || (await req.json().catch(() => ({}))).token;

    if (!token) {
      return new Response(JSON.stringify({ error: "Token requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jwtSecret = Deno.env.get("CHAT_JWT_SECRET");
    if (!jwtSecret) {
      return new Response(JSON.stringify({ error: "JWT secret not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify and decode JWT
    const payload = await verifyJWT(token, jwtSecret);

    /*
    Expected JWT payload:
    {
      "email": "user@school.edu",
      "full_name": "Juan Pérez",
      "member_role": "teacher" | "student" | "admin" | "coordinator" | "parent",
      "institution_name": "Colegio XYZ",
      "institution_id": "optional-uuid",
      "numero_documento": "123456",
      "grupo": "5°A",          // optional - for students
      "curso_nombre": "2025",  // optional
      "es_director_grupo": false,
      "director_grupo": "5°A", // optional - if teacher is director
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
      curso_nombre,
      es_director_grupo,
      director_grupo,
      password,
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

    // Try to find existing user
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u: any) => u.email === email);

    let userId: string;
    const userPassword = password || `Sede_${numero_documento || Date.now()}`;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create user
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
      // Find or create institution
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

    // Add to institution if not already a member
    if (instId) {
      const { data: existingMember } = await supabase
        .from("institution_members")
        .select("id")
        .eq("institution_id", instId)
        .eq("user_id", userId)
        .limit(1)
        .single();

      if (!existingMember) {
        await supabase.from("institution_members").insert({
          institution_id: instId,
          user_id: userId,
          member_role: member_role || "student",
          status: "active",
        });
      }

      // Handle academic groups
      if (grupo && instId) {
        // Find or create group
        let { data: groupData } = await supabase
          .from("academic_groups")
          .select("id")
          .eq("institution_id", instId)
          .eq("name", grupo)
          .limit(1)
          .single();

        if (!groupData) {
          const { data: newGroup } = await supabase
            .from("academic_groups")
            .insert({
              institution_id: instId,
              name: grupo,
              course_name: curso_nombre || null,
              director_user_id: es_director_grupo ? userId : null,
            })
            .select("id")
            .single();
          groupData = newGroup;
        }

        if (groupData) {
          // Add to group
          await supabase
            .from("academic_group_members")
            .upsert({
              group_id: groupData.id,
              user_id: userId,
              role: member_role === "parent" ? "parent" : "student",
            }, { onConflict: "group_id,user_id" });
        }
      }

      // If teacher is director of a group
      if (director_grupo && instId && member_role === "teacher") {
        const { data: groupToAssign } = await supabase
          .from("academic_groups")
          .select("id")
          .eq("institution_id", instId)
          .eq("name", director_grupo)
          .limit(1)
          .single();

        if (groupToAssign) {
          await supabase
            .from("academic_groups")
            .update({ director_user_id: userId })
            .eq("id", groupToAssign.id);
        } else {
          await supabase.from("academic_groups").insert({
            institution_id: instId,
            name: director_grupo,
            course_name: curso_nombre || null,
            director_user_id: userId,
          });
        }
      }
    }

    // Sign in the user and return session
    const { data: signInData, error: signInError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    // Return data for auto-login
    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        email,
        redirect: "/chat",
        // Return credentials for client-side sign in
        auto_login: {
          email,
          password: userPassword,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
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
