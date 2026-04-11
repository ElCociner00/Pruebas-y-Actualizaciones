// js/permisos.js (ARCHIVO COMPLETO - REEMPLAZAR)
import { supabase } from "./supabase.js";

const PERMISOS_STORAGE_KEY = "app_user_permissions_cache_v1";
const PERMISOS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

let permisosCacheados = null;

// Roles por defecto en caso de fallo total de red/Supabase
const DEFAULT_PERMISSIONS = {
    admin_root: { all: true },
    admin: { all: true },
    revisor: {
        dashboard: true, cierre_turno: true, historico_cierre_turno: true,
        cierre_inventarios: true, historico_cierre_inventarios: true, inventarios: true,
        dashboard_siigo: true, historico_facturas_siigo: true,
    },
    operativo: {
        cierre_turno: true, cierre_inventarios: true,
    }
};

/**
 * Carga los permisos desde Supabase y los guarda en localStorage.
 * Debe ser llamada UNA SOLA VEZ después del login exitoso.
 */
export async function cargarYPersistirPermisos(usuarioId, empresaId, rol) {
    console.log(`[Permisos] Cargando permisos para usuario ${usuarioId} en empresa ${empresaId}`);
    let permisosMap = {};

    try {
        // 1. Intentar obtener desde la vista efectiva de Supabase
        const { data, error } = await supabase
            .from("v_permisos_efectivos")
            .select("modulo, permitido")
            .eq("usuario_id", usuarioId)
            .eq("empresa_id", empresaId);

        if (error) throw error;

        (data || []).forEach(p => {
            permisosMap[p.modulo] = p.permitido === true;
        });

    } catch (error) {
        console.warn("[Permisos] Fallo al cargar desde Supabase, usando defaults para rol:", rol, error);
        // 2. Fallback a permisos por defecto basados en el rol
        const defaults = DEFAULT_PERMISSIONS[rol] || DEFAULT_PERMISSIONS.operativo;
        if (defaults.all) {
            // Si el rol tiene acceso total, no necesitamos un mapa, lo manejaremos en la función de verificación
            permisosMap = { __all__: true };
        } else {
            permisosMap = { ...defaults };
        }
    }

    const cachePayload = {
        timestamp: Date.now(),
        permisos: permisosMap
    };

    localStorage.setItem(PERMISOS_STORAGE_KEY, JSON.stringify(cachePayload));
    permisosCacheados = permisosMap;
    console.log("[Permisos] Permisos cacheados exitosamente.");
    return permisosMap;
}

/**
 * Obtiene los permisos de forma síncrona desde la caché en memoria o localStorage.
 * Esta función NUNCA debe fallar ni retornar una promesa rechazada.
 */
export function obtenerPermisosSync() {
    // 1. Memoria cache
    if (permisosCacheados) {
        return permisosCacheados;
    }

    // 2. localStorage cache
    try {
        const raw = localStorage.getItem(PERMISOS_STORAGE_KEY);
        if (raw) {
            const { timestamp, permisos } = JSON.parse(raw);
            if (Date.now() - timestamp < PERMISOS_CACHE_TTL_MS) {
                permisosCacheados = permisos;
                return permisos;
            }
        }
    } catch (e) {
        console.error("[Permisos] Error al leer cache de localStorage", e);
    }

    // 3. Fallback de emergencia (si no hay nada en caché)
    console.warn("[Permisos] Usando permisos de emergencia (vacíos).");
    return {};
}

/**
 * Verifica si un usuario tiene permiso a un módulo de forma síncrona.
 */
export function tienePermisoSync(modulo) {
    const permisos = obtenerPermisosSync();
    
    // Si el mapa tiene la llave especial __all__, es un super admin/admin
    if (permisos.__all__ === true) {
        return true;
    }

    return permisos[modulo] === true;
}

/**
 * Limpia la caché de permisos (útil al cerrar sesión).
 */
export function limpiarCachePermisos() {
    permisosCacheados = null;
    localStorage.removeItem(PERMISOS_STORAGE_KEY);
}
