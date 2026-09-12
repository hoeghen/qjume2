import { createBrowserRouter } from 'react-router-dom';
import { App } from './App.js';
import { CustomerHome } from './routes/customer/CustomerHome.js';
import { QueueDetail } from './routes/customer/QueueDetail.js';
import { ShopHome } from './routes/shop/ShopHome.js';
import { ShopIndex } from './routes/shop/ShopIndex.js';
import { QueueFormRoute } from './routes/shop/QueueFormRoute.js';
import { ServingRoute } from './routes/shop/ServingRoute.js';
import { Billing } from './routes/shop/Billing.js';
import { MonitorHome } from './routes/monitor/MonitorHome.js';

export const router = createBrowserRouter([
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
]);
