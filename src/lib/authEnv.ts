// Whether Clerk auth is configured. When the publishable key is absent
// (e.g. before you add env vars on Vercel) the app runs open, without login,
// so it never hard-crashes.
export const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
