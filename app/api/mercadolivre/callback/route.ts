import { NextResponse } from "next/server";

// Evita que a rota seja otimizada/cacheada estaticamente pelo Next.js/Vercel.
// Sem isso, em produção o "code" do Mercado Livre pode ser reaproveitado
// indevidamente (ele é de uso único) e gerar erro "invalid_grant".
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // O Mercado Livre também pode redirecionar com erro em vez de code,
  // por exemplo quando o usuário nega a autorização.
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (errorParam) {
    return NextResponse.json(
      {
        erro: "Mercado Livre retornou um erro na autorização.",
        codigo_erro: errorParam,
        detalhes: errorDescription ?? null,
      },
      { status: 400 }
    );
  }

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

  // (Opcional, recomendado) Se o fluxo de autorização usou PKCE, o
  // "code_verifier" precisa ter sido salvo em um cookie httpOnly no
  // momento em que você gerou a URL de autorização, e é enviado aqui.
  // Se você não usa PKCE, pode remover este bloco sem problema.
  const codeVerifier = request.headers
    .get("cookie")
    ?.match(/ml_code_verifier=([^;]+)/)?.[1];

  // Troca o código de autorização pelo access token
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  if (codeVerifier) {
    body.set("code_verifier", codeVerifier);
  }

  // Timeout de segurança: evita que a função fique presa caso a API
  // do Mercado Livre demore para responder.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeout);

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

    // ------------------------------------------------------------------
    // IMPORTANTE: persistência dos tokens.
    // O access_token expira em poucas horas e o refresh_token é o que
    // permite renovar sem o usuário logar de novo. O ideal é salvar
    // isso em banco de dados associado ao usuário/loja (ex.: Postgres,
    // Supabase, etc.), não só em cookie.
    //
    // Abaixo, como solução imediata, salvamos em cookies httpOnly
    // seguros. Troque este bloco pela gravação no seu banco assim que
    // possível.
    // ------------------------------------------------------------------
    const res = NextResponse.json({
      sucesso: true,
      mensagem: "Mercado Livre conectado com sucesso!",
      usuario_id: data.user_id,
      token_recebido: !!data.access_token,
      refresh_token_recebido: !!data.refresh_token,
      expira_em: data.expires_in,
      escopo: data.scope,
    });

    res.cookies.set("ml_access_token", data.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: data.expires_in ?? 21600, // ML normalmente expira em 6h
    });

    if (data.refresh_token) {
      res.cookies.set("ml_refresh_token", data.refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        // refresh_token do ML dura ~6 meses
        maxAge: 60 * 60 * 24 * 180,
      });
    }

    // Limpa o code_verifier, que já cumpriu sua função.
    res.cookies.delete("ml_code_verifier");

    return res;
  } catch (error) {
    clearTimeout(timeout);

    const isAbort = error instanceof Error && error.name === "AbortError";

    console.error("Erro ao conectar com o Mercado Livre:", error);

    return NextResponse.json(
      {
        erro: isAbort
          ? "Tempo de resposta do Mercado Livre excedido."
          : "Erro interno ao conectar com o Mercado Livre.",
      },
      { status: isAbort ? 504 : 500 }
    );
  }
}
