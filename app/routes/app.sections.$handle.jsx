import { useState, useCallback } from "react";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { Page, Card, BlockStack, Text, Button, InlineStack, Select, Banner } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getSectionByHandle, readSectionLiquid } from "../sections/catalog.server";

function getLegacyIdFromGid(gid) {
  // e.g. gid://shopify/OnlineStoreTheme/123456789
  const m = String(gid || "").match(/(\d+)$/);
  return m ? m[1] : "";
}

function buildThemeEditorUrl(shopDomain, themeGid) {
  const store = shopDomain.replace(/\.myshopify\.com$/i, "");
  const legacyId = getLegacyIdFromGid(themeGid);
  if (!legacyId) return "";
  return `https://admin.shopify.com/store/${store}/themes/${legacyId}/editor`;
}

export const loader = async ({ request, params }) => {
  const { admin, billing, session } = await authenticate.admin(request);

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

  const billingState = await billing.check({ plans: [section.billingPlan] });

  return {
    section,
    themes,
    billingState,
    shop: session.shop,
  };
};

export const action = async ({ request, params }) => {
  const { admin, billing, session } = await authenticate.admin(request);

  const section = getSectionByHandle(params.handle);
  if (!section) throw new Response("Not found", { status: 404 });

  const form = await request.formData();
  const intent = String(form.get("intent") || "");

  const billingRequest = async () => {
    // Production default: real charges.
    // Dev/partner-development stores cannot be charged, so we automatically use test billing there.
    // You can force test billing anywhere by setting SHOPIFY_BILLING_TEST=true.

    const forcedTest = String(process.env.SHOPIFY_BILLING_TEST || "").toLowerCase() === "true";

    let partnerDevelopment = false;
    try {
      const shopRes = await admin.graphql(`
        #graphql
        query ShopPlan {
          shop {
            plan {
              partnerDevelopment
            }
          }
        }
      `);
      const shopJson = await shopRes.json();
      partnerDevelopment = Boolean(shopJson.data?.shop?.plan?.partnerDevelopment);
    } catch {
      // If this fails for any reason, fall back to real charges.
      partnerDevelopment = false;
    }

    const isTest = forcedTest || partnerDevelopment;
    console.log("[billing] isTest=%s forcedTest=%s partnerDevelopment=%s shop=%s", isTest, forcedTest, partnerDevelopment, session.shop);

    const returnUrl = new URL(`/app/sections/${params.handle}`, request.url).toString();
    return billing.request({
      plan: section.billingPlan,
      isTest,
      returnUrl,
    });
  };

  if (intent === "purchase") {
    // Require one-time purchase. If missing, redirect to Shopify confirmation.
    try {
      await billing.require({
        plans: [section.billingPlan],
        onFailure: billingRequest,
      });
    } catch (err) {
      console.error("[billing] Purchase error:", err.message, err.errorData ?? err);
      return { ok: false, errors: [{ message: err.message }] };
    }

    return { ok: true };
  }

  if (intent === "install") {
    // Ensure purchased
    try {
      await billing.require({
        plans: [section.billingPlan],
        onFailure: billingRequest,
      });
    } catch (err) {
      console.error("[billing] Install billing error:", err.message, err.errorData ?? err);
      return { ok: false, errors: [{ message: err.message }] };
    }

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

    return {
      ok: true,
      installedFilename: section.themeFilename,
      themeEditorUrl: buildThemeEditorUrl(session.shop, themeId),
    };
  }

  throw new Response("Bad request", { status: 400 });
};

export default function SectionDetail() {
  const { section, themes, billingState, shop } = useLoaderData();

  const purchaseFetcher = useFetcher();
  const installFetcher = useFetcher();

  const isPurchasing = ["loading", "submitting"].includes(purchaseFetcher.state);
  const isInstalling = ["loading", "submitting"].includes(installFetcher.state);

  const themeOptions = themes
    .slice()
    .sort((a, b) => {
      if (a.role === "MAIN" && b.role !== "MAIN") return -1;
      if (b.role === "MAIN" && a.role !== "MAIN") return 1;
      return a.name.localeCompare(b.name);
    })
    .map((t) => ({
      label: `${t.name}${t.role === "MAIN" ? " (Live)" : ""}`,
      value: t.id,
    }));

  const [selectedThemeId, setSelectedThemeId] = useState(themeOptions[0]?.value || "");
  const handleThemeChange = useCallback((value) => setSelectedThemeId(value), []);
  const selectedTheme = themes.find((t) => t.id === selectedThemeId) || null;

  const hasPurchased = Boolean(billingState?.hasActivePayment);

  return (
    <Page title={section.title} backAction={{ content: "Sections", url: "/app/sections" }}>
      <BlockStack gap="400">
        {purchaseFetcher.data?.ok === false && (
          <Banner tone="critical" title="Purchase failed">
            <p>{(purchaseFetcher.data.errors || []).map((e) => e.message).join(" · ")}</p>
          </Banner>
        )}

        {installFetcher.data?.ok === false && (
          <Banner tone="critical" title="Install failed">
            <p>{(installFetcher.data.errors || []).map((e) => e.message).join(" · ")}</p>
          </Banner>
        )}

        {installFetcher.data?.ok === true && (
          <Banner tone="success" title="Installed">
            <p>
              Added <code>{installFetcher.data.installedFilename}</code> to your theme.
            </p>
            {installFetcher.data.themeEditorUrl && (
              <p>
                <a href={installFetcher.data.themeEditorUrl} target="_blank" rel="noreferrer">
                  Open Theme Editor
                </a>
              </p>
            )}
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

            <Text as="p" variant="bodySm" tone={hasPurchased ? "success" : "subdued"}>
              {hasPurchased ? "Purchased" : "Not purchased yet"} ({shop})
            </Text>

            <InlineStack gap="400" align="start">
              <purchaseFetcher.Form method="post">
                <input type="hidden" name="intent" value="purchase" />
                <Button disabled={hasPurchased} loading={isPurchasing} submit variant="primary">
                  {hasPurchased ? "Purchased" : "Purchase"}
                </Button>
              </purchaseFetcher.Form>

              <installFetcher.Form method="post">
                <input type="hidden" name="intent" value="install" />
                <Select label="Theme" name="themeId" options={themeOptions} value={selectedThemeId} onChange={handleThemeChange} />
                <Text as="p" variant="bodySm" tone="subdued">
                  Selected theme: {selectedTheme?.name || ""}
                </Text>
                {/* legacy theme id is derived from the theme GID */}
                <div style={{ marginTop: 12 }}>
                  <Button loading={isInstalling} submit>
                    Install to selected theme
                  </Button>
                </div>
              </installFetcher.Form>
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
