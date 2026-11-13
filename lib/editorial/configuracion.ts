import { verificadorValido } from './seguridad';

export type ConfiguracionEditorial = { modo: 'local' } | {
  modo: 'postgres'; verificador: string; secreto: string; origenes: string[];
};

export function configuracionEditorial(): ConfiguracionEditorial | null {
  if (process.env.EDITORIAL_STORAGE === 'postgres') {
    const verificador = process.env.EDITORIAL_PASSWORD_SCRYPT ?? '';
    const secreto = process.env.EDITORIAL_SESSION_SECRET ?? '';
    const origenes = (process.env.EDITORIAL_ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);
    if (!process.env.DATABASE_URL || !verificadorValido(verificador) || !/^[a-f0-9]{64,}$/.test(secreto)
      || !origenes.length) return null;
    try {
      for (const origen of origenes) {
        const url = new URL(origen);
        const local = !process.env.VERCEL && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
        if (url.origin !== origen || url.hostname.includes('*') || (url.protocol !== 'https:' && !local)) return null;
      }
    } catch { return null; }
    return { modo: 'postgres', verificador, secreto, origenes };
  }
  if (!process.env.VERCEL && process.env.EDITORIAL_LOCAL_DIR && !process.env.EDITORIAL_STORAGE) return { modo: 'local' };
  return null;
}

export function origenEditorialPermitido(url: string, configuracion: ConfiguracionEditorial | null) {
  if (!configuracion) return false;
  try {
    const origen = new URL(url);
    return configuracion.modo === 'postgres' ? configuracion.origenes.includes(origen.origin)
      : ['localhost', '127.0.0.1', '[::1]'].includes(origen.hostname);
  } catch { return false; }
}
