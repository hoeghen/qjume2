import { createBrowserRouter, createHashRouter } from 'react-router-dom';
import { App } from './App.js';
import { CustomerHome } from './routes/customer/CustomerHome.js';
import { QueueDetail } from './routes/customer/QueueDetail.js';
import { ShopHome } from './routes/shop/ShopHome.js';
import { ShopIndex } from './routes/shop/ShopIndex.js';
import { QueueFormRoute } from './routes/shop/QueueFormRoute.js';
import { ServingRoute } from './routes/shop/ServingRoute.js';
import { Billing } from './routes/shop/Billing.js';
import { MonitorHome } from './routes/monitor/MonitorHome.js';

// A portable build has to run from a path it cannot know at build time, on a
// host with no rewrite rule to send deep links back to index.html. Putting the
// route in the fragment solves both: the server only ever sees index.html.
const isPortable = import.meta.env.VITE_PORTABLE === 'true';

export const router = (isPortable ? createHashRouter : createBrowserRouter)(
  [
    {
      path: '/',
      element: <App />,
      children: [
        { index: true, element: <CustomerHome /> },
        { path: 'q/:shopId/:queueId', element: <QueueDetail /> },
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
        ],
      },
    ],
  // Served from a subdirectory on GitHub Pages, from the root everywhere else.
  // Vite fills this in from `base` at build time. A hash router carries the
  // route in the fragment, so it needs no basename at all.
  isPortable ? {} : { basename: import.meta.env.BASE_URL },
);
