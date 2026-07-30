# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login.spec.ts >> Login page — authentication >> valid company credentials redirect to the existing dashboard
- Location: tests\login.spec.ts:166:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Tearing down "context" exceeded the test timeout of 30000ms.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7]: "N"
        - generic [ref=e8]:
          - generic [ref=e9]: InvoNest
          - generic [ref=e10]: AI Cash Flow Intelligence
      - heading "Welcome back." [level=1] [ref=e11]
      - paragraph [ref=e12]: Sign in to your finance workspace.
    - button "Continue with Google" [ref=e13] [cursor=pointer]
    - paragraph [ref=e19]: Google Workspace accounts only
    - generic [ref=e20]: Or
    - generic [ref=e24]:
      - textbox "Company Email" [ref=e26]: demo@invonest.ai
      - generic [ref=e30]:
        - textbox "Password" [ref=e31]: Demo@123
        - button [ref=e32] [cursor=pointer]
      - generic [ref=e36]:
        - generic [ref=e37]: Demo Account
        - generic [ref=e38]:
          - generic [ref=e39]: "Email:"
          - generic [ref=e40]:
            - generic [ref=e41]: demo@invonest.ai
            - button [ref=e42] [cursor=pointer]
        - generic [ref=e46]:
          - generic [ref=e47]: "Password:"
          - generic [ref=e48]:
            - generic [ref=e49]: Demo@123
            - button [ref=e50] [cursor=pointer]
      - button "Login to InvoNest" [ref=e54] [cursor=pointer]
  - button "Open Next.js Dev Tools" [ref=e60] [cursor=pointer]
  - alert [ref=e64]
```