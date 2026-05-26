import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Política de envíos",
  description:
    "Información sobre tiempos, cobertura y costos de envío de ICB Tech en Costa Rica.",
};

export default function EnviosPage() {
  return (
    <LegalPage
      title="Política de envíos"
      intro="Enviamos a todo Costa Rica y ofrecemos recogida gratuita en sucursal."
      updated="Mayo 2026"
    >
      <LegalSection heading="1. Cobertura">
        <p>
          Realizamos envíos a todo el territorio nacional. Para zonas de
          difícil acceso, el tiempo de entrega puede extenderse.
        </p>
      </LegalSection>
      <LegalSection heading="2. Tiempos de entrega">
        <p>
          Gran Área Metropolitana (GAM): 24 a 48 horas hábiles. Resto del país:
          2 a 4 días hábiles. Los tiempos corren a partir de la confirmación
          del pago.
        </p>
      </LegalSection>
      <LegalSection heading="3. Costos">
        <p>
          El costo de envío se calcula según el destino y el peso del pedido, y
          se muestra antes de finalizar la compra. La recogida en cualquiera de
          nuestras sucursales no tiene costo.
        </p>
      </LegalSection>
      <LegalSection heading="4. Seguimiento">
        <p>
          Una vez despachado el pedido, te compartiremos la información de
          seguimiento por correo o teléfono.
        </p>
      </LegalSection>
      <LegalSection heading="5. Recepción">
        <p>
          Te recomendamos revisar el producto al momento de la entrega. Si
          notás daños en el empaque, indicalo al transportista y contactanos de
          inmediato.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
