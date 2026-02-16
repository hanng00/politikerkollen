/**
 * Politikerkollen Infrastructure Stack
 * 
 * Cost-optimized Dagster deployment on AWS:
 * - Fargate Spot for all workloads
 * - Public subnets only (no NAT Gateway costs)
 * - On-demand task execution for dlt/dbt containers
 * - MotherDuck as serverless data warehouse
 * 
 * Estimated cost: ~$8-15/month
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

import { type StackConfig } from './config.js';
import { FargateSpotTask } from './constructs/index.js';

export interface PolitikerkollenStackProps extends cdk.StackProps {
  config: StackConfig;
}

export class PolitikerkollenStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly cluster: ecs.Cluster;
  public readonly dagsterRepo: ecr.Repository;
  public readonly ingestionRepo: ecr.Repository;
  public readonly dbtRepo: ecr.Repository;
  public readonly motherDuckSecret: secretsmanager.Secret;
  
  constructor(scope: Construct, id: string, props: PolitikerkollenStackProps) {
    super(scope, id, props);
    
    const { config } = props;
    const envPrefix = `politikerkollen-${config.environment}`;
    
    // =========================================================================
    // VPC - Public subnets only (no NAT Gateway = $0 networking costs)
    // =========================================================================
    this.vpc = new ec2.Vpc(this, 'Vpc', {
      vpcName: `${envPrefix}-vpc`,
      maxAzs: 2,
      natGateways: 0, // No NAT = free!
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });
    
    // =========================================================================
    // Security Groups
    // =========================================================================
    const dagsterSg = new ec2.SecurityGroup(this, 'DagsterSg', {
      vpc: this.vpc,
      securityGroupName: `${envPrefix}-dagster-sg`,
      description: 'Security group for Dagster services',
      allowAllOutbound: true,
    });
    
    // Allow Dagster webserver UI access
    dagsterSg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(3000),
      'Dagster webserver UI'
    );
    
    // Allow internal communication between Dagster services
    dagsterSg.addIngressRule(
      dagsterSg,
      ec2.Port.allTraffic(),
      'Internal Dagster communication'
    );
    
    const taskSg = new ec2.SecurityGroup(this, 'TaskSg', {
      vpc: this.vpc,
      securityGroupName: `${envPrefix}-task-sg`,
      description: 'Security group for task containers (ingestion, dbt)',
      allowAllOutbound: true, // Needed for MotherDuck, Riksdagen API
    });
    
    // =========================================================================
    // ECS Cluster with Fargate Spot
    // =========================================================================
    this.cluster = new ecs.Cluster(this, 'Cluster', {
      clusterName: envPrefix,
      vpc: this.vpc,
      containerInsightsV2: ecs.ContainerInsights.DISABLED, // Disable to save costs
      enableFargateCapacityProviders: true,
    });
    
    // =========================================================================
    // ECR Repositories with lifecycle policies
    // =========================================================================
    const createRepo = (name: string): ecr.Repository => {
      return new ecr.Repository(this, `${name}Repo`, {
        repositoryName: `${envPrefix}/${name.toLowerCase()}`,
        imageScanOnPush: false, // Disable to save costs
        lifecycleRules: [
          {
            description: 'Keep only last 5 images',
            maxImageCount: 5,
          },
        ],
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        emptyOnDelete: true,
      });
    };
    
    this.dagsterRepo = createRepo('dagster');
    this.ingestionRepo = createRepo('ingestion');
    this.dbtRepo = createRepo('dbt');
    
    // =========================================================================
    // Secrets Manager
    // =========================================================================
    this.motherDuckSecret = new secretsmanager.Secret(this, 'MotherDuckSecret', {
      secretName: `politikerkollen/${config.environment}/motherduck-token`,
      description: 'MotherDuck access token for data warehouse',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ token: 'REPLACE_ME' }),
        generateStringKey: 'placeholder', // Placeholder, will be updated manually
      },
    });
    
    // Dagster auth credentials
    const dagsterAuthSecret = new secretsmanager.Secret(this, 'DagsterAuthSecret', {
      secretName: `politikerkollen/${config.environment}/dagster-auth`,
      description: 'Dagster webserver authentication credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'admin' }),
        generateStringKey: 'password',
        excludePunctuation: true,
        passwordLength: 24,
      },
    });
    
    // =========================================================================
    // IAM Roles
    // =========================================================================
    
    // Execution role (for ECS to pull images, write logs, read secrets)
    const executionRole = new iam.Role(this, 'ExecutionRole', {
      roleName: `${envPrefix}-ecs-execution-role`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });
    
    this.motherDuckSecret.grantRead(executionRole);
    dagsterAuthSecret.grantRead(executionRole);
    
    // Task role for Dagster (needs to run ECS tasks)
    const dagsterTaskRole = new iam.Role(this, 'DagsterTaskRole', {
      roleName: `${envPrefix}-dagster-task-role`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });
    
    // Task role for worker containers (ingestion, dbt)
    const workerTaskRole = new iam.Role(this, 'WorkerTaskRole', {
      roleName: `${envPrefix}-worker-task-role`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });
    
    this.motherDuckSecret.grantRead(workerTaskRole);
    
    // =========================================================================
    // Task Definitions
    // =========================================================================
    
    // Ingestion task (dlt)
    const ingestionTask = new FargateSpotTask(this, 'IngestionTask', {
      name: `${config.environment}-ingestion`,
      imageUri: this.ingestionRepo.repositoryUri + ':latest',
      cpu: config.taskContainers.cpu,
      memoryMiB: config.taskContainers.memoryMiB,
      command: ['run', '--help'], // Overridden at runtime
      secretFields: {
        MOTHERDUCK_ACCESS_TOKEN: { secret: this.motherDuckSecret, field: 'token' },
      },
      logRetentionDays: config.logRetentionDays,
      taskRole: workerTaskRole,
      executionRole: executionRole,
    });
    
    // dbt task
    const dbtTask = new FargateSpotTask(this, 'DbtTask', {
      name: `${config.environment}-dbt`,
      imageUri: this.dbtRepo.repositoryUri + ':latest',
      cpu: config.taskContainers.cpu,
      memoryMiB: config.taskContainers.memoryMiB,
      command: ['run', '--help'], // Overridden at runtime
      secretFields: {
        MOTHERDUCK_ACCESS_TOKEN: { secret: this.motherDuckSecret, field: 'token' },
      },
      logRetentionDays: config.logRetentionDays,
      taskRole: workerTaskRole,
      executionRole: executionRole,
    });
    
    // Grant Dagster permission to run tasks
    dagsterTaskRole.addToPolicy(new iam.PolicyStatement({
      actions: ['ecs:RunTask', 'ecs:StopTask', 'ecs:DescribeTasks'],
      resources: ['*'],
      conditions: {
        ArnEquals: {
          'ecs:cluster': this.cluster.clusterArn,
        },
      },
    }));
    
    dagsterTaskRole.addToPolicy(new iam.PolicyStatement({
      actions: ['iam:PassRole'],
      resources: [executionRole.roleArn, workerTaskRole.roleArn],
    }));
    
    dagsterTaskRole.addToPolicy(new iam.PolicyStatement({
      actions: ['logs:GetLogEvents', 'logs:FilterLogEvents'],
      resources: ['*'],
    }));
    
    this.motherDuckSecret.grantRead(dagsterTaskRole);
    
    // Dagster webserver task (with authentication)
    const webserverTask = new FargateSpotTask(this, 'WebserverTask', {
      name: `${config.environment}-dagster-webserver`,
      imageUri: this.dagsterRepo.repositoryUri + ':latest',
      cpu: config.dagsterWebserver.cpu,
      memoryMiB: config.dagsterWebserver.memoryMiB,
      command: ['dagster-webserver', '-h', '0.0.0.0', '-p', '3000'],
      containerPort: 3000,
      environment: {
        DAGSTER_ENVIRONMENT: 'production',
        ECS_CLUSTER: this.cluster.clusterName,
        ECS_SUBNETS: this.vpc.publicSubnets.map(s => s.subnetId).join(','),
        ECS_SECURITY_GROUPS: taskSg.securityGroupId,
        INGESTION_TASK_DEFINITION: ingestionTask.taskDefinition.taskDefinitionArn,
        DBT_TASK_DEFINITION: dbtTask.taskDefinition.taskDefinitionArn,
      },
      secretFields: {
        MOTHERDUCK_ACCESS_TOKEN: { secret: this.motherDuckSecret, field: 'token' },
        DAGSTER_WEBSERVER_AUTH_USERNAME: { secret: dagsterAuthSecret, field: 'username' },
        DAGSTER_WEBSERVER_AUTH_PASSWORD: { secret: dagsterAuthSecret, field: 'password' },
      },
      logRetentionDays: config.logRetentionDays,
      taskRole: dagsterTaskRole,
      executionRole: executionRole,
    });
    
    // Dagster daemon task
    const daemonTask = new FargateSpotTask(this, 'DaemonTask', {
      name: `${config.environment}-dagster-daemon`,
      imageUri: this.dagsterRepo.repositoryUri + ':latest',
      cpu: config.dagsterDaemon.cpu,
      memoryMiB: config.dagsterDaemon.memoryMiB,
      command: ['dagster-daemon', 'run'],
      environment: {
        DAGSTER_ENVIRONMENT: 'production',
        ECS_CLUSTER: this.cluster.clusterName,
        ECS_SUBNETS: this.vpc.publicSubnets.map(s => s.subnetId).join(','),
        ECS_SECURITY_GROUPS: taskSg.securityGroupId,
        INGESTION_TASK_DEFINITION: ingestionTask.taskDefinition.taskDefinitionArn,
        DBT_TASK_DEFINITION: dbtTask.taskDefinition.taskDefinitionArn,
      },
      secretFields: {
        MOTHERDUCK_ACCESS_TOKEN: { secret: this.motherDuckSecret, field: 'token' },
      },
      logRetentionDays: config.logRetentionDays,
      taskRole: dagsterTaskRole,
      executionRole: executionRole,
    });
    
    // =========================================================================
    // ECS Services (long-running Dagster components)
    // =========================================================================
    
    // Dagster webserver service (use regular Fargate for stability)
    new ecs.FargateService(this, 'WebserverService', {
      serviceName: 'dagster-webserver',
      cluster: this.cluster,
      taskDefinition: webserverTask.taskDefinition,
      desiredCount: 1,
      minHealthyPercent: 0, // Allow full replacement (only 1 task)
      maxHealthyPercent: 100,
      assignPublicIp: true,
      securityGroups: [dagsterSg],
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      capacityProviderStrategies: [
        { capacityProvider: 'FARGATE', weight: 1 }, // Use regular Fargate for webserver stability
      ],
      enableExecuteCommand: true, // For debugging
    });
    
    // Dagster daemon service (use Fargate Spot for cost savings)
    new ecs.FargateService(this, 'DaemonService', {
      serviceName: 'dagster-daemon',
      cluster: this.cluster,
      taskDefinition: daemonTask.taskDefinition,
      desiredCount: 1,
      minHealthyPercent: 0, // Allow full replacement (only 1 task)
      maxHealthyPercent: 100,
      assignPublicIp: true,
      securityGroups: [dagsterSg],
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      capacityProviderStrategies: [
        { capacityProvider: 'FARGATE_SPOT', weight: 1, base: 0 },
        { capacityProvider: 'FARGATE', weight: 0, base: 0 },
      ],
      enableExecuteCommand: true,
    });
    
    // =========================================================================
    // Outputs
    // =========================================================================
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
    });
    
    new cdk.CfnOutput(this, 'ClusterName', {
      value: this.cluster.clusterName,
      description: 'ECS Cluster name',
    });
    
    new cdk.CfnOutput(this, 'DagsterRepoUri', {
      value: this.dagsterRepo.repositoryUri,
      description: 'ECR repository URI for Dagster',
    });
    
    new cdk.CfnOutput(this, 'IngestionRepoUri', {
      value: this.ingestionRepo.repositoryUri,
      description: 'ECR repository URI for ingestion',
    });
    
    new cdk.CfnOutput(this, 'DbtRepoUri', {
      value: this.dbtRepo.repositoryUri,
      description: 'ECR repository URI for dbt',
    });
    
    new cdk.CfnOutput(this, 'IngestionTaskDefArn', {
      value: ingestionTask.taskDefinition.taskDefinitionArn,
      description: 'Ingestion task definition ARN',
    });
    
    new cdk.CfnOutput(this, 'DbtTaskDefArn', {
      value: dbtTask.taskDefinition.taskDefinitionArn,
      description: 'dbt task definition ARN',
    });
    
    new cdk.CfnOutput(this, 'MotherDuckSecretArn', {
      value: this.motherDuckSecret.secretArn,
      description: 'MotherDuck secret ARN',
    });
    
    new cdk.CfnOutput(this, 'DagsterAuthSecretArn', {
      value: dagsterAuthSecret.secretArn,
      description: 'Dagster auth secret ARN (username/password auto-generated)',
    });
    
    new cdk.CfnOutput(this, 'GetDagsterCredentialsCommand', {
      value: `aws secretsmanager get-secret-value --secret-id ${dagsterAuthSecret.secretName} --query SecretString --output text | jq .`,
      description: 'Command to retrieve Dagster login credentials',
    });
    
    new cdk.CfnOutput(this, 'TaskSecurityGroupId', {
      value: taskSg.securityGroupId,
      description: 'Security group ID for task containers',
    });
    
    new cdk.CfnOutput(this, 'PublicSubnets', {
      value: this.vpc.publicSubnets.map(s => s.subnetId).join(','),
      description: 'Public subnet IDs',
    });
    
    new cdk.CfnOutput(this, 'SetMotherDuckTokenCommand', {
      value: `aws secretsmanager put-secret-value --secret-id ${this.motherDuckSecret.secretName} --secret-string '{"token": "YOUR_TOKEN_HERE"}'`,
      description: 'Command to set MotherDuck token',
    });
  }
}
