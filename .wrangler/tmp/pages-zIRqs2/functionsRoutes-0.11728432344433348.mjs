import { onRequestGet as __api_viewer_session__sessionId__snapshot_ts_onRequestGet } from "C:\\Users\\barto\\Desktop\\Darts-Counter-V7-GIT\\functions\\api\\viewer\\session\\[sessionId]\\snapshot.ts"
import { onRequestOptions as __api_viewer_session__sessionId__snapshot_ts_onRequestOptions } from "C:\\Users\\barto\\Desktop\\Darts-Counter-V7-GIT\\functions\\api\\viewer\\session\\[sessionId]\\snapshot.ts"
import { onRequestPost as __api_viewer_session__sessionId__snapshot_ts_onRequestPost } from "C:\\Users\\barto\\Desktop\\Darts-Counter-V7-GIT\\functions\\api\\viewer\\session\\[sessionId]\\snapshot.ts"
import { onRequestGet as __api_running_routes_catalog_ts_onRequestGet } from "C:\\Users\\barto\\Desktop\\Darts-Counter-V7-GIT\\functions\\api\\running\\routes\\catalog.ts"
import { onRequestOptions as __api_running_routes_catalog_ts_onRequestOptions } from "C:\\Users\\barto\\Desktop\\Darts-Counter-V7-GIT\\functions\\api\\running\\routes\\catalog.ts"
import { onRequestDelete as __api_viewer_session__sessionId__ts_onRequestDelete } from "C:\\Users\\barto\\Desktop\\Darts-Counter-V7-GIT\\functions\\api\\viewer\\session\\[sessionId].ts"
import { onRequestOptions as __api_viewer_session__sessionId__ts_onRequestOptions } from "C:\\Users\\barto\\Desktop\\Darts-Counter-V7-GIT\\functions\\api\\viewer\\session\\[sessionId].ts"
import { onRequest as __api_storage_backups___path___ts_onRequest } from "C:\\Users\\barto\\Desktop\\Darts-Counter-V7-GIT\\functions\\api\\storage\\backups\\[[path]].ts"
import { onRequestPost as __api_avatar_cartoon_ts_onRequestPost } from "C:\\Users\\barto\\Desktop\\Darts-Counter-V7-GIT\\functions\\api\\avatar\\cartoon.ts"
import { onRequestPost as __api_avatar_checkout_ts_onRequestPost } from "C:\\Users\\barto\\Desktop\\Darts-Counter-V7-GIT\\functions\\api\\avatar\\checkout.ts"
import { onRequestGet as __api_avatar_checkout_verify_ts_onRequestGet } from "C:\\Users\\barto\\Desktop\\Darts-Counter-V7-GIT\\functions\\api\\avatar\\checkout-verify.ts"
import { onRequestGet as __api_avatar_debug_ts_onRequestGet } from "C:\\Users\\barto\\Desktop\\Darts-Counter-V7-GIT\\functions\\api\\avatar\\debug.ts"
import { onRequestPost as __api_avatar_stripe_webhook_ts_onRequestPost } from "C:\\Users\\barto\\Desktop\\Darts-Counter-V7-GIT\\functions\\api\\avatar\\stripe-webhook.ts"
import { onRequestGet as __api_avatar_test_ts_onRequestGet } from "C:\\Users\\barto\\Desktop\\Darts-Counter-V7-GIT\\functions\\api\\avatar\\test.ts"
import { onRequestOptions as __api_viewer_session_ts_onRequestOptions } from "C:\\Users\\barto\\Desktop\\Darts-Counter-V7-GIT\\functions\\api\\viewer\\session.ts"
import { onRequestPost as __api_viewer_session_ts_onRequestPost } from "C:\\Users\\barto\\Desktop\\Darts-Counter-V7-GIT\\functions\\api\\viewer\\session.ts"
import { onRequest as __api_storage_backups__middleware_ts_onRequest } from "C:\\Users\\barto\\Desktop\\Darts-Counter-V7-GIT\\functions\\api\\storage\\backups\\_middleware.ts"
import { onRequest as __api_backend___path___ts_onRequest } from "C:\\Users\\barto\\Desktop\\Darts-Counter-V7-GIT\\functions\\api\\backend\\[[path]].ts"

export const routes = [
    {
      routePath: "/api/viewer/session/:sessionId/snapshot",
      mountPath: "/api/viewer/session/:sessionId",
      method: "GET",
      middlewares: [],
      modules: [__api_viewer_session__sessionId__snapshot_ts_onRequestGet],
    },
  {
      routePath: "/api/viewer/session/:sessionId/snapshot",
      mountPath: "/api/viewer/session/:sessionId",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_viewer_session__sessionId__snapshot_ts_onRequestOptions],
    },
  {
      routePath: "/api/viewer/session/:sessionId/snapshot",
      mountPath: "/api/viewer/session/:sessionId",
      method: "POST",
      middlewares: [],
      modules: [__api_viewer_session__sessionId__snapshot_ts_onRequestPost],
    },
  {
      routePath: "/api/running/routes/catalog",
      mountPath: "/api/running/routes",
      method: "GET",
      middlewares: [],
      modules: [__api_running_routes_catalog_ts_onRequestGet],
    },
  {
      routePath: "/api/running/routes/catalog",
      mountPath: "/api/running/routes",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_running_routes_catalog_ts_onRequestOptions],
    },
  {
      routePath: "/api/viewer/session/:sessionId",
      mountPath: "/api/viewer/session",
      method: "DELETE",
      middlewares: [],
      modules: [__api_viewer_session__sessionId__ts_onRequestDelete],
    },
  {
      routePath: "/api/viewer/session/:sessionId",
      mountPath: "/api/viewer/session",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_viewer_session__sessionId__ts_onRequestOptions],
    },
  {
      routePath: "/api/storage/backups/:path*",
      mountPath: "/api/storage/backups",
      method: "",
      middlewares: [],
      modules: [__api_storage_backups___path___ts_onRequest],
    },
  {
      routePath: "/api/avatar/cartoon",
      mountPath: "/api/avatar",
      method: "POST",
      middlewares: [],
      modules: [__api_avatar_cartoon_ts_onRequestPost],
    },
  {
      routePath: "/api/avatar/checkout",
      mountPath: "/api/avatar",
      method: "POST",
      middlewares: [],
      modules: [__api_avatar_checkout_ts_onRequestPost],
    },
  {
      routePath: "/api/avatar/checkout-verify",
      mountPath: "/api/avatar",
      method: "GET",
      middlewares: [],
      modules: [__api_avatar_checkout_verify_ts_onRequestGet],
    },
  {
      routePath: "/api/avatar/debug",
      mountPath: "/api/avatar",
      method: "GET",
      middlewares: [],
      modules: [__api_avatar_debug_ts_onRequestGet],
    },
  {
      routePath: "/api/avatar/stripe-webhook",
      mountPath: "/api/avatar",
      method: "POST",
      middlewares: [],
      modules: [__api_avatar_stripe_webhook_ts_onRequestPost],
    },
  {
      routePath: "/api/avatar/test",
      mountPath: "/api/avatar",
      method: "GET",
      middlewares: [],
      modules: [__api_avatar_test_ts_onRequestGet],
    },
  {
      routePath: "/api/viewer/session",
      mountPath: "/api/viewer",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_viewer_session_ts_onRequestOptions],
    },
  {
      routePath: "/api/viewer/session",
      mountPath: "/api/viewer",
      method: "POST",
      middlewares: [],
      modules: [__api_viewer_session_ts_onRequestPost],
    },
  {
      routePath: "/api/storage/backups",
      mountPath: "/api/storage/backups",
      method: "",
      middlewares: [__api_storage_backups__middleware_ts_onRequest],
      modules: [],
    },
  {
      routePath: "/api/backend/:path*",
      mountPath: "/api/backend",
      method: "",
      middlewares: [],
      modules: [__api_backend___path___ts_onRequest],
    },
  ]