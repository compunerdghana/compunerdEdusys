import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getAdmin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("school_id, role")
      .eq("id", currentUser.id)
      .single();

    const schoolId = currentProfile?.school_id;
    if (!schoolId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const isAuthorized = ["admin", "owner", "school_owner", "headmaster"].includes(currentProfile.role);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { users, role_type } = body; // Array of user profiles

    if (!users || !Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ error: "No users provided for import" }, { status: 400 });
    }

    const admin = getAdmin();

    // 1. Pre-fetch existing emails, phones, and IDs to validate duplicates
    const { data: existingProfiles } = await admin
      .from("profiles")
      .select("email, phone, username")
      .eq("school_id", schoolId);

    const existingEmails = new Set(existingProfiles?.map(p => p.email?.toLowerCase()) || []);
    const existingPhones = new Set(existingProfiles?.map(p => p.phone) || []);
    const existingUsernames = new Set(existingProfiles?.map(p => p.username?.toLowerCase()) || []);

    const errors: string[] = [];
    const imported: any[] = [];

    for (let i = 0; i < users.length; i++) {
      const u = users[i];
      const lineNum = i + 1;
      
      const email = u.email?.trim();
      const fullName = u.full_name?.trim();
      const phone = u.phone?.trim();
      const role = u.role?.trim() || role_type;
      const username = u.username?.trim() || email?.split("@")[0];
      const password = u.password?.trim() || "ChangeMe123!";

      if (!email || !fullName) {
        errors.push(`Row ${lineNum}: Missing email or full name.`);
        continue;
      }

      if (existingEmails.has(email.toLowerCase())) {
        errors.push(`Row ${lineNum}: Email '${email}' already exists.`);
        continue;
      }

      if (phone && existingPhones.has(phone)) {
        errors.push(`Row ${lineNum}: Phone '${phone}' already exists.`);
        continue;
      }

      if (username && existingUsernames.has(username.toLowerCase())) {
        errors.push(`Row ${lineNum}: Username '${username}' already exists.`);
        continue;
      }

      // Add to set to prevent duplicate checks within the same batch
      existingEmails.add(email.toLowerCase());
      if (phone) existingPhones.add(phone);
      if (username) existingUsernames.add(username.toLowerCase());

      // 2. Create user in Auth
      const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, role, school_id: schoolId }
      });

      if (authErr) {
        errors.push(`Row ${lineNum}: Auth creation failed (${authErr.message})`);
        continue;
      }

      // 3. Create profile
      const { data: profile, error: profileErr } = await admin
        .from("profiles")
        .insert({
          id: authUser.user.id,
          school_id: schoolId,
          role,
          full_name: fullName,
          username: username,
          phone: phone || null,
          is_active: true
        })
        .select()
        .single();

      if (profileErr) {
        await admin.auth.admin.deleteUser(authUser.user.id);
        errors.push(`Row ${lineNum}: Profile saving failed (${profileErr.message})`);
        continue;
      }

      // 4. Create role-specific records
      if (role === "student") {
        const names = fullName.split(/\s+/);
        const firstName = names[0] || "";
        const lastName = names.slice(1).join(" ") || names[0] || "";
        
        await admin.from("students").insert({
          school_id: schoolId,
          admission_number: u.admission_number || `ADM/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`,
          student_id: u.student_id || `STU-${Math.floor(1000 + Math.random() * 9000)}`,
          first_name: firstName,
          last_name: lastName,
          status: "active",
          admission_date: new Date().toISOString().split("T")[0],
          user_id: profile.id
        });
      } else if (role === "parent") {
        await admin.from("parents").insert({
          school_id: schoolId,
          parent_id: u.parent_id || `PAR-${Math.floor(1000 + Math.random() * 9000)}`,
          full_name: fullName,
          phone: phone || "",
          email: email,
          user_id: profile.id
        });
      } else if (role === "teacher") {
        await admin.from("teachers").insert({
          school_id: schoolId,
          teacher_id: u.teacher_id || `TCH-${Math.floor(1000 + Math.random() * 9000)}`,
          user_id: profile.id
        });
      } else if (role !== "super_admin") {
        await admin.from("staff").insert({
          school_id: schoolId,
          staff_id: u.staff_id || `STF-${Math.floor(1000 + Math.random() * 9000)}`,
          position: role.replace("_", " "),
          user_id: profile.id
        });
      }

      imported.push({ id: profile.id, email, full_name: fullName });
    }

    return NextResponse.json({
      success: errors.length === 0,
      importedCount: imported.length,
      imported,
      errors
    });
  } catch (err) {
    console.error("Bulk Import error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
