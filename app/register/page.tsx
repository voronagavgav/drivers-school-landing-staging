import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Wordmark, LegalDisclaimer } from "@/components/brand";
import { Card } from "@/components/ui";
import { RegisterForm } from "@/components/auth-forms";

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-5 py-12">
      <div className="mb-6">
        <Wordmark />
      </div>
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 font-display text-2xl font-semibold text-ink">Реєстрація</h1>
        <p className="mb-5 text-sm text-muted">Кілька секунд — і можна вчитися.</p>
        <RegisterForm />
      </Card>
      <div className="mt-5 w-full max-w-sm">
        <LegalDisclaimer />
      </div>
    </div>
  );
}
