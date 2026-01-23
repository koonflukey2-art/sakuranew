#!/usr/bin/env bash
set -euo pipefail

root="${1:-src/app/api}"

mapfile -t files < <(find "$root" -type f -name route.ts)

for f in "${files[@]}"; do
  # เฉพาะไฟล์ที่มี pattern แบบเก่า
  if grep -qE "export +async +function +(GET|POST|PUT|PATCH|DELETE)\s*\([^,]+,\s*\{\s*params\s*\}\s*:" "$f"; then
    cp -a "$f" "$f.bak"

    perl -0777 -i -pe '
      # เปลี่ยน arg2 แบบเก่าให้เป็น Next.js 15 style (ใช้ Record ครอบไว้ให้ generic)
      s/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(\s*([^,]+),\s*\{\s*params\s*\}\s*:\s*\{\s*params\s*:\s*\{[^}]*\}\s*\}\s*\)/
      export async function $1($2, { params }: { params: Promise<Record<string, string>> })/gms;

      # กรณีใช้ type alias (เช่น RouteParams) ก็จับแล้วแทนเหมือนกัน
      s/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(\s*([^,]+),\s*\{\s*params\s*\}\s*:\s*[A-Za-z0-9_<>,\s]+\s*\)/
      export async function $1($2, { params }: { params: Promise<Record<string, string>> })/gms;

      # เปลี่ยน destructure จาก params → await params
      s/const\s+\{\s*([^}]+)\s*\}\s*=\s*params\s*;/const { $1 } = await params;/gms;
    ' "$f"
  fi
done

echo "=== Remaining usages of params. (ต้องแก้มือ/หรือจะให้ผมทำคำสั่งต่อให้ได้) ==="
grep -RIn --include='route.ts' 'params\.' "$root" || true
