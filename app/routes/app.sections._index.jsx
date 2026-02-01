import { useLoaderData, useLocation } from "@remix-run/react";
import { Page, Card, BlockStack, Text, Button, InlineStack } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { SECTION_CATALOG } from "../sections/catalog.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return { sections: SECTION_CATALOG };
};

export default function SectionsIndex() {
  const { sections } = useLoaderData();
  const location = useLocation();

  // In embedded Shopify Admin, query params like `host` are required for App Bridge context.
  // Preserve them for client-side navigation.
  const search = location.search || "";

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
                <Button url={`/app/sections/${s.handle}${search}`} variant="primary">
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
