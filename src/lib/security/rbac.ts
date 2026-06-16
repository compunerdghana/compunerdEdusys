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

    // 2. Fetch active subscription and plan details
    const { data: subscription } = await admin
      .from("school_subscriptions")
      .select(`
        id, status, expires_at,
        plan:subscription_plans(id, name, features)
      `)
      .eq("school_id", schoolId)
      .in("status", ["active", "trial"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Features list from plan (e.g., ["students", "finance"])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const planFeatures: string[] = (subscription?.plan as any)?.features || [];

    // 3. Fetch all platform features
    const { data: allFeatures } = await admin
      .from("platform_features")
      .select("id, code, is_core, access_level")
      .eq("status", "active");

    if (!allFeatures) return [];

    // 4. Fetch school feature overrides
    const { data: overrides } = await admin
      .from("school_feature_overrides")
      .select("feature:platform_features(code), enabled")
      .eq("school_id", schoolId);

    const overrideMap: Record<string, boolean> = {};
    if (overrides) {
      overrides.forEach((o: any) => {
        if (o.feature?.code) {
          overrideMap[o.feature.code] = o.enabled;
        }
      });
    }

    // Determine enabled features
    const enabledFeatures = allFeatures.filter((f) => {
      const code = f.code;

      // If explicitly overridden:
      if (overrideMap[code] !== undefined) {
        return overrideMap[code];
      }

      // If core feature:
      if (f.is_core || f.access_level === "public") {
        return true;
      }

      // Check if feature matches any category code in plan features
      // E.g. feature code 'students_list' starts with 'students'
      const planMatch = planFeatures.some((pf) => 
        code === pf || code.startsWith(pf + "_") || pf.startsWith(code.split("_")[0])
      );

      return planMatch;
    });

    return enabledFeatures.map((f) => f.code);
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
