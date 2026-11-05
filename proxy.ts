import { NextResponse } from "next/server";
import { auth } from "@/auth";

const PROTECTED = [/^\/assets/, /^\/keys/, /^\/agent/, /^\/usage/, /^\/previews/];

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  if (!req.auth && PROTECTED.some((r) => r.test(pathname))) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
