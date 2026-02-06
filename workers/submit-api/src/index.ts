interface Env {
  GITHUB_TOKEN: string;
  GITHUB_REPO: string;
  GITHUB_BASE_BRANCH?: string;
  ALLOWED_ORIGIN?: string;
}

interface SubmissionPayload {
  company: string;
  perkType: "credit" | "discount" | "trial" | "mixed";
  amountDisplay: string;
  eligibility: string;
  categories: string[];
  fundingStages: string[];
  url: string;
  website?: string;
}

const allowedPerkTypes = new Set(["credit", "discount", "trial", "mixed"]);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin") || "";
    const corsHeaders = getCorsHeaders(origin, env.ALLOWED_ORIGIN);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    if (!isAllowedPath(url.pathname)) {
      return jsonResponse({ ok: false, error: "Not found." }, 404, corsHeaders);
    }

    if (env.ALLOWED_ORIGIN && origin && origin !== env.ALLOWED_ORIGIN) {
      return jsonResponse({ ok: false, error: "Origin not allowed." }, 403, corsHeaders);
    }

    if (request.method !== "POST") {
      return jsonResponse({ ok: false, error: "Method not allowed." }, 405, corsHeaders);
    }

    if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
      return jsonResponse({ ok: false, error: "Server is not configured yet." }, 500, corsHeaders);
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return jsonResponse({ ok: false, error: "Invalid JSON payload." }, 400, corsHeaders);
    }

    const parsed = validatePayload(rawBody);
    if (!parsed.ok) {
      return jsonResponse({ ok: false, error: parsed.error }, 400, corsHeaders);
    }

    try {
      const submission = parsed.payload;
      const baseBranch = env.GITHUB_BASE_BRANCH || "main";
      const branchSlug = toSlug(submission.company);
      const branchName = `submission/${branchSlug}-${Date.now().toString(36)}`;
      const fileName = `${branchSlug}-${submission.perkType}.md`;
      const markdown = buildMarkdown(submission);

      const baseSha = await getBaseBranchSha(env, baseBranch);
      await createBranch(env, branchName, baseSha);
      await createPerkFile(env, {
        branchName,
        filePath: `src/content/perks/${fileName}`,
        content: markdown,
        commitMessage: `feat: add ${submission.company} perk`,
      });

      const prUrl = await createPullRequest(env, {
        title: `feat: add ${submission.company} perk`,
        head: branchName,
        base: baseBranch,
        body: buildPullRequestBody(submission, fileName),
      });

      return jsonResponse({ ok: true, prUrl }, 200, corsHeaders);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create pull request.";
      return jsonResponse({ ok: false, error: message }, 502, corsHeaders);
    }
  },
};

function isAllowedPath(pathname: string): boolean {
  return pathname === "/" || pathname === "/submit-perk" || pathname === "/api/submit-perk";
}

function getCorsHeaders(origin: string, allowedOrigin?: string): HeadersInit {
  const allowOrigin = allowedOrigin || origin || "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function jsonResponse(body: unknown, status: number, headers: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

function validatePayload(input: unknown): { ok: true; payload: SubmissionPayload } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Submission payload is required." };
  }

  const data = input as Record<string, unknown>;
  const company = cleanText(data.company);
  const perkType = cleanText(data.perkType).toLowerCase();
  const amountDisplay = cleanText(data.amountDisplay);
  const eligibility = cleanText(data.eligibility);
  const url = cleanText(data.url);
  const website = cleanText(data.website);

  const categories = normalizeStringArray(data.categories);
  const fundingStages = normalizeStringArray(data.fundingStages);

  if (website) {
    return { ok: false, error: "Submission rejected." };
  }
  if (company.length < 2) {
    return { ok: false, error: "Company name is too short." };
  }
  if (!allowedPerkTypes.has(perkType)) {
    return { ok: false, error: "Perk type is invalid." };
  }
  if (amountDisplay.length < 2) {
    return { ok: false, error: "Value display is required." };
  }
  if (eligibility.length < 12) {
    return { ok: false, error: "Eligibility should be at least 12 characters." };
  }
  if (!categories.length) {
    return { ok: false, error: "At least one category is required." };
  }
  if (!fundingStages.length) {
    return { ok: false, error: "At least one funding stage is required." };
  }
  if (!isValidUrl(url)) {
    return { ok: false, error: "Program URL must be a valid URL." };
  }

  return {
    ok: true,
    payload: {
      company,
      perkType: perkType as SubmissionPayload["perkType"],
      amountDisplay,
      eligibility,
      categories,
      fundingStages,
      url,
      website,
    },
  };
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => cleanText(item))
      .filter(Boolean);
  }
  const single = cleanText(value);
  return single ? [single] : [];
}

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function toSlug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "new-perk"
  );
}

function yamlString(value: string): string {
  return `"${value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\n", " ")}"`;
}

function buildMarkdown(submission: SubmissionPayload): string {
  const today = new Date().toISOString().slice(0, 10);
  const category = submission.categories[0] || "Other";
  const stage = submission.fundingStages[0] || "Seed";
  const summary = `Official startup program for ${submission.company}.`;

  return `---
company: ${yamlString(submission.company)}
title: ${yamlString(`${submission.amountDisplay} in ${submission.company} Credits`)}
summary: ${yamlString(summary)}
perkType: ${yamlString(submission.perkType)}
amountDisplay: ${yamlString(submission.amountDisplay)}
currency: "USD"
eligibility: ${yamlString(submission.eligibility)}
fundingStages:
  - ${yamlString(stage)}
regions:
  - "Global"
categories:
  - ${yamlString(category)}
applyUrl: ${yamlString(submission.url)}
sourceUrl: ${yamlString(submission.url)}
lastVerified: ${today}
verified: false
isActive: true
---

Added via automated submit API.
`;
}

function buildPullRequestBody(submission: SubmissionPayload, fileName: string): string {
  return [
    "## Summary",
    "- Adds a new startup perk submission from the public submit form.",
    `- Company: ${submission.company}`,
    `- Program URL: ${submission.url}`,
    "",
    "## Validation",
    "- Submitted through automated API validation.",
    "",
    "## Files",
    `- src/content/perks/${fileName}`,
  ].join("\n");
}

async function getBaseBranchSha(env: Env, baseBranch: string): Promise<string> {
  const response = await githubRequest(env, `/git/ref/heads/${encodeURIComponent(baseBranch)}`, {
    method: "GET",
  });
  const payload = await parseGithubResponse(response);
  const object = payload.object as Record<string, unknown> | undefined;
  const sha = typeof object?.sha === "string" ? object.sha : "";
  if (!sha) {
    throw new Error("Could not resolve base branch SHA.");
  }
  return sha;
}

async function createBranch(env: Env, branchName: string, sha: string): Promise<void> {
  const response = await githubRequest(env, "/git/refs", {
    method: "POST",
    body: JSON.stringify({
      ref: `refs/heads/${branchName}`,
      sha,
    }),
  });
  await parseGithubResponse(response);
}

async function createPerkFile(
  env: Env,
  args: { branchName: string; filePath: string; content: string; commitMessage: string }
): Promise<void> {
  const response = await githubRequest(env, `/contents/${args.filePath}`, {
    method: "PUT",
    body: JSON.stringify({
      message: args.commitMessage,
      content: toBase64(args.content),
      branch: args.branchName,
    }),
  });
  await parseGithubResponse(response);
}

async function createPullRequest(
  env: Env,
  args: { title: string; head: string; base: string; body: string }
): Promise<string> {
  const response = await githubRequest(env, "/pulls", {
    method: "POST",
    body: JSON.stringify({
      title: args.title,
      head: args.head,
      base: args.base,
      body: args.body,
      draft: true,
    }),
  });
  const payload = await parseGithubResponse(response);
  return payload.html_url as string;
}

async function githubRequest(env: Env, path: string, init: RequestInit): Promise<Response> {
  return fetch(`https://api.github.com/repos/${env.GITHUB_REPO}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "startup-perks-submit-api",
      "Content-Type": "application/json",
    },
  });
}

async function parseGithubResponse(response: Response): Promise<Record<string, unknown>> {
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const message = typeof data.message === "string" ? data.message : "GitHub API request failed.";
    throw new Error(message);
  }
  return data;
}

function toBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}
