import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { logAuditEvent } from "@/lib/security/rbac";

function getAdmin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Internal ID generator logic helper
async function incrementAndGenerateId(admin: any, schoolId: string, roleType: string) {
  try {
    const { data: school } = await admin
      .from("schools")
      .select("code, id_format_student, id_format_teacher, id_format_staff, id_format_parent, id_format_admin")
      .eq("id", schoolId)
      .single();

    const schoolCode = school?.code || "SCH";
    let template = "CPN/{school_code}/{year}/STU{seq}";
    if (roleType === "student") template = school?.id_format_student || "CPN/{school_code}/{year}/STU{seq}";
    else if (roleType === "teacher") template = school?.id_format_teacher || "CPN/{school_code}/{year}/TCH{seq}";
    else if (roleType === "parent") template = school?.id_format_parent || "CPN/{school_code}/{year}/PAR{seq}";
    else if (roleType === "staff") template = school?.id_format_staff || "CPN/{school_code}/{year}/STF{seq}";
    else template = school?.id_format_admin || "CPN/{school_code}/{year}/ADM{seq}";

    const { data: acadYear } = await admin
      .from("academic_years")
      .select("id, name")
      .eq("school_id", schoolId)
      .eq("is_current", true)
      .maybeSingle();

    const acadYearId = acadYear?.id || null;
    let yearStr = new Date().getFullYear().toString().slice(-2);
    if (acadYear?.name) {
      const match = acadYear.name.match(/\b\d{4}\b/);
      if (match) yearStr = match[0].slice(-2);
    }

    let nextValue = 1;
    const { data: sequence, error: seqErr } = await admin
      .from("school_id_sequences")
      .select("id, last_value")
      .eq("school_id", schoolId)
      .eq("role_type", roleType)
      .single();

    if (seqErr || !sequence) {
      await admin.from("school_id_sequences").insert({
        school_id: schoolId,
        role_type: roleType,
        academic_year_id: acadYearId,
        last_value: 1
      });
      nextValue = 1;
    } else {
      nextValue = sequence.last_value + 1;
      await admin
        .from("school_id_sequences")
        .update({ last_value: nextValue })
        .eq("id", sequence.id);
    }

    return template
      .replace(/{school_code}/g, schoolCode.toUpperCase())
      .replace(/{year}/g, yearStr)
      .replace(/{seq}/g, String(nextValue).padStart(4, "0"));
  } catch (err) {
    console.error("ID Generator helper error:", err);
    return `${roleType.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id, role")
      .eq("id", user.id)
      .single();

    const schoolId = profile?.school_id;
    if (!schoolId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get("role") || "";
    const statusFilter = searchParams.get("status") || "";
    const searchVal = searchParams.get("q") || "";

    const admin = getAdmin();

    // Query profiles with matching joins
    let query = admin
      .from("profiles")
      .select(`
        *,
        user_roles (
          role:school_roles ( id, name, display_name )
        ),
        students (
          id, student_id, admission_number, class_id, status, stream, house, academic_year,
          classroom:classrooms(name)
        ),
        teachers (
          id, teacher_id, employment_date, department, qualification, specialization, subjects_assigned, classes_assigned
        ),
        parents (
          id, parent_id, occupation, employer, address, emergency_contact,
          parent_student_links (
            relationship, is_primary,
            student:students ( id, first_name, last_name, admission_number )
          )
        ),
        staff (
          id, staff_id, department, position, employment_type, employment_date, supervisor_id
        ),
        user_permissions (
          permission:school_permissions ( id, name, display_name )
        )
      `)
      .eq("school_id", schoolId)
      .neq("role", "super_admin");

    if (roleFilter) {
      if (roleFilter === "staff_all") {
        query = query.not("role", "in", '("student","parent")');
      } else {
        query = query.eq("role", roleFilter);
      }
    }

    if (statusFilter) {
      query = query.eq("is_active", statusFilter === "active");
    }

    const { data: users, error } = await query;
    if (error) throw error;

    let filtered = users ?? [];
    if (searchVal) {
      const q = searchVal.toLowerCase();
      filtered = filtered.filter(u => 
        u.full_name?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ users: filtered });
  } catch (err) {
    console.error("GET users error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("id, school_id, full_name, role")
      .eq("id", currentUser.id)
      .single();

    const schoolId = currentProfile?.school_id;
    if (!schoolId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    // Permissions check
    const isAuthorized = ["admin", "owner", "school_owner", "headmaster"].includes(currentProfile.role);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const admin = getAdmin();
    const body = await request.json();
    const {
      email,
      full_name,
      username,
      password,
      role,
      phone,
      role_id,
      middle_name,
      gender,
      date_of_birth,
      religion,
      nationality,
      residential_address,
      digital_address,
      ghana_card,
      emergency_contact,
      
      // role-specific attributes
      student_id, admission_number, class_id, stream, house, academic_year, previous_school, medical_notes, // student
      teacher_id, employment_date, department, qualification, specialization, subjects_assigned, classes_assigned, // teacher
      parent_id, occupation, employer, address, student_ids, relationship, // parent
      staff_id, position, employment_type, supervisor_id, // staff
      
      // overrides
      override_permission_ids
    } = body;

    if (!email || !full_name || !password || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Create auth user
    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role, school_id: schoolId }
    });

    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 400 });
    }

    // 2. Profile table entry
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .upsert({
        id: authUser.user.id,
        school_id: schoolId,
        role,
        full_name,
        middle_name: middle_name || null,
        gender: gender || null,
        date_of_birth: date_of_birth || null,
        religion: religion || null,
        nationality: nationality || "Ghanaian",
        residential_address: residential_address || null,
        digital_address: digital_address || null,
        ghana_card: ghana_card || null,
        emergency_contact: emergency_contact || {},
        username: username || email.split("@")[0],
        phone: phone || null,
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileErr) {
      await admin.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }

    // 3. Assign role to user_roles
    if (role_id) {
      await admin.from("user_roles").insert({
        user_id: profile.id,
        role_id: role_id
      });
    }

    // 4. Role specific integrations
    const names = full_name.trim().split(/\s+/);
    const firstName = names[0] || "";
    const lastName = names.slice(1).join(" ") || names[0] || "";

    if (role === "student") {
      const autoId = student_id || await incrementAndGenerateId(admin, schoolId, "student");
      const admNum = admission_number || `ADM/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;
      await admin.from("students").insert({
        school_id: schoolId,
        admission_number: admNum,
        student_id: autoId,
        first_name: firstName,
        middle_name: middle_name || null,
        last_name: lastName,
        date_of_birth: date_of_birth || null,
        gender: gender || "male",
        class_id: class_id || null,
        status: "active",
        admission_date: new Date().toISOString().split("T")[0],
        previous_school: previous_school || null,
        medical_notes: medical_notes || null,
        stream: stream || null,
        house: house || null,
        academic_year: academic_year || null,
        nationality: nationality || "Ghanaian",
        religion: religion || null,
        ghana_card: ghana_card || null,
        emergency_contact: emergency_contact || {},
        user_id: profile.id
      });
    } else if (role === "parent") {
      const autoId = parent_id || await incrementAndGenerateId(admin, schoolId, "parent");
      const { data: parentRecord } = await admin.from("parents").insert({
        school_id: schoolId,
        parent_id: autoId,
        full_name: full_name,
        phone: phone || "",
        email: email,
        occupation: occupation || null,
        address: address || null,
        employer: employer || null,
        emergency_contact: emergency_contact || {},
        user_id: profile.id
      }).select().single();

      if (parentRecord && student_ids && Array.isArray(student_ids)) {
        for (const sId of student_ids) {
          await admin.from("parent_student_links").insert({
            parent_id: parentRecord.id,
            student_id: sId,
            relationship: relationship || "Guardian",
            is_primary: false
          });
        }
      }
    } else if (role === "teacher") {
      const autoId = teacher_id || await incrementAndGenerateId(admin, schoolId, "teacher");
      await admin.from("teachers").insert({
        school_id: schoolId,
        teacher_id: autoId,
        employment_date: employment_date || new Date().toISOString().split("T")[0],
        department: department || null,
        qualification: qualification || null,
        specialization: specialization || null,
        subjects_assigned: subjects_assigned || [],
        classes_assigned: classes_assigned || [],
        user_id: profile.id
      });
    } else if (role !== "super_admin" && role !== "parent" && role !== "student") {
      // General staff
      const autoId = staff_id || await incrementAndGenerateId(admin, schoolId, "staff");
      await admin.from("staff").insert({
        school_id: schoolId,
        staff_id: autoId,
        department: department || null,
        position: position || role.replace("_", " "),
        employment_type: employment_type || "full-time",
        employment_date: employment_date || new Date().toISOString().split("T")[0],
        supervisor_id: supervisor_id || null,
        user_id: profile.id
      });
    }

    // 5. Direct Override Permissions
    if (override_permission_ids && Array.isArray(override_permission_ids)) {
      for (const permId of override_permission_ids) {
        await admin.from("user_permissions").insert({
          user_id: profile.id,
          permission_id: permId
        });
      }
    }

    // 6. Log audit trail
    await logAuditEvent(
      schoolId,
      currentProfile.id,
      currentProfile.full_name,
      "user.create",
      "user",
      profile.id,
      { email, role, full_name }
    );

    return NextResponse.json({ user: profile }, { status: 201 });
  } catch (err) {
    console.error("POST user error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("id, school_id, full_name, role")
      .eq("id", currentUser.id)
      .single();

    const schoolId = currentProfile?.school_id;
    if (!schoolId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const isAuthorized = ["admin", "owner", "school_owner", "headmaster"].includes(currentProfile.role);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const admin = getAdmin();
    const body = await request.json();
    const {
      id,
      full_name,
      phone,
      role,
      is_active,
      role_id,
      middle_name,
      gender,
      date_of_birth,
      religion,
      nationality,
      residential_address,
      digital_address,
      ghana_card,
      emergency_contact,

      // updates
      student_id, admission_number, class_id, stream, house, academic_year, previous_school, medical_notes, // student
      teacher_id, employment_date, department, qualification, specialization, subjects_assigned, classes_assigned, // teacher
      parent_id, occupation, employer, address, student_ids, relationship, // parent
      staff_id, position, employment_type, supervisor_id, // staff
      override_permission_ids
    } = body;

    if (!id) return NextResponse.json({ error: "User ID is required" }, { status: 400 });

    const { data: targetUser } = await admin
      .from("profiles")
      .select("school_id, role")
      .eq("id", id)
      .single();

    if (!targetUser || targetUser.school_id !== schoolId) {
      return NextResponse.json({ error: "Unauthorized access to tenant record" }, { status: 403 });
    }

    // 1. Update Profile
    const profileUpdates: Record<string, any> = {};
    if (full_name !== undefined) profileUpdates.full_name = full_name;
    if (phone !== undefined) profileUpdates.phone = phone;
    if (role !== undefined) profileUpdates.role = role;
    if (is_active !== undefined) profileUpdates.is_active = is_active;
    if (middle_name !== undefined) profileUpdates.middle_name = middle_name;
    if (gender !== undefined) profileUpdates.gender = gender;
    if (date_of_birth !== undefined) profileUpdates.date_of_birth = date_of_birth;
    if (religion !== undefined) profileUpdates.religion = religion;
    if (nationality !== undefined) profileUpdates.nationality = nationality;
    if (residential_address !== undefined) profileUpdates.residential_address = residential_address;
    if (digital_address !== undefined) profileUpdates.digital_address = digital_address;
    if (ghana_card !== undefined) profileUpdates.ghana_card = ghana_card;
    if (emergency_contact !== undefined) profileUpdates.emergency_contact = emergency_contact;

    const { data: updatedProfile, error: profileErr } = await admin
      .from("profiles")
      .update(profileUpdates)
      .eq("id", id)
      .select()
      .single();

    if (profileErr) throw profileErr;

    // BAN duration update in auth
    if (is_active !== undefined) {
      await admin.auth.admin.updateUserById(id, {
        ban_duration: is_active ? "none" : "87600h"
      });
    }

    // 2. Role matrix update
    if (role_id) {
      await admin.from("user_roles").delete().eq("user_id", id);
      await admin.from("user_roles").insert({ user_id: id, role_id });
    }

    // 3. Child tables updates
    const names = (full_name || updatedProfile.full_name).trim().split(/\s+/);
    const firstName = names[0] || "";
    const lastName = names.slice(1).join(" ") || names[0] || "";

    const userRole = role || targetUser.role;

    if (userRole === "student") {
      const studentUpdates: Record<string, any> = {
        first_name: firstName,
        last_name: lastName,
        updated_at: new Date().toISOString()
      };
      if (student_id !== undefined) studentUpdates.student_id = student_id;
      if (admission_number !== undefined) studentUpdates.admission_number = admission_number;
      if (class_id !== undefined) studentUpdates.class_id = class_id;
      if (stream !== undefined) studentUpdates.stream = stream;
      if (house !== undefined) studentUpdates.house = house;
      if (academic_year !== undefined) studentUpdates.academic_year = academic_year;
      if (previous_school !== undefined) studentUpdates.previous_school = previous_school;
      if (medical_notes !== undefined) studentUpdates.medical_notes = medical_notes;
      if (nationality !== undefined) studentUpdates.nationality = nationality;
      if (religion !== undefined) studentUpdates.religion = religion;
      if (ghana_card !== undefined) studentUpdates.ghana_card = ghana_card;
      if (emergency_contact !== undefined) studentUpdates.emergency_contact = emergency_contact;

      await admin.from("students").upsert({
        user_id: id,
        school_id: schoolId,
        ...studentUpdates
      }, { onConflict: "user_id" });
    } else if (userRole === "parent") {
      const parentUpdates: Record<string, any> = {};
      if (parent_id !== undefined) parentUpdates.parent_id = parent_id;
      if (full_name !== undefined) parentUpdates.full_name = full_name;
      if (phone !== undefined) parentUpdates.phone = phone;
      if (occupation !== undefined) parentUpdates.occupation = occupation;
      if (address !== undefined) parentUpdates.address = address;
      if (employer !== undefined) parentUpdates.employer = employer;
      if (emergency_contact !== undefined) parentUpdates.emergency_contact = emergency_contact;

      const { data: parentRecord } = await admin.from("parents").upsert({
        user_id: id,
        school_id: schoolId,
        ...parentUpdates
      }, { onConflict: "user_id" }).select().single();

      if (parentRecord && student_ids && Array.isArray(student_ids)) {
        await admin.from("parent_student_links").delete().eq("parent_id", parentRecord.id);
        for (const sId of student_ids) {
          await admin.from("parent_student_links").insert({
            parent_id: parentRecord.id,
            student_id: sId,
            relationship: relationship || "Guardian",
            is_primary: false
          });
        }
      }
    } else if (userRole === "teacher") {
      const teacherUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (teacher_id !== undefined) teacherUpdates.teacher_id = teacher_id;
      if (employment_date !== undefined) teacherUpdates.employment_date = employment_date;
      if (department !== undefined) teacherUpdates.department = department;
      if (qualification !== undefined) teacherUpdates.qualification = qualification;
      if (specialization !== undefined) teacherUpdates.specialization = specialization;
      if (subjects_assigned !== undefined) teacherUpdates.subjects_assigned = subjects_assigned;
      if (classes_assigned !== undefined) teacherUpdates.classes_assigned = classes_assigned;

      await admin.from("teachers").upsert({
        user_id: id,
        school_id: schoolId,
        ...teacherUpdates
      }, { onConflict: "user_id" });
    } else if (userRole !== "super_admin") {
      const staffUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (staff_id !== undefined) staffUpdates.staff_id = staff_id;
      if (department !== undefined) staffUpdates.department = department;
      if (position !== undefined) staffUpdates.position = position;
      if (employment_type !== undefined) staffUpdates.employment_type = employment_type;
      if (employment_date !== undefined) staffUpdates.employment_date = employment_date;
      if (supervisor_id !== undefined) staffUpdates.supervisor_id = supervisor_id;

      await admin.from("staff").upsert({
        user_id: id,
        school_id: schoolId,
        ...staffUpdates
      }, { onConflict: "user_id" });
    }

    // 4. Overrides Update
    if (override_permission_ids && Array.isArray(override_permission_ids)) {
      await admin.from("user_permissions").delete().eq("user_id", id);
      for (const permId of override_permission_ids) {
        await admin.from("user_permissions").insert({
          user_id: id,
          permission_id: permId
        });
      }
    }

    // 5. Log audit trail
    await logAuditEvent(
      schoolId,
      currentProfile.id,
      currentProfile.full_name,
      is_active === false ? "user.suspend" : "user.update",
      "user",
      id,
      profileUpdates
    );

    return NextResponse.json({ user: updatedProfile });
  } catch (err) {
    console.error("PATCH user error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
