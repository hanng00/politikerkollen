/**
 * Shared configuration for Politikerkollen infrastructure.
 */

export type Environment = 'dev' | 'prod';

export interface StackConfig {
  environment: Environment;
  
  // Dagster services (long-running)
  dagsterWebserver: {
    cpu: number;
    memoryMiB: number;
  };
  dagsterDaemon: {
    cpu: number;
    memoryMiB: number;
  };
  
  // Task containers (on-demand)
  taskContainers: {
    cpu: number;
    memoryMiB: number;
  };
  
  // Log retention
  logRetentionDays: number;
}

export const configs: Record<Environment, StackConfig> = {
  dev: {
    environment: 'dev',
    dagsterWebserver: { cpu: 256, memoryMiB: 512 },
    dagsterDaemon: { cpu: 256, memoryMiB: 512 },
    taskContainers: { cpu: 256, memoryMiB: 512 },
    logRetentionDays: 3,
  },
  prod: {
    environment: 'prod',
    dagsterWebserver: { cpu: 256, memoryMiB: 512 },
    dagsterDaemon: { cpu: 256, memoryMiB: 512 },
    taskContainers: { cpu: 512, memoryMiB: 1024 },
    logRetentionDays: 7,
  },
};

export function getConfig(environment: Environment): StackConfig {
  return configs[environment];
}
