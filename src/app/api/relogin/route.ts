import { NextResponse } from "next/server";
import { spawn } from "child_process";

export async function POST() {
  try {
    if (process.platform === "win32") {
      // Fix execution policy and open claude auth login in a new PowerShell window
      const script = [
        "Write-Host '=== Open Carrusel - Fix de autenticacion ===' -ForegroundColor Cyan",
        "Write-Host ''",
        "Write-Host 'Paso 1: Habilitando ejecucion de scripts en PowerShell...' -ForegroundColor Yellow",
        "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force",
        "Write-Host 'OK - Execution policy actualizada.' -ForegroundColor Green",
        "Write-Host ''",
        "Write-Host 'Paso 2: Iniciando sesion en Claude...' -ForegroundColor Yellow",
        "claude auth login",
        "Write-Host ''",
        "Write-Host 'Listo! Volve a la app y hace click en Revalidar.' -ForegroundColor Cyan",
        "Read-Host 'Presiona Enter para cerrar'",
      ].join("; ");

      spawn("powershell.exe", ["-NoExit", "-Command", script], {
        detached: true,
        stdio: "ignore",
      }).unref();
    } else {
      // macOS / Linux
      const script = `echo '=== Open Carrusel - Fix de autenticacion ===' && claude auth login`;
      spawn("open", ["-a", "Terminal", "-n", "--args", "-e", script], {
        detached: true,
        stdio: "ignore",
      }).unref();
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
