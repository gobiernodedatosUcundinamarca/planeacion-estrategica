/** La clave depende de la etiqueta original, nunca de su traducción o edición. */
export function idEtiquetaFiltro(ambito: string, texto: string) {
  const clave = (valor: string) => valor.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `filtro-${clave(ambito)}-${clave(texto)}`;
}
