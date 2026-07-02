import { Palmtree } from "lucide-react";
import { ComingSoon } from "@/components/portal/ComingSoon";

export const metadata = {
  title: "Vacaciones",
};

export default function VacacionesPage() {
  return (
    <ComingSoon
      title="Vacaciones"
      description="Aquí vas a poder ver tu saldo de días disponibles, solicitar vacaciones y dar seguimiento a tus solicitudes."
      Icon={Palmtree}
    />
  );
}
