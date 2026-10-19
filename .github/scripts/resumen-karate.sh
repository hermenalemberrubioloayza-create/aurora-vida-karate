#!/usr/bin/env bash
# Escribe en el resumen del job cuántos escenarios pasaron y cuáles fallaron.
set -uo pipefail
RESUMEN="${GITHUB_STEP_SUMMARY:-/dev/stdout}"
DIR=target/karate-reports

if ! ls "$DIR"/*.karate-json.txt > /dev/null 2>&1; then
  echo "### Karate: no se generaron reportes" >> "$RESUMEN"
  exit 0
fi

python3 - "$DIR" >> "$RESUMEN" <<'EOF'
import glob, json, sys
total = fallidos = 0
filas = []
for archivo in sorted(glob.glob(sys.argv[1] + "/*.karate-json.txt")):
    datos = json.load(open(archivo, encoding="utf-8"))
    for s in datos.get("scenarioResults", []):
        total += 1
        if s.get("failed"):
            fallidos += 1
            error = (s.get("error") or "").split("\n")[0].replace("|", "/")[:160]
            filas.append(f"| {s.get('name', '')} | {error} |")
print(f"### Karate: {total - fallidos} de {total} escenarios pasaron")
if filas:
    print("\n| Escenario que falló | Detalle |\n| --- | --- |")
    print("\n".join(filas))
EOF
