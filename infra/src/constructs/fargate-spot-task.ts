/**
 * Reusable construct for Fargate Spot task definitions.
 * 
 * Creates a task definition optimized for cost with:
 * - Fargate Spot capacity provider
 * - Minimal logging configuration
 * - Secrets injection from Secrets Manager
 */

import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface FargateSpotTaskProps {
  /**
   * Name for the task definition family
   */
  name: string;
  
  /**
   * ECR repository URI for the container image
   */
  imageUri: string;
  
  /**
   * CPU units (256 = 0.25 vCPU)
   */
  cpu: number;
  
  /**
   * Memory in MiB
   */
  memoryMiB: number;
  
  /**
   * Default command for the container (can be overridden at runtime)
   */
  command?: string[];
  
  /**
   * Environment variables
   */
  environment?: Record<string, string>;
  
  /**
   * Secrets from Secrets Manager to inject
   */
  secrets?: Record<string, secretsmanager.ISecret>;
  
  /**
   * Secret field mappings (secret -> field name in JSON)
   */
  secretFields?: Record<string, { secret: secretsmanager.ISecret; field: string }>;
  
  /**
   * Log retention in days
   */
  logRetentionDays?: number;
  
  /**
   * Container port to expose (optional)
   */
  containerPort?: number;
  
  /**
   * Task role (for AWS API access from within container)
   */
  taskRole?: iam.IRole;
  
  /**
   * Execution role (for ECS to pull images, write logs)
   */
  executionRole?: iam.IRole;
}

export class FargateSpotTask extends Construct {
  public readonly taskDefinition: ecs.FargateTaskDefinition;
  public readonly container: ecs.ContainerDefinition;
  public readonly logGroup: logs.LogGroup;
  
  constructor(scope: Construct, id: string, props: FargateSpotTaskProps) {
    super(scope, id);
    
    // Create log group
    this.logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/ecs/politikerkollen/${props.name}`,
      retention: props.logRetentionDays ?? logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    
    // Create task definition
    this.taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      family: `politikerkollen-${props.name}`,
      cpu: props.cpu,
      memoryLimitMiB: props.memoryMiB,
      taskRole: props.taskRole,
      executionRole: props.executionRole,
    });
    
    // Build secrets configuration
    const ecsSecrets: Record<string, ecs.Secret> = {};
    
    // Handle full secrets
    if (props.secrets) {
      for (const [name, secret] of Object.entries(props.secrets)) {
        ecsSecrets[name] = ecs.Secret.fromSecretsManager(secret);
      }
    }
    
    // Handle secret fields (JSON secrets with specific field)
    if (props.secretFields) {
      for (const [name, config] of Object.entries(props.secretFields)) {
        ecsSecrets[name] = ecs.Secret.fromSecretsManager(config.secret, config.field);
      }
    }
    
    // Add container
    this.container = this.taskDefinition.addContainer('container', {
      image: ecs.ContainerImage.fromRegistry(props.imageUri),
      command: props.command,
      environment: props.environment,
      secrets: Object.keys(ecsSecrets).length > 0 ? ecsSecrets : undefined,
      logging: ecs.LogDrivers.awsLogs({
        logGroup: this.logGroup,
        streamPrefix: props.name,
      }),
      essential: true,
    });
    
    // Add port mapping if specified
    if (props.containerPort) {
      this.container.addPortMappings({
        containerPort: props.containerPort,
        protocol: ecs.Protocol.TCP,
      });
    }
  }
}
