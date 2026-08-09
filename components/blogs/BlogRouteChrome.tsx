"use client";

import { useEffect } from "react";

/**
 * On blog routes, the header wordmark becomes "Blogs" via SiteRouteTitle
 * and the default "Zcash Names" label is hidden (see globals.css).
 */
export default function BlogRouteChrome() {
  useEffect(() => {
    document.documentElement.setAttribute("data-blog-route", "true");
    return () => {
      document.documentElement.removeAttribute("data-blog-route");
    };
  }, []);

  return null;
}
