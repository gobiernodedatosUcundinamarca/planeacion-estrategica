import 'server-only';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { CFB } from 'xlsx';
import { CacheArchivo } from './infrastructure/cache-archivo';
import { interpretarConversatorio } from '@/lib/reglas/conversatorios';
import type { DocumentoConversatorio } from '@/types/conversatorios';

const entidades: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decodificar = (texto: string) => texto.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, valor: string) =>
  valor.startsWith('#') ? String.fromCodePoint(parseInt(valor.slice(valor[1] === 'x' ? 2 : 1), valor[1] === 'x' ? 16 : 10)) : entidades[valor]);

export class PptxConversatoriosDataSource {
  readonly directorio = join(process.cwd(), 'data', 'source-conversatorios', 'presentaciones');
  private archivos = () => readdirSync(this.directorio).filter(n => /^Presentacion_.*_Resumen\.pptx$/.test(n)).sort().map(n => join(this.directorio, n));
  private cache = new CacheArchivo(this.archivos, (): DocumentoConversatorio[] => {
    const documentos = this.archivos().map(ruta => {
      const bytes = readFileSync(ruta);
      const zip = CFB.read(bytes, { type: 'buffer' }) as { FullPaths: string[]; FileIndex: { content: Uint8Array }[] };
      const slides = zip.FullPaths.flatMap((ruta, i) => {
        const numero = ruta.match(/ppt\/slides\/slide(\d+)\.xml$/)?.[1];
        if (!numero) return [];
        const xml = Buffer.from(zip.FileIndex[i].content).toString('utf8');
        const textos = [...xml.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)].map(m => decodificar(m[1]));
        return [{ numero: Number(numero), textos }];
      }).sort((a, b) => a.numero - b.numero);
      const archivo = ruta.split(/[\\/]/).at(-1)!;
      const diapositivas = slides.flatMap(s => { const d = interpretarConversatorio(s.textos, s.numero); return d ? [d] : []; });
      if (!slides[0]?.textos[0] || !diapositivas.length) throw Error('Presentación sin conversatorios: ' + archivo);
      return { archivo, unidad: slides[0].textos[0], general: archivo === 'Presentacion_General_Resumen.pptx', sha256: createHash('sha256').update(bytes).digest('hex'), diapositivas };
    });
    if (!documentos.some(d => d.general) || !documentos.some(d => !d.general)) throw Error('Fuentes de conversatorios incompletas');
    return documentos;
  });
  obtener() { return this.cache.obtener(); }
  leerArchivo(archivo: string) {
    if (!this.obtener().some(d => d.archivo === archivo)) return null;
    return readFileSync(join(this.directorio, archivo));
  }
}
