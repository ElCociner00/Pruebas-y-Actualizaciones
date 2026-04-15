# Registro de cambios — 2026-04-15 22:01 UTC (Histórico cierre turno: Excel plano)

## Objetivo solicitado
Cambiar el formato de exportación Excel del histórico de cierres de turno a un formato plano, simple y masivo, basado en una tabla horizontal con encabezados fijos y filas por turno, para facilitar filtros y manejo en volumen.

## Cambios aplicados
Se actualizó la exportación en `js/historico_cierre_turno.js` para generar un **Excel plano tabular** (una sola tabla continua) con el siguiente esquema semántico:

1. `RESPONSABLE TURNO`
2. `FECHA TURNO`
3. `EFECTIVO SISTEMA`
4. `NEQUI SISTEMA`
5. `DAVIPLATA SISTEMA`
6. `TARJETA SISTEMA`
7. `TRANSFERENCIAS SISTEMA`
8. `EFECTIVO REAL`
9. `NEQUI REAL`
10. `DAVIPLATA REAL`
11. `TARJETA REAL`
12. `TRANSFERENCIA REAL`
13. `DIF EFECTIVO`
14. `DIF NEQUI`
15. `DIF DAVIPLATA`
16. `DIF TARJETA`
17. `DIF TRANSFERENCIAS`
18. `TOTAL SISTEMA`
19. `TOTAL REAL`
20. `DIF TOTAL`
21. `COMENTARIOS RESPONSABLES`
22. `REVISADO POR`

### Reglas implementadas
- Diferencias por canal: `DIF = REAL - SISTEMA`.
- Totales: suma de los 5 canales principales (efectivo, nequi, daviplata, tarjeta, transferencias).
- Fallback de lectura de datos:
  - Primero toma `general` del turno (ej. `*_sistema`, `*_real`).
  - Si faltan valores, usa resumen inferido de `variables_detalle`.
- Para compatibilidad operativa:
  - `TARJETA` se resuelve con fallback a `datafono`.
  - `DAVIPLATA` se resuelve con fallback a `rappi`.

## Archivo principal modificado
- `js/historico_cierre_turno.js`

## Cómo revertir
1. Restaurar la función `downloadExcel` al formato por bloques comparativos previo.
2. Eliminar helpers nuevos:
   - `FLAT_EXCEL_HEADERS`
   - `getGeneralByCandidates`
   - `findDetailValue`
   - `extractCanalValores`
   - `toFlatExcelRow`
3. Reponer el flujo anterior que usaba `buildExcelTurnoBlock` para cada turno.

## Impacto esperado
- Mejor rendimiento y operatividad en uso masivo/filtros en Excel.
- Menor complejidad visual en el archivo exportado.
- Estructura consistente para procesos de validación y auditoría.
