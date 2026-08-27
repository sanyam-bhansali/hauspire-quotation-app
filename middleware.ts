import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Everything except the sign-in route requires a logged-in designer.
const isPublic = createRouteMatcher(["/sign-in(.*)"]);

export default clerkMiddleware((auth, req) => {
  if (!isPublic(req)) auth().protect();
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
