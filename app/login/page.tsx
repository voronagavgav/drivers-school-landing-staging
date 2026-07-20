import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Wordmark } from "@/components/brand";
import { Card } from "@/components/ui";
import { LoginForm } from "@/components/auth-forms";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-5 py-12">
      <div className="mb-6">
        <Wordmark />
      </div>
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 font-display text-2xl font-semibold text-ink">Вхід</h1>
        <p className="mb-5 text-sm text-muted">Раді бачити знову.</p>
        <LoginForm />
      </Card>
      <p className="mt-4 text-xs text-muted">
        Демо: user@drivers.school / User12345
      </p>
    </div>
  );
}
