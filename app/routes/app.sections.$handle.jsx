import { useFetcher, useLoaderData } from "@remix-run/react";
import { Page, Card, BlockStack, Text, Button, InlineStack, Select, Banner } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getSectionByHandle, readSectionLiquid } from "../sections/catalog.server";

export const loader = async ({ request, params }) => {
  const { admin } = await authenticate.admin(request);

  const section = getSectionByHandle(params.handle);
  if (!section) throw new Response("Not found", { status: 404 });

  // List themes for selection
  const themeRes = await admin.graphql(`
    #graphql
    query Themes {
      themes(first: 50) {
        nodes { id name role }
      }
    }
  `);
  const themeJson = await themeRes.json();
  const themes = themeJson.data.themes.nodes;

  return { section, themes };
};

export const action = async ({ request, params }) => {
  const { admin, billing } = await authenticate.admin(request);

  const section = getSectionByHandle(params.handle);
  if (!section) throw new Response("Not found", { status: 404 });

  const form = await request.formData();
  const intent = String(form.get("intent") || "");

  if (intent === "purchase") {
    // Require one-time purchase. If missing, redirect to Shopify confirmation.
    await billing.require({
      plans: [section.billingPlan],
      onFailure: async () =>
        billing.request({
          plan: section.billingPlan,
          isTest: true,
        }),
    });

    return { ok: true };
  }

  if (intent === "install") {
    // Ensure purchased
    await billing.require({
      plans: [section.billingPlan],
      onFailure: async () =>
        billing.request({
          plan: section.billingPlan,
          isTest: true,
        }),
    });

    const themeId = String(form.get("themeId") || "");
    if (!themeId) throw new Response("Missing theme", { status: 400 });

    const liquid = readSectionLiquid(section.handle);

    const upsertRes = await admin.graphql(
      `
      #graphql
      mutation Upsert($themeId: ID!, $files: [OnlineStoreThemeFilesUpsertFileInput!]!) {
        themeFilesUpsert(themeId: $themeId, files: $files) {
          upsertedThemeFiles { filename }
          userErrors { field message }
        }
      }
    `,
      {
        variables: {
          themeId,
          files: [
            {
              filename: section.themeFilename,
              body: { type: "TEXT", value: liquid },
            },
          ],
        },
      },
    );

    const upsertJson = await upsertRes.json();
    const errs = upsertJson.data?.themeFilesUpsert?.userErrors || [];
    if (errs.length) {
      return { ok: false, errors: errs };
    }

    return { ok: true };
  }

  throw new Response("Bad request", { status: 400 });
};

export default function SectionDetail() {
  const { section, themes } = useLoaderData();
  const fetcher = useFetcher();

  const isWorking = ["loading", "submitting"].includes(fetcher.state);

  const themeOptions = themes
    .map((t) => ({ label: `${t.name}${t.role === "MAIN" ? " (Live)" : ""}`, value: t.id }))
    .sort((a, b) => (a.label.includes("(Live)") ? -1 : 1));

  const selectedTheme = String(fetcher.formData?.get("themeId") || themeOptions[0]?.value || "");

  return (
    <Page title={section.title} backAction={{ content: "Sections", url: "/app/sections" }}>
      <BlockStack gap="400">
        {fetcher.data?.ok === false && (
          <Banner tone="critical" title="Install failed">
            <p>{(fetcher.data.errors || []).map((e) => e.message).join(" · ")}</p>
          </Banner>
        )}

        <Card>
          <BlockStack gap="200">
            <Text as="p" variant="bodyMd">
              {section.description}
            </Text>
            <Text as="p" variant="bodyMd">
              Price: ${section.priceUsd.toFixed(2)} (one-time)
            </Text>

            <InlineStack gap="200">
              <fetcher.Form method="post">
                <input type="hidden" name="intent" value="purchase" />
                <Button loading={isWorking} submit variant="primary">
                  Purchase
                </Button>
              </fetcher.Form>

              <fetcher.Form method="post">
                <input type="hidden" name="intent" value="install" />
                <Select label="Theme" name="themeId" options={themeOptions} value={selectedTheme} />
                <div style={{ marginTop: 12 }}>
                  <Button loading={isWorking} submit>
                    Install to selected theme
                  </Button>
                </div>
              </fetcher.Form>
            </InlineStack>

            <Text as="p" variant="bodySm" tone="subdued">
              Tip: After install, open Theme Editor and add the section from the section picker.
            </Text>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
