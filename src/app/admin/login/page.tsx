import { BackgroundShader } from "@/components/ui/background-shader";
import { LoginForm } from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden p-4 text-white">
      <BackgroundShader palette="brand" speed={0.5} />
      <LoginForm />
    </div>
  );
}
