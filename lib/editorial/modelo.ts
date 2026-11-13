import catalogo from '@/editorial/catalogo.json';

export type EstadoEditorial = { revision: number; textos: Record<string, string> };

export function validarCambio(id: unknown, valor: unknown, revision: unknown): asserts id is string {
  if (typeof id !== 'string' || !Object.hasOwn(catalogo, id)
    || !(valor === null || typeof valor === 'string')
    || (typeof valor === 'string' && valor.length > 4000)
    || !Number.isSafeInteger(revision) || Number(revision) < 0) throw Error('DATOS_INVALIDOS');
}

export function validarEstado(valor: unknown): EstadoEditorial {
  if (!valor || typeof valor !== 'object') throw Error('DATOS_INVALIDOS');
  const estado = valor as EstadoEditorial;
  if (!Number.isSafeInteger(estado.revision) || estado.revision < 0 || !estado.textos
    || typeof estado.textos !== 'object' || Array.isArray(estado.textos)) throw Error('DATOS_INVALIDOS');
  for (const [id, texto] of Object.entries(estado.textos)) {
    if (typeof texto !== 'string') throw Error('DATOS_INVALIDOS');
    validarCambio(id, texto, estado.revision);
  }
  return { revision: estado.revision, textos: { ...estado.textos } };
}
