import { NodeDetailResponse } from '@/src/app/(dashboard)/workspaces/[workspace_id]/topology/types';
import { ServiceForm, NodeForm } from './types';

export function svcToForm(svc: NodeDetailResponse['services'][number]): ServiceForm {
  const hasPort = svc.node_service_port > 0;
  return {
    name: svc.node_service_name,
    description: svc.node_service_description || '',
    ip: svc.node_service_ip_address,
    method: hasPort ? 'TCP' : 'ICMP',
    port: hasPort ? String(svc.node_service_port) : '',
  };
}

export function nodeToForm(node: NodeDetailResponse): NodeForm {
  const hasPort = node.node_port > 0;
  return {
    label: node.node_label,
    description: node.node_description || '',
    ip: node.node_ip_address,
    method: node.node_method as 'ICMP' | 'TCP',
    port: hasPort ? String(node.node_port) : '',
  };
}
