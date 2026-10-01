import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * POST /api/contacto
 * ------------------------------------------------------------------
 * Recibe los datos del formulario de contacto de la web y crea una
 * oportunidad en el CRM con estado "nuevo".
 *
 * Acepta:
 *  - <form method="POST"> normal (application/x-www-form-urlencoded o multipart/form-data)
 *    → al terminar redirige de vuelta a la web con ?enviado=ok (o ?enviado=error)
 *  - fetch() con JSON (application/json) → responde JSON
 *
 * Campos (se aceptan también los nombres en inglés entre paréntesis):
 *   nombre* (name), email* (correo), telefono (phone), empresa (company),
 *   servicio (service), tipo_mascota (petType), nombre_mascota (petName),
 *   asunto (subject), mensaje* (message),
 *   consentimiento (privacidad / privacy) , redirect (URL de vuelta opcional)
 *   website → campo trampa anti-spam: debe ir VACÍO y oculto.
 */

const ALIAS: Record<string, string[]> = {
  nombre: ["nombre", "name", "nombre_completo"],
  email: ["email", "correo", "mail"],
  telefono: ["telefono", "teléfono", "phone", "tel"],
  empresa: ["empresa", "company", "compania"],
  servicio: ["servicio", "service", "interes"],
  tipo_mascota: ["tipo_mascota", "mascota", "pettype", "pet_type"],
  nombre_mascota: ["nombre_mascota", "petname", "pet_name", "nombre_animal"],
  asunto: ["asunto", "subject"],
  mensaje: ["mensaje", "message", "comentario", "consulta"],
  consentimiento: ["consentimiento", "privacidad", "privacy", "acepto"],
  redirect: ["redirect", "_redirect", "volver"],
  website: ["website", "_gotcha"],
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Límite muy simple anti-abuso: 5 envíos por minuto e IP (en memoria).
const hits = new Map<string, number[]>();
function limitado(ip: string) {
  const ahora = Date.now();
  const lista = (hits.get(ip) ?? []).filter((t) => ahora - t < 60_000);
  lista.push(ahora);
  hits.set(ip, lista);
  return lista.length > 5;
}

function corsHeaders(req: NextRequest): Record<string, string> {
  const permitidos = (process.env.ALLOWED_ORIGINS ?? "*").split(",").map((s) => s.trim());
  const origin = req.headers.get("origin") ?? "";
  const allow = permitidos.includes("*") ? "*" : permitidos.includes(origin) ? origin : permitidos[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

export function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

async function leerCuerpo(req: NextRequest): Promise<{ datos: Record<string, string>; esJson: boolean }> {
  const tipo = req.headers.get("content-type") ?? "";
  const plano: Record<string, string> = {};
  if (tipo.includes("application/json")) {
    const json = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    for (const [k, v] of Object.entries(json)) plano[k.toLowerCase()] = v == null ? "" : String(v);
    return { datos: plano, esJson: true };
  }
  const form = await req.formData().catch(() => null);
  form?.forEach((v, k) => {
    if (typeof v === "string") plano[k.toLowerCase()] = v;
  });
  return { datos: plano, esJson: false };
}

function campo(datos: Record<string, string>, clave: keyof typeof ALIAS) {
  for (const alias of ALIAS[clave]) {
    const v = datos[alias];
    if (v != null && v.trim() !== "") return v.trim();
  }
  return "";
}

const recorta = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);

function volver(req: NextRequest, redirect: string, estado: "ok" | "error", mensaje?: string) {
  const destino = redirect || req.headers.get("referer") || "/";
  try {
    const url = new URL(destino, req.url);
    url.searchParams.set("enviado", estado);
    if (mensaje) url.searchParams.set("motivo", mensaje);
    return NextResponse.redirect(url, 303);
  } catch {
    return new NextResponse(estado === "ok" ? "Mensaje enviado. ¡Gracias!" : `Error: ${mensaje}`, {
      status: estado === "ok" ? 200 : 400,
    });
  }
}

export async function POST(req: NextRequest) {
  const cors = corsHeaders(req);
  const { datos, esJson } = await leerCuerpo(req);
  const redirect = campo(datos, "redirect");

  const responder = (ok: boolean, status: number, mensaje: string, extra: object = {}) =>
    esJson
      ? NextResponse.json({ ok, mensaje, ...extra }, { status, headers: cors })
      : volver(req, redirect, ok ? "ok" : "error", ok ? undefined : mensaje);

  // Honeypot: si un bot rellena el campo oculto, fingimos éxito y no guardamos nada.
  if (campo(datos, "website")) return responder(true, 200, "Mensaje recibido");

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "desconocida";
  if (limitado(ip)) return responder(false, 429, "Demasiados envíos. Inténtalo en un minuto.");

  const nombre = recorta(campo(datos, "nombre"), 120);
  const email = recorta(campo(datos, "email").toLowerCase(), 160);
  const mensaje = recorta(campo(datos, "mensaje"), 5000);
  const nombreMascota = recorta(campo(datos, "nombre_mascota"), 80);
  const telefono = recorta(campo(datos, "telefono"), 40);
  // perro, gato o lo que escriba (papagayo, conejo…)
  const tipoMascota = recorta(campo(datos, "tipo_mascota").toLowerCase(), 40);
  const consentimientoRaw = campo(datos, "consentimiento").toLowerCase();
  const consentimiento = ["on", "true", "1", "si", "sí", "yes", "acepto"].includes(consentimientoRaw);

  const errores: Record<string, string> = {};
  if (nombre.length < 2) errores.nombre = "El nombre es obligatorio";
  if (!EMAIL_RE.test(email)) errores.email = "El email no es válido";
  if (mensaje.length < 5) errores.mensaje = "El mensaje es obligatorio";
  if (!nombreMascota) errores.nombre_mascota = "El nombre de la mascota es obligatorio";
  if (telefono.replace(/\D/g, "").length < 9) errores.telefono = "El teléfono es obligatorio";
  if (!tipoMascota || tipoMascota === "otro") errores.tipo_mascota = "Indica qué animal es (perro, gato, conejo…)";
  if (Object.keys(errores).length) {
    return responder(false, 422, Object.values(errores).join(". "), { errores });
  }

  try {
    // Sin sesión: la política "oportunidad_web" solo deja crear oportunidades nuevas de origen web.
    // La base de datos busca (o crea) al particular por su correo o teléfono y le añade el animal.
    const supabase = await createServerSupabaseClient();
    const asunto = recorta(campo(datos, "asunto"), 200);
    const empresa = recorta(campo(datos, "empresa"), 160);
    const { error } = await supabase.from("oportunidad").insert({
      titulo: asunto || "",
      mensaje: empresa ? `${mensaje}\n\n(Empresa indicada: ${empresa})` : mensaje,
      servicio: recorta(campo(datos, "servicio"), 120) || null,
      origen: "web",
      estado: "nuevo",
      nombre_contacto: nombre,
      correo_contacto: email,
      telefono_contacto: telefono,
      nombre_animal: nombreMascota,
      especie_animal: tipoMascota,
      consentimiento,
    });

    if (error) throw error;
    return responder(true, 201, "¡Gracias! Hemos recibido tu mensaje y te contactaremos pronto.");
  } catch (e) {
    console.error("[api/contacto]", e);
    return responder(false, 500, "No se ha podido guardar el mensaje. Inténtalo más tarde.");
  }
}
