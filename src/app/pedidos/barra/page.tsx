import { PosInterface } from "@/components/pedidos/PosInterface";

export const metadata = {
  title: "Pedido en Barra — Rancho Alba",
};

export default function BarraPage() {
  return <PosInterface barraMode />;
}
