/**
 * Shared school wallet helper used by all finance API routes.
 */
import { createClient } from "@supabase/supabase-js";

export function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const admin = getAdminClient();

export function isTableMissing(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === "42P01" || (error.message ?? "").includes("does not exist");
}

export async function ensureSchoolWallet(schoolId: string) {
  const { data, error } = await admin
    .from("school_wallets")
    .upsert({ school_id: schoolId, current_balance: 0, total_income: 0, total_expenses: 0, total_collections: 0, total_waivers: 0, total_discounts: 0, opening_balance: 0 }, { onConflict: "school_id", ignoreDuplicates: true })
    .select("*")
    .maybeSingle();

  if (error && !isTableMissing(error)) {
    // upsert may return nothing on ignoreDuplicates; fetch existing
  }

  // Always fetch the current record
  const { data: wallet, error: fetchErr } = await admin
    .from("school_wallets")
    .select("*")
    .eq("school_id", schoolId)
    .single();

  if (fetchErr) throw fetchErr;
  return wallet as {
    id: string;
    school_id: string;
    current_balance: number;
    total_income: number;
    total_expenses: number;
    total_collections: number;
    opening_balance: number;
  };
}

export interface WalletMutationParams {
  schoolId: string;
  amount: number;
  type: "credit" | "debit";
  category: string;
  description?: string;
  referenceType?: string;
  referenceId?: string;
  userId?: string;
}

export async function mutateSchoolWallet(params: WalletMutationParams) {
  const { schoolId, amount, type, category, description, referenceType, referenceId, userId } = params;

  const wallet = await ensureSchoolWallet(schoolId);

  const balanceBefore = Number(wallet.current_balance);
  const balanceAfter = type === "credit" ? balanceBefore + amount : balanceBefore - amount;

  // Insert ledger entry
  const { data: tx, error: txErr } = await admin.from("school_wallet_transactions").insert({
    school_id: schoolId,
    wallet_id: wallet.id,
    type,
    category,
    reference_type: referenceType ?? null,
    reference_id: referenceId ?? null,
    amount,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    description: description ?? null,
    created_by: userId ?? null,
  }).select("id").single();

  if (txErr) throw txErr;

  // Update wallet balance
  const walletUpdate: Record<string, unknown> = {
    current_balance: balanceAfter,
    last_updated: new Date().toISOString(),
  };
  if (type === "credit") walletUpdate.total_income = Number(wallet.total_income) + amount;
  if (type === "debit") walletUpdate.total_expenses = Number(wallet.total_expenses) + amount;

  const { error: wErr } = await admin.from("school_wallets").update(walletUpdate).eq("id", wallet.id);
  if (wErr) throw wErr;

  // Write audit log
  await admin.from("finance_audit_log").insert({
    school_id: schoolId,
    user_id: userId ?? null,
    action: type === "credit" ? "wallet_credit" : "wallet_debit",
    entity_type: "school_wallet",
    entity_id: wallet.id,
    amount,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    metadata: { category, referenceType, referenceId, description },
  });

  return { transactionId: tx.id, balanceBefore, balanceAfter };
}
