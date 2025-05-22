import { AlertDomain } from './alert';
import { K8sDomain } from './k8s';
import { LogDomain } from './log';
import { MetricDomain } from './metric';
import { NetflowDomain } from './netflow';
import { TraceDomain } from './trace';
import { Domains } from './types';

// Singleton Domains value with all known domains.
export const allDomains = new Domains(
  new AlertDomain(),
  new K8sDomain(),
  new LogDomain(),
  new MetricDomain(),
  new NetflowDomain(),
  new TraceDomain(),
);
