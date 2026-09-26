import { createBrowserRouter, createHashRouter } from 'react-router-dom';
import { App } from './App.js';
import { Splash } from './routes/Splash.js';
import { CustomerHome } from './routes/customer/CustomerHome.js';
import { QueueDetail } from './routes/customer/QueueDetail.js';
import { ShopQueues } from './routes/customer/ShopQueues.js';
import { ShopHome } from './routes/shop/ShopHome.js';
import { ShopIndex } from './routes/shop/ShopIndex.js';
import { QueueFormRoute } from './routes/shop/QueueFormRoute.js';
import { ServingRoute } from './routes/shop/ServingRoute.js';
import { Billing } from './routes/shop/Billing.js';
import { MonitorHome } from './routes/monitor/MonitorHome.js';
import { Terms } from './routes/legal/Terms.js';
import { Privacy } from './routes/legal/Privacy.js';
import { AdminHome } from './routes/admin/AdminHome.js';
import { AdminShopList } from './routes/admin/AdminShopList.js';
import { AdminShopDetail } from './routes/admin/AdminShopDetail.js';
import { AdminQueueEditRoute } from './routes/admin/AdminQueueEditRoute.js';
import { AdminAuditLog } from './routes/admin/AdminAuditLog.js';

// A portable build has to run from a path it cannot know at build time, on a
// host with no rewrite rule to send deep links back to index.html. Putting the
// route in the fragment solves both: the server only ever sees index.html.
const isPortable = import.meta.env.VITE_PORTABLE === 'true';

/**
 * Every route, written once and unprefixed. Mounted twice below - as-is for
 * English, and again under `da/` for Danish - rather than as a `:lang?`
 * dynamic segment: a literal `da` branch can never be ambiguous with a
 * sibling route the way an optional dynamic prefix can (an unprefixed
 * `/find` would otherwise be parseable either as the `find` route or as
 * `:lang="find"` matching the index route). See src/lib/i18n/locale.ts for
 * the other half of this - detecting which branch a URL is under.
 */
const ROUTE_CHILDREN = [
  { index: true, element: <Splash /> },
  { path: 'find', element: <CustomerHome /> },
  { path: 'q/:shopId/:queueId', element: <QueueDetail /> },
  // Public, and deliberately not under /shop — that is the owner's area.
  { path: 's/:shopId', element: <ShopQueues /> },
  {
    path: 'shop',
    element: <ShopHome />,
    children: [
      { index: true, element: <ShopIndex /> },
      { path: 'billing', element: <Billing /> },
      { path: 'q/new', element: <QueueFormRoute /> },
      { path: 'q/:queueId/settings', element: <QueueFormRoute /> },
      { path: 'q/:queueId/serve', element: <ServingRoute /> },
    ],
  },
  { path: 'monitor', element: <MonitorHome /> },
  { path: 'terms', element: <Terms /> },
  { path: 'privacy', element: <Privacy /> },
  {
    // Not linked from anywhere in the app, the same as /monitor — the
    // one person who needs this reaches it by URL. See CLAUDE.md
    // decision 9.
    path: 'admin',
    element: <AdminHome />,
    children: [
      { index: true, element: <AdminShopList /> },
      { path: 'log', element: <AdminAuditLog /> },
      { path: 'shops/:shopId', element: <AdminShopDetail /> },
      {
        path: 'shops/:shopId/q/:queueId',
        element: <AdminQueueEditRoute />,
      },
    ],
  },
];

export const router = (isPortable ? createHashRouter : createBrowserRouter)(
  [
    {
      path: '/',
      element: <App />,
      children: [...ROUTE_CHILDREN, { path: 'da', children: ROUTE_CHILDREN }],
    },
  ],
  // Served from a subdirectory on GitHub Pages, from the root everywhere else.
  // Vite fills this in from `base` at build time. A hash router carries the
  // route in the fragment, so it needs no basename at all.
  isPortable ? {} : { basename: import.meta.env.BASE_URL },
);
