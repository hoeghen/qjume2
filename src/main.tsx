import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router.js';
import { isMock } from './lib/mock/mode.js';
import { seedMockBackend } from './lib/mock/seed.js';
import './index.css';

if (isMock) seedMockBackend();

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
