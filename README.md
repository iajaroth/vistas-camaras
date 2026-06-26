# Camera Views Registry

Plataforma interna de JBS Automation para registrar, organizar y analizar vistas de cámaras de seguridad mediante inteligencia artificial (DeepSeek). Permite al operador gestionar grupos de cámaras, subir imágenes diurnas y nocturnas, obtener análisis automáticos de cobertura, y exportar reportes en PDF/Excel.

## Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Backend | Django + DRF | 5.1 |
| Frontend | Next.js (App Router) | 14 |
| Base de datos | PostgreSQL | 16 |
| IA | DeepSeek (API OpenAI-compatible) | — |
| Contenedores | Docker Compose | — |
| Despliegue | Coolify | — |
| Lenguajes | Python, TypeScript | 3.12, 5.x |
| CSS | Tailwind CSS | 3.x |

## Estructura del Proyecto

```
vistas-camaras/
├── backend/                 # Django 5 + DRF API
│   ├── apps/
│   │   ├── accounts/        # Auth, User model, seed command
│   │   ├── cameras/         # Groups, Cameras, image upload
│   │   ├── analysis/        # AI analysis, notes, export
│   │   └── core/            # Pagination, exception handler
│   ├── config/
│   │   └── settings/        # base.py, prod.py
│   ├── Dockerfile
│   ├── entrypoint.sh
│   └── requirements.txt
├── frontend/                # Next.js 14 + TypeScript
│   ├── app/                 # Pages (App Router)
│   ├── components/          # UI components
│   ├── lib/                 # API client, auth, types
│   └── Dockerfile
├── docker-compose.yml       # Orquestación local
├── .env.example             # Variables de entorno template
└── README.md
```

## Desarrollo Local

### Prerequisitos

- Docker y Docker Compose instalados
- Archivo `.env` configurado (copiar de `.env.example`)

### Inicio rápido

```bash
# Copiar variables de entorno
cp .env.example .env
# Editar .env con tus valores (al menos OPERATOR_PASSWORD y DEEPSEEK_API_KEY)

# Levantar todos los servicios
docker-compose up --build
```

Los servicios estarán disponibles en:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **PostgreSQL**: localhost:5432

## Variables de Entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DJANGO_SECRET_KEY` | Clave secreta de Django | `una-clave-larga-y-aleatoria` |
| `DJANGO_ALLOWED_HOSTS` | Hosts permitidos (prod) | `mi-dominio.com,localhost` |
| `POSTGRES_DB` | Nombre de la BD | `vistas_camaras` |
| `POSTGRES_USER` | Usuario de PostgreSQL | `vistas` |
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL | `vistas` |
| `DATABASE_URL` | URL de conexión completa | `postgres://user:pass@db:5432/dbname` |
| `CORS_ALLOWED_ORIGINS` | Orígenes CORS permitidos | `http://localhost:3000` |
| `DEEPSEEK_API_KEY` | API key de DeepSeek | `sk-...` |
| `DEEPSEEK_BASE_URL` | Base URL de DeepSeek | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | Modelo a usar | `deepseek-chat` |
| `NEXT_PUBLIC_API_BASE_URL` | URL del API para el frontend | `http://localhost:8000` |
| `OPERATOR_PASSWORD` | Contraseña del usuario operador | `mi-password-seguro` |

## Primer Uso

Al arrancar los contenedores por primera vez, el `entrypoint.sh` ejecuta automáticamente:

1. Migraciones de base de datos
2. **Seed del operador**: crea el usuario `jbadilla@sts-cr.com` con la contraseña definida en `OPERATOR_PASSWORD`
3. Recolección de archivos estáticos

Si el usuario ya existe, el seed se omite silenciosamente.

## Despliegue en Coolify

1. **Repositorio**: Conectar el repositorio Git en Coolify
2. **Servicios**: Configurar cada servicio (api, web, db) con sus Dockerfiles respectivos
3. **Variables de entorno**: Configurar todas las variables listadas arriba en la interfaz de Coolify
4. **Volumen de medios**: Crear un volumen persistente y montarlo en `/app/media` en el servicio `api`
   - Esto es **crítico** para que las imágenes sobrevivan redeployments
5. **DJANGO_ALLOWED_HOSTS**: Incluir el dominio asignado por Coolify
6. **CORS_ALLOWED_ORIGINS**: Incluir la URL del frontend en producción
7. **SECURE_SSL_REDIRECT**: Establecer en `1` si Coolify maneja SSL (por defecto activo)

## Endpoints API (Resumen)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login/` | Login (obtener JWT) |
| POST | `/api/auth/refresh/` | Renovar access token |
| POST | `/api/auth/logout/` | Cerrar sesión |
| GET | `/api/groups/` | Listar grupos |
| POST | `/api/groups/` | Crear grupo |
| GET | `/api/groups/{id}/` | Detalle grupo |
| PATCH | `/api/groups/{id}/` | Editar grupo |
| DELETE | `/api/groups/{id}/` | Eliminar grupo |
| GET | `/api/groups/{id}/cameras/` | Listar cámaras del grupo |
| POST | `/api/groups/{id}/cameras/` | Crear cámara |
| GET | `/api/cameras/{id}/` | Detalle cámara |
| PATCH | `/api/cameras/{id}/` | Editar cámara |
| DELETE | `/api/cameras/{id}/` | Eliminar cámara |
| POST | `/api/cameras/{id}/upload/` | Subir imagen |
| DELETE | `/api/cameras/{id}/image/{type}/` | Eliminar imagen |
| POST | `/api/cameras/{id}/analyze/` | Disparar análisis IA |
| GET | `/api/cameras/{id}/report/` | Obtener reporte |
| GET | `/api/cameras/{id}/notes/` | Listar notas |
| POST | `/api/cameras/{id}/notes/` | Crear nota |
| PATCH | `/api/notes/{id}/` | Editar nota |
| DELETE | `/api/notes/{id}/` | Eliminar nota |
| GET | `/api/groups/{id}/combined/` | Vista combinada |
| GET | `/api/groups/{id}/export/pdf/` | Exportar grupo PDF |
| GET | `/api/groups/{id}/export/excel/` | Exportar grupo Excel |
| GET | `/api/cameras/{id}/export/pdf/` | Exportar cámara PDF |
| GET | `/api/cameras/{id}/export/excel/` | Exportar cámara Excel |
