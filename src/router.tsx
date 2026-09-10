import { createBrowserRouter } from 'react-router-dom';
import { App } from './App.js';
import { CustomerHome } from './routes/customer/CustomerHome.js';
import { ShopHome } from './routes/shop/ShopHome.js';
import { MonitorHome } from './routes/monitor/MonitorHome.js';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <CustomerHome /> },
      { path: 'shop', element: <ShopHome /> },
      { path: 'monitor', element: <MonitorHome /> },
    ],
  },
]);
