import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/LegalPage";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Política de Garantía, Cambios y Devoluciones",
  description:
    "Política oficial de garantía, cambios y devoluciones de ICB Technologies Costa Rica.",
  alternates: { canonical: absoluteUrl("/devoluciones") },
};

export default function DevolucionesPage() {
  return (
    <LegalPage
      title="Política de Garantía, Cambios y Devoluciones"
      intro="En ICB Technologies Costa Rica agradecemos su compra y confianza. Con el fin de brindar claridad en nuestras condiciones comerciales, se establece la siguiente política aplicable a las compras realizadas en nuestras sucursales, canales digitales, medios de pago electrónicos, transferencias, SINPE Móvil, links de pago o pagos en efectivo."
      updated="Mayo 2026"
    >
      <LegalSection heading="1. Ventas en firme">
        <p>Todas nuestras ventas se consideran ventas en firme.</p>
        <p>
          La empresa no realiza devoluciones de dinero por arrepentimiento,
          error de compra, incompatibilidad, cambio de opinión, falta de uso,
          compra duplicada o cualquier otra causa atribuible al cliente, salvo
          que la empresa, a su exclusivo criterio comercial, autorice una
          excepción por escrito o que aplique una obligación legal relacionada
          con garantía.
        </p>
      </LegalSection>

      <LegalSection heading="2. Plazo para solicitar cambio o devolución comercial">
        <p>
          Cualquier solicitud de cambio o devolución comercial deberá ser
          presentada dentro de los primeros 3 días naturales posteriores a la
          fecha de compra.
        </p>
        <p>
          Vencido este plazo, la empresa no estará obligada a aceptar cambios o
          devoluciones comerciales, sin perjuicio de los derechos que
          correspondan al cliente por garantía legal, cuando aplique.
        </p>
      </LegalSection>

      <LegalSection heading="3. Cambios de producto">
        <p>
          La empresa podrá valorar el cambio del producto adquirido dentro del
          plazo de 3 días naturales desde la compra, siempre que se cumplan
          todas las siguientes condiciones:
        </p>
        <ol className="ml-4 list-decimal space-y-1">
          <li>
            El producto debe encontrarse sellado de fábrica, o bien, en
            perfectas condiciones para la venta.
          </li>
          <li>
            Debe conservar sus sellos de seguridad, plásticos, empaques,
            accesorios, manuales, etiquetas y demás componentes originales.
          </li>
          <li>
            No debe presentar señales de uso, apertura, manipulación,
            instalación, daño, suciedad, rayones, golpes, humedad, alteración
            de empaques o faltantes.
          </li>
          <li>
            El cliente debe presentar el comprobante de compra correspondiente.
          </li>
        </ol>
        <p>
          La aceptación del cambio queda sujeta a revisión previa por parte de
          la empresa.
        </p>
      </LegalSection>

      <LegalSection heading="4. Productos que no estén en condiciones de venta">
        <p>
          Cuando el producto no se encuentre en condiciones aptas para ser
          vendido nuevamente, la empresa podrá rechazar el cambio o devolución.
        </p>
        <p>
          No obstante, y únicamente como gesto comercial, la empresa podrá
          valorar reconocer al cliente un porcentaje del precio pagado, según el
          estado del producto, sus empaques, accesorios, grado de uso,
          deterioro o faltantes. Dicho reconocimiento, si se aprueba, podrá
          aplicarse como crédito para compras posteriores en ICB Technologies Costa Rica
          Costa Rica.
        </p>
        <p>
          Este reconocimiento no constituye una obligación automática para la
          empresa y será evaluado caso por caso.
        </p>
      </LegalSection>

      <LegalSection heading="5. Garantía de productos cambiados">
        <p>
          En caso de que la empresa autorice el cambio de un producto, la
          garantía aplicable continuará corriendo con base en la fecha de la
          compra original.
        </p>
        <p>
          El cambio de producto no reinicia, extiende ni renueva desde cero el
          plazo de garantía, salvo que una autorización escrita de la empresa
          indique expresamente lo contrario.
        </p>
      </LegalSection>

      <LegalSection heading="6. Garantía legal o garantía del fabricante">
        <p>
          Esta política de cambios y devoluciones comerciales no limita los
          derechos que correspondan al cliente por garantía legal, defectos de
          fábrica o garantía otorgada por el fabricante.
        </p>
        <p>
          Cuando el producto presente una falla cubierta por garantía, la
          empresa podrá gestionar, según corresponda, la revisión técnica,
          reparación, cambio, sustitución, nota de crédito o devolución,
          conforme al diagnóstico y la normativa aplicable.
        </p>
        <p>
          No se cubrirán por garantía los daños ocasionados por mal uso, golpes,
          humedad, instalación incorrecta, manipulación indebida, alteración del
          producto, uso de accesorios no compatibles, variaciones eléctricas,
          apertura no autorizada, desgaste normal o cualquier otra causa no
          atribuible a defecto de fábrica.
        </p>
      </LegalSection>

      <LegalSection heading="7. Procedimiento para solicitar devolución, cambio o gestión de garantía">
        <p>
          Toda solicitud deberá realizarse por correo electrónico a:{" "}
          <a
            href="mailto:servicioalcliente@icbtechscr.com"
            className="font-semibold text-accent-300 hover:underline"
          >
            servicioalcliente@icbtechscr.com
          </a>
        </p>
        <p>
          En el correo, el cliente deberá indicar y adjuntar la siguiente
          información:
        </p>
        <ol className="ml-4 list-decimal space-y-1">
          <li>
            Nombre completo de la persona solicitante y su número de
            identificación.
          </li>
          <li>
            Nombre de la empresa representada (cuando la compra se haya
            realizado a nombre de una persona jurídica).
          </li>
          <li>Factura electrónica, comprobante o referencia de compra.</li>
          <li>
            Comprobante de pago respectivo, en caso de pago por SINPE Móvil o
            transferencia bancaria y compra mediante enlace/plataforma de pago
            virtual con tarjeta.
          </li>
          <li>
            Si el pago fue realizado en efectivo, indicar el punto físico donde
            se efectuó el pago.
          </li>
          <li>Motivo de la solicitud.</li>
          <li>
            Medio para devolución de dinero, si aplica y si fue aprobado por la
            empresa.
          </li>
        </ol>
        <p>Para devoluciones de dinero aprobadas, el cliente deberá indicar:</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>Número de cuenta bancaria o número de SINPE Móvil.</li>
          <li>Nombre completo del titular de la cuenta o SINPE Móvil.</li>
          <li>Entidad bancaria correspondiente, cuando aplique.</li>
        </ul>
        <p>
          Cuando la compra haya sido realizada por una empresa, la devolución
          deberá realizarse únicamente a una cuenta bancaria o SINPE Móvil a
          nombre de la misma empresa que efectuó la compra. No se realizarán
          devoluciones a cuentas personales de terceros o personas físicas
          distintas a la entidad compradora.
        </p>
      </LegalSection>

      <LegalSection heading="8. Revisión y aprobación">
        <p>
          La recepción de una solicitud no implica su aprobación automática.
        </p>
        <p>
          Toda solicitud será revisada por la empresa, quien podrá solicitar
          información adicional, fotografías, comprobantes, revisión física del
          producto o diagnóstico técnico antes de resolver.
        </p>
        <p>
          La empresa se reserva el derecho de rechazar solicitudes que no
          cumplan con esta política, que se presenten fuera de plazo, que no
          cuenten con comprobante de compra, que involucren productos usados o
          alterados, o que no permitan verificar adecuadamente la compra y
          condición del producto.
        </p>
      </LegalSection>

      <LegalSection heading="9. Costos de envío o traslado">
        <p>
          Cuando el cambio, devolución o revisión requiera traslado del
          producto, los costos de envío, mensajería o transporte correrán por
          cuenta del cliente, salvo que la empresa determine que el caso
          corresponde a una falla cubierta por garantía o autorice expresamente
          otra condición por escrito.
        </p>
      </LegalSection>

      <LegalSection heading="10. Aceptación de la política">
        <p>
          Al realizar una compra en ICB Technologies Costa Rica, el cliente
          declara conocer y aceptar esta política de cambios, devoluciones y
          garantías.
        </p>
        <p>
          Esta política forma parte de las condiciones comerciales de venta de
          la empresa y aplica sin perjuicio de los derechos mínimos establecidos
          por la legislación costarricense de protección al consumidor.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
