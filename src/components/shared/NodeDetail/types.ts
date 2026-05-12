export interface ServiceForm {
  name: string;
  description: string;
  ip: string;
  method: 'ICMP' | 'TCP';
  port: string;
}

export interface NodeForm {
  label: string;
  description: string;
  ip: string;
  method: 'ICMP' | 'TCP';
  port: string;
}

export const EMPTY_SERVICE_FORM: ServiceForm = {
  name: '', description: '', ip: '', method: 'ICMP', port: '',
};
