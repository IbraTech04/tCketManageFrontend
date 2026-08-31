# tCketManage Frontend 

This is a (completely and shamelessly vibe-coded) frontend for the tCketManage Admin Panel. It is built using React and TypeScript, and is designed to be a single-page application (SPA). 

See [the backend repository](https://github.com/IbraTech04/tCketManageBackend) for the backend code and API documentation.

Currently this UI is used purely for admin-related tasks and is mostly for testing the backend in an E2E manner. In other words, **for now it is merely a tool for me to accelerate backend development** and **it is not intended for public use**. However, I plan on eventually making it fully featured for public use, and I will update this README accordingly when that happens.

There is a temporary `/buy` page that allows the purchasing of tickets, however it is not complete yet. The idea is to turn it into some embeddable iFrame that can be easily integrated into any existing website, but for now it is just a standalone page for testing purposes.

Again, I cannot stress enough that this frontend is merely a tool designed to accelerate backend development :sob:

## Running against the standalone backend

The console normally expects the shared LensBridge backend, which owns `/api/auth` and issues the JWTs every request carries. The standalone `tcketmanage-app` has no auth stack — it exists to exercise core's endpoints on their own — so pointed at it, the console bounces you to a sign-in page nothing can serve.

Copy `.env.example` to `.env.local` and set:

```
VITE_DISABLE_AUTH=true
```

That drops the `Authorization` header, skips the token-refresh-and-redirect on a 401, and opens every route. A badge sits in the bottom-left of every page while it is on.

It cannot leak into a release build. `src/lib/devAuth.js` ANDs the variable with `import.meta.env.DEV`, and Vite substitutes both at build time, so a production bundle contains `false && …` and drops the bypass as dead code — setting the variable in a production build does nothing.

Both backends serve core under `/api/tcket`, so no base-path change is needed either way.
