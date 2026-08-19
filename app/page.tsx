import { cookies } from "next/headers";

const ofertas = [
  {
    produto: "Smartphone Samsung Galaxy",
    preco: "R$ 899,90",
    desconto: "32% OFF",
    loja: "Mercado Livre",
  },
  {
    produto: "Fone Bluetooth JBL",
    preco: "R$ 149,90",
    desconto: "25% OFF",
    loja: "Mercado Livre",
  },
  {
    produto: "Smart TV 50 polegadas",
    preco: "R$ 1.899,00",
    desconto: "28% OFF",
    loja: "Mercado Livre",
  },
];

type ContaMercadoLivre = {
  nickname: string;
  first_name?: string;
  last_name?: string;
  logo?: string | null;
};

async function buscarContaConectada(): Promise<ContaMercadoLivre | null> {
  const accessToken = cookies().get("ml_access_token")?.value;

  if (!accessToken) {
    return null;
  }

  try {
    const response = await fetch("https://api.mercadolibre.com/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    return {
      nickname: data.nickname,
      first_name: data.first_name,
      last_name: data.last_name,
      logo: data.logo ?? null,
    };
  } catch {
    return null;
  }
}

export default async function Home() {
  const conta = await buscarContaConectada();

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold">
              Descont<span className="text-green-400">AE</span>
            </h1>
            <p className="text-sm text-zinc-400">
              Central automática de ofertas
            </p>
          </div>

          {conta ? (
            <div className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2">
              {conta.logo ? (
                <img
                  src={conta.logo}
                  alt={conta.nickname}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-sm font-bold text-black">
                  {conta.nickname?.charAt(0).toUpperCase() ?? "M"}
                </div>
              )}
              <div className="text-sm">
                <p className="font-semibold text-green-400">
                  {conta.first_name
                    ? `${conta.first_name} ${conta.last_name ?? ""}`.trim()
                    : conta.nickname}
                </p>
                <p className="text-xs text-zinc-400">Conectado</p>
              </div>
            </div>
          ) : (
            
              href="/api/mercadolivre/login"
              className="rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-black hover:bg-green-400"
            >
              Conectar Mercado Livre
            </a>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-green-400">
            Automação de ofertas
          </p>

          <h2 className="max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
            Encontre as melhores promoções automaticamente.
          </h2>

          <p className="mt-5 max-w-2xl text-lg text-zinc-400">
            O DescontAE foi criado para encontrar ofertas, analisar descontos,
            gerar links e facilitar a divulgação dos produtos.
          </p>
        </div>

        <div className="mb-10 grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm text-zinc-400">Ofertas encontradas</p>
            <p className="mt-2 text-3xl font-bold">0</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm text-zinc-400">Links gerados</p>
            <p className="mt-2 text-3xl font-bold">0</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm text-zinc-400">Publicações</p>
            <p className="mt-2 text-3xl font-bold">0</p>
          </div>
        </div>

        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-2xl font-bold">Ofertas em destaque</h3>

          <button className="rounded-xl bg-green-500 px-5 py-3 font-semibold text-black hover:bg-green-400">
            Buscar ofertas
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {ofertas.map((oferta) => (
            <div
              key={oferta.produto}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
            >
              <div className="mb-5 flex h-40 items-center justify-center rounded-xl bg-zinc-800 text-zinc-500">
                Produto
              </div>

              <div className="mb-3 inline-block rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-400">
                {oferta.desconto}
              </div>

              <h4 className="font-semibold">{oferta.produto}</h4>

              <p className="mt-3 text-2xl font-bold">{oferta.preco}</p>

              <p className="mt-1 text-sm text-zinc-400">
                Loja: {oferta.loja}
              </p>

              <button className="mt-5 w-full rounded-xl border border-zinc-700 px-4 py-3 font-semibold hover:bg-zinc-800">
                Ver oferta
              </button>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-zinc-800 py-8 text-center text-sm text-zinc-500">
        DescontAE • Sistema de automação de ofertas
      </footer>
    </main>
  );
}
