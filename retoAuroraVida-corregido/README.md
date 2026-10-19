# Aurora Vida · Pruebas de API con Karate

Pruebas de contrato y de negocio de la API de Aurora Vida (HU-01 Cotizador).

## Ambientes

| Ambiente | URL | Cuándo se usa |
| --- | --- | --- |
| `efimero` | `http://localhost:3000` | En cada Pull Request: el pipeline levanta la API oficial dentro del runner, corre las pruebas y la destruye |
| `local` | `http://localhost:3000` | En tu máquina, con la API corriendo localmente |
| `dev` | `https://aurora-vida-dev.onrender.com` | Lo último integrado a `main` |
| `certi` | `https://aurora-vida-certi.onrender.com` | La versión liberada para certificar |
| `prod` | `https://aurora-vida-prod.onrender.com` | Solo pruebas de lectura (`ReadOnlySmokeRunner`); no hay soporte de pruebas |

## Ejecutar

```bash
mvn test -Dkarate.env=certi -Dsemillero=tu-usuario
mvn test -Dkarate.env=prod -Dtest=ReadOnlySmokeRunner
```

- `-Dsemillero` define el header `X-Semillero`: tus datos y tu reloj quedan separados de los de los demás.
  También se puede definir con la variable de entorno `AURORA_SEMILLERO`.
- `AURORA_HOST` apunta a otra URL sin tocar el código (por ejemplo `AURORA_HOST=http://localhost:4000`).

Para levantar la API oficial en tu máquina (requiere Docker o Podman):

```bash
docker run --rm -p 3000:3000 -e APP_MODE=test ghcr.io/jmaurtuaq2021/aurora-vida:latest
mvn test -Dkarate.env=local
```

## Interfaz web local y pruebas Playwright

La interfaz del cotizador y su mock de API están en la raíz del repositorio. Para abrirlos en PowerShell:

```powershell
$env:PORT=4177
npm start
```

Abre `http://127.0.0.1:4177` para usar el cotizador. Para ejecutar las pruebas de interfaz y API con Playwright:

```powershell
npm test
```

Playwright inicia el servidor en el puerto `4177` si no está activo. El reporte HTML queda en
`playwright-report/index.html`. Para ejecutar toda la suite Karate contra el mismo mock:

```powershell
$env:AURORA_HOST='http://localhost:4177'
Set-Location retoAuroraVida-corregido
mvn test
```

## Estructura

```
src/test/java/
├── karate-config.js                  Ambientes, URLs, X-Semillero y X-Ambiente esperado
└── com/aurora/
    ├── TestRunner.java               Todos los features (local, efimero, dev, certi)
    ├── ReadOnlySmokeRunner.java      Solo @readonly (apto para PROD)
    └── cotizaciones/
        ├── cotizar.feature           POST /cotizaciones: primas, edad, suma, plazo, obligatorios, formato
        ├── consultar.feature         GET /cotizaciones/{id}: consulta, vigencia, 404 y 400
        ├── cotizaciones-smoke-readonly.feature   Salud y catálogo de plazos (sin crear datos)
        └── helpers/
            ├── fijar-reloj.feature   Fija el reloj del espacio del semillero (@ignore: no corre solo)
            ├── crear-cotizacion.feature  Crea una cotización como dato de prueba (@ignore)
            └── schemas.json          Esquemas de cotización, error y plazo
```

Todos los escenarios fijan el reloj en **2026-10-13 10:00 (Lima)**: las edades y fechas son siempre las mismas,
sin importar el día en que se ejecuten.

## Etiquetas

| Etiqueta | Qué agrupa | Casos que ejecuta |
| --- | --- | --- |
| `@regresion` | Toda la suite | 48 |
| `@smokeTest` | Lo mínimo para saber si el servicio está sano: salud, catálogo, cotizar y consultar | 4 |
| `@happypath` | Flujos válidos: la API responde 200 o 201 | 28 |
| `@negativo` | Datos inválidos o reglas incumplidas: la API responde 400, 404 o 422 | 20 |
| `@readonly` | No crea datos ni usa el soporte de pruebas (lo único que corre en PROD) | 2 |
| `@ca1` … `@ca8` | Criterio de aceptación de la HU-01 | — |
| `@cotizar`, `@consultar` | Operación del contrato | — |

```bash
mvn test -Dkarate.env=certi -Dkarate.options="--tags @smokeTest"
mvn test -Dkarate.env=certi -Dkarate.options="--tags @happypath"
mvn test -Dkarate.env=certi -Dkarate.options="--tags @negativo,@ca1"       # coma = O
mvn test -Dkarate.env=certi -Dkarate.options="--tags @ca1 --tags @negativo" # dos --tags = Y
mvn test -Dkarate.env=prod -Dtest=ReadOnlySmokeRunner
```

En el pipeline, al ejecutarlo a mano (Actions → Pruebas API (Karate) → Run workflow) se eligen el ambiente y las etiquetas.

## Cobertura de la HU-01 v1.1

| Criterio | Escenarios |
| --- | --- |
| CA1 · Edad 18 a 65 | Bordes 18 y 65 (dos casos), 17 y 66 (422), edad con meses, nacido un 29 de febrero |
| CA2 · Suma asegurada | 50,000 y 500,000 válidos; 40,000, 510,000 y 75,000 (400) |
| CA3 · Plazo | 5, 10, 15 y 20 válidos (en CA5); 7 y `'10'` como texto (400) |
| CA4 · Obligatorios | Falta cada uno de los 4 campos; cuerpo vacío |
| CA5 · Primas | Mínimo de S/ 20; los 5 tramos de tasa en sus bordes; los 4 factores de plazo; factor fumador |
| CA6 · Vigencia | Fecha de cotización y vencimiento; vigente el día 30, vencida el día 31 y consultable |
| CA7 · Contratar | Es de interfaz: se cubre con Playwright |
| CA8 · Errores | 400 por formato, tipo, campo extra y JSON inválido; 422 por edad; 404 y 400 en la consulta |

## Pipeline (`.github/workflows/pruebas-api.yml`)

- **Pull Request y push a `main`**: ambiente efímero con la imagen oficial. El resultado aparece como check del PR
  y el reporte de Karate queda en los artefactos de la ejecución.
- **Ejecución manual** (Actions → Pruebas API (Karate) → Run workflow): elige `dev`, `certi` o `prod`.

Variables del repositorio (Settings → Secrets and variables → Actions → Variables), opcionales:

| Variable | Por defecto | Para qué |
| --- | --- | --- |
| `AURORA_IMAGE` | `ghcr.io/jmaurtuaq2021/aurora-vida:latest` | Versión de la API a probar (por ejemplo `:hu-01.1`) |
| `AURORA_SEMILLERO` | `karate-hu01` | Tu espacio en los ambientes compartidos |

Si la imagen es privada, agrega el secreto `GHCR_TOKEN` (token con permiso `read:packages`).

## Flujo de trabajo (Trunk Based Development)

1. Crea una rama corta: `git checkout -b test/hu-01-limites-edad`.
2. Agrega o corrige escenarios y súbelos: `git push -u origin test/hu-01-limites-edad`.
3. Abre un Pull Request a `main`: el check **Karate · ambiente efímero** debe quedar en verde.
4. Pide revisión, integra y borra la rama.

## Convenciones de los escenarios

- **Un escenario, un comportamiento.** Si hay dos bordes (por ejemplo día 30 y día 31), van en dos casos
  (`Scenario Outline`), para que el reporte diga exactamente cuál falló.
- **La preparación no es la prueba.** Crear datos o mover el reloj se hace con helpers (`call read(...)`) y con `*`;
  `Given`/`When`/`Then` quedan para la petición que se está probando.
- **Cada escenario es independiente.** Crea sus propios datos y no depende del orden ni de otro escenario.
  El Background fija el reloj antes de cada uno.
