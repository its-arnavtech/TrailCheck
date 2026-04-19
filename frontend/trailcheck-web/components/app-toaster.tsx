'use client';

import { Toaster } from 'react-hot-toast';

export default function AppToaster() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'rgba(9, 19, 24, 0.94)',
          color: '#ecf1ea',
          border: '1px solid rgba(201, 221, 207, 0.14)',
          boxShadow: '0 18px 42px rgba(0,0,0,0.24)',
          backdropFilter: 'blur(14px)',
        },
      }}
    />
  );
}
