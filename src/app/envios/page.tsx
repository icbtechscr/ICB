import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Política de Envíos",
  description:
    "Política oficial de envíos de ICB Technologies Costa Rica: cobertura, tarifas, plazos y condiciones.",
};

export default function EnviosPage() {
  return (
    <LegalPage
      title="Política de Envíos"
      intro="En ICB Technologies Costa Rica nos comprometemos a gestionar los envíos de nuestros clientes de forma ordenada, responsable y transparente. La presente política establece las condiciones aplicables para el despacho, entrega y logística de productos adquiridos por nuestros clientes."
      updated="Mayo 2026"
    >
      <LegalSection heading="1. Monto mínimo para aplicar envío">
        <p>
          Los envíos aplican únicamente para compras de productos cuyo precio
          individual sea igual o superior a 10.000 colones, o bien, cuando la
          compra total del cliente sume un monto mínimo de 10.000 colones.
        </p>
        <p>
          A partir de dicho monto, se procederá a calcular el costo de envío
          correspondiente, según la distancia, zona de entrega, medio de
          transporte, tipo de servicio requerido y condiciones logísticas
          aplicables.
        </p>
        <p>
          En caso de que el producto o los productos adquiridos no sumen el
          monto mínimo de 10.000 colones, el cliente deberá adquirir otro
          producto u otros productos adicionales hasta alcanzar el monto mínimo
          requerido para proceder con la logística de envío.
        </p>
      </LegalSection>

      <LegalSection heading="2. Plazo estimado de despacho">
        <p>
          La empresa procurará realizar los envíos el mismo día de la compra,
          haciendo todo lo humanamente posible para coordinar la entrega de
          manera oportuna.
        </p>
        <p>
          No obstante, en caso de que por razones operativas, logísticas,
          disponibilidad de mensajería, horarios, rutas, volumen de pedidos o
          cualquier otra circunstancia no sea posible efectuar el envío el mismo
          día, este será programado para el siguiente día hábil.
        </p>
        <p>
          Los tiempos de entrega son estimados y pueden variar según la
          ubicación del cliente, disponibilidad de rutas, tipo de producto,
          medio de transporte y condiciones externas.
        </p>
      </LegalSection>

      <LegalSection heading="3. Épocas de alta demanda">
        <p>
          El cliente comprende y acepta que durante épocas de mayor demanda,
          tales como promociones, temporadas comerciales, fechas especiales,
          cierre de año, campañas masivas, feriados, eventos nacionales o
          situaciones de alto flujo comercial, los tiempos de entrega pueden
          extenderse más de lo habitual.
        </p>
        <p>
          Lo anterior puede deberse a la alta demanda de pedidos, saturación de
          rutas, disponibilidad limitada de mensajeros, servicios de encomienda
          o empresas transportistas.
        </p>
        <p>
          La empresa realizará sus mejores esfuerzos para cumplir con los
          tiempos de entrega, sin embargo, los plazos podrían verse afectados
          por circunstancias propias del volumen operativo de dichas temporadas.
        </p>
      </LegalSection>

      <LegalSection heading="4. Envíos por encomienda o servicios de transporte">
        <p>
          Los envíos realizados por medio de encomienda, servicios de transporte
          tradicionales o empresas comúnmente utilizadas en Costa Rica tendrán
          un costo adicional mínimo de 4.000 colones.
        </p>
        <p>
          Este monto aplica para encomiendas o servicios de transporte típicos,
          según disponibilidad, zona de destino y condiciones del servicio.
        </p>
        <p>
          En el caso de envíos realizados mediante Correos de Costa Rica, la
          tarifa mínima será de 7.000 colones. Este monto se compone de la
          tarifa mínima cobrada por Correos de Costa Rica para el envío de
          nuestros productos, la cual es de aproximadamente 5.000 colones, más
          un costo logístico interno de 2.000 colones correspondiente al
          traslado del producto por medio de mensajero hasta el punto de
          despacho correspondiente.
        </p>
        <p>
          El cliente acepta que las tarifas de encomienda pueden variar según
          peso, tamaño, destino, empresa transportista, urgencia del servicio o
          condiciones propias del proveedor externo.
        </p>
      </LegalSection>

      <LegalSection heading="5. Tarifas por kilómetro recorrido">
        <p>
          Para envíos realizados mediante mensajería directa dentro de la zona
          de cobertura de la empresa, se aplicarán las siguientes tarifas
          vigentes:
        </p>
        <ul className="ml-4 list-disc space-y-1">
          <li>Envío en moto: 500 colones por kilómetro recorrido.</li>
          <li>Envío en carro: 1.000 colones por kilómetro recorrido.</li>
        </ul>
        <p>
          Estas tarifas se encuentran vigentes actualmente y están sujetas a
          cambios sin previo aviso.
        </p>
        <p>
          La empresa se reserva el derecho de modificar, actualizar o ajustar
          las tarifas de envío cuando lo considere necesario, según costos
          operativos, distancia, combustible, disponibilidad de mensajería,
          tipo de producto, volumen, peso, condiciones de ruta o cualquier otra
          circunstancia logística.
        </p>
      </LegalSection>

      <LegalSection heading="6. Pago previo para envíos fuera de zona de cobertura">
        <p>
          Para envíos realizados por medio de encomienda, transporte externo o
          entregas fuera del Gran Área Metropolitana o fuera de la zona de
          cobertura directa de la empresa, la totalidad de la cotización,
          factura o monto adeudado deberá estar cancelada antes de proceder con
          el envío.
        </p>
        <p>
          La empresa no realiza envíos bajo modalidad de pago contra entrega
          cuando se trate de envíos fuera del Gran Área Metropolitana, zonas
          fuera de cobertura directa o entregas gestionadas mediante encomienda
          o terceros transportistas.
        </p>
        <p>
          El cliente deberá cancelar previamente el valor total del producto,
          los costos de envío, cargos adicionales aplicables y cualquier otro
          monto relacionado con la gestión logística.
        </p>
      </LegalSection>

      <LegalSection heading="7. Pago contra entrega dentro de la zona de cobertura">
        <p>
          En caso de envíos dentro de la zona de cobertura directa de la
          empresa, el cliente podrá cancelar contra entrega si así lo desea y si
          la empresa lo autoriza previamente.
        </p>
        <p>Los métodos de pago disponibles para entregas contra entrega podrán ser:</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>Efectivo.</li>
          <li>Transferencia bancaria.</li>
          <li>SINPE Móvil.</li>
          <li>Enlace de pago para tarjeta.</li>
        </ul>
        <p>
          La entrega del producto estará sujeta a la confirmación del pago
          correspondiente. En caso de pagos por transferencia, SINPE Móvil o
          enlace de pago, la empresa podrá solicitar comprobante o verificar la
          acreditación del monto antes de entregar el producto.
        </p>
      </LegalSection>

      <LegalSection heading="8. Productos por encargo o contra pedido">
        <p>
          En el caso de productos, mercancías o artículos gestionados por
          encargo o contra pedido, el cliente comprende que deberá otorgar a la
          empresa el plazo logístico necesario para recibir, trasladar o colocar
          el producto en el punto físico de San José, el cual funciona como
          central de logística.
        </p>
        <p>
          Una vez que el producto se encuentre disponible en dicho punto
          logístico, la empresa procederá a coordinar el envío correspondiente
          a la brevedad posible, según disponibilidad de rutas, mensajería,
          transporte, zona de destino y condiciones operativas.
        </p>
        <p>
          Los tiempos de entrega de productos por encargo o contra pedido pueden
          variar según proveedor, disponibilidad, traslado interno, importación,
          transporte, ruta, volumen de pedidos o cualquier otra condición propia
          de la logística del producto.
        </p>
      </LegalSection>

      <LegalSection heading="9. Responsabilidad en entregas por terceros">
        <p>
          Cuando el envío sea realizado por medio de encomiendas, transportistas
          externos, Correos de Costa Rica u otros proveedores de transporte, la
          empresa gestionará el despacho del producto conforme a la información
          brindada por el cliente.
        </p>
        <p>
          Una vez entregado el paquete al proveedor de transporte
          correspondiente, los tiempos de entrega, manipulación, ruta, rastreo y
          condiciones finales dependerán también de dicho proveedor externo.
        </p>
        <p>
          La empresa brindará al cliente la información disponible para
          seguimiento cuando corresponda, pero no se responsabiliza por atrasos
          atribuibles directamente al servicio de transporte externo, cierres de
          ruta, fuerza mayor, eventos climáticos, feriados, huelgas, errores de
          dirección proporcionada por el cliente o cualquier situación ajena al
          control directo de la empresa.
        </p>
      </LegalSection>

      <LegalSection heading="10. Información correcta para el envío">
        <p>
          El cliente es responsable de proporcionar de forma clara, completa y
          correcta la información necesaria para realizar el envío, incluyendo:
        </p>
        <ul className="ml-4 list-disc space-y-1">
          <li>Nombre completo.</li>
          <li>Número de teléfono.</li>
          <li>Dirección exacta.</li>
          <li>Provincia, cantón y distrito.</li>
          <li>Punto de referencia.</li>
          <li>Horario disponible para recibir.</li>
          <li>Persona autorizada para recibir, cuando aplique.</li>
        </ul>
        <p>
          La empresa no será responsable por atrasos, entregas fallidas, costos
          adicionales o reprogramaciones ocasionadas por información incompleta,
          incorrecta o imprecisa suministrada por el cliente.
        </p>
      </LegalSection>

      <LegalSection heading="11. Reprogramación de entregas">
        <p>
          Si el cliente no se encuentra disponible al momento de la entrega, no
          responde llamadas, proporciona una dirección incorrecta o impide la
          entrega por cualquier motivo atribuible a su persona, la empresa
          podrá reprogramar el envío.
        </p>
        <p>
          Toda reprogramación podrá generar un nuevo costo de envío, el cual
          deberá ser asumido por el cliente antes de coordinar nuevamente la
          entrega.
        </p>
      </LegalSection>

      <LegalSection heading="12. Aceptación de la política">
        <p>
          Al solicitar un envío o realizar una compra con entrega a domicilio,
          encomienda, transporte externo o mensajería directa, el cliente
          declara conocer y aceptar la presente Política de Envíos.
        </p>
        <p>
          Esta política forma parte de las condiciones comerciales de venta de
          ICB Technologies Costa Rica, y podrá ser modificada por la empresa
          cuando lo considere necesario.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
