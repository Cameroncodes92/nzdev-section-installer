import { useEffect } from "react";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { Page, Card, BlockStack, Text, Button, InlineStack } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { SECTION_CATALOG } from "../sections/catalog.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return { sections: SECTION_CATALOG };
};

export default function SectionsIndex() {
  const { sections } = useLoaderData();
  const navigate = useNavigate();

  useEffect(() => {
    // Debug click capture to detect overlays / swallowed events.
    // Enable by setting window.__P5_DEBUG_CLICKS__ = true in the browser console.
    const handler = (e) => {
      if (!window.__P5_DEBUG_CLICKS__) return;
      const t = e.target;
      // eslint-disable-next-line no-console
      console.log("[p5-debug] click", {
        tag: t?.tagName,
        className: t?.className,
        id: t?.id,
        href: t?.getAttribute?.("href"),
        button: t?.getAttribute?.("type"),
      });
    };

    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);

  return (
    <Page title="Sections">
      <BlockStack gap="400">
        {sections.map((s) => (
          <Card key={s.handle}>
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd">
                {s.title}
              </Text>
              <Text as="p" variant="bodyMd">
                {s.description}
              </Text>
              <InlineStack gap="200" align="space-between">
                <Text as="p" variant="bodyMd">
                  ${s.priceUsd.toFixed(2)} (one-time)
                </Text>
                <Button
                  onClick={() => {
                    // eslint-disable-next-line no-console
                    console.log("[p5-debug] View click", s.handle);
                    navigate(`/app/sections/${s.handle}`);
                  }}
                  variant="primary"
                >
                  View
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        ))}
      </BlockStack>
    </Page>
  );
}
