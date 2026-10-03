import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router.js';
import './index.css';
// Imported for its side effect: the install prompt fires once at startup.
import './lib/install.js';
// Imported for its side effect: keeps an installed app on the latest build.
import './lib/appUpdate.js';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
