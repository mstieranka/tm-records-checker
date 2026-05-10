import { data, Link, useLocation } from "react-router";
import { Links, Meta, Outlet, Scripts, useLoaderData } from "react-router";
import { IconMenu2 } from "@tabler/icons-react";
import { ThemeProvider } from "next-themes";
import type { Route } from "./+types/root";
import { AUTH_ERROR_KEY, commitSession, getSession, getUser } from "./auth/session.server";
import { ThemeToggle } from "~/components/ThemeToggle";
import { Button } from "~/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "~/components/ui/navigation-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { Toaster } from "~/components/ui/sonner";

import favicon16 from "./assets/favicon-16x16.png";
import favicon192 from "./assets/favicon-192x192.png";
import favicon32 from "./assets/favicon-32x32.png";
import favicon96 from "./assets/favicon-96x96.png";
import faviconIco from "./assets/favicon.ico";
import css from "./root.css?url";

export const links: Route.LinksFunction = () => [
  { rel: "stylesheet", href: css },
  {
    rel: "icon",
    type: "image/png",
    sizes: "16x16",
    href: favicon16,
  },
  {
    rel: "icon",
    type: "image/png",
    sizes: "32x32",
    href: favicon32,
  },
  {
    rel: "icon",
    type: "image/png",
    sizes: "96x96",
    href: favicon96,
  },
  {
    rel: "icon",
    type: "image/png",
    sizes: "192x192",
    href: favicon192,
  },
  { rel: "shortcut icon", type: "image/x-icon", href: faviconIco },
  { rel: "icon", type: "image/x-icon", href: faviconIco },
];

export async function loader({ request }: Route.LoaderArgs) {
  let session = await getSession(request.headers.get("cookie"));
  let error = session.get(AUTH_ERROR_KEY);
  if (error) {
    return data(
      { error },
      {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      },
    );
  }

  return {
    auth: await getUser(request),
  };
}

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/maps", label: "Maps" },
  { to: "/tasks", label: "Tasks" },
  { to: "/settings", label: "Settings" },
  { to: "/auth/logout", label: "Logout" },
];

export default function Root() {
  const data = useLoaderData<typeof loader>();
  const isAuthed = "auth" in data && !!data.auth;
  const location = useLocation();

  return (
    <html suppressHydrationWarning>
      <head>
        <link rel="icon" href="data:image/x-icon;base64,AA" />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <header className="flex items-center justify-between gap-4 border-b px-4 py-3 md:px-6">
            <Link to="/" className="font-heading text-base font-medium">
              TM Records Checker
            </Link>
            <div className="flex items-center gap-2">
              {isAuthed && (
                <>
                  <div className="hidden md:block">
                    <NavigationMenu>
                      <NavigationMenuList className="space-x-2">
                        {NAV_LINKS.map((link) => (
                          <NavigationMenuItem key={link.to}>
                            <NavigationMenuLink
                              active={location.pathname === link.to}
                              render={({ ...props }) => (
                                <Link to={link.to} {...props}>
                                  {link.label}
                                </Link>
                              )}
                            />
                          </NavigationMenuItem>
                        ))}
                      </NavigationMenuList>
                    </NavigationMenu>
                  </div>
                  <div className="md:hidden">
                    <Sheet>
                      <SheetTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <IconMenu2 />
                        <span className="sr-only">Open menu</span>
                      </SheetTrigger>
                      <SheetContent side="right">
                        <SheetHeader>
                          <SheetTitle>Menu</SheetTitle>
                        </SheetHeader>
                        <nav className="flex flex-col gap-1 px-4 pb-4">
                          {NAV_LINKS.map((link) => (
                            <SheetClose
                              key={link.to}
                              render={
                                <Link
                                  to={link.to}
                                  className="rounded-md px-3 py-2 text-sm hover:bg-muted"
                                >
                                  {link.label}
                                </Link>
                              }
                            />
                          ))}
                          <div className="mt-4 border-t pt-4">
                            <ThemeToggle showLabel />
                          </div>
                        </nav>
                      </SheetContent>
                    </Sheet>
                  </div>
                </>
              )}
              <div className="hidden md:block">
                <ThemeToggle />
              </div>
            </div>
          </header>
          <Outlet />
          <Toaster position="top-center" />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
