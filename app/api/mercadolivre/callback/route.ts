import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "Código de autorização não recebido." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    sucesso: true,
    mensagem: "Login do Mercado Livre autorizado!",
    codigo_recebido: true,
  });
}
