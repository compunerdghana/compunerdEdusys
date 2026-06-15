import { LoginForm } from "./LoginForm";

async function getSchoolBranding() {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/public/school-branding`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json() as Promise<{ name: string | null; logo_url: string | null }>;
  } catch {
    return null;
  }
}

export default async function LoginPage() {
  const branding = await getSchoolBranding();

  return <LoginForm schoolName={branding?.name ?? null} schoolLogo={branding?.logo_url ?? null} />;
}
