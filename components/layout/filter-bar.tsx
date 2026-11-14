"use client";
import { EtiquetaFiltroEditable } from "@/components/editorial/etiqueta-filtro";

import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFiltrosStore } from "@/store/filtros";
import { ETIQUETA_ROL_CORTA, FACULTADES_ORDENADAS, ROLES_ORDENADOS, SEDES_ORDENADAS } from "@/constants/marca";
import type { Rol, Sede } from "@/types/encuesta";

const TODAS = "__todas__";
const FACULTADES_SET = new Set(FACULTADES_ORDENADAS);

export function FilterBar() {
  const {
    rol,
    sede,
    facultad,
    programaOArea,
    toggleRol,
    toggleSede,
    toggleFacultad,
    toggleProgramaOArea,
    limpiar,
    hayFiltrosActivos,
  } = useFiltrosStore();

  const { data: opciones } = useQuery({
    queryKey: ["opciones-filtro"],
    queryFn: async () => {
      const res = await fetch("/api/filtros/opciones");
      if (!res.ok) throw new Error("No se pudieron cargar las áreas");
      return res.json() as Promise<{ areas: string[] }>;
    },
    staleTime: Infinity,
  });
  const areas = opciones?.areas ?? [];

  const rolActivo = rol?.[0] ?? TODAS;
  const sedeActiva = sede?.[0] ?? TODAS;
  const facultadOAreaActiva = facultad?.[0] ?? programaOArea?.[0] ?? TODAS;
  const activo = hayFiltrosActivos();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Campo etiqueta="Unidad Regional">
        <Select
          value={sedeActiva}
          onValueChange={(v) => {
            if (sede?.[0]) toggleSede(sede[0] as Sede);
            if (v && v !== TODAS) toggleSede(v as Sede);
          }}
        >
          <SelectTrigger size="sm" className="w-[160px] bg-card">
            <SelectValue placeholder="Todas">
              {(v: string | null) => <span className="min-w-0 truncate">{v && v !== TODAS ? v : "Todas"}</span>}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODAS}>Todas</SelectItem>
            {SEDES_ORDENADAS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Campo>

      <Campo etiqueta="Facultad / Área">
        <Select
          value={facultadOAreaActiva}
          onValueChange={(v) => {
            if (facultad?.[0]) toggleFacultad(facultad[0]);
            if (programaOArea?.[0]) toggleProgramaOArea(programaOArea[0]);
            if (v && v !== TODAS) {
              if (FACULTADES_SET.has(v)) toggleFacultad(v);
              else toggleProgramaOArea(v);
            }
          }}
        >
          <SelectTrigger size="sm" className="w-[220px] bg-card">
            <SelectValue placeholder="Todas">
              {(v: string | null) => <span className="min-w-0 truncate">{v && v !== TODAS ? v : "Todas"}</span>}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODAS}>Todas</SelectItem>
            <SelectGroup>
              <SelectLabel>Facultad</SelectLabel>
              {FACULTADES_ORDENADAS.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectGroup>
            {areas.length ? (
              <SelectGroup>
                <SelectLabel>Área</SelectLabel>
                {areas.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectGroup>
            ) : null}
          </SelectContent>
        </Select>
      </Campo>

      <Campo etiqueta="Rol">
        <Select
          value={rolActivo}
          onValueChange={(v) => {
            if (rol?.[0]) toggleRol(rol[0] as Rol);
            if (v && v !== TODAS) toggleRol(v as Rol);
          }}
        >
          <SelectTrigger size="sm" className="w-[180px] bg-card">
            <SelectValue placeholder="Todos">
              {(v: string | null) => (
                <span className="min-w-0 truncate">{v && v !== TODAS ? ETIQUETA_ROL_CORTA[v as Rol] : "Todos"}</span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODAS}>Todos</SelectItem>
            {ROLES_ORDENADOS.map((r) => (
              <SelectItem key={r} value={r}>
                {ETIQUETA_ROL_CORTA[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Campo>

      {activo ? (
        <Button variant="ghost" size="sm" onClick={limpiar} className="text-muted-foreground">
          <X className="size-3.5" />
          Limpiar filtros
        </Button>
      ) : null}
    </div>
  );
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"><EtiquetaFiltroEditable ambito="diagnostico" texto={etiqueta}/></span>
      {children}
    </div>
  );
}
