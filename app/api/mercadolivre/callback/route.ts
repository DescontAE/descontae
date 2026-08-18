import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Código enviado pelo Mercado Livre após a autorização
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      {
        erro: "Código de autorização não recebido.",
      },
      { status: 400 }
    );
  }

  // Credenciais armazenadas nas variáveis de ambiente do Vercel
  const clientId = process.env.ID_DO_CLIENTE_MERCADO_LIVRE;
  const clientSecret = process.env.SEGREDO_DO_CLIENTE_MERCADOLIVRE;
  const redirectUri = process.env.MERCADO_LIVRE_REDIRECT_URI;

  // Verificação das configurações
  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      {
        erro: "Credenciais do Mercado Livre não configuradas.",
        clientId: !!clientId,
        clientSecret: !!clientSecret,
        redirectUri: !!redirectUri,
      },
      { status: 500 }
    );
  }

  // Troca o código de autorização pelo access token
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code: code,
    redirect_uri: redirectUri,
  });

  try {
    const response = await fetch(
      "https://api.mercadolibre.com/oauth/token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          erro: "Mercado Livre recusou a troca do código pelo token.",
          detalhes: data,
        },
        { status: response.status }
      );
    }

    // Não mostramos o access_token na tela.
    return NextResponse.json({
      sucesso: true,
      mensagem: "Mercado Livre conectado com sucesso!",
      usuario_id: data.user_id,
      token_recebido: !!data.access_token,
      refresh_token_recebido: !!data.refresh_token,
      expira_em: data.expires_in,
      escopo: data.scope,
    });
  } catch (error) {
    console.error("Erro ao conectar com o Mercado Livre:", error);

    return NextResponse.json(
      {
        erro: "Erro interno ao conectar com o Mercado Livre.",
      },
      { status: 500 }
    );
  }
}
