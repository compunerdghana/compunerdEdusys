import { createClient } from "@supabase/supabase-js";

// Service role client to perform internal queries bypassing RLS
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Maps platform feature codes to columns in the school_features table.
 */
function getColumnNameForFeatureCode(code: string): string | null {
  if (code.startsWith("students_")) return "students";
  if (code.startsWith("admissions_")) return "admissions";
  
  if (
    code === "finance_payroll" ||
    code.startsWith("reports_payroll") ||
    code === "hr_leave" ||
    code === "hr_training" ||
    code === "hr_promotions" ||
    code === "hr_transfers" ||
    code === "hr_exits"
  ) {
    return "payroll";
  }
  if (
    code.startsWith("finance_") ||
    code === "settings_fees" ||
    code === "reports_finance" ||
    code === "reports_outstanding"
  ) {
    return "finance";
  }
  
  if (code === "academic_attendance" || code === "hr_staff_attendance" || code === "reports_attendance") {
    return "attendance";
  }
  
  if (code === "academic_exams" || code === "reports_exams") {
    return "exams";
  }
  if (code === "academic_report_cards" || code === "reports_report_cards") {
    return "report_cards";
  }
  
  if (
    code.startsWith("academic_") ||
    code.startsWith("settings_") ||
    code === "academic_calendar" ||
    code === "academic_overview" ||
    code === "academic_timetable"
  ) {
    return "academics";
  }
  
  if (code.startsWith("comms_") || code.startsWith("communication_") || code === "reports_comms") {
    return "communications";
  }
  
  if (code.startsWith("inventory")) return "inventory";
  if (code.startsWith("transport")) return "transport";
  if (code.startsWith("hostel")) return "hostel";
  
  return null;
}

/**
 * Resolves all active feature codes for a school based on active plan and overrides.
 */
export async function getSchoolEnabledFeatures(schoolId: string): Promise<string[]> {
  try {
    const admin = getAdminClient();

    // 1. Fetch school details
    const { data: school, error: schoolErr } = await admin
      .from("schools")
      .select("id, status")
      .eq("id", schoolId)
      .single();

    if (schoolErr || !school) return [];
    if (school.status === "suspended" || school.status === "archived") return [];

    // 2. Fetch school_features columns
    const { data: schoolFeatures, error: featErr } = await admin
      .from("school_features")
      .select("*")
      .eq("school_id", schoolId)
      .maybeSingle();

    // Default configuration if no row exists yet
    const featuresRow: Record<string, any> = schoolFeatures || {
      students: true,
      admissions: true,
      finance: true,
      attendance: true,
      academics: true,
      exams: true,
      report_cards: true,
      communications: true,
      payroll: true,
      inventory: false,
      transport: false,
      hostel: false,
    };

    // 3. Fetch all active platform features
    const { data: allFeatures } = await admin
      .from("platform_features")
      .select("id, code, is_core, access_level")
      .eq("status", "active");

    if (!allFeatures) return [];

    const enabledFeaturesList: string[] = [];

    // Add high-level column keys themselves if they are enabled
    const highLevelColumns = [
      "students", "admissions", "finance", "attendance", "academics",
      "exams", "report_cards", "communications", "payroll",
      "inventory", "transport", "hostel"
    ];

    highLevelColumns.forEach((col) => {
      if (featuresRow[col] === true) {
        enabledFeaturesList.push(col);
      }
    });

    // Determine which platform features are enabled
    allFeatures.forEach((f) => {
      const code = f.code;

      // Core features are always enabled
      if (f.is_core || f.access_level === "public") {
        enabledFeaturesList.push(code);
        return;
      }

      // Check if feature code maps to a high-level column
      const mappedCol = getColumnNameForFeatureCode(code);
      if (mappedCol) {
        if (featuresRow[mappedCol] === true) {
          enabledFeaturesList.push(code);
        }
      } else {
        // Fallback: If not mapped to any column, allow it by default
        enabledFeaturesList.push(code);
      }
    });

    // Return unique values
    return Array.from(new Set(enabledFeaturesList));
  } catch (err) {
    console.error("Error in getSchoolEnabledFeatures:", err);
    return [];
  }
}

/**
 * Returns the unique permissions list for a school user.
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  try {
    const admin = getAdminClient();

    // 1. Get user profile
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("id, role, school_id")
      .eq("id", userId)
      .single();

    if (profileErr || !profile) return [];

    // If super admin: unlimited
    if (profile.role === "super_admin") {
      const { data: allPerms } = await admin.from("school_permissions").select("name");
      return allPerms?.map((p) => p.name) || [];
    }

    if (!profile.school_id) return [];

    // 2. Get school enabled features
    const enabledFeatures = await getSchoolEnabledFeatures(profile.school_id);

    // 3. Get user roles
    const { data: userRoles } = await admin
      .from("user_roles")
      .select("role_id")
      .eq("user_id", userId);

    const roleIds = userRoles?.map((ur) => ur.role_id) || [];

    // 4. Fetch permissions for user's roles
    let permissionsQuery = admin
      .from("school_role_permissions")
      .select(`
        permission:school_permissions(name, feature_code)
      `);

    if (roleIds.length > 0) {
      permissionsQuery = permissionsQuery.in("role_id", roleIds);
    } else {
      // Fallback: If no explicit user_roles, map by profile.role template
      const fallbackRoleName = profile.role === "owner" || profile.role === "school_owner" || profile.role === "admin" ? "school_admin" : profile.role;
      const { data: fallbackRole } = await admin
        .from("school_roles")
        .select("id")
        .eq("school_id", profile.school_id)
        .eq("name", fallbackRoleName)
        .maybeSingle();
      
      if (fallbackRole) {
        permissionsQuery = permissionsQuery.eq("role_id", fallbackRole.id);
      } else {
        return [];
      }
    }

    const { data: permsData } = await permissionsQuery;
    if (!permsData) return [];

    const activePermissions: string[] = [];
    permsData.forEach((row: any) => {
      const perm = row.permission;
      if (perm?.name) {
        // Permission is valid only if its associated feature is enabled for the school
        if (!perm.feature_code || enabledFeatures.includes(perm.feature_code)) {
          activePermissions.push(perm.name);
        }
      }
    });

    return Array.from(new Set(activePermissions));
  } catch (err) {
    console.error("Error in getUserPermissions:", err);
    return [];
  }
}

/**
 * Checks if a user has a specific permission.
 */
export async function hasPermission(userId: string, permissionName: string): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissions.includes(permissionName);
}

/**
 * Checks if a feature is enabled for a school.
 */
export async function checkFeatureEnabled(schoolId: string, featureCode: string): Promise<boolean> {
  const features = await getSchoolEnabledFeatures(schoolId);
  return features.includes(featureCode);
}

/**
 * Log a security or audit action inside a school.
 */
export async function logAuditEvent(
  schoolId: string,
  actorId: string | null,
  actorName: string,
  action: string,
  targetType: string,
  targetId: string | null,
  details: object = {},
  ipAddress: string = "127.0.0.1",
  device: string = "unknown"
) {
  try {
    const admin = getAdminClient();
    await admin.from("school_audit_logs").insert({
      school_id: schoolId,
      actor_id: actorId,
      actor_name: actorName,
      action,
      target_type: targetType,
      target_id: targetId,
      details: details || {},
      ip_address: ipAddress,
      device
    });
  } catch (err) {
    console.error("Failed to log audit event:", err);
  }
}

/**
 * Log a security incident (e.g. failed login, access violation).
 */
export async function logSecurityEvent(
  schoolId: string,
  userId: string | null,
  eventType: string,
  severity: "low" | "medium" | "high" | "critical",
  description: string,
  ipAddress: string = "127.0.0.1",
  device: string = "unknown"
) {
  try {
    const admin = getAdminClient();
    await admin.from("security_events").insert({
      school_id: schoolId,
      user_id: userId,
      event_type: eventType,
      severity,
      description,
      ip_address: ipAddress,
      device
    });
  } catch (err) {
    console.error("Failed to log security event:", err);
  }
}
