// The campaign spec the builder edits (saved as a draft; see the API's
// meta-ads/spec.js for its full shape and checks).

export const rid = () => Math.random().toString(36).slice(2, 9);

// The ad account's home market, as the first location of a new ad set.
const HOME = { INR: "IN", USD: "US", GBP: "GB", EUR: "DE", JPY: "JP", CNY: "CN", SAR: "SA", AED: "AE", SGD: "SG", AUD: "AU", CAD: "CA" };
export const homeCountry = (caps) => HOME[caps?.adAccount?.currency] || "IN";

export function blankAd(caps, link, n = 1) {
  // The Page and Instagram account chosen when connecting; else the first Page and its Instagram.
  const page = caps?.pages?.find((p) => p.id === caps?.defaults?.pageId) || caps?.pages?.[0];
  const igId = caps?.defaults?.instagramId || page?.instagram?.id || null;
  return { key: rid(), name: `Ad ${n}`, format: "image", identity: { pageId: page?.id || null, instagramId: igId }, primaryText: "", headline: "", description: "", link: link || "", cta: "SHOP_NOW", imageHash: null, imagePreview: null, videoId: null, videoPreview: null, thumbnailHash: null, thumbnailPreview: null, cards: [] };
}

export function blankAdSet(caps, objective, link, n = 1) {
  const goal = caps?.objectives?.[objective]?.recommended || "landing_page_views";
  const pixel = caps?.pixels?.find((p) => p.active) || caps?.pixels?.[0];
  return {
    key: rid(),
    name: `Ad set ${n}`,
    goal: caps?.goals?.[goal]?.needsPixel && !pixel ? "landing_page_views" : goal,
    pixelId: pixel?.id || null,
    budget: 500,
    startTime: null,
    endTime: null,
    targeting: { countries: [homeCountry(caps)], regions: [], cities: [], excludedRegions: [], ageMin: 18, ageMax: 65, genders: [], locales: [], interests: [], customAudiences: [], excludedAudiences: [], advantageAudience: true },
    placements: { mode: "automatic", platforms: ["facebook", "instagram"], facebook: [], instagram: [], devices: [] },
    ads: [blankAd(caps, link)],
  };
}

export function blankSpec(caps, link) {
  return {
    campaign: { name: "", objective: "OUTCOME_SALES", budgetLevel: "campaign", budgetType: "daily", budget: 500, bidStrategy: "LOWEST_COST_WITHOUT_CAP", bidAmount: null, roasFloor: null, specialAdCategories: [], startTime: null, endTime: null },
    adSets: [blankAdSet(caps, "OUTCOME_SALES", link)],
  };
}

/** A copy with fresh keys (duplicating an ad set or an ad). */
export const copyAdSet = (s, name) => ({ ...JSON.parse(JSON.stringify(s)), key: rid(), name, ads: s.ads.map((a) => ({ ...JSON.parse(JSON.stringify(a)), key: rid() })) });
export const copyAd = (a, name) => ({ ...JSON.parse(JSON.stringify(a)), key: rid(), name });

/** Where the builder is: the campaign, its budget, an ad set, an ad, or Review. */
export function nodesOf(spec) {
  const out = [{ type: "campaign" }, { type: "budget" }];
  spec.adSets.forEach((s, i) => {
    out.push({ type: "adset", i });
    s.ads.forEach((_, j) => out.push({ type: "ad", i, j }));
  });
  out.push({ type: "review" });
  return out;
}
export const sameNode = (a, b) => a.type === b.type && a.i === b.i && a.j === b.j;
// The coach's suggestions are tied to these steps (API meta-ads/coach.js).
export const STEP_OF = { campaign: 0, budget: 1, adset: 2, ad: 3, review: 4 };

/** Problems from POST /check, counted where they belong in the tree. */
export function errorsAt(check, spec, node) {
  const list = check?.errors || [];
  if (node.type === "campaign" || node.type === "budget") return list.filter((e) => e.at === "campaign").length;
  if (node.type === "adset") {
    const s = spec.adSets[node.i];
    return list.filter((e) => e.at === `adset:${s?.key ?? node.i}` || (node.i === 0 && e.at === "adsets")).length;
  }
  if (node.type === "ad") {
    const s = spec.adSets[node.i];
    const a = s?.ads[node.j];
    return list.filter((e) => e.at === `ad:${a?.key ?? `${node.i}-${node.j}`}`).length;
  }
  return 0;
}

export const ctaLabel = (c) => c.replace(/_/g, " ").toLowerCase().replace(/^./, (x) => x.toUpperCase());
