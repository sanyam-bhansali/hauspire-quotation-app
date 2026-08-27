import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublic = createRouteMatcher(["/sign-in(.*)"]);
const enabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// When Clerk is configured, protect every route except /sign-in.
// When it isn't (no env vars yet), let all requests through so the app runs.
export default enabled
  ? clerkMiddleware((auth, req) => {
      if (!isPublic(req)) auth().protect();
    })
  : function middleware() {
      return NextResponse.next();
    };

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
