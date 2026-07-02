// Registro central de módulos del Portal del Colaborador.
// Para agregar un módulo nuevo: añadir una entrada aquí y crear su página
// en src/app/portal/<id>/page.tsx. La navegación y el inicio lo recogen solos.
import {
  Home,
  Clock,
  Megaphone,
  Palmtree,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { canSell, type UserRole } from "@/lib/roles";

export type PortalModule = {
  id: string;
  href: string;
  /** Nombre completo (tarjetas del inicio). */
  label: string;
  /** Nombre corto (barra de navegación). */
  navLabel: string;
  description: string;
  Icon: LucideIcon;
  /** Módulo aún no disponible: se muestra con insignia "Pronto". */
  comingSoon?: boolean;
  /** Permiso requerido además de la sesión. */
  requires?: "sell";
  /** Ocultarlo de las tarjetas del inicio (p. ej. el propio inicio). */
  hideOnHome?: boolean;
};

export const PORTAL_MODULES: PortalModule[] = [
  {
    id: "inicio",
    href: "/portal",
    label: "Inicio",
    navLabel: "Inicio",
    description: "Resumen de tu día y accesos rápidos.",
    Icon: Home,
    hideOnHome: true,
  },
  {
    id: "marcar",
    href: "/portal/marcar",
    label: "Marcar hora",
    navLabel: "Marcar",
    description: "Entrada, almuerzo y salida del día.",
    Icon: Clock,
  },
  {
    id: "vender",
    href: "/portal/vender",
    label: "Vender en Facebook",
    navLabel: "Vender",
    description: "Publicá productos del catálogo en tu página.",
    Icon: Megaphone,
    requires: "sell",
  },
  {
    id: "vacaciones",
    href: "/portal/vacaciones",
    label: "Vacaciones",
    navLabel: "Vacaciones",
    description: "Saldo de días y solicitudes de vacaciones.",
    Icon: Palmtree,
  },
  {
    id: "rendimiento",
    href: "/portal/rendimiento",
    label: "Rendimiento",
    navLabel: "Rendimiento",
    description: "Tus marcas, ventas y métricas del mes.",
    Icon: TrendingUp,
    comingSoon: true,
  },
];

/** Módulos visibles para un rol dado. */
export function modulesForRole(role: UserRole): PortalModule[] {
  return PORTAL_MODULES.filter(
    (m) => !m.requires || (m.requires === "sell" && canSell(role))
  );
}
