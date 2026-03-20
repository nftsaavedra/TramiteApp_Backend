# 📋 INSTRUCCIONES PARA APLICAR MIGRACIÓN DE SYSTEM_CONFIG

**Fecha:** March 20, 2026  
**Prioridad:** CRÍTICA - Sistema no puede arrancar sin esto

---

## ⚠️ PROBLEMA ACTUAL

El backend falla al iniciar con el siguiente error:

```
PrismaClientKnownRequestError: 
Invalid `this.prisma.systemConfig.findUnique()` invocation
The table `(not available)` does not exist in the current database.
```

**Causa:** La migración está creada pero NO se aplicó a la base de datos.

---

## ✅ SOLUCIÓN - 3 OPCIONES

### OPCIÓN #1: Aplicar SQL Manualmente (RECOMENDADA)

**Herramientas necesarias:** pgAdmin, DBeaver, o psql

**Pasos:**

1. **Abrir herramienta de gestión de PostgreSQL**
   - pgAdmin 4 (recomendado)
   - DBeaver
   - psql (línea de comandos)

2. **Conectar a la base de datos**
   ```
   Host: localhost:5432
   Database: tramites_db
   User: postgres (o tu usuario)
   Password: ********
   ```

3. **Ejecutar script SQL**
   
   **Opción A - Desde archivo:**
   ```sql
   -- Abrir archivo: tramite_backend/prisma/migrations/apply_system_config.sql
   -- Ejecutar todo el contenido
   ```
   
   **Opción B - Copiar y pegar:**
   ```sql
   BEGIN;
   
   DO $$ BEGIN
       ALTER TYPE "Role" ADD VALUE 'USER';
   EXCEPTION
       WHEN duplicate_object THEN null;
   END $$;
   
   DO $$ BEGIN
       ALTER TYPE "Role" ADD VALUE 'SUPERUSER';
   EXCEPTION
       WHEN duplicate_object THEN null;
   END $$;
   
   CREATE TABLE IF NOT EXISTS "system_config" (
       "id" TEXT NOT NULL DEFAULT 'main',
       "rootOfficeName" TEXT NOT NULL DEFAULT 'Viceministerio de Planificación e Inversión',
       "rootOfficeSiglas" TEXT NOT NULL DEFAULT 'VPIN',
       "defaultRole" "Role" NOT NULL DEFAULT 'RECEPCIONISTA',
       "isInitialized" BOOLEAN NOT NULL DEFAULT false,
       "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
       "updatedAt" TIMESTAMP(3) NOT NULL,
       CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
   );
   
   COMMIT;
   
   -- Verificar
   SELECT * FROM system_config WHERE id = 'main';
   ```

4. **Verificar resultado**
   ```sql
   -- Debería mostrar 1 fila si se creó correctamente
   SELECT * FROM system_config;
   
   -- Verificar estructura
   \d system_config
   ```

5. **Reiniciar backend**
   ```bash
   cd tramite_backend
   npm run start:dev
   ```

6. **Verificar logs**
   ```
   [Nest] ... [SystemConfigService] ✅ Sistema ya está inicializado
   ```

---

### OPCIÓN #2: Reset Completo de Migraciones (SOLO DESARROLLO)

**⚠️ ADVERTENCIA:** Esto eliminará TODOS los datos de la base de datos!

**Solo usar en entorno de desarrollo!**

```bash
cd tramite_backend

# Resetear completamente
npx prisma migrate reset --force

# Regenerar Prisma Client
npx prisma generate

# Reiniciar backend
npm run start:dev
```

**Resultado esperado:**
- ✅ Todas las migraciones se aplican desde cero
- ✅ Tabla system_config creada automáticamente
- ✅ Datos eliminados (solo desarrollo!)

---

### OPCIÓN #3: Forzar Migración Existente

Si la migración ya existe pero no se aplicó:

```bash
cd tramite_backend

# Marcar migración como aplicada (sin ejecutar SQL)
npx prisma migrate resolve --applied 20260320150433_add_system_config

# Luego aplicar cambios restantes (si los hay)
npx prisma migrate deploy

# Regenerar cliente
npx prisma generate
```

---

## 🔍 VERIFICACIÓN POST-MIGRACIÓN

### 1. Verificar en Base de Datos

```sql
-- Conectar a tramites_db
\c tramites_db

-- Verificar tabla
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'system_config';

-- Debería retornar 1 fila

-- Verificar datos
SELECT * FROM system_config;

-- Debería mostrar:
-- id | rootOfficeName | rootOfficeSiglas | defaultRole | isInitialized | createdAt | updatedAt
-- main | Viceministerio... | VPIN | RECEPCIONISTA | true/falso | timestamp | timestamp
```

### 2. Verificar Backend

```bash
cd tramite_backend
npm run start:dev
```

**Logs esperados:**
```
[Nest] ... [NestFactory] Starting Nest application...
[Nest] ... [InstanceLoader] AppModule dependencies initialized
[Nest] ... [InstanceLoader] SystemConfigModule dependencies initialized
[Nest] ... [SystemConfigService] ✅ Sistema ya está inicializado
[Nest] ... [NestApplication] Nest application successfully started
```

### 3. Verificar Frontend

1. Abrir navegador: `http://localhost:5173`
2. Login como ADMIN
3. Navegar a: `Admin → Configuración del Sistema`
4. Ver formulario cargado con datos

---

## ❌ TROUBLESHOOTING

### Error: "La tabla ya existe"

**Solución:**
```sql
-- Eliminar tabla y recrear
DROP TABLE IF EXISTS system_config CASCADE;

-- Luego ejecutar migration.sql nuevamente
```

### Error: "El enum ya tiene ese valor"

**Solución:**
```sql
-- Los enums YA existen, ignorar error
-- Continuar con CREATE TABLE normalmente
```

### Error: "No se puede conectar a la BD"

**Verificar:**
```bash
# PostgreSQL está corriendo?
pg_ctl status

# Puerto correcto?
netstat -an | findstr 5432

# Credenciales correctas?
cat tramite_backend/.env
# DATABASE_URL="postgresql://..."
```

### Error: "Backend no arranca después de migración"

**Pasos:**
1. Verificar logs de error específicos
2. Regenerar Prisma Client:
   ```bash
   npx prisma generate
   ```
3. Limpiar caché:
   ```bash
   Remove-Item -Path .prisma -Recurse -Force
   npx prisma generate
   ```
4. Revisar que system_config tenga datos:
   ```sql
   SELECT * FROM system_config;
   ```

---

## 🎯 PASOS FINALES

Después de aplicar la migración exitosamente:

### 1. Probar Endpoints

```powershell
# Login
$body = @{ email = "admin@test.com"; password = "admin123" } | ConvertTo-Json
$response = Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/login' `
  -Method POST -Body $body -ContentType 'application/json'
$token = $response.access_token

# Obtener configuración
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri 'http://localhost:3000/api/system-config' `
  -Method GET -Headers $headers

# Resultado esperado:
# {
#   "data": {
#     "id": "main",
#     "rootOfficeName": "...",
#     "rootOfficeSiglas": "...",
#     "defaultRole": "RECEPCIONISTA",
#     "isInitialized": true
#   },
#   "message": "..."
# }
```

### 2. Probar UI

1. Navegar a `http://localhost:5173/admin/configuracion`
2. Ver datos cargados correctamente
3. Editar nombre y siglas
4. Guardar cambios
5. Verificar toast de éxito
6. Refrescar página para confirmar persistencia

### 3. Verificar en BD

```sql
-- Después de actualizar desde UI
SELECT * FROM system_config;

-- Debería mostrar valores actualizados
```

---

## 📞 CONTACTO Y SOPORTE

Si después de seguir estos pasos el problema persiste:

1. **Revisar logs completos del backend**
2. **Verificar conexión a BD**
3. **Confirmar versión de PostgreSQL** (>= 13 recomendado)
4. **Chequear permisos de usuario**

---

## ✅ CHECKLIST RÁPIDO

- [ ] PostgreSQL corriendo
- [ ] BD `tramites_db` accesible
- [ ] Script SQL ejecutado exitosamente
- [ ] Tabla `system_config` creada
- [ ] Datos verificados con SELECT
- [ ] Backend reiniciado
- [ ] Logs muestran inicialización exitosa
- [ ] Frontend accede a /admin/configuracion
- [ ] Formulario carga datos correctamente
- [ ] Actualización funciona y persiste

---

**Última actualización:** March 20, 2026  
**Estado:** ⏳ PENDIENTE DE APLICACIÓN
