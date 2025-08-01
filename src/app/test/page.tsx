/**
 * Test page to verify storage implementation
 * @filepath src/app/test/page.tsx
 */

'use client';

import { useEffect, useState } from 'react';

export default function TestPage() {
  const [result, setResult] = useState<string>('Testing...');
  
  useEffect(() => {
    // Test will be done via API route
    fetch('/api/test')
      .then(res => res.json())
      .then(data => setResult(JSON.stringify(data, null, 2)));
  }, []);
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Storage Test</h1>
      <pre className="bg-gray-100 p-4 rounded">{result}</pre>
    </div>
  );
}