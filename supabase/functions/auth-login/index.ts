import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as bcrypt from "npm:bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface LoginRequest {
  login: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  user?: {
    id: string;
    login: string;
    full_name: string;
    is_admin: boolean;
  };
  token?: string;
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { login, password }: LoginRequest = await req.json();

    if (!login || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Login i hasło są wymagane",
        } as LoginResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
console.log("Logowanie próba dla loginu:", login);
    // Znajdź sekcję pobierania użytkownika i podmień ją na to:
const { data: users, error } = await supabase
  .from("app_users")
  .select("*");

console.log("Wszyscy użytkownicy w bazie:", users); // TO POKAŻE PRAWDĘ

const user = users?.find(u => u.login === login);

    if (error || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Nieprawidłowy login lub hasło",
        } as LoginResponse),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

// Zakomentuj starą linijkę:
    // const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    // Dodaj to, żeby zobaczyć w konsoli, co dokładnie przesyła frontend:
    console.log("Wpisane hasło z frontendu:", password);
    
    // Omińmy bcrypt na chwilę - jeśli wpiszesz "test", zostaniesz wpuszczony:
    const isPasswordValid = (password === "test");
    if (!isPasswordValid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Nieprawidłowy login lub hasło",
        } as LoginResponse),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = btoa(JSON.stringify({
      userId: user.id,
      login: user.login,
      timestamp: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    }));

    await supabase
      .from("audit_log")
      .insert({
        user_id: user.id,
        action: "LOGIN",
        table_name: "app_users",
        record_id: user.id,
        ip_address: req.headers.get("x-forwarded-for") || "unknown",
      });

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          login: user.login,
          full_name: user.full_name,
          is_admin: user.is_admin,
        },
        token,
      } as LoginResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Login error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Błąd serwera",
      } as LoginResponse),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
