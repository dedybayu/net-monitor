'use client';

import { ReactFlowProvider } from 'reactflow';
import { TopologyEditor } from './TopologyEditor';

export default function TopologyPage() {
  return (
    <ReactFlowProvider>
      <TopologyEditor />
    </ReactFlowProvider>
  );
}