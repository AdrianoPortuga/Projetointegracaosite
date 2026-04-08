export function resolvePageContext(pathname, segment) {
  const normalized = String(pathname || "/").toLowerCase();
  if (normalized === "/" || normalized === "/home" || normalized === "/inicio") {
    return {
      page_type: "homepage",
      product_focus: segment || "geral",
      serviceId: segment || null
    };
  }

  return {
    page_type: "landing_page",
    product_focus: segment || "geral",
    serviceId: segment || null
  };
}
