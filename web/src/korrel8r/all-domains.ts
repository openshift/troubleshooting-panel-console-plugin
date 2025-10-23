import { AlertDomain } from './alert';
import { K8sDomain } from './k8s';
import { LogDomain } from './log';
import { MetricDomain } from './metric';
import { NetflowDomain } from './netflow';
import { TraceDomain } from './trace';

// List of all the known domains, default constructed.
export const allDomains = [
  new AlertDomain(),
  new K8sDomain(),
  new LogDomain(),
  new MetricDomain(),
  new NetflowDomain(),
  new TraceDomain(),
];
