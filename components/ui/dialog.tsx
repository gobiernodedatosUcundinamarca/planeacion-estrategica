"use client"

import {TextoEditorial} from "@/components/editorial/texto-editorial";
import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

/**
 * El centrado normal (`fixed` + `top/left: 50%` + `-translate-1/2`, clases
 * de abajo) es correcto y suficiente en todos los casos — EXCEPTO bajo el
 * modo "forzar escritorio" móvil: ahí WebKit resuelve ese `50%` contra un
 * viewport fantasma para `position:fixed` (el mismo tipo de bug de
 * `window.innerHeight` ya documentado en app/layout.tsx). Por eso esta
 * corrección se aplica SOLO cuando `html.forzar-escritorio` está presente —
 * en cualquier otro contexto (incluido escritorio real) el hook no toca
 * nada y se usa el `fixed` de siempre, evitando reintroducir con JS un bug
 * distinto en el caso normal.
 */
function useCentrarDialogoMovilForzado() {
  const nodeRef = React.useRef<HTMLDivElement | null>(null);

  const centrar = React.useCallback(() => {
    const el = nodeRef.current;
    if (!el || !document.documentElement.classList.contains("forzar-escritorio")) return;
    const margen = 16;
    const viewport = window.visualViewport;
    const alto = viewport?.height ?? document.documentElement.clientHeight;
    const ancho = viewport?.width ?? document.documentElement.clientWidth;
    el.style.position = "absolute";
    // Tailwind v4 aplica `-translate-x-1/2 -translate-y-1/2` con la
    // propiedad CSS `translate` independiente (no con `transform`) — hay que
    // anularla aparte, `transform:none` no la toca. La animación de entrada
    // (data-open:zoom-in-95) también se apaga para que no reintroduzca una
    // escala/transform propia por encima del estilo inline.
    el.style.animation = "none";
    el.style.setProperty("transform", "none", "important");
    el.style.setProperty("translate", "none", "important");
    el.getAnimations().forEach((a) => a.cancel());
    el.style.maxHeight = `${alto - margen * 2}px`;
    const rect = el.getBoundingClientRect();
    const top = window.scrollY + (viewport?.offsetTop ?? 0) + Math.max(margen, (alto - rect.height) / 2);
    const left = window.scrollX + (viewport?.offsetLeft ?? 0) + Math.max(margen, (ancho - rect.width) / 2);
    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
  }, []);

  // Callback ref en vez de useRef+useLayoutEffect: el Popup de base-ui se
  // monta en el DOM real un paso después (vía su Portal), así que un
  // useLayoutEffect en el componente padre puede correr con `ref.current`
  // todavía en null. Un callback ref se dispara exactamente cuando React
  // adjunta el nodo real, sin importar ese desfase interno.
  const setRef = React.useCallback(
    (el: HTMLDivElement | null) => {
      nodeRef.current = el;
      if (el) centrar();
    },
    [centrar]
  );

  React.useEffect(() => {
    window.addEventListener("resize", centrar);
    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', centrar);
    viewport?.addEventListener('scroll', centrar);
    return () => {
      window.removeEventListener("resize", centrar);
      viewport?.removeEventListener('resize', centrar);
      viewport?.removeEventListener('scroll', centrar);
    };
  }, [centrar]);

  return setRef;
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
}) {
  const popupRef = useCentrarDialogoMovilForzado();

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        ref={popupRef}
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex h-fit max-h-[calc(100%-2rem)] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-hidden rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-2 right-2"
                size="icon-sm"
              />
            }
          >
            <XIcon
            />
            <span className="sr-only"><TextoEditorial id="266cad4dcc2d0f11d99f" original={"Close"}/></span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "-mx-4 -mb-4 flex flex-row justify-end gap-2 rounded-b-xl border-t bg-muted/50 p-4",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-base leading-none font-medium",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
