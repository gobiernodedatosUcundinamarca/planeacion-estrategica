import type { MetodoClasificacion } from "@/types/clasificacion-documental";

/** Metodologías documentadas; sus categorías se leen de las fuentes, no de esta lista. */
export const FUENTES_CLASIFICACION: { id: MetodoClasificacion; nombre: string; descripcion: string }[] = [
  { id: "aportes-plan", nombre: "Aportes de las presentaciones (A1, A2…)", descripcion: "Lista común por transformación. Asignación Jev con probabilidad mínima de 70 %, con las exclusiones de la revisión original." },
  { id: "bert-conjunto", nombre: "BERTopic original · conjunto de unidades", descripcion: "Agrupación original por transformación. Sus temas son distintos de los aportes A1/A2; la afinidad no es una probabilidad Jev." },
  { id: "bert-regional", nombre: "BERTopic original · por unidad regional", descripcion: "Cada unidad y transformación tiene sus propios temas documentados. No se equiparan entre unidades ni con los códigos de las presentaciones." },
  { id: "jev-ejercicio", nombre: "Jev original · por ejercicio", descripcion: "Listas originales por ejercicio y fechas, conservadas como una clasificación diferente de la lista común de las presentaciones." },
  { id: "bert-jev-unidad", nombre: "BERT → Jev original · por unidad", descripcion: "Temas descubiertos por unidad y clasificados por Jev. Se conservan sus asignaciones originales, sin trasladarlas a los códigos A1/A2 comunes." },
];

export function esMetodoClasificacion(valor: string): valor is MetodoClasificacion {
  return FUENTES_CLASIFICACION.some((fuente) => fuente.id === valor);
}
