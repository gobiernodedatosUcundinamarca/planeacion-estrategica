import {TextoEditorial} from "@/components/editorial/texto-editorial";
import { MessageSquareText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumero } from "@/lib/formatters";
import type { PreguntaAbierta } from "@/types/analitica-momentos";

export function RespuestasAbiertas({ pregunta }: { pregunta: PreguntaAbierta }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquareText className="size-4 shrink-0 text-primary" aria-hidden />
          {pregunta.pregunta}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{formatNumero(pregunta.respuestas.length)} <TextoEditorial id="fd49d6ca9c44ce551c82" original={"respuestas"}/></p>
      </CardHeader>
      <CardContent>
        <ul className="flex max-h-96 flex-col gap-3 overflow-y-auto pr-1">
          {pregunta.respuestas.map((respuesta, i) => (
            <li key={i} className="rounded-lg bg-muted/60 px-3.5 py-3 text-sm leading-relaxed text-foreground">
              {respuesta}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
