import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { erro: "Código de autorização não recebido." },
      { status: 400 }
    );
  }

  const clientId = process.env.ID_DO_CLIENTE_MERCADO_LIVRE;
const clientSecret = process.env.SEGREDO_DO_CLIENTE_MERCADOLIVRE;
const redirectUri = process.env.MERCADO_LIVRE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { erro: "Credenciais do Mercado Livre não configuradas." },
      { status: 500 }
    );
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  const resposta = await fetch(
    "https://api.mercadolibre.com/oauth/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
    }
  );

  const dados = await resposta.json();

  if (!resposta.ok) {
    return NextResponse.json(
      {
        erro: "Não foi possível obter o token do Mercado Livre.",
        detalhes: dados,
      },
      { status: resposta.status }
    );
  }

  return NextResponse.json({
    sucesso: true,
    mensagem: "Mercado Livre conectado com sucesso!",
    usuario: dados.user_id,
    token_recebido: true,
  });
}
