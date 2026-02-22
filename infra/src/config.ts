/**
 * Shared configuration for Politikerkollen infrastructure.
 */

import * as ec2 from 'aws-cdk-lib/aws-ec2';

export type Environment = 'dev' | 'prod';

export interface StackConfig {
  environment: Environment;
  
  // EC2 instance size
  ec2InstanceSize: ec2.InstanceSize;
  
  // Log retention
  logRetentionDays: number;
}

export const configs: Record<Environment, StackConfig> = {
  dev: {
    environment: 'dev',
    ec2InstanceSize: ec2.InstanceSize.MICRO, // t4g.micro - free tier eligible
    logRetentionDays: 3,
  },
  prod: {
    environment: 'prod',
    ec2InstanceSize: ec2.InstanceSize.SMALL, // t4g.small - 2 vCPU, 2GB RAM
    logRetentionDays: 7,
  },
};

export function getConfig(environment: Environment): StackConfig {
  return configs[environment];
}
