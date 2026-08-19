import { NextResponse } from "next/server";

/**
 * Callback de autorização OAuth do Mercado Livre.
 *
 * Fluxo:
 * 1. O usuário clica em "Conectar com Mercado Livre" no seu site.
 * 2. Ele autoriza o acesso na tela do Mercado Livre.
 * 3. O Mercado Livre redireciona de volta para ESTA rota, em:
 *      https://SEU_DOMINIO/api/mercadolivre/callback
 *    com um parâmetro "?code=..." na URL.
 * 4. Esta rota troca esse "code" por um access_token/refresh_token.
 *
 * IMPORTANTE: a URL acima precisa ser IDÊNTICA, caractere por caractere,
 * em dois lugares:
 *   - Na variável de ambiente MERCADO_LIVRE_REDIRECT_URI (Vercel)
 *   - No painel de desenvolvedor do Mercado Livre (campo "URL de redirect")
 */

// Impede que a Next.js trate essa rota como estática/cacheada.
// Sem isso, o "code" (que é de uso único) pode acabar sendo reaproveitado
// em builds/caches e o Mercado Livre responde com erro "invalid_grant".
export const dynamic = "force-dynamic";

// Nomes das variáveis de ambiente (mantidos exatamente como já configurados
// no painel da Vercel — não altere estes nomes).
const ENV_CLIENT_ID = "ID_DO_CLIENTE_MERCADO_LIVRE";
const ENV_CLIENT_SECRET = "SEGREDO_DO_CLIENTE_MERCADOLIVRE";
const ENV_REDIRECT_URI = "MERCADO_LIVRE_REDIRECT_URI";

const ML_TOKEN_URL = "https://api.mercadolibre.com/oauth/token";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // O Mercado Livre manda "error" (não "code") quando o usuário nega a
  // autorização ou algo falha do lado dele.
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

  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { erro: "Código de autorização não recebido." },
      { status: 400 }
    );
  }

  const clientId = process.env[ENV_CLIENT_ID];
  const clientSecret = process.env[ENV_CLIENT_SECRET];
  const redirectUri = process.env[ENV_REDIRECT_URI];

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

  // Suporte opcional a PKCE: só é usado se você tiver salvo um
  // "ml_code_verifier" em cookie httpOnly ao gerar a URL de autorização.
  // Se seu fluxo de autorização não usa PKCE, isso simplesmente não
  // encontra o cookie e é ignorado — não quebra nada.
  const codeVerifier = request.headers
    .get("cookie")
    ?.match(/ml_code_verifier=([^;]+)/)?.[1];

  const tokenRequestBody = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  if (codeVerifier) {
    tokenRequestBody.set("code_verifier", codeVerifier);
  }

  // Timeout de segurança para não deixar a função presa indefinidamente.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  let tokenResponse: Response;
  let tokenData: any;

  try {
    tokenResponse = await fetch(ML_TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenRequestBody.toString(),
      cache: "no-store",
      signal: controller.signal,
    });

    tokenData = await tokenResponse.json();
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    console.error("Erro ao chamar a API do Mercado Livre:", error);

    return NextResponse.json(
      {
        erro: isAbort
          ? "Tempo de resposta do Mercado Livre excedido."
          : "Erro interno ao conectar com o Mercado Livre.",
      },
      { status: isAbort ? 504 : 500 }
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!tokenResponse.ok) {
    return NextResponse.json(
      {
        erro: "Mercado Livre recusou a troca do código pelo token.",
        status_mercado_livre: tokenResponse.status,
        detalhes: tokenData,
      },
      { status: tokenResponse.status }
    );
  }

  // ------------------------------------------------------------------
  // Persistência dos tokens.
  //
  // O access_token expira em poucas horas; o refresh_token é o que
  // permite renovar o acesso sem o usuário logar de novo (dura ~6 meses).
  //
  // O ideal em produção é salvar isso em BANCO DE DADOS, vinculado ao
  // usuário/loja (data.user_id), para poder renovar o token depois em
  // background e ter múltiplas contas conectadas ao mesmo tempo.
  //
  // Como solução funcional imediata (sem depender de um banco ainda),
  // guardamos em cookies httpOnly seguros. Troque este bloco por uma
  // chamada ao seu banco assim que tiver isso pronto.
  // ------------------------------------------------------------------
  const responseBody = {
    sucesso: true,
    mensagem: "Mercado Livre conectado com sucesso!",
    usuario_id: tokenData.user_id,
    token_recebido: !!tokenData.access_token,
    refresh_token_recebido: !!tokenData.refresh_token,
    expira_em: tokenData.expires_in,
    escopo: tokenData.scope,
  };

  const res = NextResponse.json(responseBody);

  res.cookies.set("ml_access_token", tokenData.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: tokenData.expires_in ?? 21600, // padrão ML: 6h
  });

  if (tokenData.refresh_token) {
    res.cookies.set("ml_refresh_token", tokenData.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 180, // ~6 meses
    });
  }

  res.cookies.delete("ml_code_verifier");

  return res;
}
