import type { LucideIcon } from "lucide-react";
import {TextoDeCatalogo} from "@/components/editorial/texto-editorial";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  etiqueta: string;
  valor: string;
  detalle?: string;
  icono: LucideIcon;
  className?: string;
  compacto?: boolean;
}

export function KpiCard({
  etiqueta,
  valor,
  detalle,
  icono: Icono,
  className,
  compacto = false,
}: KpiCardProps) {
  if (compacto) {
    return (
      <Card className={cn("gap-0 border-border/70 py-0", className)}>
        <CardContent className="flex items-center gap-2.5 px-3.5 py-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
            <Icono className="size-4" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[11px] font-medium text-muted-foreground"><TextoDeCatalogo texto={etiqueta}/></span>
            <span className="font-heading text-xl font-bold leading-tight tabular-nums">{valor}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-border/70", className)}>
      <CardContent className="flex items-start justify-between gap-3 px-5 py-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-muted-foreground"><TextoDeCatalogo texto={etiqueta}/></span>
          <span className="font-heading text-[2.25rem] font-bold tabular-nums leading-none">
            {valor}
          </span>
          {detalle ? <span className="text-xs text-muted-foreground"><TextoDeCatalogo texto={detalle}/></span> : null}
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
          <Icono className="size-5" aria-hidden />
        </span>
      </CardContent>
    </Card>
  );
}
