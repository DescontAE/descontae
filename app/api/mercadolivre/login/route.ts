import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.ID_DO_CLIENTE_MERCADO_LIVRE;
  const redirectUri = process.env.MERCADO_LIVRE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Credenciais do Mercado Livre não configuradas." },
      { status: 500 }
    );
  }

  const url = new URL(
    "https://auth.mercadolivre.com.br/authorization"
  );

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);

  return NextResponse.redirect(url.toString());
}
