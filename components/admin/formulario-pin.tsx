"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { validarPin } from "@/app/admin/acciones";

/**
 * Solo recoge el PIN y se lo pasa al servidor: aquí no hay ninguna
 * comparación, porque el PIN correcto nunca llega al navegador. Si la acción
 * responde que sí, `router.refresh()` vuelve a pedir la página al servidor —
 * que esta vez ya ve la cookie recién escrita y devuelve el contenido.
 */
export function FormularioPin() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [validando, iniciarValidacion] = useTransition();

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    iniciarValidacion(async () => {
      const resultado = await validarPin(codigo);
      if (!resultado.ok) {
        setError(resultado.motivo ?? "PIN incorrecto.");
        setCodigo("");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-8">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Lock className="size-5" aria-hidden />
          </span>
          <h1 className="font-heading text-xl font-semibold text-foreground">Administración</h1>
          <p className="text-sm text-muted-foreground">
            Ingresa el PIN de acceso para continuar.
          </p>
        </div>

        <form onSubmit={enviar} className="mt-6 flex flex-col gap-3">
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            aria-label="PIN de acceso"
            aria-invalid={error ? true : undefined}
            placeholder="PIN de acceso"
            value={codigo}
            disabled={validando}
            onChange={(evento) => {
              setCodigo(evento.target.value);
              setError(null);
            }}
            // El espaciado ancho solo con texto escrito: sobre el placeholder
            // deja "PIN de acceso" separado letra por letra.
            className={cn("h-10 text-center", codigo && "tracking-[0.4em]")}
          />
          {error ? (
            <p role="alert" className="text-center text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" size="lg" disabled={validando || codigo.trim().length === 0}>
            {validando ? "Verificando…" : "Entrar"}
          </Button>
        </form>

        <Link
          href="/"
          className="mt-6 inline-flex w-full items-center justify-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
