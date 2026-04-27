# INYTEL Presence

Aplicación web de control de presencia y registro de jornada laboral desarrollada para la empresa **Inytel**. Da cumplimiento al artículo 34.9 del Estatuto de los Trabajadores, que obliga a todas las empresas a registrar diariamente la jornada laboral de sus empleados.

---

## Tecnologías

**Frontend**
- Vue.js 3 + Vite
- Tailwind CSS v4
- Vue Router
- Axios
- Chart.js + vue-chartjs
- Lucide Vue

**Backend**
- Node.js v24 + Express
- MySQL 8 (via Railway)
- JWT (jsonwebtoken)
- bcryptjs
- Resend API (notificaciones por email)

**Infraestructura**
- Railway (PaaS — frontend + backend + base de datos)
- Docker (build y despliegue)
- pnpm (gestor de paquetes)

---

## Estructura del proyecto

```
inytel-presence/
├── backend/
│   ├── config/
│   │   └── db.js               # Conexión MySQL
│   ├── helpers/
│   │   └── empleados.js        # Funciones auxiliares
│   ├── middlewares/
│   │   └── auth.js             # JWT y control de roles
│   ├── routes/
│   │   ├── auth.js             # Autenticación y contraseñas
│   │   ├── empleados.js        # CRUD de empleados
│   │   ├── fichajes.js         # Registro de jornadas
│   │   └── dashboard.js        # Estadísticas y panel
│   ├── services/
│   │   └── email.js            # Envío de emails con Resend
│   ├── server.js               # Punto de entrada del servidor
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/         # Componentes reutilizables
│   │   ├── composables/        # Lógica reutilizable (useAuth, useFichajes, etc.)
│   │   ├── router/             # Configuración de rutas
│   │   ├── views/              # Vistas principales
│   │   ├── App.vue
│   │   ├── main.js
│   │   └── style.css
│   └── package.json
├── Dockerfile
├── package.json                # Scripts raíz para Railway
└── inytel_db_schema.sql        # Esquema de la base de datos
```

---

## Requisitos previos

- Node.js v24 o superior
- pnpm v10 o superior
- MySQL 8 (local o remoto)
- Cuenta en [Railway](https://railway.app) (para despliegue)
- Cuenta en [Resend](https://resend.com) (para emails)

---

## Instalación local

### 1. Clonar el repositorio

```bash
git clone https://github.com/alitfal/inytel-presence.git
cd inytel-presence
```

### 2. Instalar pnpm (si no lo tienes)

```bash
npm install -g pnpm
```

### 3. Instalar dependencias

```bash
# Frontend
cd frontend && pnpm install

# Backend
cd ../backend && pnpm install
```

### 4. Configurar variables de entorno

Crea el fichero `backend/.env` con el siguiente contenido:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
DB_NAME=inytel_presence
JWT_SECRET=tu_secreto_jwt
RESEND_API_KEY=tu_api_key_resend
EMAIL_FROM=noreply@tudominio.com
```

### 5. Crear la base de datos

Importa el esquema incluido en el repositorio:

```bash
mysql -u tu_usuario -p < inytel_db_schema.sql
```

### 6. Arrancar en desarrollo

Necesitas dos terminales abiertas simultáneamente:

```bash
# Terminal 1 — Backend
cd backend && node server.js

# Terminal 2 — Frontend
cd frontend && pnpm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

> **Nota:** Si cambias de máquina con arquitecturas diferentes (ARM/Intel), ejecuta `rm -rf node_modules && pnpm install` en las carpetas `frontend/` y `backend/` antes de arrancar.

---

## Despliegue en Railway

El proyecto está configurado para desplegarse automáticamente en Railway mediante Docker al hacer push a la rama principal.

### Variables de entorno en Railway

Configura las mismas variables que en el `.env` local desde el panel de Railway → **Variables**.

### Build y arranque

El `Dockerfile` en la raíz del proyecto se encarga de:
1. Instalar pnpm
2. Compilar el frontend (`pnpm run build`)
3. Instalar dependencias del backend
4. Arrancar el servidor en el puerto 3001

---

## Funcionalidades

### Panel de empleado
- Consulta de datos personales
- Registro de entrada y salida
- Historial de jornadas con navegación temporal (hoy / semana / mes)
- Resumen de horas trabajadas vs objetivo
- Resolución de incidencias (jornadas sin cerrar)
- Cambio de contraseña

### Panel de administración
- Gestión completa de empleados (crear, editar, eliminar)
- Vista de equipo en grid o lista
- Estado de presencia en tiempo real con refresco automático
- Dashboard con estadísticas, gráficas, calendario y ranking
- Alertas de empleados sin fichar
- Reseteo de contraseñas
- Activar/desactivar acceso de empleados

### Sistema de autenticación
- Login con JWT (duración 8 horas)
- Aviso de sesión próxima a expirar
- Recuperación de contraseña por email
- Notificaciones de bienvenida al crear un empleado

---

## Roles

| Rol | Acceso |
|---|---|
| `admin` | Panel de administración completo + perfil |
| `empleado` | Solo perfil propio y fichaje |

---

## Licencia

Proyecto desarrollado como Módulo de Proyecto del C.F.G.S. Desarrollo de Aplicaciones Web en el C.I.F.P. César Manrique.

**Alumno:** Angel Luis Litago Falces  
**Tutor:** José David Díaz Díaz  
**Curso:** 3º DAW Semipresencial
