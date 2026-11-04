import type { Rol, Sede } from "@/types/encuesta";

/**
 * Color oficial por sede — Manual de Imagen Institucional ECOM002V_18, pág. 39.
 * Uso: badges/chips de identidad de marca junto al nombre de la sede.
 * NO usar como paleta categórica primaria en gráficos multi-serie (falla
 * validación CVD — ver docs/03-design-system-dashboards.md, §1.3).
 */
export const COLOR_POR_SEDE: Record<Sede, string> = {
  Fusagasugá: "#00A99D",
  Facatativá: "#007B3E",
  Chía: "#79C000",
  Soacha: "#91C256",
  Ubaté: "#00482B",
  Girardot: "#DAAA00",
  Zipaquirá: "#F7931E",
  Bogotá: "#4D4D4D",
};

/**
 * Paleta categórica validada (CVD + contraste) para la dimensión Rol.
 * Ver docs/03-design-system-dashboards.md §1.3 para el detalle de validación.
 */
export const COLOR_POR_ROL: Record<Rol, string> = {
  Estudiante: "var(--chart-1)",
  Graduado: "var(--chart-2)",
  "Gestores del Conocimiento y el Aprendizaje": "var(--chart-3)",
  "Ops-Apa": "var(--chart-4)",
  Administrativo: "var(--chart-5)",
};

/**
 * Cómo se le muestra cada rol al usuario. La clave es el valor del Excel de la
 * encuesta, que no cambia; aquí solo se decide el nombre visible. Estudiantes y
 * docentes van con el nombre que les da la universidad: Creadores de
 * Oportunidades y Gestores del Conocimiento y el Aprendizaje.
 */
export const ETIQUETA_ROL: Record<Rol, string> = {
  Estudiante: "Creadores de Oportunidades",
  Graduado: "Graduado",
  "Gestores del Conocimiento y el Aprendizaje": "Gestores del Conocimiento y el Aprendizaje",
  "Ops-Apa": "Ops-Apa",
  Administrativo: "Administrativo",
};

/** La misma etiqueta, abreviada donde el espacio es poco (filtros, ejes). */
export const ETIQUETA_ROL_CORTA: Record<Rol, string> = {
  ...ETIQUETA_ROL,
  "Gestores del Conocimiento y el Aprendizaje": "GCA",
};

export const SEDES_ORDENADAS: Sede[] = [
  "Fusagasugá",
  "Facatativá",
  "Chía",
  "Soacha",
  "Ubaté",
  "Girardot",
  "Zipaquirá",
  "Bogotá",
];

export const ROLES_ORDENADOS: Rol[] = [
  "Estudiante",
  "Graduado",
  "Gestores del Conocimiento y el Aprendizaje",
  "Administrativo",
  "Ops-Apa",
];

export const FACULTADES_ORDENADAS: string[] = [
  "Ingeniería",
  "Ciencias administrativas y contables",
  "Ciencias agropecuarias",
  "Ciencias del deporte y la educación física",
  "Ciencias de la salud",
  "Ciencias sociales, humanidades y ciencias políticas",
  "Instituto de posgrados",
  "Educación",
];

/**
 * Para personas cuyo rol principal no es Estudiante (Administrativo, GCA,
 * Ops-Apa), la columna "Programa o Area" del Excel a veces trae el nombre
 * literal de la facultad a la que están adscritas (p.ej. "Facultad De
 * Ingeniería") en vez de un programa académico — texto que el diccionario
 * Programa→Facultad no captura porque no es un programa. Este mapa cierra
 * ese vacío. Claves ya normalizadas (sin tildes, mayúsculas — ver
 * `normalizar()` en excel-data-source.ts) para comparar exacto.
 */
export const AREA_A_FACULTAD: Record<string, string> = {
  "FACULTAD DE CIENCIAS ADMINISTRATIVAS ECONOMICAS Y CONTABLES": "Ciencias administrativas y contables",
  "FACULTAD DE INGENIERIA": "Ingeniería",
  "FACULTAD DE CIENCIAS AGROPECUARIAS": "Ciencias agropecuarias",
  "FACULTAD DE CIENCIAS DE LA SALUD": "Ciencias de la salud",
  "FACULTAD DE CIENCIAS SOCIALES - HUMANIDADES Y CIENCIAS POLITICAS": "Ciencias sociales, humanidades y ciencias políticas",
  "FACULTAD DE CIENCIAS DEL DEPORTE Y EDUCACION FISICA": "Ciencias del deporte y la educación física",
  "FACULTAD DE EDUCACION": "Educación",
  "FONDO INSTITUTO DE POSGRADOS": "Instituto de posgrados",
};
