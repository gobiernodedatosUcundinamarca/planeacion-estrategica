import 'server-only';
import { readFile, writeFile, rename, mkdir, appendFile, open, unlink } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import catalogo from '@/editorial/catalogo.json';
const dir = () => { if (!process.env.EDITORIAL_LOCAL_DIR)
    throw Error('EDITORIAL_LOCAL_DIR no configurado'); return resolve(process.env.EDITORIAL_LOCAL_DIR); };
export type EstadoEditorial = {
    revision: number;
    textos: Record<string, string>;
};
export async function leer(): Promise<EstadoEditorial> { try {
    return JSON.parse(await readFile(join(dir(), 'textos.json'), 'utf8'));
}
catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT')
        return { revision: 0, textos: {} };
    throw e;
} }
async function acceso() { return JSON.parse(await readFile(join(dir(), 'acceso.json'), 'utf8')) as {
    salt: string;
    hash: string;
    firma: string;
}; }
export async function validarClave(clave: string) { try {
    const a = await acceso();
    const h = scryptSync(clave, a.salt, 64);
    return timingSafeEqual(h, Buffer.from(a.hash, 'hex'));
}
catch {
    return false;
} }
export async function token() { const a = await acceso(); const carga = Date.now() + 2 * 60 * 60 * 1000 + '.' + randomBytes(16).toString('hex'); return carga + '.' + createHmac('sha256', a.firma).update(carga).digest('hex'); }
export async function sesion(t: string) { try {
    const a = await acceso();
    const parts = t.split('.');
    if (parts.length !== 3 || Number(parts[0]) < Date.now())
        return false;
    const actual = Buffer.from(parts[2], 'hex'), esperado = createHmac('sha256', a.firma).update(parts.slice(0, 2).join('.')).digest();
    return actual.length === esperado.length && timingSafeEqual(actual, esperado);
}
catch {
    return false;
} }
async function bloquear() { await mkdir(dir(), { recursive: true }); const path = join(dir(), 'edicion.lock'); for (let i = 0; i < 50; i++) {
    try {
        return { archivo: await open(path, 'wx'), path };
    }
    catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'EEXIST')
            throw e;
        await new Promise(r => setTimeout(r, 40));
    }
} throw Error('CONFLICTO'); }
let cola: Promise<unknown> = Promise.resolve();
export async function guardar(id: string, valor: string | null, revision: number) { const trabajo = cola.then(async () => { const lock = await bloquear(); try {
    if (!Object.hasOwn(catalogo, id))
        throw Error('Texto no editable');
    if (valor !== null && valor.length > 4000)
        throw Error('Longitud no válida');
    const actual = await leer();
    if (actual.revision !== revision)
        throw Error('CONFLICTO');
    const textos = { ...actual.textos };
    if (valor === null)
        delete textos[id];
    else
        textos[id] = valor;
    const nuevo = { revision: actual.revision + 1, textos };
    await mkdir(dir(), { recursive: true });
    const tmp = join(dir(), `textos-${randomBytes(8).toString('hex')}.tmp`);
    await writeFile(tmp, JSON.stringify(nuevo, null, 2));
    await appendFile(join(dir(), 'historial.jsonl'), JSON.stringify({ fecha: new Date().toISOString(), id, anterior: actual.textos[id] ?? null, nuevo: valor, revision: nuevo.revision }) + '\n');
    await rename(tmp, join(dir(), 'textos.json'));
    return nuevo;
}
finally {
    await lock.archivo.close();
    await unlink(lock.path);
} }); cola = trabajo.catch(() => { }); return trabajo; }
