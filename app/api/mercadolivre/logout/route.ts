import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const homeUrl = new URL("/", request.url);
  const res = NextResponse.redirect(homeUrl);

  res.cookies.delete("ml_access_token");
  res.cookies.delete("ml_refresh_token");

  return res;
}
