import {TextoEditorial} from "@/components/editorial/texto-editorial";
import { Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Lo que muestran los datos, en frases. Cada frase se arma con las cifras del
 * recorte que se está viendo —no es texto fijo—, así que cambia con los
 * filtros y con cada carga nueva.
 */
export function Hallazgos({ frases }: { frases: string[] }) {
  if (frases.length === 0) return null;
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Lightbulb className="size-4 text-primary" aria-hidden />
          <TextoEditorial id="fe360fe539cd06140f54" original={"Lo que muestran los datos"}/></CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-foreground marker:text-primary">
          {frases.map((frase) => (
            <li key={frase}>{frase}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
