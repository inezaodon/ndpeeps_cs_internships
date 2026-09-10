const TOKEN_KEY = "ndpeeps_gh_dispatch_token";
const OWNER = "inezaodon";
const REPO = "ndpeeps_cs_internships";
const WORKFLOW_FILE = "daily-big-tech-email.yml";

export function getDispatchToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setDispatchToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token.trim());
}

export function clearDispatchToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function triggerDigestEmail(token: string): Promise<void> {
  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: "main" }),
    },
  );

  if (res.status === 204) return;

  let detail = "";
  try {
    detail = await res.text();
  } catch {
    /* ignore */
  }

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      "GitHub rejected the token. Create a fine-grained PAT with Actions: Read and write on inezaodon/ndpeeps_cs_internships.",
    );
  }

  throw new Error(`Could not start digest (${res.status})${detail ? `: ${detail}` : ""}`);
}
