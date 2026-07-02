import { TrendingUp } from "lucide-react";
import { ComingSoon } from "@/components/portal/ComingSoon";

export const metadata = {
  title: "Rendimiento",
};

export default function RendimientoPage() {
  return (
    <ComingSoon
      title="Rendimiento"
      description="Aquí vas a poder ver tus marcas del mes, tus publicaciones y ventas, y otras métricas de tu desempeño."
      Icon={TrendingUp}
    />
  );
}
