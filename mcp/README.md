# FailureAtlas MCP Integration

Production Model Context Protocol (MCP) server foundation for FailureAtlas, exposing persistent failure intelligence to conversational reasoning interfaces such as ChatGPT.

- **Production Domain**: `https://failureatlas.vercel.app/`
- **Production MCP Endpoint**: `https://failureatlas.vercel.app/mcp`
- **OAuth Issuer**: `https://failureatlas.vercel.app`
- **MCP Audience**: `failureatlas-mcp`

> **Note**: FailureAtlas MCP is not a replacement for the existing FailureAtlas backend. It is an authenticated integration layer exposing selected FailureAtlas capabilities to compatible MCP clients.

---

## 1. Architectural Overview

```
                        USER
                          │
            ┌─────────────┴─────────────┐
            │                           │
            ▼                           ▼
         LeetCode                    ChatGPT
            │                           │
            ▼                           │
     FailureAtlas                       │
     Extension                          │
            │                           │
            ▼                           │
     FailureAtlas                       │
      Backend                           │
            │                           │
            ▼                           │
     Failure Analysis                   │
            │                           │
            ▼                           │
    Persistent Memory                   │
            │                           │
            │                      OAuth authorization
            │                           │
            │                           ▼
            │                    FailureAtlas OAuth
            │                           │
            │                    MCP access token
            │                           │
            └───────────────────────────┤
                                        ▼
                            POST /mcp
                   https://failureatlas.vercel.app/mcp
                                        │
                                        ▼
                             Verify access token
                                        │
                                        ▼
                        Resolve FailureAtlas user
                                        │
                                        ▼
                                 Check scopes
                                        │
                                        ▼
                                 MCP tool
                                        │
                                        ▼
                      Existing FailureAtlas services
                                        │
                             ┌──────────┴──────────┐
                             ▼                     ▼
                        PostgreSQL              Neo4j
                             │                     │
                             └──────────┬──────────┘
                                        ▼
                             FailureAtlas Memory
                                        │
                                        ▼
                                     ChatGPT
                                        │
                                        ▼
                              Personalized response
```

---

## 2. Persistent Memory vs. Conversational Context

- **ChatGPT Conversation**: Temporary conversational context. Deleting a ChatGPT conversation does NOT delete FailureAtlas memory.
- **FailureAtlas**: Persistent learning memory across all platforms, submissions, and sessions.
- **MCP Bridge**: Secure, OAuth 2.0-authenticated channel allowing ChatGPT to read the user's FailureAtlas memory when authorized. Disconnecting ChatGPT does NOT delete FailureAtlas memory.

---

## 3. Google OAuth vs. FailureAtlas MCP OAuth

1. **Google OAuth** (`identity authentication`): Authenticates "Who is this FailureAtlas user?".
2. **FailureAtlas OAuth** (`MCP authorization`): Authorizes "What access has this user granted to ChatGPT?".
3. **Google ID tokens** are NEVER used as MCP access tokens. ChatGPT calls `/mcp` using signed FailureAtlas MCP Bearer access tokens.

---

## 4. OAuth 2.0 PKCE & Refresh Tokens

- **Authorization Code Endpoint**: `GET /oauth/authorize` (requires PKCE `code_challenge_method=S256`).
- **Token Endpoint**: `POST /oauth/token` (supports `grant_type=authorization_code` and `grant_type=refresh_token`).
- **Access Tokens**: Short-lived (1 hour lifetime) signed JWTs (`iss: https://failureatlas.vercel.app`, `aud: failureatlas-mcp`).
- **Refresh Tokens**: Long-lived (30 days lifetime) revocable tokens enabling persistent ChatGPT connectivity.

---

## 5. Scope Matrix

| Scope | Description | Tool Required |
| :--- | :--- | :--- |
| `failureatlas:profile` | Access user profile & submission statistics | `get_my_profile` |
| `failureatlas:failures:read` | Read recent failures & search failure history | `get_my_recent_failures`, `search_my_failures` |
| `failureatlas:weaknesses:read` | Access systemic weakness graph profile | `get_my_weaknesses` |
| `failureatlas:diagnosis:read` | Retrieve structured failure diagnosis | `get_failure_diagnosis` |
| `failureatlas:recommendations:read` | Retrieve personalized learning strategies | `get_learning_recommendations` |

---

## 6. Exposed Tools

1. `get_my_profile`: Returns user profile, total submissions, accepted count, and acceptance rate.
2. `get_my_recent_failures`: Returns compact summary of recent coding failures without raw source code or hidden prompts.
3. `search_my_failures`: Hybrid RAG search across historical coding failures.
4. `get_my_weaknesses`: Recurring weaknesses and PageRank severity scores.
5. `get_failure_diagnosis`: Detailed diagnosis for a specific `failureId` (verifies `failure.userId === authenticatedUserId`).
6. `get_learning_recommendations`: Personalized learning strategies and recommended practice problems.

---

## 7. Development & Testing

### Running Type-Check
```bash
pnpm type-check
```

### Running MCP Test Suite
```bash
pnpm mcp:test
```
or
```bash
npx tsx mcp/tests/auth.test.ts
npx tsx mcp/tests/tools.test.ts
npx tsx mcp/tests/http-flow.test.ts
```

---

## 8. Deployment Architecture (Vercel)

Production MCP requests are handled statelessly through the Next.js Route Handler:
`https://failureatlas.vercel.app/mcp` (`src/app/mcp/route.ts`).

No persistent background processes or fixed production ports are required.
