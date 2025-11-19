// src/common/utils/prisma-where.builder.ts

import { Prisma } from '@prisma/client';

type RelationConfig = Record<string, string[]>; // ej: { oficinaRemitente: ['nombre', 'siglas'] }

export class PrismaWhereBuilder {
  private where: any = { AND: [] };

  /**
   * Búsqueda Inteligente (Google-like):
   * Divide el texto en términos y busca coincidencias cruzadas en campos directos y relaciones.
   * Ej: "DGI OFICIO" buscará que (Asunto O Oficina tenga 'DGI') Y (Asunto O Tipo tenga 'OFICIO')
   */
  addSmartSearch(
    query: string | undefined,
    directFields: string[],
    relations: RelationConfig = {},
  ) {
    if (!query || !query.trim()) return this;

    const terms = query.trim().split(/\s+/); // Dividir por espacios

    const termConditions = terms.map((term) => {
      const orConditions: any[] = [];

      // 1. Coincidencia en campos directos (ej. asunto, numeroDocumento)
      directFields.forEach((field) => {
        orConditions.push({
          [field]: { contains: term, mode: 'insensitive' },
        });
      });

      // 2. Coincidencia en relaciones (ej. oficinaRemitente.siglas)
      Object.entries(relations).forEach(([relationName, fields]) => {
        fields.forEach((field) => {
          orConditions.push({
            [relationName]: {
              [field]: { contains: term, mode: 'insensitive' },
            },
          });
        });
      });

      return { OR: orConditions };
    });

    // Usamos AND para asegurar que CADA término de búsqueda se cumpla en alguna parte
    this.where.AND.push(...termConditions);
    return this;
  }

  /**
   * Filtros de Array (IN)
   */
  addInFilter(field: string, values?: any[]) {
    if (values && values.length > 0) {
      this.where.AND.push({ [field]: { in: values } });
    }
    return this;
  }

  /**
   * Rango de Fechas Robusto
   * Maneja inicio de día (00:00) y fin de día (23:59) automáticamente.
   */
  addDateRange(field: string, from?: string, to?: string) {
    if (!from && !to) return this;

    const rangeFilter: any = {};

    if (from) {
      const dateFrom = new Date(from);
      dateFrom.setHours(0, 0, 0, 0);
      rangeFilter.gte = dateFrom;
    }

    if (to) {
      const dateTo = new Date(to);
      dateTo.setHours(23, 59, 59, 999);
      rangeFilter.lte = dateTo;
    }

    this.where.AND.push({ [field]: rangeFilter });
    return this;
  }

  build() {
    // Limpieza: Si el array AND está vacío, lo eliminamos para no ensuciar la query
    if (this.where.AND.length === 0) {
      delete this.where.AND;
    }
    return this.where;
  }
}
