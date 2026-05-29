/**
 * Core infrastructure for Politikerkollen (no always-on compute).
 *
 * VPC (public subnets, no NAT), ECR repos, MotherDuck secret.
 * Resource names are not tiered by dev/prod — the AWS account is the boundary.
 */

import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

const RESOURCE_PREFIX = "politikerkollen";

export class PolitikerkollenCoreStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly ingestionRepo: ecr.Repository;
  public readonly dbtRepo: ecr.Repository;
  public readonly cognitionRepo: ecr.Repository;
  public readonly motherDuckSecret: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props: cdk.StackProps = {}) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, "Vpc", {
      vpcName: `${RESOURCE_PREFIX}-vpc`,
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });

    const createRepo = (name: string): ecr.Repository => {
      return new ecr.Repository(this, `${name}Repo`, {
        repositoryName: `${RESOURCE_PREFIX}/${name.toLowerCase()}`,
        imageScanOnPush: false,
        lifecycleRules: [{ maxImageCount: 5 }],
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        emptyOnDelete: true,
      });
    };

    this.ingestionRepo = createRepo("ingestion");
    this.dbtRepo = createRepo("dbt");
    this.cognitionRepo = createRepo("cognition");

    this.motherDuckSecret = new secretsmanager.Secret(this, "MotherDuckSecret", {
      secretName: `${RESOURCE_PREFIX}/motherduck-token`,
      description: "MotherDuck access token",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ token: "REPLACE_ME" }),
        generateStringKey: "placeholder",
      },
    });

    const publicSubnetIds = this.vpc.publicSubnets.map((s) => s.subnetId).join(",");

    new cdk.CfnOutput(this, "VpcId", { value: this.vpc.vpcId });
    new cdk.CfnOutput(this, "PublicSubnetIds", {
      value: publicSubnetIds,
      description: "Comma-separated public subnet IDs (for SAM / Fargate)",
    });
    new cdk.CfnOutput(this, "IngestionRepoUri", {
      value: this.ingestionRepo.repositoryUri,
    });
    new cdk.CfnOutput(this, "DbtRepoUri", {
      value: this.dbtRepo.repositoryUri,
    });
    new cdk.CfnOutput(this, "CognitionRepoUri", {
      value: this.cognitionRepo.repositoryUri,
    });
    new cdk.CfnOutput(this, "MotherDuckSecretArn", {
      value: this.motherDuckSecret.secretArn,
    });
    new cdk.CfnOutput(this, "SetMotherDuckToken", {
      value: `aws secretsmanager put-secret-value --secret-id ${this.motherDuckSecret.secretName} --secret-string '{"token":"YOUR_TOKEN"}'`,
    });
  }
}
