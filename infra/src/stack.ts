/**
 * Politikerkollen Infrastructure Stack
 * 
 * Ultra-low-cost Dagster deployment on AWS:
 * - Single EC2 Spot instance running Docker Compose
 * - Postgres container for Dagster metadata
 * - Public subnet (no NAT Gateway costs)
 * - MotherDuck as serverless data warehouse
 * 
 * Estimated cost: ~$3-6/month
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

import { type StackConfig } from './config.js';

export interface PolitikerkollenStackProps extends cdk.StackProps {
  config: StackConfig;
}

export class PolitikerkollenStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly instance: ec2.Instance;
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
      natGateways: 0,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });
    
    // =========================================================================
    // Security Group
    // =========================================================================
    const dagsterSg = new ec2.SecurityGroup(this, 'DagsterSg', {
      vpc: this.vpc,
      securityGroupName: `${envPrefix}-dagster-sg`,
      description: 'Security group for Dagster EC2 instance',
      allowAllOutbound: true,
    });
    
    // Dagster webserver UI (direct access, or use SSM port forwarding for private access)
    dagsterSg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(3000),
      'Dagster webserver UI'
    );
    
    // =========================================================================
    // ECR Repositories
    // =========================================================================
    const createRepo = (name: string): ecr.Repository => {
      return new ecr.Repository(this, `${name}Repo`, {
        repositoryName: `${envPrefix}/${name.toLowerCase()}`,
        imageScanOnPush: false,
        lifecycleRules: [{ maxImageCount: 5 }],
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
      description: 'MotherDuck access token',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ token: 'REPLACE_ME' }),
        generateStringKey: 'placeholder',
      },
    });
    
    const dagsterPostgresSecret = new secretsmanager.Secret(this, 'DagsterPostgresSecret', {
      secretName: `politikerkollen/${config.environment}/dagster-postgres`,
      description: 'Dagster Postgres password',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'dagster' }),
        generateStringKey: 'password',
        excludePunctuation: true,
        passwordLength: 24,
      },
    });
    
    // =========================================================================
    // IAM Role for EC2
    // =========================================================================
    const ec2Role = new iam.Role(this, 'Ec2Role', {
      roleName: `${envPrefix}-ec2-role`,
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'),
      ],
    });
    
    this.motherDuckSecret.grantRead(ec2Role);
    dagsterPostgresSecret.grantRead(ec2Role);
    this.dagsterRepo.grantPullPush(ec2Role);
    this.ingestionRepo.grantPullPush(ec2Role);
    this.dbtRepo.grantPullPush(ec2Role);
    
    // =========================================================================
    // EC2 User Data
    // =========================================================================
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      '#!/bin/bash',
      'set -ex',
      '',
      '# Install Docker & Docker Compose',
      'dnf update -y',
      'dnf install -y docker git jq',
      'systemctl enable --now docker',
      'usermod -aG docker ec2-user',
      'curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose',
      'chmod +x /usr/local/bin/docker-compose',
      '',
      '# Create app directory',
      'mkdir -p /opt/dagster && cd /opt/dagster',
      '',
      '# Get secrets',
      `MOTHERDUCK_TOKEN=$(aws secretsmanager get-secret-value --secret-id ${this.motherDuckSecret.secretName} --query SecretString --output text | jq -r .token)`,
      `POSTGRES_PASSWORD=$(aws secretsmanager get-secret-value --secret-id ${dagsterPostgresSecret.secretName} --query SecretString --output text | jq -r .password)`,
      '',
      '# Create .env',
      'cat > /opt/dagster/.env << EOF',
      'DAGSTER_POSTGRES_USER=dagster',
      'DAGSTER_POSTGRES_PASSWORD=$POSTGRES_PASSWORD',
      'DAGSTER_POSTGRES_DB=dagster',
      'MOTHERDUCK_TOKEN=$MOTHERDUCK_TOKEN',
      `DAGSTER_IMAGE=${this.dagsterRepo.repositoryUri}:latest`,
      'EOF',
      '',
      '# Create docker-compose.yml',
      `cat > /opt/dagster/docker-compose.yml << 'COMPOSE'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: \${DAGSTER_POSTGRES_USER}
      POSTGRES_PASSWORD: \${DAGSTER_POSTGRES_PASSWORD}
      POSTGRES_DB: \${DAGSTER_POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${DAGSTER_POSTGRES_USER}"]
      interval: 5s
      retries: 5
    restart: unless-stopped

  webserver:
    image: \${DAGSTER_IMAGE}
    entrypoint: ["dagster-webserver", "-h", "0.0.0.0", "-p", "3000"]
    ports: ["3000:3000"]
    environment:
      DAGSTER_POSTGRES_USER: \${DAGSTER_POSTGRES_USER}
      DAGSTER_POSTGRES_PASSWORD: \${DAGSTER_POSTGRES_PASSWORD}
      DAGSTER_POSTGRES_DB: \${DAGSTER_POSTGRES_DB}
      DAGSTER_POSTGRES_HOST: postgres
      MOTHERDUCK_TOKEN: \${MOTHERDUCK_TOKEN}
    volumes: ["/var/run/docker.sock:/var/run/docker.sock"]
    depends_on:
      postgres: { condition: service_healthy }
    restart: unless-stopped

  daemon:
    image: \${DAGSTER_IMAGE}
    entrypoint: ["dagster-daemon", "run"]
    environment:
      DAGSTER_POSTGRES_USER: \${DAGSTER_POSTGRES_USER}
      DAGSTER_POSTGRES_PASSWORD: \${DAGSTER_POSTGRES_PASSWORD}
      DAGSTER_POSTGRES_DB: \${DAGSTER_POSTGRES_DB}
      DAGSTER_POSTGRES_HOST: postgres
      MOTHERDUCK_TOKEN: \${MOTHERDUCK_TOKEN}
    volumes: ["/var/run/docker.sock:/var/run/docker.sock"]
    depends_on:
      postgres: { condition: service_healthy }
    restart: unless-stopped

volumes:
  postgres_data:
COMPOSE`,
      '',
      '# Login to ECR and start',
      `aws ecr get-login-password --region ${this.region} | docker login --username AWS --password-stdin ${this.account}.dkr.ecr.${this.region}.amazonaws.com`,
      'cd /opt/dagster',
      'docker-compose pull || true',
      'docker-compose up -d || true',
      '',
      '# Systemd service for auto-start',
      `cat > /etc/systemd/system/dagster.service << 'SERVICE'
[Unit]
Description=Dagster
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/dagster
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down

[Install]
WantedBy=multi-user.target
SERVICE`,
      'systemctl daemon-reload',
      'systemctl enable dagster',
    );
    
    // =========================================================================
    // EC2 Instance
    // =========================================================================
    this.instance = new ec2.Instance(this, 'DagsterInstance', {
      vpc: this.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, config.ec2InstanceSize),
      machineImage: ec2.MachineImage.latestAmazonLinux2023({ cpuType: ec2.AmazonLinuxCpuType.ARM_64 }),
      securityGroup: dagsterSg,
      role: ec2Role,
      userData,
      blockDevices: [{
        deviceName: '/dev/xvda',
        volume: ec2.BlockDeviceVolume.ebs(20, {
          volumeType: ec2.EbsDeviceVolumeType.GP3,
          encrypted: true,
        }),
      }],
    });
    
    cdk.Tags.of(this.instance).add('Name', `${envPrefix}-dagster`);
    
    // =========================================================================
    // Outputs
    // =========================================================================
    new cdk.CfnOutput(this, 'InstanceId', { value: this.instance.instanceId });
    new cdk.CfnOutput(this, 'DagsterUrl', { value: `http://${this.instance.instancePublicIp}:3000` });
    new cdk.CfnOutput(this, 'SshCommand', { value: `aws ssm start-session --target ${this.instance.instanceId}` });
    new cdk.CfnOutput(this, 'DagsterRepoUri', { value: this.dagsterRepo.repositoryUri });
    new cdk.CfnOutput(this, 'IngestionRepoUri', { value: this.ingestionRepo.repositoryUri });
    new cdk.CfnOutput(this, 'DbtRepoUri', { value: this.dbtRepo.repositoryUri });
    new cdk.CfnOutput(this, 'SetMotherDuckToken', { 
      value: `aws secretsmanager put-secret-value --secret-id ${this.motherDuckSecret.secretName} --secret-string '{"token":"YOUR_TOKEN"}'` 
    });
  }
}
